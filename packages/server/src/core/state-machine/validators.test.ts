import { describe, expect, it } from 'vitest';
import { Room } from '../Room';
import type { Sender } from './types';
import {
  validateActionPropose,
  validateBriefingReady,
  validateGameStart,
  validateMessage,
  validateRoomJoin,
  validateRoomLeave,
  validateSenderIsHost,
  validateSenderIsPlayer,
} from './validators';

function makeRoom(hostSocketId = 'host-sock-1'): Room {
  return new Room({
    id: 'r1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId,
  });
}

function host(socketId = 'host-sock-1'): Sender {
  return { kind: 'host', socketId };
}

function player(playerId: string, socketId = `sock-${playerId}`): Sender {
  return { kind: 'player', playerId, socketId };
}

function addPlayers(room: Room, n: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `p${i + 1}`;
    room.addPlayer({ id, name: `J${i + 1}`, socketId: `s-${id}`, joinedAt: new Date() });
    ids.push(id);
  }
  return ids;
}

describe('validateSenderIsHost', () => {
  it('OK quand le sender est le host de la room', () => {
    const room = makeRoom('host-sock-1');
    expect(validateSenderIsHost(room, host('host-sock-1'))).toBeNull();
  });

  it('refuse si sender est player', () => {
    const room = makeRoom();
    const err = validateSenderIsHost(room, player('p1'));
    expect(err?.code).toBe('ROOM_STATE_INVALID');
    expect(err?.message).toMatch(/organisateur/i);
  });

  it('refuse si sender prétend être host mais avec un socket différent', () => {
    const room = makeRoom('host-sock-1');
    expect(validateSenderIsHost(room, host('autre-sock'))?.code).toBe('ROOM_STATE_INVALID');
  });
});

describe('validateSenderIsPlayer', () => {
  it('OK si le player est inscrit', () => {
    const room = makeRoom();
    addPlayers(room, 1);
    expect(validateSenderIsPlayer(room, player('p1'))).toBeNull();
  });

  it("refuse si sender est host", () => {
    const room = makeRoom();
    expect(validateSenderIsPlayer(room, host())?.code).toBe('NOT_IN_ROOM');
  });

  it("refuse si le player n'est pas/plus inscrit", () => {
    const room = makeRoom();
    expect(validateSenderIsPlayer(room, player('p-fantome'))?.code).toBe('NOT_IN_ROOM');
  });
});

describe('validateRoomJoin', () => {
  it('OK en lobby avec un pseudo non vide', () => {
    const room = makeRoom();
    expect(validateRoomJoin(room, 'Léa')).toBeNull();
  });

  it('refuse si la room est dans un autre statut', () => {
    const room = makeRoom();
    room.setStatus('casse');
    expect(validateRoomJoin(room, 'Léa')?.code).toBe('ROOM_STATE_INVALID');
  });

  it('refuse si la room est pleine', () => {
    const room = makeRoom();
    addPlayers(room, 5);
    expect(validateRoomJoin(room, 'Léa')?.code).toBe('ROOM_FULL');
  });

  it('refuse si le pseudo est vide ou blanc', () => {
    const room = makeRoom();
    expect(validateRoomJoin(room, '')?.code).toBe('TARGET_INVALID');
    expect(validateRoomJoin(room, '   ')?.code).toBe('TARGET_INVALID');
  });
});

describe('validateRoomLeave', () => {
  it('OK pour un player inscrit', () => {
    const room = makeRoom();
    addPlayers(room, 1);
    expect(validateRoomLeave(room, player('p1'))).toBeNull();
  });

  it('refuse pour un non-inscrit', () => {
    const room = makeRoom();
    expect(validateRoomLeave(room, player('p1'))?.code).toBe('NOT_IN_ROOM');
  });
});

describe('validateGameStart', () => {
  it('OK avec host + lobby + 3 joueurs', () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 3);
    expect(validateGameStart(room, host('h-sock'))).toBeNull();
  });

  it('refuse si le sender n’est pas host', () => {
    const room = makeRoom();
    addPlayers(room, 3);
    expect(validateGameStart(room, player('p1'))?.code).toBe('ROOM_STATE_INVALID');
  });

  it('refuse si on est plus en lobby', () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 3);
    room.setStatus('briefing');
    expect(validateGameStart(room, host('h-sock'))?.code).toBe('ROOM_STATE_INVALID');
  });

  it('refuse si < 3 joueurs (mode normal)', () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 2);
    const err = validateGameStart(room, host('h-sock'));
    expect(err?.code).toBe('ROOM_STATE_INVALID');
    expect(err?.message).toMatch(/au moins 3/i);
  });

  it("DEV_ALLOW_SOLO=true : accepte 1 joueur", () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 1);
    const err = validateGameStart(room, host('h-sock'), { devAllowSolo: true });
    expect(err).toBeNull();
  });

  it("DEV_ALLOW_SOLO=true : accepte 2 joueurs aussi", () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 2);
    const err = validateGameStart(room, host('h-sock'), { devAllowSolo: true });
    expect(err).toBeNull();
  });

  it("DEV_ALLOW_SOLO=true : refuse encore 0 joueur (message dédié)", () => {
    const room = makeRoom('h-sock');
    const err = validateGameStart(room, host('h-sock'), { devAllowSolo: true });
    expect(err?.code).toBe('ROOM_STATE_INVALID');
    expect(err?.message).toMatch(/aucun joueur/i);
  });
});

