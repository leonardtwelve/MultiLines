import type { PlayerId, RoomCode, RoomId, RoomStatus, SocketId } from '@pixel-quests/shared';

export interface Player {
  id: PlayerId;
  name: string;
  socketId: SocketId;
  joinedAt: Date;
}

export const MAX_PLAYERS_PER_ROOM = 5;
export const MIN_PLAYERS_TO_START = 3;

/**
 * État d'une room (lobby + partie en cours) côté serveur.
 *
 * Source de vérité pour la liste des joueurs, l'aventure choisie et le
 * statut courant de la partie (cf. `docs/specs/server-state-machine.md`).
 *
 * `Room` reste un **conteneur de données** — la logique de transitions
 * (validations, side effects à diffuser) vit dans `RoomStateMachine`.
 */
export class Room {
  readonly id: RoomId;
  readonly code: RoomCode;
  readonly adventureId: string;
  readonly hostSocketId: SocketId;
  readonly createdAt: Date;

  private readonly players: Map<PlayerId, Player> = new Map();
  private lastActivityAt: Date;
  /**
   * Statut courant. Démarre en `lobby` ; mute via `setStatus` appelée par
   * `RoomStateMachine` après validation des transitions.
   */
  private _status: RoomStatus = 'lobby';
  /**
   * Statut précédent le passage en `paused` — permet de restaurer
   * l'état d'origine au `game.resume` (cf. spec §3.8 paused enveloppe).
   */
  private _statusBeforePause: RoomStatus | null = null;
  /**
   * Joueurs ayant émis `briefing.ready`. Vidé à chaque retour en `lobby`.
   */
  private readonly _briefingReady: Set<PlayerId> = new Set();

  constructor(params: {
    id: RoomId;
    code: RoomCode;
    adventureId: string;
    hostSocketId: SocketId;
    createdAt?: Date;
  }) {
    this.id = params.id;
    this.code = params.code;
    this.adventureId = params.adventureId;
    this.hostSocketId = params.hostSocketId;
    this.createdAt = params.createdAt ?? new Date();
    this.lastActivityAt = this.createdAt;
  }

  // === Statut ===

  get status(): RoomStatus {
    return this._status;
  }

  /**
   * Transition de statut. Pas de garde-fou ici — c'est la state machine
   * qui valide la légitimité avant d'appeler.
   *
   * Side effects automatiques :
   * - vers `paused` : stocke l'ancien statut dans `_statusBeforePause`.
   * - vers tout autre statut : reset `briefingReady` (sauf si on entre
   *   en `briefing` lui-même — on garde la liste vide initiale).
   */
  setStatus(next: RoomStatus): void {
    if (next === this._status) return;
    if (next === 'paused') {
      this._statusBeforePause = this._status;
    }
    if (next !== 'briefing') {
      this._briefingReady.clear();
    }
    this._status = next;
    this.touch();
  }

  /** Statut pré-pause (utile pour `game.resume`). */
  get statusBeforePause(): RoomStatus | null {
    return this._statusBeforePause;
  }

  /** Consomme le pré-pause après restauration. */
  clearStatusBeforePause(): void {
    this._statusBeforePause = null;
  }

  // === Briefing ready set ===

  markBriefingReady(playerId: PlayerId): void {
    this._briefingReady.add(playerId);
    this.touch();
  }

  isBriefingReady(playerId: PlayerId): boolean {
    return this._briefingReady.has(playerId);
  }

  briefingReadyCount(): number {
    return this._briefingReady.size;
  }

  briefingReadyIds(): ReadonlyArray<PlayerId> {
    return [...this._briefingReady];
  }

  /** Tous les joueurs présents ont-ils confirmé leur briefing ? */
  allBriefingReady(): boolean {
    return this._briefingReady.size === this.players.size && this.players.size > 0;
  }

  addPlayer(player: Player): void {
    if (this.isFull()) {
      throw new Error(`Room ${this.id} : déjà ${MAX_PLAYERS_PER_ROOM} joueurs.`);
    }
    if (this.players.has(player.id)) {
      throw new Error(`Room ${this.id} : joueur ${player.id} déjà présent.`);
    }
    this.players.set(player.id, player);
    this.touch();
  }

  removePlayer(playerId: PlayerId): Player | undefined {
    const player = this.players.get(playerId);
    if (!player) return undefined;
    this.players.delete(playerId);
    this.touch();
    return player;
  }

  getPlayer(playerId: PlayerId): Player | undefined {
    return this.players.get(playerId);
  }

  /** Retourne une copie immuable de la liste des joueurs. */
  getPlayers(): ReadonlyArray<Player> {
    return [...this.players.values()];
  }

  playerCount(): number {
    return this.players.size;
  }

  isFull(): boolean {
    return this.players.size >= MAX_PLAYERS_PER_ROOM;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  getLastActivityAt(): Date {
    return this.lastActivityAt;
  }

  /** Met à jour le timestamp d'activité (cleanup expirés). */
  touch(): void {
    this.lastActivityAt = new Date();
  }
}
