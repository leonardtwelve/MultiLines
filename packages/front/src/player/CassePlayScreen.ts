/**
 * Écran de jeu Player pendant la phase `casse` (slice 3e-3).
 *
 * Affiche, dans l'ordre :
 *   1. Header : numéro de tour + jauge d'alerte
 *   2. Bandeau « À toi de jouer » SI on est le joueur actif, sinon
 *      « En attente de [pseudo] »
 *   3. Si actif : 3 boutons d'action correspondant aux capabilities
 *      du rôle privé (labels FR + niveau de risque)
 *   4. Feedback inline du dernier résultat reçu (action.resolved)
 *
 * S'abonne au ClientStore + écoute `action.resolved` côté SocketClient.
 *
 * **Limite slice 3e-3** : on duplique côté front les libellés/risques
 * des actions Hacker (seules implémentées côté serveur en 3e-2). Quand
 * les 12 autres actions seront livrées (3e-2b), on étendra `ACTION_META`
 * ou on migrera vers un package partagé `@pixel-quests/banque-lune`.
 */

import type { SocketClient } from '../network/SocketClient';
import type { ClientStore } from '../store';

export interface CassePlayScreenProps {
  root: HTMLElement;
  client: SocketClient;
  store: ClientStore;
}

/**
 * Métadonnées des actions par actionId. Source : GAMEPLAY.md §5
 * (synchronisé manuellement avec `packages/server/src/adventures/
 * banque-lune/roles.ts`). À migrer en shared en 3e-2b.
 */
interface ActionMeta {
  label: string;
  risk: 'low' | 'medium' | 'high';
  emblematic?: boolean;
  description: string;
}

const ACTION_META: Readonly<Record<string, ActionMeta>> = {
  // Hacker
  'intrusion-systeme': {
    label: 'Intrusion système',
    risk: 'medium',
    description: 'Désactive une caméra/capteur. Alerte ↓ si succès.',
  },
  'collecte-donnees': {
    label: 'Collecte de données',
    risk: 'low',
    description: 'Récupère des Crédits. Risque faible.',
  },
  'surcharge': {
    label: 'Surcharge',
    risk: 'high',
    emblematic: true,
    description: 'Court-circuite un système majeur. Risque élevé.',
  },
  // Faussaire / Infiltré / Négociateur / Observateur — 3e-2b.
};

interface ResolvedLog {
  actionId: string;
  byPlayerId: string;
  success: boolean;
  at: number;
}

export class CassePlayScreen {
  private rootEl: HTMLElement | null = null;
  private offSubscribe: (() => void) | null = null;
  private offResolved: (() => void) | null = null;
  private offError: (() => void) | null = null;
  /** Dernier résultat reçu (action.resolved). Affiché inline. */
  private lastResolved: ResolvedLog | null = null;
  private lastError: string | null = null;
  /** Anti double-tap : id d'action en cours de submission. */
  private pendingAction: string | null = null;

  constructor(private readonly props: CassePlayScreenProps) {}

  render(): void {
    this.props.root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'casse';
    this.rootEl = wrapper;
    this.props.root.appendChild(wrapper);

    // Listeners.
    this.offSubscribe = this.props.store.subscribe(() => this.refresh());
    this.offResolved = this.props.client.on('action.resolved', (payload) => {
      this.lastResolved = {
        actionId: payload.actionId,
        byPlayerId: payload.byPlayerId,
        success: payload.success,
        at: Date.now(),
      };
      this.pendingAction = null;
      this.refresh();
    });
    this.offError = this.props.client.on('private.error', (err) => {
      this.lastError = err.message;
      this.pendingAction = null;
      this.refresh();
    });

    this.refresh();
  }

  destroy(): void {
    this.offSubscribe?.();
    this.offSubscribe = null;
    this.offResolved?.();
    this.offResolved = null;
    this.offError?.();
    this.offError = null;
  }

