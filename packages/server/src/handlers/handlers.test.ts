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
  const app = createApp(
    {
      port: 0,
      publicUrl: 'http://127.0.0.1:0',
      corsOrigins: '*',
      devAllowSolo: false,
    },
    // Graces ultra-courtes pour les tests d'intégration — sinon chaque
    // cas de disconnect bloquerait 30-60 s. La logique grace réelle
    // reste vérifiée (séquence player.disconnected → player.left).
    { playerGraceMs: 50, hostGraceMs: 50 },
  );
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
    sock.once(
      'connection.established',
      (payload: { socketId: string; serverVersion: string }) => {
        socketId = payload.socketId;
        tryResolve();
      },
    );
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

  it("disconnect d'un Player → player.disconnected immédiat, puis player.left après grace", async () => {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const hostRoomCreated = once<{ roomCode: string }>(host, 'room.created');
    host.emit('room.create', { adventureId: 'banque-lune' });
    const { roomCode } = await hostRoomCreated;

    const { sock: player } = await connectClient(h.port);
    const joined = once(host, 'player.joined');
    player.emit('room.join', { roomCode, playerName: 'Sami' });
    await joined;

    const playerDisco = once<{ playerId: string }>(host, 'player.disconnected');
    const playerLeft = once<{ playerId: string }>(host, 'player.left');
    player.disconnect();
    const discoPayload = await playerDisco;
    expect(discoPayload.playerId).toBeDefined();
    // La grace est ultra-courte en test (50ms) → on reçoit player.left juste après.
    const leftPayload = await playerLeft;
    expect(leftPayload.playerId).toBe(discoPayload.playerId);
  });

  it("disconnect du Host → room.not-found émis aux Players après grace", async () => {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const hostRoomCreated = once<{ roomId: string; roomCode: string }>(host, 'room.created');
    host.emit('room.create', { adventureId: 'banque-lune' });
    const { roomId, roomCode } = await hostRoomCreated;

    const { sock: player } = await connectClient(h.port);
    h.sockets.push(player);
    const joined = once(host, 'player.joined');
    player.emit('room.join', { roomCode, playerName: 'Léa' });
    await joined;

    const notFound = once<{ roomCode: string }>(player, 'room.not-found');
    host.disconnect();
    const payload = await notFound;
    expect(payload.roomCode).toBe(roomCode);
    // La room a bien été supprimée du registry.
    // Petite pause pour s'assurer que le setTimeout a eu le temps de finir.
    await new Promise((r) => setTimeout(r, 30));
    expect(h.app.rooms.getRoom(roomId)).toBeUndefined();
  });

  // ===========================================================================
  // Gameplay handlers (slice 3c-3) — game.start + briefing.ready + private.error
  // ===========================================================================

  /** Récupère le roomId créé + connecte un Host. */
  async function setupHostWithRoom(): Promise<{
    host: ClientSocket;
    roomId: string;
    roomCode: string;
  }> {
    const { sock: host } = await connectClient(h.port);
    h.sockets.push(host);
    const created = once<{ roomId: string; roomCode: string }>(host, 'room.created');
    host.emit('room.create', { adventureId: 'banque-lune' });
    const { roomId, roomCode } = await created;
    return { host, roomId, roomCode };
  }

  /** Connecte n Players et les fait rejoindre la room ; renvoie leurs sockets + ids. */
  async function joinPlayers(
    roomCode: string,
    hostSock: ClientSocket,
    names: string[],
  ): Promise<Array<{ sock: ClientSocket; playerId: string; name: string }>> {
    const out: Array<{ sock: ClientSocket; playerId: string; name: string }> = [];
    for (const name of names) {
      const { sock } = await connectClient(h.port);
      h.sockets.push(sock);
      const joined = once<{ playerId: string; playerName: string }>(hostSock, 'player.joined');
      sock.emit('room.join', { roomCode, playerName: name });
      const { playerId } = await joined;
      out.push({ sock, playerId, name });
    }
    return out;
  }

  it('game.start avec < 3 joueurs → private.error ROOM_STATE_INVALID', async () => {
    const { host, roomId } = await setupHostWithRoom();
    const err = once<{ code: string; message: string }>(host, 'private.error');
    host.emit('game.start', { roomId });
    const payload = await err;
    expect(payload.code).toBe('ROOM_STATE_INVALID');
    expect(payload.message).toMatch(/au moins 3/i);
  });

  it('game.start sur roomId inconnu → private.error ROOM_NOT_FOUND', async () => {
    const { host } = await setupHostWithRoom();
    const err = once<{ code: string }>(host, 'private.error');
    host.emit('game.start', { roomId: 'inexistant' });
    const payload = await err;
    expect(payload.code).toBe('ROOM_NOT_FOUND');
  });

  it('game.start par un Player (pas le Host) → private.error ROOM_STATE_INVALID', async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const [{ sock: player }] = await joinPlayers(roomCode, host, ['Léa']);
    const err = once<{ code: string }>(player, 'private.error');
    player.emit('game.start', { roomId });
    const payload = await err;
    // Validator validateSenderIsHost renvoie ROOM_STATE_INVALID
    expect(payload.code).toBe('ROOM_STATE_INVALID');
  });

  it('game.start valide → game.started broadcast + private.role-revealed/objective par player', async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const players = await joinPlayers(roomCode, host, ['Léa', 'Sami', 'Aïcha']);

    const gameStartedHost = once<{ initialState: { status: string } }>(host, 'game.started');
    const roleP1 = once<{ roleId: string }>(players[0].sock, 'private.role-revealed');
    const objP1 = once<{ description: string }>(players[0].sock, 'private.objective');
    const roleP2 = once<{ roleId: string }>(players[1].sock, 'private.role-revealed');
    const roleP3 = once<{ roleId: string }>(players[2].sock, 'private.role-revealed');

    host.emit('game.start', { roomId });

    const initial = await gameStartedHost;
    expect(initial.initialState.status).toBe('briefing');
    const r1 = await roleP1;
    const o1 = await objP1;
    expect(r1.roleId).toBeTruthy();
    expect(o1.description).toBeTruthy();
    expect((await roleP2).roleId).toBeTruthy();
    expect((await roleP3).roleId).toBeTruthy();
  });

  it("private.role-revealed : chaque Player ne reçoit QUE son propre rôle (sécurité par construction)", async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const players = await joinPlayers(roomCode, host, ['Léa', 'Sami', 'Aïcha']);

    // Compte les private.role-revealed reçus par chaque player.
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    for (const [i, p] of players.entries()) {
      p.sock.on('private.role-revealed', () => {
        counts[i] += 1;
      });
    }

    host.emit('game.start', { roomId });
    // Laisse le temps aux 3 émissions ciblées d'arriver.
    await new Promise((r) => setTimeout(r, 250));

    // Chaque player a reçu exactement 1 message — le sien. Si un broadcast
    // accidentel sortait, on aurait 3 messages par player.
    expect(counts[0]).toBe(1);
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(1);
  });

  it("briefing.ready : transition vers casse quand les 3 joueurs confirment", async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const players = await joinPlayers(roomCode, host, ['Léa', 'Sami', 'Aïcha']);
    const gameStarted = once(host, 'game.started');
    host.emit('game.start', { roomId });
    await gameStarted;

    // Émet et attend chaque broadcast en série, en posant une promesse
    // AVANT l'émission correspondante (sinon `once` rate l'event).
    for (const p of players) {
      const waitReady = once<{ readyPlayerIds: string[] }>(host, 'briefing.ready-changed');
      p.sock.emit('briefing.ready', {});
      await waitReady;
    }

    // Après le 3e ready, la transition vers casse est synchrone côté
    // serveur. On laisse un tick à socket.io pour drainer la file
    // d'événements avant de lire le statut.
    await new Promise((r) => setTimeout(r, 50));
    const status = h.app.rooms.getRoom(roomId)?.status;
    expect(status).toBe('casse');
  });

  it('briefing.ready par un socket non-player → private.error NOT_IN_ROOM', async () => {
    // Connexion sans rejoindre une room.
    const { sock: orphan } = await connectClient(h.port);
    h.sockets.push(orphan);
    const err = once<{ code: string }>(orphan, 'private.error');
    orphan.emit('briefing.ready', {});
    const payload = await err;
    expect(payload.code).toBe('NOT_IN_ROOM');
  });

  it('briefing.ready avant game.start → private.error ROOM_STATE_INVALID', async () => {
    const { host, roomCode } = await setupHostWithRoom();
    const [{ sock: player }] = await joinPlayers(roomCode, host, ['Léa']);
    const err = once<{ code: string }>(player, 'private.error');
    player.emit('briefing.ready', {});
    const payload = await err;
    expect(payload.code).toBe('ROOM_STATE_INVALID');
  });

  // ===========================================================================
  // Slice 3d — state.snapshot bout-en-bout via socket.io réel
  // ===========================================================================

  it('game.start émet state.snapshot ciblé à Host + chaque Player (review 3d #4)', async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const players = await joinPlayers(roomCode, host, ['Léa', 'Sami', 'Aïcha']);

    // Promesses pour chaque snapshot attendu, posées AVANT l'émission de game.start
    // (sinon les events arriveraient avant que les listeners soient attachés).
    type SnapshotPayload = {
      version: number;
      audience: 'host' | 'player';
      public: { adventureId: string; status: string };
      private?: { playerId: string; roleId: string };
      hostMeta?: Record<string, unknown>;
    };

    const hostSnapshot = once<SnapshotPayload>(host, 'state.snapshot');
    const playerSnapshots = players.map((p) =>
      once<SnapshotPayload>(p.sock, 'state.snapshot'),
    );

    host.emit('game.start', { roomId });

    // Host : audience='host', pas de private, hostMeta défini.
    const hostSnap = await hostSnapshot;
    expect(hostSnap.audience).toBe('host');
    expect(hostSnap.version).toBe(0);
    expect(hostSnap.private).toBeUndefined();
    expect(hostSnap.hostMeta).toBeDefined();
    expect(hostSnap.public.status).toBe('briefing');

    // Chaque Player : audience='player', private rempli, pas de hostMeta.
    for (const [i, snapPromise] of playerSnapshots.entries()) {
      const snap = await snapPromise;
      expect(snap.audience).toBe('player');
      expect(snap.version).toBe(0);
      expect(snap.hostMeta).toBeUndefined();
      expect(snap.private).toBeDefined();
      expect(snap.private?.playerId).toBe(players[i].playerId);
      expect(snap.private?.roleId).toBeTruthy();
    }
  });

  it("le snapshot Player ne fuit PAS le state privé des autres joueurs (sécurité)", async () => {
    const { host, roomId, roomCode } = await setupHostWithRoom();
    const players = await joinPlayers(roomCode, host, ['Léa', 'Sami', 'Aïcha']);

    // P2 enregistre TOUS les state.snapshot reçus.
    const p2Received: Array<{
      audience: string;
      private?: { playerId: string };
    }> = [];
    players[1].sock.on(
      'state.snapshot',
      (snap: { audience: string; private?: { playerId: string } }) => {
        p2Received.push(snap);
      },
    );

    host.emit('game.start', { roomId });
    // Petite pause pour laisser arriver les 4 snapshots ciblés.
    await new Promise((r) => setTimeout(r, 200));

    // P2 reçoit EXACTEMENT 1 snapshot — le sien — avec son propre playerId.
    expect(p2Received).toHaveLength(1);
    expect(p2Received[0].audience).toBe('player');
    expect(p2Received[0].private?.playerId).toBe(players[1].playerId);
  });
});
