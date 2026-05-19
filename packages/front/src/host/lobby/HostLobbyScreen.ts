/**
 * Écran Lobby côté Host (F11, F12 pivot Jackbox).
 *
 * Cycle de vie :
 *   1. Connexion au serveur (via SocketClient).
 *   2. Émission de `room.create` → réception `room.created`.
 *   3. Affichage du code de room + QR code pointant vers /player/index.html?code=...
 *   4. Liste de joueurs connectés, mise à jour live sur `player.joined` /
 *      `player.left`.
 *   5. Bouton "Lancer la partie" (désactivé tant qu'il n'y a pas le minimum
 *      requis — pour 3a on bloque à 1 joueur minimum, sera affiné en 3b/3c).
 *
 * UI volontairement minimaliste : code de room en grand (lecture à distance),
 * QR sur le côté, liste compacte. Le polish viendra avec le Prompt 3b/c.
 */

import QRCode from 'qrcode';
import type { PayloadOf, ServerEvent } from '@pixel-quests/shared';
import type { ConnectionStatus, SocketClient } from '../../network/SocketClient';

export interface HostLobbyScreenProps {
  root: HTMLElement;
  client: SocketClient;
  adventureId: string;
  /**
   * URL de base que le QR pointe (ex: `https://multi-lines.vercel.app/player/index.html`).
   * Le code de room est ajouté en query (`?code=...`).
   */
  joinBaseUrl: string;
  onCancel: () => void;
  /**
   * Lancement effectif de la partie. Non câblé en Prompt 3a (placeholder UI).
   */
  onStartGame?: (state: { roomId: string; players: PlayerInfo[] }) => void;
}

interface PlayerInfo {
  playerId: string;
  playerName: string;
}

export class HostLobbyScreen {
  private players: PlayerInfo[] = [];
  private roomId: string | null = null;
  private roomCode: string | null = null;
  private joinUrl: string | null = null;
  private status: ConnectionStatus = 'idle';
  private statusEl: HTMLElement | null = null;
  private codeEl: HTMLElement | null = null;
  private qrEl: HTMLImageElement | null = null;
  private playersListEl: HTMLElement | null = null;
  private startButtonEl: HTMLButtonElement | null = null;
  private errorEl: HTMLElement | null = null;
  private offHandlers: Array<() => void> = [];

  constructor(private readonly props: HostLobbyScreenProps) {}

  /**
   * Monte l'UI et lance la séquence (connexion + création room). Renvoie
   * une promesse qui résout une fois la room créée — pratique pour les
   * tests, optionnel à attendre côté UI.
   */
  async render(): Promise<void> {
    const { root } = this.props;
    root.innerHTML = '';
    this.buildSkeleton(root);
    this.attachStatusListener();
    await this.startSession();
  }

  /** Désabonne les listeners et déconnecte le client. À appeler avant unmount. */
  destroy(): void {
    for (const off of this.offHandlers) off();
    this.offHandlers = [];
    if (this.props.client.status !== 'idle') {
      this.props.client.disconnect();
    }
  }

  // === UI scaffolding ===

  private buildSkeleton(root: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'lobby';
    wrapper.innerHTML = `
      <header class="lobby__header">
        <button type="button" class="lobby__back" aria-label="Retour à l'accueil">← Accueil</button>
        <div class="lobby__status" data-testid="status">Connexion…</div>
      </header>
      <h1 class="lobby__title">Salon de partie</h1>
      <p class="lobby__hint">
        Les joueurs scannent le QR ou tapent le code ci-dessous depuis
        leur smartphone.
      </p>
      <section class="lobby__share">
        <div class="lobby__code-block">
          <div class="lobby__code-label">Code de partie</div>
          <div class="lobby__code" data-testid="room-code">····</div>
          <a class="lobby__url" data-testid="join-url" target="_blank" rel="noopener noreferrer">…</a>
        </div>
        <div class="lobby__qr">
          <img class="lobby__qr-img" data-testid="qr-img" alt="QR code à scanner" />
        </div>
      </section>
      <section class="lobby__players">
        <h2 class="lobby__section-title">
          Joueurs (<span data-testid="players-count">0</span>/5)
        </h2>
        <ul class="lobby__players-list" data-testid="players-list"></ul>
        <p class="lobby__empty" data-testid="players-empty">
          En attente du premier joueur…
        </p>
      </section>
      <p class="lobby__error" data-testid="error" hidden></p>
      <button
        type="button"
        class="lobby__start"
        data-testid="start"
        disabled
      >Lancer la partie</button>
    `;
    root.appendChild(wrapper);

    // Récup des éléments dynamiques.
    this.statusEl = wrapper.querySelector('[data-testid="status"]');
    this.codeEl = wrapper.querySelector('[data-testid="room-code"]');
    this.qrEl = wrapper.querySelector<HTMLImageElement>('[data-testid="qr-img"]');
    this.playersListEl = wrapper.querySelector('[data-testid="players-list"]');
    this.startButtonEl = wrapper.querySelector<HTMLButtonElement>('[data-testid="start"]');
    this.errorEl = wrapper.querySelector('[data-testid="error"]');

    wrapper.querySelector('.lobby__back')?.addEventListener('click', () => {
      this.destroy();
      this.props.onCancel();
    });
    this.startButtonEl?.addEventListener('click', () => {
      if (!this.roomId) return;
      this.props.onStartGame?.({ roomId: this.roomId, players: [...this.players] });
    });
  }

