import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/engine/EventBus';

type TestEvents = {
  'player:joined': { playerId: string };
  'turn:ended': { round: number };
};

describe('EventBus', () => {
  it("appelle le handler abonné quand l'événement est émis", () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('player:joined', handler);

    bus.emit('player:joined', { playerId: 'p1' });

    expect(handler).toHaveBeenCalledWith({ playerId: 'p1' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('arrête de notifier après off()', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('turn:ended', handler);

    bus.off('turn:ended', handler);
    bus.emit('turn:ended', { round: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('le retour de on() permet de se désabonner', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = bus.on('turn:ended', handler);

    unsubscribe();
    bus.emit('turn:ended', { round: 2 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('clear() supprime tous les abonnements', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('player:joined', a);
    bus.on('turn:ended', b);

    bus.clear();
    bus.emit('player:joined', { playerId: 'p2' });
    bus.emit('turn:ended', { round: 5 });

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
