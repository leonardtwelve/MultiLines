import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { loadConfig } from './config/env';
import { RoomRegistry } from './core/RoomRegistry';
import { registerHostHandlers } from './handlers/HostHandlers';
import {
  registerDisconnectHandler,
  registerPlayerHandlers,
} from './handlers/PlayerHandlers';

/**
 * Entry point du serveur Pixel Quests (F11, F17, F20, F21).
 *
 * HTTP minimal (route `/health`) + socket.io pour le protocole temps réel.
 * Les handlers Host et Player sont enregistrés par connexion entrante.
 */
export function createApp(config = loadConfig()): {
  http: ReturnType<typeof createServer>;
  io: Server;
  rooms: RoomRegistry;
} {
  const rooms = new RoomRegistry();

  const http = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', rooms: rooms.size() }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not-found' }));
  });

  const io = new Server(http, {
    cors: {
      origin: config.corsOrigins,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('connection.established', { socketId: socket.id });
    registerHostHandlers({ io, socket, rooms, config });
    registerPlayerHandlers({ io, socket, rooms });
    registerDisconnectHandler({ io, socket, rooms });
  });

  return { http, io, rooms };
}

/** Démarre le serveur en écoute. Utilisé par `tsx watch` / `node dist`. */
export function startServer(config = loadConfig()): {
  http: ReturnType<typeof createServer>;
  io: Server;
  rooms: RoomRegistry;
} {
  const app = createApp(config);
  app.http.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[pixel-quests/server] listening on http://localhost:${config.port} ` +
        `(publicUrl=${config.publicUrl})`,
    );
  });
  return app;
}

// Auto-start uniquement quand on exécute le fichier directement (pas en tests).
// Comparaison robuste Windows + POSIX via fileURLToPath.
import { fileURLToPath } from 'node:url';
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  startServer();
}
