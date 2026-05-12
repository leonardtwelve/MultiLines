import { nanoid } from 'nanoid';
import type { RoomCode, RoomId, SocketId } from '@pixel-quests/shared';
import { generateUniqueRoomCode } from '../utils/room-code';
import { Room } from './Room';

/**
 * Registre global des rooms actives sur le serveur.
 *
 * Stockage en mémoire (RAM) pour le MVP — single-instance, pas de cluster.
 * Cleanup périodique des rooms expirées (>1h sans activité par défaut).
 */
export class RoomRegistry {
  private readonly byId = new Map<RoomId, Room>();
  private readonly byCode = new Map<RoomCode, Room>();

  constructor(
    /** Durée d'inactivité avant cleanup (ms). 1h par défaut. */
    private readonly expiryMs: number = 60 * 60 * 1000,
  ) {}

  createRoom(adventureId: string, hostSocketId: SocketId): Room {
    const id = nanoid();
    const code = generateUniqueRoomCode((c) => !this.byCode.has(c));
    const room = new Room({ id, code, adventureId, hostSocketId });
    this.byId.set(id, room);
    this.byCode.set(code, room);
    return room;
  }

  getRoom(id: RoomId): Room | undefined {
    return this.byId.get(id);
  }

  getRoomByCode(code: RoomCode): Room | undefined {
    return this.byCode.get(code);
  }

  deleteRoom(id: RoomId): boolean {
    const room = this.byId.get(id);
    if (!room) return false;
    this.byId.delete(id);
    this.byCode.delete(room.code);
    return true;
  }

  /** Supprime les rooms vides ou inactives depuis plus de `expiryMs`. */
  cleanup(now: Date = new Date()): number {
    let removed = 0;
    for (const [id, room] of this.byId) {
      const inactiveFor = now.getTime() - room.getLastActivityAt().getTime();
      if (room.isEmpty() || inactiveFor > this.expiryMs) {
        this.byId.delete(id);
        this.byCode.delete(room.code);
        removed += 1;
      }
    }
    return removed;
  }

  size(): number {
    return this.byId.size;
  }

  /** Snapshot des rooms actives (pour itération externe, ex: disconnect handler). */
  snapshotRooms(): ReadonlyArray<Room> {
    return [...this.byId.values()];
  }
}
