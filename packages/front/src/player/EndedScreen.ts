/**
 * Écran de fin de partie côté Player (slice 3e-3b).
 *
 * Affiché quand le serveur transitionne en `extraction` / `vote` /
 * `reveal` / `ended` (slice 3e-3 ne câble que `extraction` + `ended` —
 * le vote/reveal arrivent en 3e-4 avec un écran dédié).
 *
 * Affiche :
 *   1. Header avec un emoji + titre adapté au `endReason`
 *   2. Détail des crédits finaux du joueur
 *   3. Bouton « Rejouer » qui recharge la page (retour JoinScreen)
 *
 * Le `endReason` est reçu via l'event `game.ended` que le caller
 * (`main.ts`) intercepte et passe à `render(reason)`. Sinon, on
 * affiche un message générique de fin.
 */

import type { GameEndReason } from '@pixel-quests/shared';
import type { ClientStore } from '../store';

export interface EndedScreenProps {
  root: HTMLElement;
  store: ClientStore;
}

interface ReasonMeta {
  emoji: string;
  title: string;
  subtitle: string;
}

const REASON_META: Readonly<Record<GameEndReason | 'unknown', ReasonMeta>> = {
  'failure-alert': {
    emoji: '🚨',
    title: 'Échec — alarme déclenchée',
    subtitle: "L'alerte a tout fait sauter. Les gardes arrivent.",
  },
  'success-early': {
    emoji: '🎉',
    title: 'Succès — extraction réussie',
    subtitle: 'Mission accomplie avant la fin du timer.',
  },
  'turn-limit': {
    emoji: '⏱',
    title: 'Fin du timer',
    subtitle: 'La partie a été évaluée sur la situation finale.',
  },
  'host-timeout': {
    emoji: '⚠️',
    title: "L'organisateur a quitté",
    subtitle: 'La partie a été interrompue.',
  },
  'massive-disconnect': {
    emoji: '⚠️',
    title: 'Trop de déconnexions',
    subtitle: 'La partie a été annulée.',
  },
  'host-cancel': {
    emoji: '🛑',
    title: "L'organisateur a annulé",
    subtitle: 'La partie a été interrompue.',
  },
  unknown: {
    emoji: '🏁',
    title: 'Partie terminée',
    subtitle: '',
  },
};

export class EndedScreen {
  private rootEl: HTMLElement | null = null;
  private offSubscribe: (() => void) | null = null;
  private currentReason: GameEndReason | null = null;

  constructor(private readonly props: EndedScreenProps) {}

  /**
   * Monte l'écran. `reason` est passé explicitement par le caller
   * parce que `game.ended` arrive en parallèle du `state.patch` qui
   * change le status — la transition d'écran lit le status, le caller
   * captue le reason séparément.
   */
  render(reason: GameEndReason | null = null): void {
    this.currentReason = reason;
    this.props.root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ended';
    this.rootEl = wrapper;
    this.props.root.appendChild(wrapper);

    this.offSubscribe = this.props.store.subscribe(() => this.refresh());
    this.refresh();
  }

  destroy(): void {
    this.offSubscribe?.();
    this.offSubscribe = null;
  }

  /** Permet au caller de mettre à jour le reason (si game.ended arrive
   *  juste après render). */
  setReason(reason: GameEndReason): void {
    this.currentReason = reason;
    this.refresh();
  }

  private refresh(): void {
    if (!this.rootEl) return;
    const state = this.props.store.getState();
    const meta = REASON_META[this.currentReason ?? 'unknown'];
    const myCredits = state?.private
      ? state.public.players[state.private.playerId]?.credits ?? 0
      : 0;

    this.rootEl.innerHTML = `
      <div class="ended__card">
        <div class="ended__emoji" aria-hidden="true">${meta.emoji}</div>
        <h1 class="ended__title" data-testid="ended-title">${escapeText(meta.title)}</h1>
        ${
          meta.subtitle
            ? `<p class="ended__subtitle" data-testid="ended-subtitle">${escapeText(meta.subtitle)}</p>`
            : ''
        }
        ${
          state?.private
            ? `<div class="ended__stats">
                 <div class="ended__stat">
                   <span class="ended__stat-label">Tes Crédits finaux</span>
                   <span class="ended__stat-value" data-testid="ended-credits">${myCredits}</span>
                 </div>
               </div>`
            : ''
        }
        <button type="button" class="ended__replay" data-testid="ended-replay">
          🔄 Rejouer
        </button>
      </div>
    `;

    const replayBtn = this.rootEl.querySelector<HTMLButtonElement>(
      '[data-testid="ended-replay"]',
    );
    replayBtn?.addEventListener('click', () => {
      // Recharge la page → retour au JoinScreen vierge.
      window.location.reload();
    });
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
