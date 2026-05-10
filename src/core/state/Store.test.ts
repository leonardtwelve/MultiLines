import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../engine/EventBus';
import { Store } from './Store';
import { createInitialState, type GameState } from './GameState';

const makePlayer = (id: string, name = id) => ({
  id,
  name,
  color: '#ffffff',
  isActive: false,
});

describe('Store', () => {
  it('PLAYER_JOINED ajoute le joueur dans state.players', () => {
    const store = new Store(createInitialState(), new EventBus());
    store.dispatch({ type: 'PLAYER_JOINED', payload: { player: makePlayer('p1', 'Léa') } });
    expect(store.getState().players['p1']?.name).toBe('Léa');
  });

  it('TURN_STARTED met à jour currentTurn et incrémente turnNumber', () => {
    const store = new Store(createInitialState(), new EventBus());
    store.dispatch({ type: 'TURN_STARTED', payload: { playerId: 'p1' } });
    expect(store.getState().currentTurn).toEqual({ playerId: 'p1', phase: 'action', turnNumber: 1 });
    store.dispatch({ type: 'TURN_STARTED', payload: { playerId: 'p2' } });
    expect(store.getState().currentTurn.turnNumber).toBe(2);
  });

  it('TURN_ENDED remet la phase à idle sans toucher au playerId', () => {
    const store = new Store(createInitialState(), new EventBus());
    store.dispatch({ type: 'TURN_STARTED', payload: { playerId: 'p1' } });
    store.dispatch({ type: 'TURN_ENDED', payload: {} });
    expect(store.getState().currentTurn.phase).toBe('idle');
    expect(store.getState().currentTurn.playerId).toBe('p1');
  });

  it("chaque dispatch émet 'state.updated' sur le bus", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('state.updated', handler);
    const store = new Store(createInitialState(), bus);
    store.dispatch({ type: 'STATUS_CHANGED', payload: { status: 'playing' } });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0].newState.status).toBe('playing');
  });

  it("getState() retourne un état gelé (mutation directe ignorée en strict)", () => {
    const store = new Store(createInitialState(), new EventBus());
    const state = store.getState() as GameState;
    expect(() => {
      state.status = 'ended';
    }).toThrow();
  });

  it('subscribe/unsubscribe notifie puis arrête', () => {
    const store = new Store(createInitialState(), new EventBus());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'STATUS_CHANGED', payload: { status: 'playing' } });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.dispatch({ type: 'STATUS_CHANGED', payload: { status: 'ended' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('PLAYER_LEFT retire le joueur', () => {
    const store = new Store(createInitialState(), new EventBus());
    store.dispatch({ type: 'PLAYER_JOINED', payload: { player: makePlayer('p1') } });
    store.dispatch({ type: 'PLAYER_LEFT', payload: { playerId: 'p1' } });
    expect(store.getState().players['p1']).toBeUndefined();
  });
});
