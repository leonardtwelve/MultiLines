import { describe, expect, it } from 'vitest';
import type { PublicGameState, StatePatchBatch } from '@pixel-quests/shared';
import { Room } from '../../Room';
import type { AdventureHooks } from '../hooks';
import type { Sender } from '../types';
import { ALERT_THRESHOLD_FAILURE, applyCasse, enterCasse, MAX_TURNS } from './casse';

// === Helpers fixtures ===

function makeRoom(): Room {
  const room = new Room({
    id: 'r1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId: 'h-sock',
  });
  return room;
}

function basePublicState(overrides: Partial<PublicGameState> = {}): PublicGameState {
  return {
    roomId: 'r1',
    status: 'casse',
    adventureId: 'banque-lune',
    alert: 20,
    players: {
      p1: { id: 'p1', name: 'Léa', color: '#3affc7', connected: true, credits: 3 },
      p2: { id: 'p2', name: 'Sami', color: '#ffc83a', connected: true, credits: 3 },
      p3: { id: 'p3', name: 'Aïcha', color: '#c93aff', connected: true, credits: 3 },
    },
    ...overrides,
  };
}

function attachSession(room: Room, opts: { alert?: number; turnNumber?: number } = {}): void {
  room.addPlayer({ id: 'p1', name: 'Léa', socketId: 's1', joinedAt: new Date() });
  room.addPlayer({ id: 'p2', name: 'Sami', socketId: 's2', joinedAt: new Date() });
  room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 's3', joinedAt: new Date() });
  room.setStatus('briefing');
  room.setStatus('casse');
  const public_ = basePublicState({ alert: opts.alert ?? 20 });
  if (opts.turnNumber !== undefined) {
    public_.turn = { number: opts.turnNumber, activePlayerId: 'p1' };
  }
  room.setSession({
    public: public_,
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
        capabilities: ['faux-ordre', 'substitution', 'authentifier'],
        objective: { id: 'F1', description: 'Y', hidden: false },
        dossiers: [],
        pendingPactes: [],
      },
      p3: {
        playerId: 'p3',
        roleId: 'infiltre',
        capabilities: ['reconnaissance', 'detournement-garde', 'crochetage'],
        objective: { id: 'I1', description: 'Z', hidden: false },
        dossiers: [],
        pendingPactes: [],
      },
    },
    turnOrder: ['p1', 'p2', 'p3'],
  });
}

const fixedRng = (v: number) => () => Math.min(0.9999, Math.max(0, v));

const fakeHooks = (_rng: () => number): AdventureHooks => ({
  adventureId: 'banque-lune',
  distributeRoles: () => ({
    privates: {},
    publicState: basePublicState(),
  }),
  resolveAction: (actionId, _params, state, byPlayerId) => {
    if (actionId === 'collecte-donnees') {
      const credits = state.players[byPlayerId]?.credits ?? 0;
      return {
        success: true,
        patches: [
          { op: 'replace', path: `/players/${byPlayerId}/credits`, value: credits + 2 },
        ],
        events: [],
      };
    }
    if (actionId === 'intrusion-systeme-fail') {
      // Fake action qui crash l'alerte au max — pour tester l'exit condition.
      return {
        success: false,
        patches: [{ op: 'replace', path: '/alert', value: 100 }],
        events: [],
      };
    }
    return null;
  },
  triggerTurnEvents: () => [],
  computeFinalScore: () => ({ endReason: 'success-early', headline: 'X', perPlayer: {} }),
});

const player = (id: 'p1' | 'p2' | 'p3'): Sender => ({
  kind: 'player',
  playerId: id,
  socketId: `s${id.slice(1)}`,
});

// === Tests ===

describe('enterCasse — initialisation du tour 1', () => {
  it("pose status='casse' + turn 1 + activePlayerId = premier du turnOrder + version bump", () => {
    const room = makeRoom();
    attachSession(room);
    const r = enterCasse(room);
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    const patchEmit = r.emits.find((e) => e.type === 'state.patch');
    expect(patchEmit).toBeDefined();
    if (patchEmit?.type !== 'state.patch') throw new Error('expected');
    const batch = patchEmit.payload as StatePatchBatch;
    expect(batch.patches.find((p) => p.path === '/status')).toMatchObject({
      op: 'replace',
      value: 'casse',
    });
    expect(batch.patches.find((p) => p.path === '/turn')).toMatchObject({
      op: 'add',
      value: { number: 1, activePlayerId: 'p1' },
    });
    expect(batch.version).toBe(1);
    // turn.started broadcast.
    const turnStarted = r.emits.find((e) => e.type === 'turn.started');
    expect(turnStarted?.payload).toMatchObject({ turnNumber: 1, activePlayerId: 'p1' });
  });
});

