import type { EventBus } from '../engine/EventBus';
import type { GameState, GameStatus, PlayerState } from './GameState';

export type Action =
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerState } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'TURN_STARTED'; payload: { playerId: string } }
  | { type: 'TURN_ENDED'; payload: Record<string, never> }
  | { type: 'ADVENTURE_STATE_UPDATED'; payload: { newState: unknown } }
  | { type: 'STATUS_CHANGED'; payload: { status: GameStatus } };

type Listener = (state: Readonly<GameState>) => void;

/**
 * Source unique de vérité de la partie (voir D7). Toute modification passe par
 * `dispatch(action)`. Chaque dispatch :
 *  1. produit un nouvel état via le reducer ;
 *  2. émet `state.updated` sur l'EventBus avec previous/new ;
 *  3. notifie les abonnés directs via `subscribe`.
 *
 * L'état est gelé via `Object.freeze` profond — toute mutation extérieure est
 * silencieusement ignorée en mode normal, ou jette en mode strict.
 */
export class Store {
  private state: Readonly<GameState>;
  private readonly listeners = new Set<Listener>();

  constructor(initial: GameState, private readonly bus: EventBus) {
    this.state = deepFreeze(structuredClone(initial));
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  dispatch(action: Action): void {
    const previous = this.state;
    const next = deepFreeze(reducer(structuredClone(this.state) as GameState, action));
    this.state = next;
    this.bus.emit({ type: 'state.updated', payload: { previousState: previous, newState: next } });
    for (const listener of this.listeners) listener(next);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PLAYER_JOINED': {
      const { player } = action.payload;
      return { ...state, players: { ...state.players, [player.id]: { ...player } } };
    }
    case 'PLAYER_LEFT': {
      const next: Record<string, PlayerState> = { ...state.players };
      delete next[action.payload.playerId];
      return { ...state, players: next };
    }
    case 'TURN_STARTED':
      return {
        ...state,
        currentTurn: {
          playerId: action.payload.playerId,
          phase: 'action',
          turnNumber: state.currentTurn.turnNumber + 1,
        },
      };
    case 'TURN_ENDED':
      return {
        ...state,
        currentTurn: { ...state.currentTurn, phase: 'idle' },
      };
    case 'ADVENTURE_STATE_UPDATED':
      return { ...state, adventureState: action.payload.newState };
    case 'STATUS_CHANGED':
      return { ...state, status: action.payload.status };
  }
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as Record<string, unknown>)[key]);
  }
  return Object.freeze(obj);
}
