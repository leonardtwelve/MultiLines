import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as ClientIo, type Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../index';

interface TestHarness {
  app: ReturnType<typeof createApp>;
  port: number;
  sockets: ClientSocket[];
}

async function startTestServer(): Promise<TestHarness> {
  const app = createApp({
    port: 0,
    publicUrl: 'http://127.0.0.1:0',
    corsOrigins: '*',
  });
  await new Promise<void>((resolve) => {
    app.http.listen(0, '127.0.0.1', () => resolve());
  });
  const address = app.http.address() as AddressInfo;
  return { app, port: address.port, sockets: [] };
}

async function stopTestServer(h: TestHarness): Promise<void> {
  for (const s of h.sockets) {
    if (s.connected) s.disconnect();
  }
  await new Promise<void>((resolve) => {
    h.app.io.close(() => resolve());
  });
}

function connectClient(
  port: number,
): Promise<{ sock: ClientSocket; socketId: string }> {
  return new Promise((resolve, reject) => {
    const sock = ClientIo(`http://127.0.0.1:${port}`, {
      reconnection: false,
      timeout: 5000,
    });
    let socketId: string | null = null;
    let connected = false;
    const tryResolve = () => {
      if (connected && socketId !== null) resolve({ sock, socketId });
    };
    sock.once('connection.established', (payload: { socketId: string }) => {
      socketId = payload.socketId;
      tryResolve();
    });
    sock.once('connect', () => {
      connected = true;
      tryResolve();
    });
    sock.once('connect_error', (err) => reject(new Error(`connect_error: ${err.message}`)));
    setTimeout(() => reject(new Error('connectClient timeout (5s)')), 5000);
  });
}

function once<T>(sock: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    sock.once(event, (payload: T) => resolve(payload));
  });
}

describe('Server integration — socket.io handlers', () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await startTestServer();
  });

  afterEach(async () => {
    await stopTestServer(h);
  });

  it("émet 'connection.established' avec un socketId au client à la connexion", async () => {
    const { sock, socketId } = await connectClient(h.port);
    h.sockets.push(sock);
    expect(socketId).toBeTruthy();
    expect(typeof socketId).toBe('string');
  });

  it('Host : room.create → room.created avec code et URL QR', async () => {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const roomCreated = once<{ roomId: string; roomCode: string; qrUrl: string }>(
      host,
      'room.created',
    );
    host.emit('room.create', { adventureId: 'banque-lune' });
    const payload = await roomCreated;
    expect(payload.roomId).toMatch(/.+/);
    expect(payload.roomCode).toMatch(/^[A-Z]+-[A-Z]+$/);
    expect(payload.qrUrl).toContain(payload.roomCode);
    expect(h.app.rooms.size()).toBe(1);
  });

  it('Player : room.join valide → player.joined broadcast à la room', async () => {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const hostRoomCreated = once<{ roomCode: string; roomId: string }>(host, 'room.created');
    host.emit('room.create', { adventureId: 'banque-lune' });
    const { roomCode } = await hostRoomCreated;

    const { sock: player } = await connectClient(h.port);
    h.sockets.push(player);

    const hostNotified = once<{ playerId: string; playerName: string; roomId: string }>(
      host,
      'player.joined',
    );
    const playerNotified = once<{ playerId: string; playerName: string }>(player, 'player.joined');
    player.emit('room.join', { roomCode, playerName: 'Léa' });

    const fromHost = await hostNotified;
    const fromPlayer = await playerNotified;
    expect(fromHost.playerName).toBe('Léa');
    expect(fromPlayer.playerName).toBe('Léa');
    expect(fromHost.playerId).toBe(fromPlayer.playerId);
  });

  it("Player : room.join sur code inconnu → room.not-found", async () => {
    const { sock: player } = await connectClient(h.port);
    h.sockets.push(player);
    const notFound = once<{ roomCode: string }>(player, 'room.not-found');
    player.emit('room.join', { roomCode: 'NEVER-EXISTED', playerName: 'X' });
    const payload = await notFound;
    expect(payload.roomCode).toBe('NEVER-EXISTED');
  });

  it('ping → pong avec t et serverT', async () => {
    const { sock } = await connectClient(h.port);
    h.sockets.push(sock);
    const pong = once<{ t: number; serverT: number }>(sock, 'pong');
    const t = Date.now();
    sock.emit('ping', { t });
    const payload = await pong;
    expect(payload.t).toBe(t);
    expect(payload.serverT).toBeGreaterThanOrEqual(t);
  });

  it("disconnect d'un Player → player.left broadcast à la room", async () => {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const hostRoomCreated = once<{ roomCode: string }>(host, 'room.created');
    host.emit('room.create', { adventureId: 'banque-lune' });
    const { roomCode } = await hostRoomCreated;

    const { sock: player } = await connectClient(h.port);
    const joined = once(host, 'player.joined');
    player.emit('room.join', { roomCode, playerName: 'Sami' });
    await joined;

    const playerLeft = once<{ playerId: string }>(host, 'player.left');
    player.disconnect();
    const payload = await playerLeft;
    expect(payload.playerId).toBeDefined();
  });
});
