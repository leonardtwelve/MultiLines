import type { Server, Socket } from 'socket.io';
import type { PayloadOf, PlayerRequest } from '@pixel-quests/shared/protocol';
import type { RoomRegistry } from '../core/RoomRegistry';
import { applyReaction, senderFor } from './dispatch';

/**
 * Listeners socket.io pour les requêtes Player (smartphone).
 *
 * Toutes les requêtes Player sont routées via la `RoomStateMachine` —
 * c'est elle qui valide le contexte (statut, autorisation, ressources)
 * avant de muter la `Room` et de produire les emits.
 *
 * `room.join` est un cas particulier : le sender n'existe pas encore
 * dans la room au moment du message. On construit donc un sender pseudo
 * (avec le `socketId`) et la state machine génère le `playerId` dans le
 * reducer lobby (cf. `reducers/lobby.ts handleJoin`).
 */
export function registerPlayerHandlers(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
}): void {
  const { io, socket, rooms } = params;

  // === room.join — résolu par roomCode ===

  socket.on('room.join', (payload: PayloadOf<PlayerRequest, 'room.join'>) => {
    const room = rooms.getRoomByCode(payload.roomCode);
    if (!room) {
      socket.emit('room.not-found', { roomCode: payload.roomCode });
      return;
    }
    const sm = rooms.getStateMachine(room.id);
    if (!sm) {
      socket.emit('room.not-found', { roomCode: payload.roomCode });
      return;
    }
    // Sender pseudo-player : le state machine génère le vrai PlayerId.
    const reaction = sm.handle(
      { type: 'room.join', payload },
      { kind: 'player', playerId: 'pending', socketId: socket.id },
    );
    if (reaction.kind === 'accept') {
      // On joint socket.io APRÈS l'accept pour ne pas recevoir des
      // events si la validation refuse (room.full / room.state-invalid).
      void socket.join(room.id);
    }
    applyReaction({ reaction, io, socket, roomId: room.id });
  });

  // === room.leave / briefing.ready — résolus par roomId implicite ===

  socket.on('room.leave', (payload: PayloadOf<PlayerRequest, 'room.leave'>) => {
    routeRoomMessage({
      io,
      socket,
      rooms,
      roomId: payload.roomId,
      build: (room) => {
        const sender = senderFor(socket, room);
        return sender ? { sender, msg: { type: 'room.leave' as const, payload } } : null;
      },
      onAccept: () => void socket.leave(payload.roomId),
    });
  });

  socket.on('briefing.ready', (payload: PayloadOf<PlayerRequest, 'briefing.ready'>) => {
    // `briefing.ready` n'a pas de roomId dans le payload — on cherche
    // la room où ce socket est Player.
    const room = findRoomForPlayerSocket(rooms, socket.id);
    if (!room) {
      socket.emit('private.error', {
        code: 'NOT_IN_ROOM',
        message: 'Tu n’es pas inscrit·e dans une partie.',
      });
      return;
    }
    const sm = rooms.getStateMachine(room.id);
    if (!sm) return;
    const sender = senderFor(socket, room);
    if (!sender) return;
    const reaction = sm.handle({ type: 'briefing.ready', payload }, sender);
    applyReaction({ reaction, io, socket, roomId: room.id });
  });

  // === ping — inline ===

  socket.on('ping', (payload: PayloadOf<PlayerRequest, 'ping'>) => {
    socket.emit('pong', { t: payload.t, serverT: Date.now() });
  });
}

/**
 * Handler global de déconnexion : retire le joueur de toutes les rooms
 * où il est et broadcast `player.left`. Si le Host se déconnecte, on
 * supprime la room et on broadcast aux Players restants.
 *
 * NB : ce handler ne passe pas (encore) par la state machine — il agit
 * en plus de la machine en attendant la gestion `paused` / `cancelled`
 * lors d'un host-disconnect (slice ultérieure avec timers de grace).
 */
export function registerDisconnectHandler(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
}): void {
  const { io, socket, rooms } = params;

  socket.on('disconnect', () => {
    for (const room of [...findRoomsForSocket(rooms, socket.id)]) {
      if (room.hostSocketId === socket.id) {
        io.to(room.id).emit('room.not-found', { roomCode: room.code });
        rooms.deleteRoom(room.id);
      } else {
        const player = room.getPlayers().find((p) => p.socketId === socket.id);
        if (player) {
          room.removePlayer(player.id);
          io.to(room.id).emit('player.left', { playerId: player.id, roomId: room.id });
        }
      }
    }
  });
}

// === Helpers ===

/**
 * Route un message au reducer adapté pour une room donnée. Si la room
 * ou le sender est invalide, émet une `private.error` correctement
 * codée.
 */
function routeRoomMessage<P>(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
  roomId: string;
  build: (room: import('../core/Room').Room) =>
    | {
        sender: import('../core/state-machine').Sender;
        msg: Parameters<import('../core/state-machine').RoomStateMachine['handle']>[0];
      }
    | null;
  onAccept?: () => void;
  _typeMarker?: P;
}): void {
  const { io, socket, rooms, roomId, build, onAccept } = params;
  const room = rooms.getRoom(roomId);
  const sm = rooms.getStateMachine(roomId);
  if (!room || !sm) {
    socket.emit('private.error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Cette partie n’existe plus.',
    });
    return;
  }
  const built = build(room);
  if (!built) {
    socket.emit('private.error', {
      code: 'NOT_IN_ROOM',
      message: 'Tu n’es pas inscrit·e dans cette partie.',
    });
    return;
  }
  const reaction = sm.handle(built.msg, built.sender);
  if (reaction.kind === 'accept' && onAccept) onAccept();
  applyReaction({ reaction, io, socket, roomId: room.id });
}

function findRoomForPlayerSocket(
  rooms: RoomRegistry,
  socketId: string,
): import('../core/Room').Room | undefined {
  for (const room of rooms.snapshotRooms()) {
    if (room.getPlayers().some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

function* findRoomsForSocket(rooms: RoomRegistry, socketId: string) {
  for (const room of rooms.snapshotRooms()) {
    if (room.hostSocketId === socketId) {
      yield room;
      continue;
    }
    if (room.getPlayers().some((p) => p.socketId === socketId)) {
      yield room;
    }
  }
}
