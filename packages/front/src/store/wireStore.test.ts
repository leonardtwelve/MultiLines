import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@pixel-quests/shared';
import type { SocketClient } from '../network/SocketClient';
import { SocketClientStub } from '../network/SocketClient.stub';
import { ClientStore } from './ClientStore';
import { wireStore } from './wireStore';

function makeSnapshot(version = 0): Snapshot {
  return {
    version,
    audience: 'player',
    public: {
      roomId: 'r1',
      status: 'briefing',
      adventureId: 'banque-lune',
      players: {},
    },
    private: {
      playerId: 'p1',
      roleId: 'agent',
      capabilities: [],
      objective: { id: 'o1', description: 'X', hidden: false },
      dossiers: [],
      pendingPactes: [],
    },
  };
}

describe('wireStore', () => {
  it("hydrate le store à la réception de state.snapshot", () => {
    const stub = new SocketClientStub();
    const store = new ClientStore();
    wireStore(stub as unknown as SocketClient, store);
    stub.fireServerEvent('state.snapshot', makeSnapshot(3));
    expect(store.getState()?.public.adventureId).toBe('banque-lune');
    expect(store.version).toBe(3);
  });

  it('applique un state.patch reçu après le snapshot', () => {
    const stub = new SocketClientStub();
    const store = new ClientStore();
    wireStore(stub as unknown as SocketClient, store);
    stub.fireServerEvent('state.snapshot', makeSnapshot(0));
    stub.fireServerEvent('state.patch', {
      version: 1,
      patches: [{ op: 'replace', path: '/status', value: 'casse' }],
    });
    expect(store.getState()?.public.status).toBe('casse');
    expect(store.version).toBe(1);
  });

  it('déclenche requestResync en cas de gap de version', () => {
    const stub = new SocketClientStub();
    const requestResyncSpy = vi.fn();
    // On greffe une méthode requestResync sur le stub (qui ne l'a pas).
    const wrappedClient = {
      ...(stub as object),
      on: stub.on.bind(stub),
      requestResync: requestResyncSpy,
    } as unknown as SocketClient;
    const store = new ClientStore();
    let resyncFired = false;
    wireStore(wrappedClient, store, { onResyncRequested: () => (resyncFired = true) });
    stub.fireServerEvent('state.snapshot', makeSnapshot(0));
    // Gap : on saute à la version 5 sans passer par 1..4.
    stub.fireServerEvent('state.patch', {
      version: 5,
      patches: [{ op: 'replace', path: '/status', value: 'casse' }],
    });
    expect(requestResyncSpy).toHaveBeenCalledOnce();
    expect(resyncFired).toBe(true);
    // Le state n'a pas bougé — on attend le nouveau snapshot.
    expect(store.getState()?.public.status).toBe('briefing');
  });

  it('le désabonnement retire les listeners', () => {
    const stub = new SocketClientStub();
    const store = new ClientStore();
    const off = wireStore(stub as unknown as SocketClient, store);
    off();
    stub.fireServerEvent('state.snapshot', makeSnapshot());
    // Le snapshot n'a pas été appliqué — listeners retirés.
    expect(store.getState()).toBeNull();
  });

  it('ne crashe pas si requestResync throw (socket déconnecté)', () => {
    const stub = new SocketClientStub();
    const wrappedClient = {
      ...(stub as object),
      on: stub.on.bind(stub),
      requestResync: () => {
        throw new Error('not connected');
      },
    } as unknown as SocketClient;
    const store = new ClientStore();
    const onResync = vi.fn();
    wireStore(wrappedClient, store, { onResyncRequested: onResync });
    stub.fireServerEvent('state.snapshot', makeSnapshot(0));
    expect(() =>
      stub.fireServerEvent('state.patch', {
        version: 99,
        patches: [],
      }),
    ).not.toThrow();
    // Le throw est swallow ; le callback de notification N'est PAS appelé.
    expect(onResync).not.toHaveBeenCalled();
  });
});
