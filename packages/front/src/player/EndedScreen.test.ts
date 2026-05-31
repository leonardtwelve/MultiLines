import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '@pixel-quests/shared';
import { ClientStore } from '../store';
import { EndedScreen } from './EndedScreen';

function snapshotEnded(): Snapshot {
  return {
    version: 5,
    audience: 'player',
    public: {
      roomId: 'r1',
      status: 'extraction',
      adventureId: 'banque-lune',
      alert: 100,
      players: {
        p1: { id: 'p1', name: 'Léa', color: '#3affc7', connected: true, credits: 7 },
      },
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

describe('EndedScreen', () => {
  let root: HTMLElement;
  let store: ClientStore;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    store = new ClientStore();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("affiche le titre 'Partie terminée' générique sans reason", () => {
    const screen = new EndedScreen({ root, store });
    screen.render();
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toBe(
      'Partie terminée',
    );
  });

  it("failure-alert : emoji 🚨 + titre 'alarme déclenchée'", () => {
    const screen = new EndedScreen({ root, store });
    screen.render('failure-alert');
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toMatch(
      /alarme/i,
    );
    expect(root.querySelector('.ended__emoji')?.textContent).toBe('🚨');
  });

  it("success-early : emoji 🎉 + titre 'extraction réussie'", () => {
    const screen = new EndedScreen({ root, store });
    screen.render('success-early');
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toMatch(
      /extraction r/i,
    );
    expect(root.querySelector('.ended__emoji')?.textContent).toBe('🎉');
  });

  it("turn-limit : emoji ⏱ + titre 'Fin du timer'", () => {
    const screen = new EndedScreen({ root, store });
    screen.render('turn-limit');
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toMatch(
      /timer/i,
    );
  });

  it("affiche les crédits finaux du joueur (depuis le store)", () => {
    const screen = new EndedScreen({ root, store });
    screen.render('turn-limit');
    store.hydrate(snapshotEnded());
    expect(root.querySelector('[data-testid="ended-credits"]')?.textContent).toBe('7');
  });

  it("setReason met à jour l'affichage après render initial", () => {
    const screen = new EndedScreen({ root, store });
    screen.render(null);
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toBe(
      'Partie terminée',
    );
    screen.setReason('failure-alert');
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toMatch(
      /alarme/i,
    );
  });

  it("clic 'Rejouer' recharge la page", () => {
    // jsdom interdit de redéfinir location.reload — on remplace
    // l'objet location en entier via `delete` + Object.defineProperty.
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    // @ts-expect-error : delete sur location interdit en strict mais
    // toléré par jsdom en test.
    delete window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
    try {
      const screen = new EndedScreen({ root, store });
      screen.render('failure-alert');
      root.querySelector<HTMLButtonElement>('[data-testid="ended-replay"]')?.click();
      expect(reloadSpy).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    }
  });

  it("destroy retire l'abonnement au store", () => {
    const screen = new EndedScreen({ root, store });
    screen.render('failure-alert');
    screen.destroy();
    // Le DOM reste tel quel (pas de re-render automatique).
    store.hydrate(snapshotEnded());
    // Pas de crash, et le titre n'a pas changé suite à l'hydrate.
    expect(root.querySelector('[data-testid="ended-title"]')?.textContent).toMatch(
      /alarme/i,
    );
  });
});
