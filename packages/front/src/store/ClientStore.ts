/**
 * Store projection côté client (cf. `docs/specs/store-projection.md`).
 *
 * Responsabilités :
 * - Ingérer le `state.snapshot` initial (à la connexion) et reconstituer
 *   un state local immuable (`Object.freeze` récursif).
 * - Appliquer les `state.patch` incrémentaux dans l'ordre monotone des
 *   versions. Rejeter les doublons, déclencher un resync sur les gaps.
 * - File d'attente bornée pour les patches arrivés AVANT le snapshot
 *   (race condition réseau — spec §2.1).
 * - Notifier les abonnés sur changement de state.
 *
 * Filtrage public vs privé :
 * - Les paths commençant par `/private/...` ciblent `state.private`.
 * - Les autres ciblent `state.public`.
 *
 * Le serveur fait déjà le filtrage par destinataire (cf. spec §5.1) :
 * un Player ne reçoit jamais les patches privés d'un autre joueur. Le
 * store ne fait donc que router les patches reçus.
 */

import type {
  HostMeta,
  PrivatePlayerState,
  PublicGameState,
  Snapshot,
  StatePatch,
  StatePatchBatch,
} from '@pixel-quests/shared';
import { applyPatches, PatchError } from './patch';

/** Forme du state côté client — combine la vue publique et la slice privée. */
export interface ClientStoreState {
  public: PublicGameState;
  private?: PrivatePlayerState;
  hostMeta?: HostMeta;
}

export type ClientStoreListener = (state: Readonly<ClientStoreState>) => void;

export interface ApplyResult {
  ok: boolean;
  /** true si le store a perdu la séquence et que l'appelant doit demander un resync. */
  needsResync?: boolean;
}

/**
 * Taille max de la file d'attente des patches reçus avant le snapshot
 * initial. Au-delà, on jette tout et on demande un resync (évite la
 * fuite mémoire si le snapshot n'arrive jamais).
 */
export const MAX_QUEUED_PATCHES = 50;

export class ClientStore {
  private _state: ClientStoreState | null = null;
  private _version = 0;
  private pendingBatches: StatePatchBatch[] = [];
  private listeners = new Set<ClientStoreListener>();

  // === API publique ===

  /**
   * Vue lecture-seule du state courant. `null` tant que le snapshot
   * initial n'a pas été reçu.
   *
   * Le `Object.freeze` récursif est appliqué à `_state` — toute
   * tentative de mutation directe en mode strict throw. En mode sloppy
   * (browser sans `use strict`), la mutation est silencieusement
   * ignorée mais le store ne re-emit pas (donc la UI reste correcte).
   */
  getState(): Readonly<ClientStoreState> | null {
    return this._state;
  }

  /** Version monotone courante (utile aux tests + au debug). */
  get version(): number {
    return this._version;
  }

