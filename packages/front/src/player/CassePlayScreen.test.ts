import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@pixel-quests/shared';
import type { SocketClient } from '../network/SocketClient';
import { ClientStore } from '../store';
import { CassePlayScreen } from './CassePlayScreen';

/** Stub SocketClient minimal — `on` mémorise les listeners pour pouvoir
 *  fire des events depuis les tests, `proposeAction` est un vi.fn. */
function makeMockClient() {
  const listeners = new Map<
    string,
    Set<(payload: { actionId?: string; byPlayerId?: string; success?: boolean; code?: string; message?: string }) => void>
  >();
  const proposeAction = vi.fn();
  const on = vi.fn(
    (
      type: string,
      handler: (payload: { actionId?: string; byPlayerId?: string; success?: boolean; code?: string; message?: string }) => void,
    ) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(handler);
      return () => set?.delete(handler);
    },
  );
  return {
    proposeAction,
    on,
    fire(
      type: string,
      payload: { actionId?: string; byPlayerId?: string; success?: boolean; code?: string; message?: string },
    ) {
      listeners.get(type)?.forEach((h) => h(payload));
    },
  };
}

function snapshotInCasse(opts: { activePlayerId?: string; alert?: number; turnNumber?: number } = {}): Snapshot {
  return {
    version: 0,
    audience: 'player',
    public: {
      roomId: 'r1',
      status: 'casse',
      adventureId: 'banque-lune',
      alert: opts.alert ?? 30,
      players: {
        p1: { id: 'p1', name: 'Léa', color: '#3affc7', connected: true, credits: 5 },
        p2: { id: 'p2', name: 'Sami', color: '#ffc83a', connected: true, credits: 3 },
      },
      turn: { number: opts.turnNumber ?? 2, activePlayerId: opts.activePlayerId ?? 'p1' },
    },
    private: {
      playerId: 'p1',
      roleId: 'hacker',
      capabilities: ['intrusion-systeme', 'collecte-donnees', 'surcharge'],
      objective: { id: 'H1', description: 'X', hidden: false },
      dossiers: [],
      pendingPactes: [],
    },
  };
}

describe('CassePlayScreen', () => {
  let root: HTMLElement;
  let store: ClientStore;
  let mockClient: ReturnType<typeof makeMockClient>;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    store = new ClientStore();
    mockClient = makeMockClient();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("affiche le placeholder de synchro tant que le store est vide", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    expect(root.querySelector('.casse__waiting')).toBeTruthy();
  });

  it("rend le header (tour + alerte) + les 3 actions du Hacker quand actif", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1', turnNumber: 2, alert: 40 }));
    expect(root.querySelector('[data-testid="turn-number"]')?.textContent).toBe('2');
    expect(root.querySelector('[data-testid="alert"]')?.textContent).toContain('40');
    expect(root.querySelector('[data-testid="active-banner"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="action-intrusion-systeme"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="action-collecte-donnees"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="action-surcharge"]')).toBeTruthy();
  });

  it("affiche le bloc d'attente si pas actif (active = un autre joueur)", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p2' }));
    expect(root.querySelector('[data-testid="waiting"]')?.textContent).toMatch(/Sami/i);
    expect(root.querySelector('[data-testid="actions"]')).toBeNull();
  });

  it("clic sur une action appelle client.proposeAction + désactive le bouton anti double-tap", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1' }));
    const btn = root.querySelector<HTMLButtonElement>(
      '[data-testid="action-collecte-donnees"]',
    );
    btn?.click();
    expect(mockClient.proposeAction).toHaveBeenCalledWith('collecte-donnees', {});
    // Re-render automatique : le bouton est disabled
    const btnAfter = root.querySelector<HTMLButtonElement>(
      '[data-testid="action-collecte-donnees"]',
    );
    expect(btnAfter?.disabled).toBe(true);
  });

  it("double clic rapide : un seul proposeAction émis", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1' }));
    root.querySelector<HTMLButtonElement>('[data-testid="action-collecte-donnees"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-testid="action-collecte-donnees"]')?.click();
    expect(mockClient.proposeAction).toHaveBeenCalledOnce();
  });

  it("action.resolved arrive → bandeau de résultat avec ✓ succès", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1' }));
    mockClient.fire('action.resolved', {
      actionId: 'collecte-donnees',
      byPlayerId: 'p1',
      success: true,
    });
    const block = root.querySelector('[data-testid="resolved"]');
    expect(block).toBeTruthy();
    expect(block?.getAttribute('data-success')).toBe('true');
    expect(block?.textContent).toContain('succès');
    expect(block?.textContent).toContain('Toi');
  });

  it("action.resolved du Faussaire (autre joueur) : affiche son pseudo + résultat", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p2' }));
    mockClient.fire('action.resolved', {
      actionId: 'intrusion-systeme',
      byPlayerId: 'p2',
      success: false,
    });
    const block = root.querySelector('[data-testid="resolved"]');
    expect(block?.getAttribute('data-success')).toBe('false');
    expect(block?.textContent).toContain('Sami');
    expect(block?.textContent).toContain('échec');
  });

  it("private.error : affiche le bloc d'erreur + libère le bouton pour retenter", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1' }));
    root.querySelector<HTMLButtonElement>('[data-testid="action-collecte-donnees"]')?.click();
    mockClient.fire('private.error', {
      code: 'NOT_YOUR_TURN',
      message: "Ce n'est pas ton tour.",
    });
    expect(root.querySelector('[data-testid="error"]')?.textContent).toMatch(/tour/i);
    // Le bouton redevient cliquable.
    const btn = root.querySelector<HTMLButtonElement>(
      '[data-testid="action-collecte-donnees"]',
    );
    expect(btn?.disabled).toBe(false);
  });

  it("destroy retire les 3 listeners (subscribe + action.resolved + private.error)", () => {
    const screen = new CassePlayScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(snapshotInCasse({ activePlayerId: 'p1' }));
    screen.destroy();
    // Après destroy, fire action.resolved : le DOM est resté en l'état
    // mais aucun re-render n'a lieu (pas de bloc résultat ajouté).
    expect(root.querySelector('[data-testid="resolved"]')).toBeNull();
    mockClient.fire('action.resolved', {
      actionId: 'collecte-donnees',
      byPlayerId: 'p1',
      success: true,
    });
    expect(root.querySelector('[data-testid="resolved"]')).toBeNull();
  });
});
