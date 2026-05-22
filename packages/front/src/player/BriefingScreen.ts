/**
 * Écran briefing Player (slice 3d).
 *
 * Après `room.join`, le Player attend que le Host lance la partie.
 * Quand `state.snapshot` arrive, le store contient le rôle + l'objectif
 * privés. Cet écran s'abonne au store et affiche :
 * - Le rôle attribué (texte + capabilities)
 * - L'objectif privé (description + flag hidden)
 * - Les dossiers initiaux (si applicable)
 * - Un bouton « Je suis prêt » qui émet `briefing.ready`
 *
 * Une fois clic « Prêt » :
 * - Le bouton est désactivé (idempotent)
 * - On affiche un message d'attente « En attente des autres joueurs… »
 *   (le serveur transitionnera en `casse` quand tous auront cliqué)
 *
 * UI volontairement minimaliste : c'est un MVP de validation du flux —
 * le polish viendra avec la slice 3e (vraies actions de rôle).
 */

import type { SocketClient } from '../network/SocketClient';
import type { ClientStore } from '../store';

export interface BriefingScreenProps {
  root: HTMLElement;
  client: SocketClient;
  store: ClientStore;
}

export class BriefingScreen {
  private offSubscribe: (() => void) | null = null;
  private offError: (() => void) | null = null;
  private ready = false;
  private rootEl: HTMLElement | null = null;

  constructor(private readonly props: BriefingScreenProps) {}

  render(): void {
    this.props.root.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'briefing';
    wrapper.innerHTML = `
      <header class="briefing__header">
        <h1 class="briefing__title">Briefing</h1>
        <p class="briefing__hint">Lis ton rôle et clique « Prêt » quand tu es lancé·e.</p>
      </header>
      <section class="briefing__body" data-testid="body">
        <p class="briefing__waiting" data-testid="waiting">
          En attente du démarrage par l'organisateur…
        </p>
      </section>
      <p class="briefing__error" data-testid="error" hidden></p>
      <button type="button" class="briefing__ready" data-testid="ready" hidden>
        Je suis prêt·e
      </button>
      <p class="briefing__after-ready" data-testid="after-ready" hidden>
        ⏳ En attente des autres joueurs…
      </p>
    `;
    this.props.root.appendChild(wrapper);
    this.rootEl = wrapper;
    const button = wrapper.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    button?.addEventListener('click', () => this.handleReady());

    this.offSubscribe = this.props.store.subscribe(() => this.refresh());
    // Erreurs serveur (ex: briefing.ready rejeté car déjà en casse) —
    // sinon le clic « Prêt » est silencieux en cas de refus (review 3d #1).
    this.offError = this.props.client.on('private.error', (err) =>
      this.showError(err.message),
    );
    // Si le store est déjà peuplé au moment de render (hydrate précoce).
    this.refresh();
  }

  destroy(): void {
    this.offSubscribe?.();
    this.offSubscribe = null;
    this.offError?.();
    this.offError = null;
  }

  private showError(message: string): void {
    const el = this.rootEl?.querySelector<HTMLElement>('[data-testid="error"]');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  private refresh(): void {
    const state = this.props.store.getState();
    if (!state || !state.private || !this.rootEl) return;

    const body = this.rootEl.querySelector<HTMLElement>('[data-testid="body"]');
    const button = this.rootEl.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    if (!body || !button) return;

    // Première peuplée : on remplace le placeholder par les détails du rôle.
    if (!body.dataset.populated) {
      body.dataset.populated = 'true';
      const priv = state.private;
      body.innerHTML = `
        <div class="briefing__role">
          <div class="briefing__label">Ton rôle</div>
          <div class="briefing__value" data-testid="role">${escapeText(priv.roleId)}</div>
        </div>
        <div class="briefing__objective">
          <div class="briefing__label">Ton objectif privé</div>
          <div class="briefing__value" data-testid="objective">
            ${escapeText(priv.objective.description)}
          </div>
          ${
            priv.objective.hidden
              ? '<p class="briefing__hidden-hint">Cet objectif reste secret — ne le partage pas.</p>'
              : ''
          }
        </div>
        ${
          priv.capabilities.length > 0
            ? `<div class="briefing__capabilities">
                 <div class="briefing__label">Actions disponibles</div>
                 <ul data-testid="capabilities">
                   ${priv.capabilities.map((c) => `<li>${escapeText(c)}</li>`).join('')}
                 </ul>
               </div>`
            : ''
        }
        ${
          priv.dossiers.length > 0
            ? `<div class="briefing__dossiers">
                 <div class="briefing__label">Dossiers en main</div>
                 <ul data-testid="dossiers">
                   ${priv.dossiers
                     .map((d) => `<li>${escapeText(d.label)} <em>(${escapeText(d.kind)})</em></li>`)
                     .join('')}
                 </ul>
               </div>`
            : ''
        }
      `;
      // Le bouton « Prêt » apparaît quand on a vu les infos.
      button.hidden = false;
    }
  }

  private handleReady(): void {
    if (this.ready) return;
    this.ready = true;
    try {
      this.props.client.markBriefingReady();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[briefing] briefing.ready failed:', err);
    }
    const button = this.rootEl?.querySelector<HTMLButtonElement>('[data-testid="ready"]');
    const after = this.rootEl?.querySelector<HTMLElement>('[data-testid="after-ready"]');
    if (button) {
      button.disabled = true;
      button.hidden = true;
    }
    if (after) after.hidden = false;
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
