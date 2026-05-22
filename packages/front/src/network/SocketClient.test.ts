import { describe, expect, it, vi } from 'vitest';
import { SocketClient } from './SocketClient';

/**
 * Tests unitaires SocketClient. La connexion réelle socket.io n'est pas
 * exercée ici (ce serait un test d'intégration nécessitant un serveur —
 * cf. packages/server/src/handlers/handlers.test.ts pour ça).
 *
 * On valide uniquement le comportement local :
 * - Les listeners attachés AVANT `connect()` ne crashent plus
 *   (régression post-3d : `wireStore(client, store)` au boot du Player
 *   donnait un écran noir parce que `on()` throwait).
 * - Le désabonnement fonctionne aussi bien avant qu'après `connect`.
 */
describe('SocketClient — listeners avant connect (hotfix post-3d)', () => {
  it("on() ne throw PAS si appelé avant connect()", () => {
    const client = new SocketClient({ url: 'http://localhost:9999', reconnection: false });
    // Avant le hotfix : throwait `SocketClient: non connecté`.
    expect(() => client.on('state.snapshot', () => {})).not.toThrow();
  });

  it('on() renvoie un désabonnement même avant connect()', () => {
    const client = new SocketClient({ url: 'http://localhost:9999', reconnection: false });
    const off = client.on('state.patch', () => {});
    expect(typeof off).toBe('function');
    // Le désabonnement ne crash pas non plus.
    expect(() => off()).not.toThrow();
  });

  it("peut empiler plusieurs listeners en pending, tous sans throw", () => {
    const client = new SocketClient({ url: 'http://localhost:9999', reconnection: false });
    const handlers = [
      client.on('state.snapshot', vi.fn()),
      client.on('state.patch', vi.fn()),
      client.on('player.joined', vi.fn()),
      client.on('private.error', vi.fn()),
    ];
    expect(handlers).toHaveLength(4);
    expect(handlers.every((h) => typeof h === 'function')).toBe(true);
    // Désabonnement de tous les pending — pas de crash.
    for (const off of handlers) off();
  });

  it("requestResync throw toujours si pas connecté (sémantique préservée)", () => {
    const client = new SocketClient({ url: 'http://localhost:9999', reconnection: false });
    expect(() => client.requestResync()).toThrow();
  });

  it('status démarre à "idle" sans connect', () => {
    const client = new SocketClient({ url: 'http://localhost:9999', reconnection: false });
    expect(client.status).toBe('idle');
    expect(client.socketId).toBeNull();
  });
});
