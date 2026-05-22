import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@pixel-quests/shared';
import type { SocketClient } from '../network/SocketClient';
import { ClientStore } from '../store';
import { BriefingScreen } from './BriefingScreen';

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
      roleId: 'leader',
      capabilities: ['observe', 'persuade'],
      objective: {
        id: 'obj-1',
        description: 'Récupère 3 dossiers compromettants',
        hidden: false,
      },
      dossiers: [{ id: 'd1', kind: 'photo', label: 'cliché compromettant' }],
      pendingPactes: [],
    },
    ...overrides,
  };
}

describe('BriefingScreen', () => {
  let root: HTMLElement;
  let store: ClientStore;
  // Stub minimal de SocketClient — markBriefingReady (jamais throw par
  // défaut) + on() qui mémorise les listeners pour permettre aux tests
  // de fire `private.error` à la demande.
  let mockClient: {
    markBriefingReady: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    _fireError: (msg: string) => void;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    store = new ClientStore();
    let errorListener: ((p: { code: string; message: string }) => void) | null = null;
    mockClient = {
      markBriefingReady: vi.fn(),
      on: vi.fn((type: string, handler: (p: { code: string; message: string }) => void) => {
        if (type === 'private.error') errorListener = handler;
        return () => {
          if (type === 'private.error') errorListener = null;
        };
      }),
      _fireError: (msg: string) => errorListener?.({ code: 'ROOM_STATE_INVALID', message: msg }),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('affiche le placeholder en attente tant que le store est vide', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    expect(root.querySelector('[data-testid="waiting"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="role"]')).toBeNull();
    // Bouton "Prêt" caché tant qu'il n'y a pas de rôle.
    const button = root.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    expect(button?.hidden).toBe(true);
  });

  it('affiche le rôle + objectif + capabilities + dossiers quand le snapshot arrive', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(makePlayerSnapshot());
    expect(root.querySelector('[data-testid="role"]')?.textContent).toBe('leader');
    expect(root.querySelector('[data-testid="objective"]')?.textContent).toContain(
      'Récupère 3 dossiers',
    );
    const caps = root.querySelectorAll('[data-testid="capabilities"] li');
    expect(caps).toHaveLength(2);
    expect(caps[0].textContent).toBe('observe');
    const dossiers = root.querySelectorAll('[data-testid="dossiers"] li');
    expect(dossiers).toHaveLength(1);
    expect(dossiers[0].textContent).toContain('cliché compromettant');
    // Bouton visible.
    const button = root.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    expect(button?.hidden).toBe(false);
  });

  it('affiche le hint "secret" si objective.hidden', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(
      makePlayerSnapshot({
        private: {
          playerId: 'p1',
          roleId: 'spy',
          capabilities: [],
          objective: { id: 'twisted', description: 'Sabotage discret', hidden: true },
          dossiers: [],
          pendingPactes: [],
        },
      }),
    );
    expect(root.querySelector('.briefing__hidden-hint')).toBeTruthy();
  });

  it('bouton "Prêt" : émet briefing.ready + affiche le bloc d’attente + désactive', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(makePlayerSnapshot());
    root.querySelector<HTMLButtonElement>('[data-testid="ready"]')?.click();
    expect(mockClient.markBriefingReady).toHaveBeenCalledOnce();
    const after = root.querySelector<HTMLElement>('[data-testid="after-ready"]');
    expect(after?.hidden).toBe(false);
    const button = root.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    expect(button?.hidden).toBe(true);
  });

  it('double-clic sur "Prêt" : second clic ignoré (idempotent)', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(makePlayerSnapshot());
    const button = root.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    button?.click();
    // Pour le second clic, on force le hidden à false (simule un user
    // qui clique avant que le rendu se mette à jour).
    if (button) button.hidden = false;
    button?.click();
    expect(mockClient.markBriefingReady).toHaveBeenCalledOnce();
  });

  it('destroy retire l’abonnement au store (pas de refresh post-destroy)', () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    screen.destroy();
    // Si le subscribe avait été conservé, on aurait re-render — mais
    // body est resté en mode "waiting".
    store.hydrate(makePlayerSnapshot());
    expect(root.querySelector('[data-testid="role"]')).toBeNull();
    expect(root.querySelector('[data-testid="waiting"]')).toBeTruthy();
  });

  it("affiche les erreurs serveur reçues via private.error (review 3d #1)", () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    store.hydrate(makePlayerSnapshot());
    // Simule un refus serveur (ex: briefing.ready après transition casse).
    mockClient._fireError('La phase de briefing n’est pas en cours.');
    const errorEl = root.querySelector<HTMLElement>('[data-testid="error"]');
    expect(errorEl?.hidden).toBe(false);
    expect(errorEl?.textContent).toMatch(/briefing/i);
  });

  it("destroy retire aussi le listener private.error (pas d'effet sur fire post-destroy)", () => {
    const screen = new BriefingScreen({
      root,
      client: mockClient as unknown as SocketClient,
      store,
    });
    screen.render();
    screen.destroy();
    // Le DOM reste en place, mais le listener private.error est retiré.
    mockClient._fireError('toto');
    const errorEl = root.querySelector<HTMLElement>('[data-testid="error"]');
    // Le bloc d'erreur reste caché — l'event n'a pas été capté.
    expect(errorEl?.hidden).toBe(true);
    expect(errorEl?.textContent ?? '').toBe('');
  });

  it("warn si markBriefingReady throw mais ne crashe pas la UI", () => {
    mockClient.markBriefingReady = vi.fn(() => {
      throw new Error('not connected');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const screen = new BriefingScreen({
        root,
        client: mockClient as unknown as SocketClient,
        store,
      });
      screen.render();
      store.hydrate(makePlayerSnapshot());
      expect(() =>
        root.querySelector<HTMLButtonElement>('[data-testid="ready"]')?.click(),
      ).not.toThrow();
      expect(warnSpy).toHaveBeenCalledOnce();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
