/**
 * Écran de connexion Player (F11 — Player smartphone).
 *
 * Formulaire minimaliste : un champ "code de partie" pré-rempli depuis
 * `?code=…` quand l'utilisateur arrive par QR, un champ "pseudo", un
 * bouton "Rejoindre". Affiche un retour clair (rejoint / room introuvable
 * / pleine / timeout).
 *
 * Mobile-first : pas de Phaser, pas d'animation lourde, juste du DOM léger
 * — le smartphone Player doit charger en < 200kb (cf. chantier #67 phase E).
 */

import type { SocketClient } from '../network/SocketClient';

export interface JoinScreenProps {
  root: HTMLElement;
  client: SocketClient;
  /** Code pré-rempli (depuis `?code=…`). */
  initialCode?: string;
  /** Pseudo pré-rempli (depuis localStorage si jamais on persiste). */
  initialName?: string;
  /** Callback déclenché une fois la room rejointe avec succès. */
  onJoined: (info: { roomId: string; playerId: string; playerName: string }) => void;
}

type ViewState = 'form' | 'connecting' | 'joined' | 'error';

export class JoinScreen {
  private state: ViewState = 'form';
  private offHandlers: Array<() => void> = [];
  private formEl: HTMLFormElement | null = null;
  private codeInput: HTMLInputElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private feedbackEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private joinedInfo: { roomId: string; playerId: string; playerName: string } | null = null;

  constructor(private readonly props: JoinScreenProps) {}

  render(): void {
    this.props.root.innerHTML = '';
    this.buildForm();
    this.attachStatusListener();
  }

  destroy(): void {
    for (const off of this.offHandlers) off();
    this.offHandlers = [];
    if (this.props.client.status !== 'idle') {
      this.props.client.disconnect();
    }
  }

  private buildForm(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'join';
    wrapper.innerHTML = `
      <header class="join__header">
        <h1 class="join__title">Rejoindre une partie</h1>
        <div class="join__status" data-testid="status">⚪</div>
      </header>
      <form class="join__form" data-testid="form" novalidate>
        <label class="join__field">
          <span class="join__label">Code de partie</span>
          <input
            type="text"
            name="code"
            data-testid="code"
            inputmode="text"
            autocomplete="off"
            autocapitalize="characters"
            placeholder="ex: BLUE-CAT"
            required
            value="${escapeAttr(this.props.initialCode ?? '')}"
          />
        </label>
        <label class="join__field">
          <span class="join__label">Ton pseudo</span>
          <input
            type="text"
            name="name"
            data-testid="name"
            autocomplete="nickname"
            maxlength="24"
            placeholder="ex: Léa"
            required
            value="${escapeAttr(this.props.initialName ?? '')}"
          />
        </label>
        <button type="submit" class="join__submit" data-testid="submit">
          Rejoindre
        </button>
        <p class="join__feedback" data-testid="feedback" role="status" aria-live="polite" hidden></p>
      </form>
    `;
    this.props.root.appendChild(wrapper);
    this.formEl = wrapper.querySelector<HTMLFormElement>('[data-testid="form"]');
    this.codeInput = wrapper.querySelector<HTMLInputElement>('[data-testid="code"]');
    this.nameInput = wrapper.querySelector<HTMLInputElement>('[data-testid="name"]');
    this.submitBtn = wrapper.querySelector<HTMLButtonElement>('[data-testid="submit"]');
    this.feedbackEl = wrapper.querySelector('[data-testid="feedback"]');
    this.statusEl = wrapper.querySelector('[data-testid="status"]');

    this.formEl?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
  }

  private attachStatusListener(): void {
    this.offHandlers.push(
      this.props.client.onStatusChange((s) => {
        if (!this.statusEl) return;
        const map: Record<string, string> = {
          idle: '⚪',
          connecting: '🟡',
          connected: '🟢',
          disconnected: '🔴',
          error: '🔴',
        };
        this.statusEl.textContent = map[s] ?? '⚪';
        this.statusEl.dataset.status = s;
      }),
    );
  }

  private async handleSubmit(): Promise<void> {
    const code = (this.codeInput?.value ?? '').trim().toUpperCase();
    const name = (this.nameInput?.value ?? '').trim();
    if (!code || !name) {
      this.showFeedback('Renseigne un code et un pseudo.', 'error');
      return;
    }
    this.setState('connecting');
    this.showFeedback('Connexion au serveur…', 'info');
    try {
      await this.props.client.connect();
      this.showFeedback('Connecté. Recherche de la partie…', 'info');
      const result = await this.props.client.joinRoom(code, name);
      if (result.ok) {
        this.joinedInfo = {
          roomId: result.roomId,
          playerId: result.playerId,
          playerName: result.playerName,
        };
        this.setState('joined');
        this.renderJoined();
        this.props.onJoined(this.joinedInfo);
      } else {
        this.setState('form');
        const reasons: Record<typeof result.reason, string> = {
          'room-not-found': `Aucune partie avec le code « ${code} ». Vérifie auprès de l'organisateur.`,
          'room-full': 'Cette partie est déjà complète (5 joueurs max).',
          timeout: 'Le serveur ne répond pas. Réessaie dans un instant.',
        };
        this.showFeedback(reasons[result.reason], 'error');
      }
    } catch (err) {
      this.setState('error');
      this.showFeedback(
        err instanceof Error
          ? `Connexion impossible : ${err.message}`
          : 'Connexion impossible. Réessaie.',
        'error',
      );
    }
  }

  private renderJoined(): void {
    if (!this.formEl || !this.joinedInfo) return;
    this.formEl.style.display = 'none';
    const done = document.createElement('div');
    done.className = 'join__done';
    done.dataset.testid = 'joined';
    done.innerHTML = `
      <h2 class="join__done-title">🎉 Tu es dans la partie</h2>
      <p class="join__done-name">
        Bienvenue, <strong>${escapeText(this.joinedInfo.playerName)}</strong>.
      </p>
      <p class="join__done-hint">
        Garde ce téléphone à portée — c'est ici que tu joueras quand
        l'organisateur lancera la partie.
      </p>
    `;
    this.formEl.parentElement?.appendChild(done);
  }

  private setState(s: ViewState): void {
    this.state = s;
    if (this.submitBtn) {
      this.submitBtn.disabled = s === 'connecting' || s === 'joined';
    }
  }

  private showFeedback(message: string, kind: 'info' | 'error'): void {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = message;
    this.feedbackEl.hidden = false;
    this.feedbackEl.dataset.kind = kind;
  }

  /** Pour les tests — visibilité publique de l'état interne. */
  get currentState(): ViewState {
    return this.state;
  }
}

// === Helpers ===

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
