/**
 * ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
 *
 * Types de l'état de partie. Le `Store` côté client a été archivé (D7 amendée :
 * la source de vérité est désormais **côté serveur**, F17). Ces types restent
 * exposés pour deux usages transitoires :
 *
 *   1. Le contrat `Adventure` les référence (`start(initialState: Readonly<GameState>)`).
 *   2. `createInitialState()` est appelé par le Host pour construire un état
 *      local minimal en attendant la projection serveur (Prompt 3).
 *
 * Le **serveur** redéfinira la forme canonique du `GameState` dans
 * `packages/server/` (Prompt 2). À ce moment-là, ces types seront soit migrés
 * vers `shared/`, soit déprécié au profit de ceux du serveur.
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
