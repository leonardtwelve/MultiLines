/**
 * Hooks d'aventure consommés par la state machine (cf.
 * `docs/specs/server-state-machine.md §7.2`).
 *
 * Les aventures (Banque Lune, future…) implémentent cette interface pour
 * fournir leur **règles métier** au moteur générique : résolution
 * d'actions, événements de tour, score final, etc.
 *
 * Au slice 3c-2 (lobby/briefing), seul `distributeRoles` est appelé. Les
 * autres hooks ont une signature stabilisée mais ne sont consommés qu'à
 * partir des slices suivantes (reducers casse/vote/reveal).
 */

import type {
  GameEndReason,
  PlayerId,
  PrivatePlayerState,
  PublicGameState,
  StatePatch,
  TurnEvent,
} from '@pixel-quests/shared';

/**
 * Résultat d'une résolution d'action (slice 3c-3+).
 *
 * - `success` : true si l'action atteint son effet principal.
 * - `patches` : opérations à appliquer à l'état (ressources, alerte, etc.).
 * - `events` : événements de tour à concaténer dans `turn.ended.events`.
 */
export interface ActionResult {
  success: boolean;
  /**
   * Patches à diffuser via `state.patch` (cf. spec store-projection
   * §3.1). Utilise le type discriminé `StatePatch` du protocole.
   */
  patches: ReadonlyArray<StatePatch>;
  events: ReadonlyArray<TurnEvent>;
}

/** Synthèse de fin de partie pour le bilan UI (slice 3c-3+). */
export interface FinalScore {
  endReason: GameEndReason;
  /** Texte localisé FR prêt à afficher (titre du bilan). */
  headline: string;
  /** Détail joueur par joueur (Crédits, objectif atteint, etc.). */
  perPlayer: Readonly<Record<PlayerId, { credits: number; objectiveAchieved: boolean }>>;
}

/**
 * Distribution initiale des rôles + objectifs au démarrage de partie.
 *
 * Appelée par la state machine à la transition `lobby → briefing` après
 * `game.start`. Le serveur stocke ensuite les `PrivatePlayerState` produits
 * et les émet aux sockets concernés via `private.role-revealed` /
 * `private.objective`.
 */
export interface RoleDistribution {
  /** Mapping joueur → état privé (rôle, objectif, ressources initiales). */
  privates: Readonly<Record<PlayerId, PrivatePlayerState>>;
  /** Vue publique initiale (sans rien des privés ci-dessus). */
  publicState: PublicGameState;
}

export interface AdventureHooks {
  /** Identifiant de l'aventure (`'banque-lune'`, etc.) — match `Room.adventureId`. */
  readonly adventureId: string;

  /**
   * Distribue les rôles + objectifs au démarrage. Appelé une seule fois,
   * à la transition `lobby → briefing`. Le seed RNG vient en option pour
   * les tests déterministes.
   */
  distributeRoles(playerIds: ReadonlyArray<PlayerId>, opts?: { rng?: () => number }): RoleDistribution;

  /**
   * Résout une action proposée par un joueur. Slice 3c-3+. Retourne
   * `null` si l'action n'est pas reconnue (la state machine renverra
   * alors `ACTION_UNKNOWN`).
   */
  resolveAction(
    actionId: string,
    params: Readonly<Record<string, unknown>>,
    state: PublicGameState,
    byPlayerId: PlayerId,
  ): ActionResult | null;

  /**
   * Produit la liste des événements de tour (aléa, scriptés, etc.) à la
   * fin de la phase `resolution`. Slice 3c-3+.
   */
  triggerTurnEvents(state: PublicGameState, opts?: { rng?: () => number }): ReadonlyArray<TurnEvent>;

  /** Calcule le score + raison de fin de partie. Slice 3c-3+. */
  computeFinalScore(state: PublicGameState, endReason: GameEndReason): FinalScore;
}