  private refresh(): void {
    if (!this.rootEl) return;
    const state = this.props.store.getState();
    if (!state || !state.private) {
      this.rootEl.innerHTML = '<p class="casse__waiting">Synchronisation…</p>';
      return;
    }
    const turn = state.public.turn;
    const alert = state.public.alert ?? 0;
    const isActive = turn?.activePlayerId === state.private.playerId;
    const activePlayerName = turn
      ? state.public.players[turn.activePlayerId]?.name ?? '?'
      : '?';
    const capabilities = state.private.capabilities;

    this.rootEl.innerHTML = `
      <header class="casse__header">
        <div class="casse__turn">
          <span class="casse__turn-label">Tour</span>
          <span class="casse__turn-number" data-testid="turn-number">${turn?.number ?? '—'}</span>
        </div>
        <div class="casse__alert" data-testid="alert">
          <span class="casse__alert-label">Alerte</span>
          <div class="casse__alert-bar">
            <div class="casse__alert-fill" style="width: ${Math.max(0, Math.min(100, alert))}%"></div>
          </div>
          <span class="casse__alert-value">${alert}%</span>
        </div>
      </header>
      ${
        isActive
          ? `
            <div class="casse__active" data-testid="active-banner">
              <span class="casse__active-badge">À toi de jouer</span>
              <p class="casse__active-hint">Choisis une action ci-dessous.</p>
            </div>
            <section class="casse__actions" data-testid="actions">
              ${capabilities
                .map((aid) => this.renderActionButton(aid))
                .join('')}
            </section>
          `
          : `
            <div class="casse__waiting-block" data-testid="waiting">
              <p>⏳ En attente de <strong>${escapeText(activePlayerName)}</strong>…</p>
            </div>
          `
      }
      ${this.renderLastResolved(state.private.playerId, state.public.players)}
      ${this.renderError()}
    `;

    // Bind clicks.
    this.rootEl
      .querySelectorAll<HTMLButtonElement>('[data-action-id]')
      .forEach((btn) => {
        const aid = btn.dataset.actionId;
        if (!aid) return;
        btn.addEventListener('click', () => this.handleActionClick(aid));
      });
  }

  private renderActionButton(actionId: string): string {
    const meta = ACTION_META[actionId];
    const label = meta?.label ?? actionId;
    const risk = meta?.risk ?? 'low';
    const desc = meta?.description ?? '';
    const emblematic = meta?.emblematic ? ' ⭐' : '';
    const pending = this.pendingAction === actionId;
    return `
      <button
        type="button"
        class="casse__action casse__action--${risk}"
        data-action-id="${escapeAttr(actionId)}"
        data-testid="action-${escapeAttr(actionId)}"
        ${pending ? 'disabled' : ''}
      >
        <span class="casse__action-label">${escapeText(label)}${emblematic}</span>
        <span class="casse__action-risk">Risque ${riskLabel(risk)}</span>
        <span class="casse__action-desc">${escapeText(desc)}</span>
      </button>
    `;
  }

  private renderLastResolved(
    myId: string,
    players: Readonly<Record<string, { name: string }>>,
  ): string {
    if (!this.lastResolved) return '';
    const { actionId, byPlayerId, success } = this.lastResolved;
    const isMe = byPlayerId === myId;
    const who = isMe ? 'Toi' : players[byPlayerId]?.name ?? '?';
    const actionLabel = ACTION_META[actionId]?.label ?? actionId;
    const outcome = success ? '✓ succès' : '✗ échec';
    return `
      <div class="casse__resolved" data-testid="resolved" data-success="${success}">
        <strong>${escapeText(who)}</strong> — ${escapeText(actionLabel)} : <em>${outcome}</em>
      </div>
    `;
  }

  private renderError(): string {
    if (!this.lastError) return '';
    return `
      <div class="casse__error" data-testid="error">${escapeText(this.lastError)}</div>
    `;
  }

  private handleActionClick(actionId: string): void {
    // Garde-fou anti double-tap : un seul action.propose à la fois.
    if (this.pendingAction) return;
    this.lastError = null;
    this.pendingAction = actionId;
    try {
      this.props.client.proposeAction(actionId, {});
    } catch (err) {
      this.lastError =
        err instanceof Error
          ? `Impossible d'envoyer : ${err.message}`
          : 'Impossible d’envoyer l’action.';
      this.pendingAction = null;
    }
    this.refresh();
  }
}

// === Helpers ===

function riskLabel(risk: 'low' | 'medium' | 'high'): string {
  return risk === 'low' ? 'faible' : risk === 'medium' ? 'moyen' : 'élevé';
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