  // === Pipeline serveur ===

  private attachStatusListener(): void {
    this.offHandlers.push(
      this.props.client.onStatusChange((s) => {
        this.status = s;
        this.renderStatus();
      }),
    );
  }

  private async startSession(): Promise<void> {
    try {
      await this.props.client.connect();
      this.attachServerListeners();
      const room = await this.props.client.createRoom(this.props.adventureId);
      this.applyRoomCreated(room);
    } catch (err) {
      this.showError(
        err instanceof Error ? err.message : 'Erreur inconnue lors de la création de la room.',
      );
    }
  }

  private attachServerListeners(): void {
    this.offHandlers.push(
      this.props.client.on('player.joined', (p) => this.handlePlayerJoined(p)),
    );
    this.offHandlers.push(
      this.props.client.on('player.left', (p) => this.handlePlayerLeft(p)),
    );
  }

  private applyRoomCreated(room: PayloadOf<ServerEvent, 'room.created'>): void {
    this.roomId = room.roomId;
    this.roomCode = room.roomCode;
    // QR cible le front (/player/index.html?code=…), pas le serveur — c'est le client
    // qui sait où vit l'UI de join. On ignore `room.qrUrl` du serveur.
    const join = new URL(this.props.joinBaseUrl);
    join.searchParams.set('code', room.roomCode);
    this.joinUrl = join.toString();
    this.renderRoom();
  }

  private handlePlayerJoined(p: PayloadOf<ServerEvent, 'player.joined'>): void {
    if (this.players.some((x) => x.playerId === p.playerId)) return;
    this.players.push({ playerId: p.playerId, playerName: p.playerName });
    this.renderPlayers();
  }

  private handlePlayerLeft(p: PayloadOf<ServerEvent, 'player.left'>): void {
    this.players = this.players.filter((x) => x.playerId !== p.playerId);
    this.renderPlayers();
  }

  // === Rendu ===

  private renderStatus(): void {
    if (!this.statusEl) return;
    const labels: Record<ConnectionStatus, string> = {
      idle: '⚪ déconnecté',
      connecting: '🟡 connexion…',
      connected: '🟢 connecté',
      disconnected: '🔴 déconnecté',
      error: '🔴 erreur',
    };
    this.statusEl.textContent = labels[this.status];
    this.statusEl.dataset.status = this.status;
  }

  private renderRoom(): void {
    if (this.codeEl && this.roomCode) this.codeEl.textContent = this.roomCode;
    if (this.joinUrl) {
      const urlEl = this.qrEl?.parentElement?.parentElement?.querySelector<HTMLAnchorElement>(
        '[data-testid="join-url"]',
      );
      if (urlEl) {
        urlEl.textContent = this.joinUrl;
        urlEl.href = this.joinUrl;
      }
    }
    if (this.qrEl && this.joinUrl) {
      void QRCode.toDataURL(this.joinUrl, { width: 240, margin: 1 }).then((dataUrl) => {
        if (this.qrEl) this.qrEl.src = dataUrl;
      });
    }
  }

  private renderPlayers(): void {
    if (!this.playersListEl) return;
    this.playersListEl.innerHTML = '';
    for (const p of this.players) {
      const li = document.createElement('li');
      li.className = 'lobby__player';
      li.dataset.playerId = p.playerId;
      li.textContent = p.playerName;
      this.playersListEl.appendChild(li);
    }
    const countEl = this.playersListEl.parentElement?.querySelector('[data-testid="players-count"]');
    if (countEl) countEl.textContent = String(this.players.length);
    const emptyEl = this.playersListEl.parentElement?.querySelector('[data-testid="players-empty"]');
    if (emptyEl) (emptyEl as HTMLElement).hidden = this.players.length > 0;
    if (this.startButtonEl) this.startButtonEl.disabled = this.players.length < 1;
  }

  private showError(message: string): void {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }
}
