import type { Server, Socket } from 'socket.io';
import type { HostRequest, PayloadOf } from '@pixel-quests/shared/protocol';
import type { RoomRegistry } from '../core/RoomRegistry';
import type { ServerConfig } from '../config/env';
import { applyReaction, senderFor } from './dispatch';

/**
 * Listeners socket.io pour les requêtes Host (tablette).
 *
 * - `room.create` : reste **inline** ici car c'est l'entrée — pas
 *   encore de room/state-machine à interroger. Crée la room dans le
 *   registry, le constructeur de `RoomStateMachine` est ensuite invoqué
 *   automatiquement par le registry.
 * - `game.start` / `game.pause` / `game.resume` / `game.cancel` :
 *   routés via la state machine. Le `senderFor` valide que l'expéditeur
 *   est bien le Host de la room ciblée.
 * - `ping` : reste inline (pas stateful par room).
 */
export function registerHostHandlers(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
  config: ServerConfig;
}): void {
  const { io, socket, rooms, config } = params;

  // === room.create — entrée Host, reste inline ===

  socket.on('room.create', (payload: PayloadOf<HostRequest, 'room.create'>) => {
    const room = rooms.createRoom(payload.adventureId, socket.id);
    void socket.join(room.id);
    socket.emit('room.created', {
      roomId: room.id,
      roomCode: room.code,
      // Le QR pointe le front (/player/index.html) — pas le serveur.
      // Le client construit l'URL exacte côté HostLobbyScreen ; on
      // garde ce champ pour compat et debug.
      qrUrl: `${config.publicUrl}/join?code=${encodeURIComponent(room.code)}`,
    });
  });

  // === game.start / pause / resume / cancel — via state machine ===

  const lifecycleTypes = ['game.start', 'game.pause', 'game.resume', 'game.cancel'] as const;
  for (const type of lifecycleTypes) {
    socket.on(type, (payload: { roomId: string }) => {
      const room = rooms.getRoom(payload.roomId);
      const sm = rooms.getStateMachine(payload.roomId);
      if (!room || !sm) {
        socket.emit('private.error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Cette partie n’existe plus.',
        });
        return;
      }
      const sender = senderFor(socket, room);
      if (!sender) {
        socket.emit('private.error', {
          code: 'NOT_IN_ROOM',
          message: 'Tu n’es pas inscrit·e dans cette partie.',
        });
        return;
      }
      const reaction = sm.handle({ type, payload }, sender);
      applyReaction({ reaction, io, socket, roomId: room.id });
    });
  }

  // === ping — inline ===

  socket.on('ping', (payload: PayloadOf<HostRequest, 'ping'>) => {
    socket.emit('pong', { t: payload.t, serverT: Date.now() });
  });
}
