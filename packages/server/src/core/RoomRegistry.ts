import { nanoid } from 'nanoid';
import type { RoomCode, RoomId, SocketId } from '@pixel-quests/shared';
import { generateUniqueRoomCode } from '../utils/room-code';
import { Room } from './Room';
import { createBanqueLuneAdventureHooks } from '../adventures/banque-lune';
import type { AdventureHooks } from './state-machine/hooks';
import { createNoOpAdventureHooks } from './state-machine/NoOpAdventureHooks';
import { RoomStateMachine } from './state-machine/RoomStateMachine';

/**
 * Fabrique des hooks aventure par `adventureId`. Permet de brancher
 * Banque Lune (ou toute future aventure) sans coupler le registry à
 * l'aventure. Défaut : dispatch par `adventureId`, fallback NoOp pour
 * les ids inconnus.
 */
export type AdventureHooksFactory = (adventureId: string, roomId: RoomId) => AdventureHooks;

/**
 * Factory par défaut : route `'banque-lune'` vers son impl réelle,
 * tout autre `adventureId` vers le NoOp (utile pour les tests et les
 * adventures futures pas encore implémentées).
 */
const DEFAULT_HOOKS_FACTORY: AdventureHooksFactory = (adventureId, roomId) => {
  switch (adventureId) {
    case 'banque-lune':
      return createBanqueLuneAdventureHooks({ roomId });
    default:
      return createNoOpAdventureHooks({ adventureId, roomId });
  }
};

/**
 * Registre global des rooms actives sur le serveur.
 *
 * Stockage en mémoire (RAM) pour le MVP — single-instance, pas de cluster.
 * Cleanup périodique des rooms expirées (>1h sans activité par défaut).
 *
 * Détient également une `RoomStateMachine` par room (cf.
 * `docs/specs/server-state-machine.md §7.1`). La state machine n'est pas
 * exposée directement — on passe par `getStateMachine(roomId)`.
 */
export class RoomRegistry {
  private readonly byId = new Map<RoomId, Room>();
  private readonly byCode = new Map<RoomCode, Room>();
  private readonly stateMachines = new Map<RoomId, RoomStateMachine>();
  private readonly hooksFactory: AdventureHooksFactory;
  private readonly expiryMs: number;

  constructor(
    opts: {
      hooksFactory?: AdventureHooksFactory;
      expiryMs?: number;
      /**
       * Passé tel quel à chaque `RoomStateMachine` créée. Activé via
       * `ServerConfig.devAllowSolo` (env `DEV_ALLOW_SOLO=true`) pour
       * autoriser les parties solo (1 joueur min au lieu de 3) en
       * playtest / debug. **Ne pas activer en prod ouverte au public.**
       */
      devAllowSolo?: boolean;
    } = {},
  ) {
    this.hooksFactory = opts.hooksFactory ?? DEFAULT_HOOKS_FACTORY;
    this.expiryMs = opts.expiryMs ?? 60 * 60 * 1000;
    this.devAllowSolo = opts.devAllowSolo ?? false;
  }

  private readonly devAllowSolo: boolean;

  createRoom(adventureId: string, hostSocketId: SocketId): Room {
    const id = nanoid();
    const code = generateUniqueRoomCode((c) => !this.byCode.has(c));
    const room = new Room({ id, code, adventureId, hostSocketId });
    this.byId.set(id, room);
    this.byCode.set(code, room);
    const hooks = this.hooksFactory(adventureId, id);
    this.stateMachines.set(
      id,
      new RoomStateMachine(room, { hooks, devAllowSolo: this.devAllowSolo }),
    );
    return room;
  }

  getRoom(id: RoomId): Room | undefined {
    return this.byId.get(id);
  }

  getRoomByCode(code: RoomCode): Room | undefined {
    return this.byCode.get(code);
  }

  /**
   * Récupère la machine à états pilotant cette room. `undefined` si la
   * room n'existe pas (ou plus). À utiliser depuis les handlers
   * socket.io pour dispatcher tous les messages gameplay.
   */
  getStateMachine(id: RoomId): RoomStateMachine | undefined {
    return this.stateMachines.get(id);
  }

  deleteRoom(id: RoomId): boolean {
    const room = this.byId.get(id);
    if (!room) return false;
    this.byId.delete(id);
    this.byCode.delete(room.code);
    this.stateMachines.delete(id);
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
        this.stateMachines.delete(id);
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
