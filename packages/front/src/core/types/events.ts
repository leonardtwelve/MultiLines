/**
 * Registre des événements du moteur (D2). Convention de nommage : `domaine.action`
 * en lowercase, verbe au passé. Voir `docs/DECISIONS.md` D2.
 *
 * Les aventures peuvent étendre ce registre via la déclaration merging TypeScript :
 *
 * ```ts
 * declare module '../../core/types/events' {
 *   interface GameEventRegistry {
 *     'banque-lune.role-revealed': { playerId: string; roleId: string };
 *   }
 * }
 * ```
 *
 * Les events spécifiques d'une aventure DOIVENT être préfixés par son id.
 */
export interface GameEventRegistry {
  'player.joined': { playerId: string; name: string };
  'player.left': { playerId: string };
  'turn.started': { playerId: string; turnNumber: number };
  'turn.ended': { playerId: string };
  'adventure.started': { adventureId: string };
  'adventure.completed': { winnerId?: string; reason: string };
  'state.updated': { previousState: unknown; newState: unknown };
}

/**
 * Union discriminée des events. Dérivée du registre, donc auto-augmentée
 * quand une aventure étend GameEventRegistry.
 */
export type GameEvent = {
  [K in keyof GameEventRegistry]: { type: K; payload: GameEventRegistry[K] };
}[keyof GameEventRegistry];

/** Alias historique. Utiliser `GameEvent` dans le nouveau code. */
export type CoreGameEvent = GameEvent;