describe('applyCasse — action.propose', () => {
  it("résout l'action + émet state.patch + action.resolved + advance turn", () => {
    const room = makeRoom();
    attachSession(room);
    enterCasse(room); // pose turn 1 / p1
    const r = applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'collecte-donnees', params: {} } },
      player('p1'),
      { hooks: fakeHooks(fixedRng(0.5)) },
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    // state.patch : crédits p1 +2 ET turn → 2 / p2
    const patchEmit = r.emits.find((e) => e.type === 'state.patch');
    if (patchEmit?.type !== 'state.patch') throw new Error('expected');
    const batch = patchEmit.payload as StatePatchBatch;
    expect(batch.patches.find((p) => p.path === '/players/p1/credits')).toMatchObject({
      value: 5,
    });
    expect(batch.patches.find((p) => p.path === '/turn')).toMatchObject({
      value: { number: 2, activePlayerId: 'p2' },
    });
    // action.resolved + turn.started broadcast.
    expect(r.emits.find((e) => e.type === 'action.resolved')?.payload).toMatchObject({
      proposalId: 'collecte-donnees',
      actionId: 'collecte-donnees',
      byPlayerId: 'p1',
      success: true,
    });
    expect(r.emits.find((e) => e.type === 'turn.started')?.payload).toMatchObject({
      turnNumber: 2,
      activePlayerId: 'p2',
    });
  });

  it("rejette une action inconnue côté hooks → ACTION_UNKNOWN", () => {
    const room = makeRoom();
    attachSession(room);
    enterCasse(room);
    const r = applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'mystery', params: {} } },
      player('p1'),
      { hooks: fakeHooks(fixedRng(0.5)) },
    );
    expect(r.kind).toBe('reject');
    if (r.kind !== 'reject') return;
    expect(r.error.code).toBe('ACTION_UNKNOWN');
  });

  it("rotation des tours : p1 → p2 → p3 → p1 (cyclique)", () => {
    const room = makeRoom();
    attachSession(room);
    enterCasse(room);
    const deps = { hooks: fakeHooks(fixedRng(0.5)) };
    applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'collecte-donnees', params: {} } },
      player('p1'),
      deps,
    );
    expect(room.getSession()?.public.turn?.activePlayerId).toBe('p2');
    applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'collecte-donnees', params: {} } },
      player('p2'),
      deps,
    );
    expect(room.getSession()?.public.turn?.activePlayerId).toBe('p3');
    applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'collecte-donnees', params: {} } },
      player('p3'),
      deps,
    );
    // Retour à p1.
    expect(room.getSession()?.public.turn?.activePlayerId).toBe('p1');
    expect(room.getSession()?.public.turn?.number).toBe(4);
  });
});

describe('applyCasse — conditions de sortie (spec §3.3)', () => {
  it("alerte ≥ ALERT_THRESHOLD_FAILURE → game.ended endReason='failure-alert'", () => {
    expect(ALERT_THRESHOLD_FAILURE).toBe(100);
    const room = makeRoom();
    attachSession(room, { alert: 90 });
    enterCasse(room);
    const r = applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'intrusion-systeme-fail', params: {} } },
      player('p1'),
      { hooks: fakeHooks(fixedRng(0.5)) },
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    const ended = r.emits.find((e) => e.type === 'game.ended');
    expect(ended?.payload).toMatchObject({ endReason: 'failure-alert' });
    expect(room.status).toBe('extraction');
  });

  it("turnNumber atteint MAX_TURNS → game.ended endReason='turn-limit'", () => {
    expect(MAX_TURNS).toBe(10);
    const room = makeRoom();
    attachSession(room, { turnNumber: MAX_TURNS });
    // Pas de enterCasse — on a déjà un turn posé manuellement.
    const r = applyCasse(
      room,
      { type: 'action.propose', payload: { actionId: 'collecte-donnees', params: {} } },
      player('p1'),
      { hooks: fakeHooks(fixedRng(0.5)) },
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    const ended = r.emits.find((e) => e.type === 'game.ended');
    expect(ended?.payload).toMatchObject({ endReason: 'turn-limit' });
  });
});

describe('applyCasse — messages non implémentés (slice 3e-2b)', () => {
  it("move.tile → accept silencieux (sera impl en 3e-2b)", () => {
    const room = makeRoom();
    attachSession(room);
    enterCasse(room);
    const r = applyCasse(
      room,
      { type: 'move.tile', payload: { x: 5, y: 8 } },
      player('p1'),
      { hooks: fakeHooks(fixedRng(0.5)) },
    );
    expect(r.kind).toBe('accept');
    if (r.kind !== 'accept') return;
    expect(r.emits).toHaveLength(0);
  });
});
