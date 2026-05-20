# Spec — Store projection côté client

> Réf : F17 (serveur source de vérité), F20 (WebSocket + JSON), D7 amendée (server-side store), D2 (events typés).
> Issue : [#63](https://github.com/leonardtwelve/MultiLines/issues/63).
> Couplée à : `protocole.md` (#60), `server-state-machine.md` (#61).
> Statut : v1 — 20 mai 2026.

Cette spec décrit comment les clients (Host tablette et Player smartphone) construisent et maintiennent leur **projection locale** de l'état serveur, qui est la source de vérité (F17). Le client ne mute jamais directement le store — il :
1. reçoit un **snapshot** initial à la (re)connexion ;
2. applique des **patches** incrémentaux ;
3. expose une vue **read-only** typée au reste de la UI.

---

## 1. Modèle d'état

### 1.1. State public partagé (`PublicGameState`)

Visible par tous les clients d'une room. Émis tel quel à toute la room socket.io.

```ts
interface PublicGameState {
  roomId: RoomId;
  status: RoomStatus;                       // cf. #61
  adventureId: string;
  players: Record<PlayerId, PublicPlayer>;   // pas d'objectif privé, pas de dossiers
  turn?: { number: number; activePlayerId: PlayerId; deadline?: number };
  board?: PublicBoardState;                  // tiles, doors (locked/open), positions
  alert?: number;                            // jauge d'alerte (Banque Lune)
  // ... autres champs publics par aventure
}

interface PublicPlayer {
  id: PlayerId;
  name: string;
  color: string;
  connected: boolean;
  // ressources publiques (Crédits affichés au HUD partagé)
  credits?: number;
  // pas d'objectif, pas de rôle (rôle révélé en `reveal` final seulement)
}

interface PublicBoardState {
  doors: Array<{ id: string; locked: boolean }>;   // état d'unlock
  positions: Record<PlayerId, { x: number; y: number }>;
}
```

### 1.2. State privé par Player (`PrivatePlayerState`)

Émis uniquement au socket du joueur concerné (cf. #60 §5).

```ts
interface PrivatePlayerState {
  playerId: PlayerId;
  roleId: string;
  capabilities: string[];     // actions disponibles selon le rôle
  objective: {
    id: string;
    description: string;      // texte localisé FR
    hidden: boolean;          // objectif tordu / secret de groupe (G3, spec #23)
    progress?: number;        // 0..1 ou contextuel
  };
  dossiers: DossierItem[];    // info privée bombe banque-lune
  tension?: number;           // ressource privée (Infiltré, Négociateur — spec #29)
  pendingPactes: PacteOffer[];
}
```

### 1.3. State Host (`HostState`)

Le Host n'a **pas** d'état privé en plus du public, mais peut recevoir des infos meta utiles à l'UI tablette :

```ts
interface HostState {
  publicGameState: PublicGameState;
  // Le Host peut afficher des stats agrégées que les Players ne voient pas
  // (ex: répartition des votes en cours d'acte 3 sans révéler les choix individuels)
  meta?: {
    voteProgress?: { received: number; total: number };
  };
}
```

---

## 2. Cycle de vie de la projection

### 2.1. À la connexion (initial sync)

```
Client                                Serveur
  │                                     │
  │── connect (socket.io handshake) ───►│
  │                                     │
  │◄── connection.established ──────────│
  │                                     │
  │ (cas Host : room.create │ cas Player : room.join)
  │                                     │
  │◄── state.snapshot ──────────────────│   payload = full PublicGameState
  │                                     │                + PrivatePlayerState
  │                                     │                  (si Player)
  │                                     │                + HostState.meta
  │                                     │                  (si Host)
  │ store.hydrate(snapshot)             │
  │                                     │
  │◄── state.patch ─────────────────────│   delta JSON Patch
  │ store.applyPatch(patches)           │
  │                                     │
  ...
```

### 2.2. Pendant la partie (patches incrémentaux)

Chaque mutation côté serveur produit :
1. Une mise à jour de la `Room` (state interne serveur).
2. Un ou plusieurs `state.patch` à diffuser (room et/ou dirigés).
3. Optionnellement des events « décoratifs » (`action.resolved`, `door.unlocked`, etc.) — purement informatifs, le client peut les ignorer pour le store mais s'en sert pour les animations.

> **Règle d'or** : `state.patch` est l'unique source de modification du store côté client. Aucun autre event n'altère la projection. Les events décoratifs déclenchent uniquement des effets UI éphémères (sons, animations, toasts).

### 2.3. À la reconnexion

```
Client (reconnect)                    Serveur
  │                                     │
  │── connect (avec cookie session) ──►│  retrouve sessionToken → playerId
  │                                     │
  │◄── state.snapshot ──────────────────│  snapshot complet pour ce joueur
  │ store.replaceWith(snapshot)         │
  │ // détruit l'ancien store local      │
```

**Décision : `replaceWith` total**, pas de tentative de réconciliation. Le client adopte le snapshot serveur. Tout state local non confirmé (action proposée pas encore résolue) est jeté.

---

## 3. Format des patches

### 3.1. Sous-ensemble JSON Patch (RFC 6902)

Pour rester simple, on supporte 3 opérations :

```ts
type StatePatch =
  | { op: 'replace'; path: string;            value: unknown }
  | { op: 'add';     path: string;            value: unknown }
  | { op: 'remove';  path: string };

type StatePatchBatch = {
  version: number;          // sérial monotone serveur (cf. §4 désynchronisation)
  patches: StatePatch[];
};
```

`path` au format pointer JSON : `/players/abc123/credits`, `/turn/activePlayerId`, `/board/doors/0/locked`.

### 3.2. Exemples

**Déplacement d'un joueur** :
```json
{ "op": "replace", "path": "/board/positions/abc123", "value": { "x": 12, "y": 8 } }
```

**Unlock d'une porte** :
```json
{ "op": "replace", "path": "/board/doors/3/locked", "value": false }
```

**Joueur déconnecté** :
```json
{ "op": "replace", "path": "/players/abc123/connected", "value": false }
```

**Joueur quitte la room** (lobby) :
```json
{ "op": "remove", "path": "/players/abc123" }
```

### 3.3. Pourquoi JSON Patch et pas une lib comme Immer
- Standard reconnu (RFC), pas d'opacité sur le format.
- Sérialisable trivialement (du JSON).
- Application client en ~30 lignes de TS (cf. §6).
- Pas de runtime dependency Immer côté serveur ou client — léger.
- Immer reste utilisable en **interne serveur** pour produire les patches (`produceWithPatches`), mais le contrat réseau reste JSON Patch.

---

## 4. Versionnage et désynchronisation

### 4.1. Numéro de version monotone
Chaque `state.patch` porte un `version: number` (incrément serveur, démarre à 0 au snapshot).

Le client maintient `lastVersion` et **rejette** tout patch dont la version n'est pas exactement `lastVersion + 1`. Si gap détecté → demande un nouveau snapshot.

```
Client                                Serveur
  │                                     │
  │◄── state.patch { version: 5 } ──────│
  │ ok lastVersion=5                    │
  │                                     │
  │   (network blip — patch 6 perdu)    │
  │                                     │
  │◄── state.patch { version: 7 } ──────│
  │ gap! demande resync                  │
  │── state.resync.request ────────────►│
  │                                     │
  │◄── state.snapshot { version: 7 } ───│
  │ replaceWith(snapshot)                │
```

### 4.2. Cas limite — première patch après snapshot
Si snapshot `version: 0`, premier patch attendu `version: 1`. Si reçu `version: N > 1`, on demande un resync.

### 4.3. Idempotence
Si patch reçu avec `version: lastVersion` (doublon réseau improbable mais possible) → ignoré silencieusement.

---

## 5. Filtrage privé côté serveur (cohérence avec #60)

Le serveur gère **deux flux de patches** :
- **Public** : émis à toute la room socket.io.
- **Privé par joueur** : émis ciblé sur un socketId. Concerne uniquement les chemins privés (`PrivatePlayerState`).

Le client est agnostique de l'origine — il les applique tels qu'ils arrivent à son store local. Le store local **combine** la part publique et la part privée :

```ts
interface ClientStore {
  public: PublicGameState;
  private?: PrivatePlayerState;   // undefined pour le Host
}
```

> **Sécurité par construction** : un Player ne reçoit jamais les patches privés des autres joueurs (le serveur ne les émet pas vers son socketId). Aucun risque de fuite via les devtools, l'info n'est tout simplement pas dans le bundle réseau de ce socket.

### 5.1. Chemins de patches
- `/players/<id>/credits` → public (broadcasté)
- `/players/<id>/objective` → privé (dirigé uniquement à `<id>`)
- `/board/positions/<id>` → public
- `/board/doors/<i>` → public
- `/turn/activePlayerId` → public
- `/private/role`, `/private/dossiers` → privé

Convention : les patches privés ont leur path préfixé par `/private/...` côté client, pour distinguer dans le store local.

---

## 6. Implémentation client (pseudocode)

### 6.1. Architecture proposée

```
packages/front/src/store/
  ├── ClientStore.ts            # API publique : getState() + subscribe()
  ├── snapshot.ts                # type Snapshot + helpers
  ├── patch.ts                   # appliquer un StatePatch (JSON Patch reduced)
  ├── ClientStore.test.ts        # tests d'application
  └── stateTypes.ts              # PublicGameState, PrivatePlayerState, ...
```

### 6.2. API du store

```ts
class ClientStore {
  private _state: ClientStoreState | null = null;
  private _version = 0;
  private listeners = new Set<(s: ClientStoreState) => void>();

  /** Appelé à la réception de `state.snapshot`. */
  hydrate(snapshot: Snapshot): void {
    this._state = freeze(snapshot.state);
    this._version = snapshot.version;
    this.emit();
  }

  /** Appelé à chaque `state.patch` reçu. */
  applyPatchBatch(batch: StatePatchBatch): { ok: boolean; needsResync?: boolean } {
    if (batch.version !== this._version + 1) {
      // Doublon → ignore. Gap → resync.
      if (batch.version <= this._version) return { ok: true };
      return { ok: false, needsResync: true };
    }
    this._state = freeze(applyPatches(this._state!, batch.patches));
    this._version = batch.version;
    this.emit();
    return { ok: true };
  }

  /** Lecture seule, immutable. */
  getState(): Readonly<ClientStoreState> | null {
    return this._state;
  }

  subscribe(listener: (s: ClientStoreState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l(this._state!);
  }
}
```

### 6.3. Application d'un patch (mini-JSON Patch)

```ts
function applyPatches(state: object, patches: StatePatch[]): object {
  let cur = deepClone(state);
  for (const p of patches) {
    const segs = p.path.split('/').slice(1).map(decodeURIComponent);
    if (p.op === 'remove') {
      removeAt(cur, segs);
    } else {
      setAt(cur, segs, p.value);
    }
  }
  return cur;
}
```

`deepClone` minimaliste (structuredClone si dispo, sinon JSON round-trip). Pas besoin d'Immer.

### 6.4. Wiring avec `SocketClient`

```ts
const store = new ClientStore();
const client = new SocketClient({ url: getServerUrl() });

await client.connect();

client.on('state.snapshot', (snapshot) => store.hydrate(snapshot));
client.on('state.patch', (batch) => {
  const result = store.applyPatchBatch(batch);
  if (result.needsResync) {
    void client.requestResync();
  }
});
```

### 6.5. Lecture côté UI (Host Phaser ou Player smartphone)

Le store est **read-only**. Les composants s'y abonnent et re-render sur changement.

```ts
const off = store.subscribe((state) => {
  // Phaser side : update sprites, doors, HUD
  updateAvatars(state.public.board.positions);
  updateAlertGauge(state.public.alert);
});
```

Pour le smartphone Player, on peut wrapper avec un mini hook si on adopte un framework léger (F19 à trancher) :
```ts
function useStore(): ClientStoreState | null {
  const [s, setS] = useState(store.getState());
  useEffect(() => store.subscribe(setS), []);
  return s;
}
```

---

## 7. Garantie d'immutabilité

### 7.1. Type-level
`getState()` renvoie `Readonly<ClientStoreState>` (récursif) → TypeScript bloque les mutations en compilation.

```ts
type ClientStoreState = {
  public: DeepReadonly<PublicGameState>;
  private?: DeepReadonly<PrivatePlayerState>;
};

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

### 7.2. Runtime (mode dev)
On utilise `Object.freeze` récursif sur le snapshot et sur chaque résultat d'`applyPatches`. En cas de tentative de mutation, throw en mode strict (silent en mode prod par défaut JS, on assume).

```ts
function freeze<T>(obj: T): T {
  Object.freeze(obj);
  for (const k of Object.keys(obj as object)) {
    const v = (obj as Record<string, unknown>)[k];
    if (v && typeof v === 'object') freeze(v);
  }
  return obj;
}
```

> **Coût** : O(n) sur le state à chaque patch. Négligeable pour les tailles MVP (~quelques dizaines de Ko max).

---

## 8. Détection de désynchronisation

### 8.1. Côté client
- Gap de version (cf. §4) → demande `state.resync`.
- Détection d'invariant violé (ex: `activePlayerId` n'est pas dans `players`) → log + demande resync préventif.

### 8.2. Côté serveur
- Pas de check actif. Le serveur fait confiance à son propre state et envoie les patches en série monotone.
- Si un client demande un resync trop souvent (> 3 fois en 1 min) → log warning, mais on continue à servir.

---

## 9. Plan d'implémentation

### Étape 1 — Types partagés
- Ajouter `PublicGameState`, `PrivatePlayerState`, `Snapshot`, `StatePatch`, `StatePatchBatch` dans `@pixel-quests/shared`.
- Étendre `ServerEvent` (cf. #60) avec `state.snapshot`, `state.patch`.

### Étape 2 — Store côté client
- Créer `packages/front/src/store/ClientStore.ts` + tests.
- Wirer dans `SocketClient` (subscribe global aux events store-related).

### Étape 3 — Producer côté serveur
- Choix : utiliser **Immer** côté serveur en interne pour `produceWithPatches`, puis convertir en JSON Patch reduced (3 ops).
- Ou : reducer manuel qui génère explicitement les patches.
- **Recommandation** : Immer interne (gain de productivité, lisibilité) + adapter qui maps vers nos 3 ops.

### Étape 4 — Filtrage privé
- Helper côté serveur `splitPatches(allPatches): { public: StatePatch[]; perPlayer: Record<PlayerId, StatePatch[]> }`.
- Tous les patches dont le path commence par `/private/...` ou cible un joueur précis sont filtrés.

### Étape 5 — Tests
- Application de patches (3 ops × cas) : unitaires.
- Snapshot + N patches → vérifie state final.
- Resync sur gap.
- Filtrage privé : un Player A ne reçoit jamais une mise à jour de l'objectif privé de Player B.

---

## 10. Hors scope de cette spec
- Le **détail des champs par aventure** dans `PublicGameState` / `PrivatePlayerState` — couvert par #41 (gameplay Banque Lune).
- Les **animations Phaser** déclenchées par les patches — couvert lors de l'impl Prompt 3c+.
- La **résolution déterministe** des actions côté serveur — couvert par #61 (state machine) et #41.
- L'**accessibilité** des changements d'état (annonces vocales, focus management) — futur.

---

## Annexe — Décisions clés

| # | Décision | Pourquoi |
|---|---|---|
| J1 | Snapshot complet à (re)connexion, pas de replay d'events | Robustesse > économie BP (cf. #60) |
| J2 | JSON Patch reduced (3 ops) | Standard, sérialisable, simple à implémenter |
| J3 | Version monotone par batch | Detect gap fiable |
| J4 | Patches privés/publics séparés côté serveur, fusionnés côté client | Sécurité par construction (cf. #60 §5) |
| J5 | Immer côté serveur, JSON Patch sur le wire | Productivité dev + portabilité protocole |
| J6 | `Object.freeze` récursif côté client | Garde-fou pas-cher, complète le type-level |
| J7 | Tout state non confirmé est jeté à la reconnexion | Pas de réconciliation complexe — le serveur est juge |
| J8 | Pas de dépendance lib côté client (mini JSON Patch maison) | Bundle léger, surtout côté Player smartphone |