describe('validateActionPropose (slice 3e-2)', () => {
  // Helper : monte une session minimale en `casse` avec turn actif p1.
  function makeCasseRoom(): {
    room: ReturnType<typeof makeRoom>;
  } {
    const room = makeRoom('h-sock');
    addPlayers(room, 3);
    room.setStatus('briefing');
    room.setStatus('casse');
    room.setSession({
      public: {
        roomId: room.id,
        status: 'casse',
        adventureId: 'banque-lune',
        alert: 20,
        players: {},
        turn: { number: 1, activePlayerId: 'p1' },
      },
      privates: {
        p1: {
          playerId: 'p1',
          roleId: 'hacker',
          capabilities: ['intrusion-systeme', 'collecte-donnees', 'surcharge'],
          objective: { id: 'H1', description: 'X', hidden: false },
          dossiers: [],
          pendingPactes: [],
        },
        p2: {
          playerId: 'p2',
          roleId: 'faussaire',
          capabilities: ['faux-ordre'],
          objective: { id: 'F1', description: 'Y', hidden: false },
          dossiers: [],
          pendingPactes: [],
        },
        p3: {
          playerId: 'p3',
          roleId: 'infiltre',
          capabilities: ['reconnaissance'],
          objective: { id: 'I1', description: 'Z', hidden: false },
          dossiers: [],
          pendingPactes: [],
        },
      },
      turnOrder: ['p1', 'p2', 'p3'],
    });
    return { room };
  }

  it("OK : action valide du joueur actif en casse", () => {
    const { room } = makeCasseRoom();
    const err = validateActionPropose(
      room,
      { actionId: 'intrusion-systeme' },
      player('p1'),
    );
    expect(err).toBeNull();
  });

  it("refuse si pas en casse → ROOM_STATE_INVALID", () => {
    const { room } = makeCasseRoom();
    room.setStatus('briefing');
    const err = validateActionPropose(room, { actionId: 'intrusion-systeme' }, player('p1'));
    expect(err?.code).toBe('ROOM_STATE_INVALID');
  });

  it("refuse si pas le joueur actif → NOT_YOUR_TURN", () => {
    const { room } = makeCasseRoom();
    const err = validateActionPropose(
      room,
      { actionId: 'intrusion-systeme' },
      player('p2'),
    );
    expect(err?.code).toBe('NOT_YOUR_TURN');
  });

  it("refuse si action hors capabilities → ACTION_NOT_ALLOWED", () => {
    const { room } = makeCasseRoom();
    const err = validateActionPropose(room, { actionId: 'faux-ordre' }, player('p1'));
    expect(err?.code).toBe('ACTION_NOT_ALLOWED');
  });

  it("refuse si sender Host → NOT_IN_ROOM", () => {
    const { room } = makeCasseRoom();
    const err = validateActionPropose(
      room,
      { actionId: 'intrusion-systeme' },
      host('h-sock'),
    );
    expect(err?.code).toBe('NOT_IN_ROOM');
  });
});

describe('validateBriefingReady', () => {
  it('OK pour un player inscrit pendant briefing', () => {
    const room = makeRoom();
    addPlayers(room, 3);
    room.setStatus('briefing');
    expect(validateBriefingReady(room, player('p1'))).toBeNull();
  });

  it('refuse hors phase briefing', () => {
    const room = makeRoom();
    addPlayers(room, 3);
    expect(validateBriefingReady(room, player('p1'))?.code).toBe('ROOM_STATE_INVALID');
  });

  it('refuse si pas inscrit dans la room', () => {
    const room = makeRoom();
    room.setStatus('briefing');
    expect(validateBriefingReady(room, player('p-fantome'))?.code).toBe('NOT_IN_ROOM');
  });
});

describe('validateMessage (dispatch)', () => {
  it('route room.join → validateRoomJoin', () => {
    const room = makeRoom();
    const msg = {
      type: 'room.join',
      payload: { roomCode: 'BLUE-CAT', playerName: 'Léa' },
    } as const;
    expect(validateMessage(room, msg, host())).toBeNull();
  });

  it('route game.start → validateGameStart', () => {
    const room = makeRoom('h-sock');
    addPlayers(room, 2);
    const msg = { type: 'game.start', payload: { roomId: 'r1' } } as const;
    expect(validateMessage(room, msg, host('h-sock'))?.code).toBe('ROOM_STATE_INVALID');
  });

  it('laisse passer les messages non encore couverts (slice future)', () => {
    const room = makeRoom();
    const msg = { type: 'ping', payload: { t: 0 } } as const;
    expect(validateMessage(room, msg, host())).toBeNull();
  });
});
