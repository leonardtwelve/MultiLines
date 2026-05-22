import { describe, expect, it } from 'vitest';
import type {
  PlayerId,
  PrivatePlayerState,
  PublicPlayer,
  TurnEvent,
  GameEndReason,
} from '@pixel-quests/shared';
import { Room } from '../../Room';
import type { AdventureHooks, FinalScore, RoleDistribution } from '../hooks';
import type { Sender } from '../types';
import { applyLobby, type LobbyReducerDeps } from './lobby';

// === Fixtures ===

const HOST_SOCKET = 'host-sock';

function makeRoom(): Room {
  return new Room({
    id: 'r1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId: HOST_SOCKET,
  });
}

function host(): Sender {
  return { kind: 'host', socketId: HOST_SOCKET };
}

function player(playerId: string, socketId = `sock-${playerId}`): Sender {
  return { kind: 'player', playerId, socketId };
}

/**
 * Hooks fictifs déterministes — distribuent un rôle factice à chaque
 * joueur. Suffisant pour tester que le reducer câble bien tous les emits.
 */
function makeFakeHooks(): AdventureHooks {
  return {
    adventureId: 'banque-lune',
    distributeRoles(playerIds: ReadonlyArray<PlayerId>): RoleDistribution {
      const privates: Record<PlayerId, PrivatePlayerState> = {};
      const players: Record<PlayerId, PublicPlayer> = {};
      for (const [i, id] of playerIds.entries()) {
        privates[id] = {
          playerId: id,
          roleId: i === 0 ? 'leader' : 'agent',
          capabilities: ['observe'],
          objective: { id: `obj-${id}`, description: 'mock obj', hidden: false },
          dossiers: i === 0 ? [{ id: 'd1', kind: 'photo', label: 'preuve' }] : [],
          pendingPactes: [],
        };
        players[id] = { id, name: `J${i + 1}`, color: '#ffcc66', connected: true };
      }
      return {
        privates,
        publicState: {
          roomId: 'r1',
          status: 'briefing',
          adventureId: 'banque-lune',
          players,
        },
      };
    },
    resolveAction: () => null,
    triggerTurnEvents: (): ReadonlyArray<TurnEvent> => [],
    computeFinalScore: (_state, endReason: GameEndReason): FinalScore => ({
      endReason,
      headline: '',
      perPlayer: {},
    }),
  };
}

function withFakeDeps(overrides: Partial<LobbyReducerDeps> = {}): LobbyReducerDeps {
  return {
    hooks: makeFakeHooks(),
    newPlayerId: (() => {
      let i = 0;
      return () => `gen-p${++i}`;
    })(),
    ...overrides,
  };
}

// === Tests ===

describe('lobby reducer — room.join', () => {
  it('ajoute le player et broadcast player.joined', () => {
    const room = makeRoom();
    const deps = withFakeDeps();
    const r = applyLobby(
      room,
      { type: 'room.join', payload: { roomCode: 'BLUE-CAT', playerName: 'Léa' } },
      // Le sender est en pratique un Player (premier message après connect).
      // Lors d'un room.join, on construit un sender pseudo-player avec un
      // playerId qui sera ignoré (le reducer en génère un nouveau).
      { kind: 'player', playerId: 'tmp', socketId: 'sock-new' },
      deps,
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits).toHaveLength(1);
    expect(r.emits[0].to).toBe('room');
    expect(r.emits[0].type).toBe('player.joined');
    if (r.emits[0].type === 'player.joined') {
      expect(r.emits[0].payload.playerName).toBe('Léa');
      expect(r.emits[0].payload.playerId).toBe('gen-p1');
      expect(r.emits[0].payload.roomId).toBe('r1');
    }
    expect(room.playerCount()).toBe(1);
  });

  it("trim le pseudo avant d'ajouter", () => {
    const room = makeRoom();
    const r = applyLobby(
      room,
      { type: 'room.join', payload: { roomCode: 'BLUE-CAT', playerName: '  Léa  ' } },
      { kind: 'player', playerId: 'tmp', socketId: 's' },
      withFakeDeps(),
    );
    expect(r.kind).toBe('accept');
    expect(room.getPlayers()[0].name).toBe('Léa');
  });
});

describe('lobby reducer — room.leave', () => {
  it('retire le player et broadcast player.left', () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    const r = applyLobby(
      room,
      { type: 'room.leave', payload: { roomId: 'r1' } },
      player('p1'),
      withFakeDeps(),
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits).toHaveLength(1);
    expect(r.emits[0].type).toBe('player.left');
    if (r.emits[0].type === 'player.left') {
      expect(r.emits[0].payload.playerId).toBe('p1');
    }
    expect(room.playerCount()).toBe(0);
  });

  it('ne crashe pas si le player a déjà disparu', () => {
    const room = makeRoom();
    const r = applyLobby(
      room,
      { type: 'room.leave', payload: { roomId: 'r1' } },
      player('p-fantome'),
      withFakeDeps(),
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits).toHaveLength(0);
  });
});

