import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@pixel-quests/shared';
import { ClientStore, MAX_QUEUED_PATCHES } from './ClientStore';

function makePlayerSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    version: 0,
    audience: 'player',
    public: {
      roomId: 'r1',
      status: 'briefing',
      adventureId: 'banque-lune',
      players: {
        p1: { id: 'p1', name: 'Léa', color: '#ffcc66', connected: true },
      },
    },
    private: {
      playerId: 'p1',
      roleId: 'agent',
      capabilities: [],
      objective: { id: 'obj-1', description: 'Sois efficace', hidden: false },
      dossiers: [],
      pendingPactes: [],
    },
    ...overrides,
  };
}

function makeHostSnapshot(): Snapshot {
  return {
    version: 0,
    audience: 'host',
    public: {
      roomId: 'r1',
      status: 'briefing',
      adventureId: 'banque-lune',
      players: {},
    },
    hostMeta: {},
  };
}

describe('ClientStore — hydrate', () => {
  it('passe state de null à hydraté + emit aux listeners', () => {
    const store = new ClientStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.getState()).toBeNull();
    const r = store.hydrate(makePlayerSnapshot());
    expect(r.ok).toBe(true);
    expect(store.getState()?.public.adventureId).toBe('banque-lune');
    expect(store.getState()?.private?.roleId).toBe('agent');
    expect(store.version).toBe(0);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('hydratation Host : pas de private, mais hostMeta', () => {
    const store = new ClientStore();
    store.hydrate(makeHostSnapshot());
    expect(store.getState()?.private).toBeUndefined();
    expect(store.getState()?.hostMeta).toEqual({});
  });

  it('hydratation remplace tout l’état précédent (pas de réconciliation)', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    store.applyPatchBatch({
      version: 1,
      patches: [{ op: 'replace', path: '/players/p1/connected', value: false }],
    });
    expect(store.getState()?.public.players['p1']?.connected).toBe(false);
    // Nouveau snapshot avec version 5 → adopte tel quel
    store.hydrate({ ...makePlayerSnapshot(), version: 5 });
    expect(store.version).toBe(5);
    expect(store.getState()?.public.players['p1']?.connected).toBe(true);
  });
});

describe('ClientStore — applyPatchBatch versioning', () => {
  it('applique un patch contigu (version N+1)', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const r = store.applyPatchBatch({
      version: 1,
      patches: [{ op: 'replace', path: '/status', value: 'casse' }],
    });
    expect(r.ok).toBe(true);
    expect(store.getState()?.public.status).toBe('casse');
    expect(store.version).toBe(1);
  });

  it('ignore silencieusement un batch doublon (version <= currentVersion)', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const listener = vi.fn();
    store.subscribe(listener);
    const r = store.applyPatchBatch({
      version: 0,
      patches: [{ op: 'replace', path: '/status', value: 'X' }],
    });
    expect(r.ok).toBe(true);
    expect(r.needsResync).toBeUndefined();
    // L'état n'a pas bougé, le listener n'est pas appelé.
    expect(store.getState()?.public.status).toBe('briefing');
    expect(listener).not.toHaveBeenCalled();
  });

  it('détecte un gap (version > currentVersion + 1) → needsResync', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const r = store.applyPatchBatch({
      version: 5,
      patches: [{ op: 'replace', path: '/status', value: 'casse' }],
    });
    expect(r.ok).toBe(false);
    expect(r.needsResync).toBe(true);
    // L'état n'a pas bougé.
    expect(store.getState()?.public.status).toBe('briefing');
    expect(store.version).toBe(0);
  });

  it('batch vide bumpe la version SANS re-emit (review 3c-4 #8)', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const listener = vi.fn();
    store.subscribe(listener);
    const r = store.applyPatchBatch({ version: 1, patches: [] });
    expect(r.ok).toBe(true);
    expect(store.version).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('un patch défaillant déclenche un resync sans muter l’état', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const r = store.applyPatchBatch({
      version: 1,
      patches: [{ op: 'remove', path: '/players/inconnue' }],
    });
    expect(r.ok).toBe(false);
    expect(r.needsResync).toBe(true);
    expect(store.version).toBe(0);
  });
});

