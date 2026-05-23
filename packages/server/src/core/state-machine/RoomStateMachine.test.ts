import { describe, expect, it, vi } from 'vitest';
import type {
  GameEndReason,
  PlayerId,
  PrivatePlayerState,
  PublicPlayer,
  TurnEvent,
} from '@pixel-quests/shared';
import { Room } from '../Room';
import { RoomStateMachine } from './RoomStateMachine';
import type { AdventureHooks, FinalScore, RoleDistribution } from './hooks';
import type { Sender } from './types';

const fakeHooks: AdventureHooks = {
  adventureId: 'banque-lune',
  distributeRoles(playerIds: ReadonlyArray<PlayerId>): RoleDistribution {
    const privates: Record<PlayerId, PrivatePlayerState> = {};
    const players: Record<PlayerId, PublicPlayer> = {};
    for (const id of playerIds) {
      privates[id] = {
        playerId: id,
        roleId: 'agent',
        capabilities: [],
        objective: { id: 'obj', description: '', hidden: false },
        dossiers: [],
        pendingPactes: [],
      };
      players[id] = { id, name: id, color: '#fff', connected: true };
    }
    return {
      privates,
      publicState: { roomId: 'r1', status: 'briefing', adventureId: 'banque-lune', players },
    };
  },
  resolveAction: () => null,
  triggerTurnEvents: (): ReadonlyArray<TurnEvent> => [],
  computeFinalScore: (_s, endReason: GameEndReason): FinalScore => ({
    endReason,
    headline: '',
    perPlayer: {},
  }),
};

function makeRoom(): Room {
  return new Room({
    id: 'r1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId: 'host-sock',
  });
}

function host(): Sender {
  return { kind: 'host', socketId: 'host-sock' };
}

function player(playerId: string): Sender {
  return { kind: 'player', playerId, socketId: `sock-${playerId}` };
}

describe('RoomStateMachine — dispatcher', () => {
  it('valide et dispatche un room.join vers le reducer lobby', () => {
    const room = makeRoom();
    let nextId = 0;
    const sm = new RoomStateMachine(room, {
      hooks: fakeHooks,
      newPlayerId: () => `gen-p${++nextId}`,
    });
    const r = sm.handle(
      { type: 'room.join', payload: { roomCode: 'BLUE-CAT', playerName: 'Léa' } },
      { kind: 'player', playerId: 'tmp', socketId: 'sock-tmp' },
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits[0].type).toBe('player.joined');
    expect(room.playerCount()).toBe(1);
  });

  it('reject quand la validation échoue (pseudo vide)', () => {
    const room = makeRoom();
    const sm = new RoomStateMachine(room, { hooks: fakeHooks });
    const r = sm.handle(
      { type: 'room.join', payload: { roomCode: 'BLUE-CAT', playerName: '' } },
      { kind: 'player', playerId: 'tmp', socketId: 's' },
    );
    expect(r.kind).toBe('reject');
    if (r.kind !== 'reject') return;
    expect(r.error.code).toBe('TARGET_INVALID');
  });

  it('enchaîne lobby → briefing → casse via game.start + tous les briefing.ready', () => {
    const room = makeRoom();
    const sm = new RoomStateMachine(room, { hooks: fakeHooks });

    // Pré-remplissage : 3 joueurs.
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });

    // Host lance la partie.
    const r1 = sm.handle({ type: 'game.start', payload: { roomId: 'r1' } }, host());
    expect(r1.kind).toBe('accept');
    expect(room.status).toBe('briefing');

    // Les 3 joueurs valident leur briefing.
    sm.handle({ type: 'briefing.ready', payload: {} }, player('p1'));
    sm.handle({ type: 'briefing.ready', payload: {} }, player('p2'));
    expect(room.status).toBe('briefing');
    const r4 = sm.handle({ type: 'briefing.ready', payload: {} }, player('p3'));
    expect(r4.kind).toBe('accept');
    expect(room.status).toBe('casse');
  });

  it('reject briefing.ready si on est encore en lobby', () => {
    const room = makeRoom();
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    const sm = new RoomStateMachine(room, { hooks: fakeHooks });
    const r = sm.handle({ type: 'briefing.ready', payload: {} }, player('p1'));
    expect(r.kind).toBe('reject');
    if (r.kind !== 'reject') return;
    expect(r.error.code).toBe('ROOM_STATE_INVALID');
  });

  it('accept silencieux + console.warn quand le statut n’a pas encore de reducer (slice future)', () => {
    const room = makeRoom();
    // `vote` est encore stubbé en slice 3e-2 (impl en 3e-3) → c'est
    // un bon cas pour vérifier le fallback no-reducer + warn.
    room.setStatus('vote');
    const sm = new RoomStateMachine(room, { hooks: fakeHooks });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const r = sm.handle({ type: 'ping', payload: { t: 0 } }, host());
      expect(r.kind).toBe('accept');
      if (r.kind !== 'accept') return;
      expect(r.emits).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledOnce();
      const [fmt, status, msgType] = warnSpy.mock.calls[0];
      expect(fmt).toContain('no reducer');
      expect(status).toBe('vote');
      expect(msgType).toBe('ping');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
