/**
 * Codes d'erreur du protocole gameplay (cf. `docs/specs/protocole.md §4`).
 *
 * Source de vérité : émis par le serveur dans `private.error` (ciblé) ou
 * dans le payload d'un `*.rejected` rattaché à un `proposalId`.
 *
 * Convention : SCREAMING_SNAKE_CASE, stables (rétrocompat protocole).
 * Les `message` français sont produits côté serveur, prêts à afficher dans
 * la UI. Les `details` sont à usage debug — jamais montrés à l'utilisateur.
 */

export type ErrorCode =
  /** L'auteur n'est pas le joueur actif. */
  | 'NOT_YOUR_TURN'
  /** Auteur pas membre de la room ciblée. */
  | 'NOT_IN_ROOM'
  /** Room inexistante. */
  | 'ROOM_NOT_FOUND'
  /** Room pleine (5 max). */
  | 'ROOM_FULL'
  /** Action incompatible avec l'état courant (ex: `vote.cast` hors acte 3). */
  | 'ROOM_STATE_INVALID'
  /** `actionId` inconnu. */
  | 'ACTION_UNKNOWN'
  /** Action existante mais pas autorisée pour ce rôle. */
  | 'ACTION_NOT_ALLOWED'
  /** Manque de Crédits / Tension / autre coût. */
  | 'INSUFFICIENT_RESOURCE'
  /** Cible d'action invalide (tile non walkable, joueur absent, etc.). */
  | 'TARGET_INVALID'
  /** Pacte plus en attente de réponse (timeout). */
  | 'PACTE_EXPIRED'
  /** Throttling serveur (anti-spam de propositions). */
  | 'RATE_LIMITED'
  /** Erreur serveur inattendue — log + remonte un message générique. */
  | 'INTERNAL';

/**
 * Payload d'erreur émis par le serveur.
 *
 * `message` est déjà localisé FR au MVP (cf. spec protocole.md §4.2 — i18n
 * différé). `proposalId` permet au client de rattacher l'erreur à une
 * action en cours dans sa UI. `details` est consigné côté client mais
 * jamais affiché.
 */
export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  proposalId?: string;
  details?: unknown;
}
