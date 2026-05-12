import type { Server, Socket } from 'socket.io';
import type {
  HostRequest,
  PayloadOf,
  ServerEvent,
} from '@pixel-quests/shared/protocol';
import type { RoomRegistry } from '../core/RoomRegistry';
import type { ServerConfig } from '../config/env';

/**
 * Enregistre les listeners socket.io pour les requêtes Host (tablette).
 *
 * Mapping requête → événement émis :
 *   room.create → room.created (au Host uniquement)
 *   game.start  → placeholder (logique de jeu en Prompt 3)
 *   ping        → pong (au Host uniquement)
 */
export function registerHostHandlers(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
  config: ServerConfig;
}): void {
  const { socket, rooms, config } = params;

  socket.on('room.create', (payload: PayloadOf<HostRequest, 'room.create'>) => {
    const room = rooms.createRoom(payload.adventureId, socket.id);
    void socket.join(room.id);
    const event: Extract<ServerEvent, { type: 'room.created' }> = {
      type: 'room.created',
      payload: {
        roomId: room.id,
        roomCode: room.code,
        qrUrl: `${config.publicUrl}/join?code=${encodeURIComponent(room.code)}`,
      },
    };
    socket.emit('room.created', event.payload);
  });

  socket.on('game.start', (_payload: PayloadOf<HostRequest, 'game.start'>) => {
    // Placeholder Prompt 2 : la logique de démarrage (transition d'état,
    // distribution des rôles, etc.) viendra avec #61 spec/server-state-machine
    // et le Prompt 3.
  });

  socket.on('ping', (payload: PayloadOf<HostRequest, 'ping'>) => {
    socket.emit('pong', { t: payload.t, serverT: Date.now() });
  });
}
