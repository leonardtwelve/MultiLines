import { describe, expect, it } from 'vitest';
import type {
  GameEndReason,
  PlayerId,
  PrivatePlayerState,
  PublicPlayer,
  TurnEvent,
} from '@pixel-quests/shared';
import { Room } from '../../Room';
import type { AdventureHooks, FinalScore, RoleDistribution } from '../hooks';
import type { Sender } from '../types';
import { applyBriefing, type BriefingReducerDeps } from './briefing';

function makeRoom(): Room {
  const room = new Room({
    id: 'r1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId: 'host-sock',
  });
  room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
  room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
  room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
  room.setStatus('briefing');
  return room;
}

function player(playerId: string): Sender {
  return { kind: 'player', playerId, socketId: `sock-${playerId}` };
}

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
        objective: { id: 'obj', description: 'mock', hidden: false },
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

const deps: BriefingReducerDeps = { hooks: fakeHooks };

describe('briefing reducer — briefing.ready', () => {
  it('marque le joueur comme prêt et broadcast briefing.ready-changed', () => {
    const room = makeRoom();
    const r = applyBriefing(
      room,
      { type: 'briefing.ready', payload: {} },
      player('p1'),
      deps,
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits).toHaveLength(1);
    expect(r.emits[0].type).toBe('briefing.ready-changed');
    if (r.emits[0].type === 'briefing.ready-changed') {
      expect(r.emits[0].payload.readyPlayerIds).toEqual(['p1']);
    }
    expect(room.isBriefingReady('p1')).toBe(true);
    expect(room.briefingReadyCount()).toBe(1);
  });

  it('est idempotent (double-tap → pas de re-emit)', () => {
    const room = makeRoom();
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p1'), deps);
    const r2 = applyBriefing(
      room,
      { type: 'briefing.ready', payload: {} },
      player('p1'),
      deps,
    );
    expect(r2.kind).toBe('accept');
    if (r2.kind !== 'accept') return;
    expect(r2.emits).toHaveLength(0);
    expect(room.briefingReadyCount()).toBe(1);
  });

  it("ne transitionne pas vers casse tant qu'un joueur manque", () => {
    const room = makeRoom();
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p1'), deps);
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p2'), deps);
    expect(room.status).toBe('briefing');
    expect(room.briefingReadyCount()).toBe(2);
  });

  it('transitionne vers casse quand tous les joueurs sont prêts', () => {
    const room = makeRoom();
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p1'), deps);
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p2'), deps);
    const r3 = applyBriefing(
      room,
      { type: 'briefing.ready', payload: {} },
      player('p3'),
      deps,
    );
    expect(r3.kind).toBe('accept');
    expect(room.status).toBe('casse');
    // briefingReady est vidé en sortie de briefing (cf. Room.setStatus).
    expect(room.briefingReadyCount()).toBe(0);
  });

  it("le 'broadcast briefing.ready-changed' liste tous les ready cumulés", () => {
    const room = makeRoom();
    applyBriefing(room, { type: 'briefing.ready', payload: {} }, player('p1'), deps);
    const r2 = applyBriefing(
      room,
      { type: 'briefing.ready', payload: {} },
      player('p2'),
      deps,
    );
    if (r2.kind !== 'accept') return;
    const ev = r2.emits[0];
    if (ev?.type === 'briefing.ready-changed') {
      expect(new Set(ev.payload.readyPlayerIds)).toEqual(new Set(['p1', 'p2']));
    }
  });
});