describe('ClientStore — race condition snapshot/patch', () => {
  it("file d'attente : patches reçus avant le snapshot sont drainés à hydrate", () => {
    const store = new ClientStore();
    // Patch arrive AVANT le snapshot — mis en file.
    const r1 = store.applyPatchBatch({
      version: 1,
      patches: [{ op: 'replace', path: '/status', value: 'casse' }],
    });
    expect(r1.ok).toBe(true);
    expect(store.getState()).toBeNull(); // pas encore hydraté
    // Maintenant on hydrate → la file se draine.
    store.hydrate(makePlayerSnapshot());
    expect(store.getState()?.public.status).toBe('casse');
    expect(store.version).toBe(1);
  });

  it('file dépasse MAX_QUEUED_PATCHES → resync forcé', () => {
    const store = new ClientStore();
    for (let i = 0; i < MAX_QUEUED_PATCHES; i++) {
      store.applyPatchBatch({ version: i + 1, patches: [] });
    }
    const r = store.applyPatchBatch({ version: 999, patches: [] });
    expect(r.ok).toBe(false);
    expect(r.needsResync).toBe(true);
  });
});

describe('ClientStore — routing public/private', () => {
  it('route les patches /private/* vers state.private', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const r = store.applyPatchBatch({
      version: 1,
      patches: [{ op: 'replace', path: '/private/roleId', value: 'leader' }],
    });
    expect(r.ok).toBe(true);
    expect(store.getState()?.private?.roleId).toBe('leader');
    // Le state public n'a pas bougé.
    expect(store.getState()?.public.players['p1']?.name).toBe('Léa');
  });

  it('mélange patches publics + privés dans le même batch', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const r = store.applyPatchBatch({
      version: 1,
      patches: [
        { op: 'replace', path: '/status', value: 'casse' },
        { op: 'add', path: '/private/dossiers/-', value: { id: 'd1', kind: 'photo', label: 'preuve' } },
      ],
    });
    expect(r.ok).toBe(true);
    expect(store.getState()?.public.status).toBe('casse');
    expect(store.getState()?.private?.dossiers).toHaveLength(1);
  });
});

describe('ClientStore — immutabilité', () => {
  it('le state retourné est gelé (Object.isFrozen === true)', () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const state = store.getState();
    expect(state).not.toBeNull();
    if (!state) return;
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.public)).toBe(true);
    expect(Object.isFrozen(state.public.players)).toBe(true);
    expect(Object.isFrozen(state.private)).toBe(true);
  });

  it("toute tentative de mutation directe en strict mode throw", () => {
    const store = new ClientStore();
    store.hydrate(makePlayerSnapshot());
    const state = store.getState();
    if (!state) throw new Error('state attendu');
    // Note : `Readonly<T>` est shallow côté TS, donc la mutation est
    // permise à la compilation. Le test valide uniquement la garantie
    // **runtime** offerte par `Object.freeze` récursif (cf. ClientStore
    // `freezeDeep`).
    expect(() => {
      (state.public as { adventureId: string }).adventureId = 'autre';
    }).toThrow();
  });
});

describe('ClientStore — subscribe / unsubscribe', () => {
  it('unsubscribe retire bien le listener', () => {
    const store = new ClientStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.hydrate(makePlayerSnapshot());
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.applyPatchBatch({ version: 1, patches: [] });
    // toujours 1 — le listener n'écoute plus
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ClientStore — reset', () => {
  it('reset remet le store à l’état initial sans toucher aux listeners', () => {
    const store = new ClientStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.hydrate(makePlayerSnapshot());
    store.reset();
    expect(store.getState()).toBeNull();
    expect(store.version).toBe(0);
    // Le listener est toujours là.
    store.hydrate(makePlayerSnapshot());
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
