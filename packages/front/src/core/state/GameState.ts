/**
 * État global d'une partie. Source unique de vérité (voir D7).
 * Modifiable uniquement via le `Store` et ses actions.
 */

export type TurnPhase = 'idle' | 'action' | 'resolution';
export type GameStatus = 'setup' | 'playing' | 'ended';

export interface PlayerState {
  id: string;
  name: string;
  /** Couleur d'avatar/UI au format CSS (hex). */
  color: string;
  isActive: boolean;
}

export interface CurrentTurn {
  playerId: string | null;
  phase: TurnPhase;
  turnNumber: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  currentTurn: CurrentTurn;
  /** Slot libre pour l'état spécifique de l'aventure courante. */
  adventureState: unknown;
  status: GameStatus;
}

export const createInitialState = (): GameState => ({
  players: {},
  currentTurn: { playerId: null, phase: 'idle', turnNumber: 0 },
  adventureState: null,
  status: 'setup',
});
