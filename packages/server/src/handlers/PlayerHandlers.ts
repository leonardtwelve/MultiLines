import { nanoid } from 'nanoid';
import type { Server, Socket } from 'socket.io';
import type { PayloadOf, PlayerRequest } from '@pixel-quests/shared/protocol';
import type { RoomRegistry } from '../core/RoomRegistry';

/**
 * Enregistre les listeners socket.io pour les requêtes Player (smartphone).
 *
 * Mapping requête → événement émis :
 *   room.join  → player.joined (broadcast room) OU room.not-found / room.full (au Player)
 *   room.leave → player.left (broadcast room)
 *   ping       → pong (au Player uniquement)
 */
export function registerPlayerHandlers(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
}): void {
  const { io, socket, rooms } = params;

  socket.on('room.join', (payload: PayloadOf<PlayerRequest, 'room.join'>) => {
    const room = rooms.getRoomByCode(payload.roomCode);
    if (!room) {
      socket.emit('room.not-found', { roomCode: payload.roomCode });
      return;
    }
    if (room.isFull()) {
      socket.emit('room.full', { roomId: room.id });
      return;
    }
    const playerId = nanoid();
    room.addPlayer({
      id: playerId,
      name: payload.playerName,
      socketId: socket.id,
      joinedAt: new Date(),
    });
    void socket.join(room.id);

    io.to(room.id).emit('player.joined', {
      playerId,
      playerName: payload.playerName,
      roomId: room.id,
    });
  });

  socket.on('room.leave', (payload: PayloadOf<PlayerRequest, 'room.leave'>) => {
    const room = rooms.getRoom(payload.roomId);
    if (!room) return;
    // Identifie le player par le socket
    const player = room.getPlayers().find((p) => p.socketId === socket.id);
    if (!player) return;
    room.removePlayer(player.id);
    void socket.leave(room.id);
    io.to(room.id).emit('player.left', { playerId: player.id, roomId: room.id });
  });

  socket.on('ping', (payload: PayloadOf<PlayerRequest, 'ping'>) => {
    socket.emit('pong', { t: payload.t, serverT: Date.now() });
  });
}

/**
 * Handler global de déconnexion : retire le joueur de toutes les rooms où il
 * est et broadcast `player.left`. Si le Host se déconnecte, on supprime la
 * room et on broadcast aux Players restants.
 */
export function registerDisconnectHandler(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
}): void {
  const { io, socket, rooms } = params;

  socket.on('disconnect', () => {
    // Tâche : trouver toutes les rooms qui référencent ce socket
    // (Host ou Player) et nettoyer en conséquence.
    for (const room of [...findRoomsForSocket(rooms, socket.id)]) {
      if (room.hostSocketId === socket.id) {
        // Host déconnecté → on supprime la room et on informe les Players.
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

function* findRoomsForSocket(rooms: RoomRegistry, socketId: string) {
  // RoomRegistry n'expose pas son map interne — itère via id connus.
  // Pour le MVP, on s'appuie sur cleanup() pour itérer ; on ajoute une
  // méthode d'iteration ad-hoc ici. À industrialiser dans Prompt 3.
  for (const room of getAllRooms(rooms)) {
    if (room.hostSocketId === socketId) {
      yield room;
      continue;
    }
    if (room.getPlayers().some((p) => p.socketId === socketId)) {
      yield room;
    }
  }
}

/**
 * Snapshot de toutes les rooms — utilisé par le disconnect handler.
 * Évite d'exposer le Map interne du registry.
 */
function getAllRooms(rooms: RoomRegistry): ReturnType<RoomRegistry['snapshotRooms']> {
  return rooms.snapshotRooms();
}
