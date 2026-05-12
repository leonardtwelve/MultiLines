import type { PlayerId, RoomCode, RoomId, SocketId } from '@pixel-quests/shared';

export interface Player {
  id: PlayerId;
  name: string;
  socketId: SocketId;
  joinedAt: Date;
}

export const MAX_PLAYERS_PER_ROOM = 5;

/**
 * État d'une room (lobby de partie) côté serveur.
 *
 * Source de vérité pour la liste des joueurs et l'aventure choisie.
 * Pas de logique de jeu ici — c'est le rôle du `GameStateMachine` à venir
 * (#61 spec/server-state-machine).
 */
export class Room {
  readonly id: RoomId;
  readonly code: RoomCode;
  readonly adventureId: string;
  readonly hostSocketId: SocketId;
  readonly createdAt: Date;

  private readonly players: Map<PlayerId, Player> = new Map();
  private lastActivityAt: Date;

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
