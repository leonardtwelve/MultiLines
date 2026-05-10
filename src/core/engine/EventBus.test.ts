import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus (typed over GameEvent)', () => {
  it('appelle le handler abonné quand un event est émis', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('player.joined', handler);

    bus.emit({ type: 'player.joined', payload: { playerId: 'p1', name: 'Léa' } });

    expect(handler).toHaveBeenCalledWith({ playerId: 'p1', name: 'Léa' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('plusieurs handlers reçoivent le même event', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('turn.started', a);
    bus.on('turn.started', b);

    bus.emit({ type: 'turn.started', payload: { playerId: 'p1', turnNumber: 1 } });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off() arrête de notifier le handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('turn.ended', handler);
    bus.off('turn.ended', handler);

    bus.emit({ type: 'turn.ended', payload: { playerId: 'p1' } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('le retour de on() permet de se désabonner', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.on('turn.ended', handler);

    unsubscribe();
    bus.emit({ type: 'turn.ended', payload: { playerId: 'p1' } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('clear() supprime tous les abonnements', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('player.joined', a);
    bus.on('turn.ended', b);

    bus.clear();
    bus.emit({ type: 'player.joined', payload: { playerId: 'p1', name: 'X' } });
    bus.emit({ type: 'turn.ended', payload: { playerId: 'p1' } });

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('garde-fou de typage : un payload mal formé est rejeté à la compilation', () => {
    const bus = new EventBus();
    // @ts-expect-error : 'name' est requis dans payload de player.joined
    bus.emit({ type: 'player.joined', payload: { playerId: 'p1' } });
    // @ts-expect-error : type d'event inconnu
    bus.emit({ type: 'unknown.event', payload: {} });
    // L'assertion runtime ne vérifie rien — c'est le compilateur TS qui valide.
    expect(true).toBe(true);
  });
});