  /**
   * Abonnement aux changements. Le listener est invoqué après chaque
   * application réussie (snapshot OU patch). Renvoie un désabonnement.
   */
  subscribe(listener: ClientStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Ingestion du `state.snapshot` reçu du serveur. Remplace tout state
   * local précédent (cf. spec §2.3 — pas de réconciliation, le serveur
   * est juge). Si des patches étaient en file d'attente, on les draine
   * dans l'ordre après l'hydratation.
   */
  hydrate(snapshot: Snapshot): ApplyResult {
    const next: ClientStoreState = {
      public: snapshot.public,
    };
    if (snapshot.private) next.private = snapshot.private;
    if (snapshot.hostMeta) next.hostMeta = snapshot.hostMeta;
    this._state = freezeDeep(next);
    this._version = snapshot.version;
    this.emit();
    // Drain de la file accumulée pendant l'attente du snapshot.
    const queued = this.pendingBatches.splice(0);
    for (const batch of queued) {
      const r = this.applyPatchBatch(batch);
      if (r.needsResync) {
        this.pendingBatches = [];
        return { ok: false, needsResync: true };
      }
    }
    return { ok: true };
  }

  /**
   * Application d'un batch de patches. Gère :
   * - File d'attente si snapshot pas encore reçu (race condition).
   * - Détection doublons (`version <= currentVersion` → ignore).
   * - Détection gap (`version != currentVersion + 1` → resync requis).
   * - Erreurs d'application (path invalide…) → resync forcé.
   */
  applyPatchBatch(batch: StatePatchBatch): ApplyResult {
    if (this._state === null) {
      // Race condition réseau : patches reçus avant le snapshot. On
      // accumule jusqu'à MAX_QUEUED_PATCHES, au-delà on resync.
      if (this.pendingBatches.length >= MAX_QUEUED_PATCHES) {
        this.pendingBatches = [];
        return { ok: false, needsResync: true };
      }
      this.pendingBatches.push(batch);
      return { ok: true };
    }
    // Doublon : version déjà passée → ignore silencieusement.
    if (batch.version <= this._version) {
      return { ok: true };
    }
    // Gap : on a manqué une ou plusieurs versions → resync.
    if (batch.version !== this._version + 1) {
      return { ok: false, needsResync: true };
    }
    // Application réelle, avec routing public/private.
    try {
      const next = applyAllRouted(this._state, batch.patches);
      this._state = freezeDeep(next);
      this._version = batch.version;
      this.emit();
      return { ok: true };
    } catch (err) {
      if (err instanceof PatchError) {
        // Cohérence du state cassée — on resync. La spec §6 doc cette
        // décision : pas de rollback partiel, on s'aligne sur le serveur.
        return { ok: false, needsResync: true };
      }
      throw err;
    }
  }

  /** Reset complet — utilisé par les tests et à la déconnexion. */
  reset(): void {
    this._state = null;
    this._version = 0;
    this.pendingBatches = [];
    // On n'efface PAS les listeners — ils sont rattachés à la durée de
    // vie du store côté UI.
  }

  // === Internes ===

  private emit(): void {
    if (!this._state) return;
    for (const l of this.listeners) l(this._state);
  }
}

// === Helpers ===

const PRIVATE_PREFIX = '/private';

/**
 * Applique tous les patches d'un batch en routant chacun vers la slice
 * `public` ou `private` du state. Renvoie le nouveau state agrégé.
 *
 * Si un patch privé arrive alors que `state.private` n'existe pas
 * (Host ou Player avant l'init), on l'initialise à `{}` (l'op `add`
 * créera les clés au fur et à mesure).
 */
function applyAllRouted(state: ClientStoreState, patches: ReadonlyArray<StatePatch>): ClientStoreState {
  // On groupe par slice cible pour ne cloner chaque slice qu'une fois.
  const publicPatches: StatePatch[] = [];
  const privatePatches: StatePatch[] = [];
  for (const p of patches) {
    if (isPrivatePath(p.path)) {
      privatePatches.push(stripPrivatePrefix(p));
    } else {
      publicPatches.push(p);
    }
  }
  const next: ClientStoreState = { ...state };
  if (publicPatches.length > 0) {
    next.public = applyPatches(state.public, publicPatches) as PublicGameState;
  }
  if (privatePatches.length > 0) {
    const baseline = state.private ?? ({} as PrivatePlayerState);
    next.private = applyPatches(baseline, privatePatches) as PrivatePlayerState;
  }
  return next;
}

function isPrivatePath(path: string): boolean {
  return path === PRIVATE_PREFIX || path.startsWith(`${PRIVATE_PREFIX}/`);
}

function stripPrivatePrefix(p: StatePatch): StatePatch {
  const newPath = p.path === PRIVATE_PREFIX ? '' : p.path.slice(PRIVATE_PREFIX.length);
  if (p.op === 'remove') return { op: 'remove', path: newPath };
  return { op: p.op, path: newPath, value: p.value };
}

/**
 * Gel récursif (immutabilité runtime). Coût négligeable pour les
 * tailles MVP (~quelques Ko). En cas de tentative de mutation, throw en
 * mode strict — silencieux en mode sloppy mais sans effet (l'objet
 * cloné par `applyPatches` n'est pas le même que celui que tente le
 * caller, donc même en sloppy mode la mutation se perd).
 */
function freezeDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') freezeDeep(v);
  }
  return obj;
}