describe('lobby reducer — game.start', () => {
  it('passe en briefing et distribue les rôles', () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
    const r = applyLobby(
      room,
      { type: 'game.start', payload: { roomId: 'r1' } },
      host(),
      withFakeDeps(),
    );
    expect(r.kind).toBe('accept');
    expect(room.status).toBe('briefing');
    if (r.kind !== 'accept') return;

    // Broadcast game.started en premier
    const broadcast = r.emits.find((e) => e.to === 'room');
    expect(broadcast?.type).toBe('game.started');

    // Un private.role-revealed par joueur
    const roles = r.emits.filter((e) => e.type === 'private.role-revealed');
    expect(roles).toHaveLength(3);
    // Chaque rôle est ciblé sur le bon socket
    const sockets = roles.map((e) => (typeof e.to === 'object' ? e.to.socketId : '')).sort();
    expect(sockets).toEqual(['sock-p1', 'sock-p2', 'sock-p3'].sort());

    // Un private.objective par joueur
    const objectives = r.emits.filter((e) => e.type === 'private.objective');
    expect(objectives).toHaveLength(3);

    // Un private.dossiers UNIQUEMENT pour le 1er joueur (cf. makeFakeHooks)
    const dossiers = r.emits.filter((e) => e.type === 'private.dossiers');
    expect(dossiers).toHaveLength(1);
    expect((dossiers[0].to as { socketId: string }).socketId).toBe('sock-p1');
  });

  it("le broadcast game.started écrase les noms placeholder du hook avec les vrais pseudos (overlay)", () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
    const r = applyLobby(
      room,
      { type: 'game.start', payload: { roomId: 'r1' } },
      host(),
      withFakeDeps(),
    );
    if (r.kind !== 'accept') return;
    const broadcast = r.emits.find((e) => e.type === 'game.started');
    if (broadcast?.type !== 'game.started') throw new Error('attendu game.started');
    const { players } = broadcast.payload.initialState;
    expect(players['p1']?.name).toBe('Léa');
    expect(players['p2']?.name).toBe('Sami');
    expect(players['p3']?.name).toBe('Aïcha');
    expect(broadcast.payload.initialState.roomId).toBe('r1');
  });

  it("émet aussi state.snapshot ciblé Host + chaque Player (slice 3d)", () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
    const r = applyLobby(
      room,
      { type: 'game.start', payload: { roomId: 'r1' } },
      host(),
      withFakeDeps(),
    );
    if (r.kind !== 'accept') throw new Error('attendu accept');

    const snapshots = r.emits.filter((e) => e.type === 'state.snapshot');
    // 1 snapshot Host + 3 Player.
    expect(snapshots).toHaveLength(4);

    const hostSnap = snapshots.find(
      (e) => typeof e.to === 'object' && e.to.socketId === HOST_SOCKET,
    );
    expect(hostSnap).toBeDefined();
    if (hostSnap?.type === 'state.snapshot') {
      expect(hostSnap.payload.audience).toBe('host');
      expect(hostSnap.payload.version).toBe(0);
      expect(hostSnap.payload.private).toBeUndefined();
      expect(hostSnap.payload.hostMeta).toEqual({});
    }

    const playerSnaps = snapshots.filter(
      (e) => typeof e.to === 'object' && e.to.socketId !== HOST_SOCKET,
    );
    expect(playerSnaps).toHaveLength(3);
    for (const snap of playerSnaps) {
      if (snap.type !== 'state.snapshot') continue;
      expect(snap.payload.audience).toBe('player');
      expect(snap.payload.private).toBeDefined();
      expect(snap.payload.private?.roleId).toBeTruthy();
      expect(snap.payload.hostMeta).toBeUndefined();
    }
  });

  it("le broadcast game.started porte le state public initial", () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'A', socketId: 'sock-p3', joinedAt: new Date() });
    const r = applyLobby(
      room,
      { type: 'game.start', payload: { roomId: 'r1' } },
      host(),
      withFakeDeps(),
    );
    if (r.kind !== 'accept') return;
    const broadcast = r.emits.find((e) => e.type === 'game.started');
    expect(broadcast).toBeDefined();
    if (broadcast?.type === 'game.started') {
      expect(broadcast.payload.initialState.status).toBe('briefing');
      expect(Object.keys(broadcast.payload.initialState.players)).toHaveLength(3);
    }
  });
});
