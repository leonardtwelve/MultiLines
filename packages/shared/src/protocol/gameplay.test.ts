import { describe, expect, it } from 'vitest';
import type {
  ActionResultSummary,
  ErrorCode,
  ErrorPayload,
  HostRequest,
  PayloadOf,
  PlayerRequest,
  PrivateEvent,
  PrivatePlayerState,
  PublicGameState,
  ServerEvent,
  Snapshot,
  StatePatch,
  StatePatchBatch,
  TurnEvent,
  TurnEventBroadcast,
} from './index';
import { PRIVATE_EVENT_TYPES, PRIVATE_PATCH_PATH_PREFIX } from './index';

describe('Protocol gameplay — Prompt 3c types', () => {
  // === HostRequest ===

  it('HostRequest accepte les commandes lifecycle', () => {
    const a: HostRequest = { type: 'game.pause', payload: { roomId: 'r1' } };
    const b: HostRequest = { type: 'game.resume', payload: { roomId: 'r1' } };
    const c: HostRequest = { type: 'game.cancel', payload: { roomId: 'r1' } };
    expect([a.type, b.type, c.type]).toEqual(['game.pause', 'game.resume', 'game.cancel']);
  });

  it('HostRequest accepte state.resync.request', () => {
    const req: HostRequest = { type: 'state.resync.request', payload: {} };
    expect(req.type).toBe('state.resync.request');
  });

  // === PlayerRequest ===

  it('PlayerRequest : action.propose avec actionId + params', () => {
    const req: PlayerRequest = {
      type: 'action.propose',
      payload: { actionId: 'infiltrate', params: { targetZoneId: 'coffres' } },
    };
    if (req.type === 'action.propose') {
      expect(req.payload.actionId).toBe('infiltrate');
      expect(req.payload.params['targetZoneId']).toBe('coffres');
    }
  });

  it('PlayerRequest : pacte et vote sont typés', () => {
    const pacte: PlayerRequest = {
      type: 'pacte.propose',
      payload: { targetPlayerId: 'p1', terms: 'tu me files 2 crédits' },
    };
    const vote: PlayerRequest = {
      type: 'vote.cast',
      payload: { ballotId: 'b1', choice: 'partager' },
    };
    expect(pacte.type).toBe('pacte.propose');
    expect(vote.type).toBe('vote.cast');
  });

  it('PlayerRequest : briefing.ready a un payload vide typé', () => {
    const ready: PlayerRequest = { type: 'briefing.ready', payload: {} };
    expect(ready.type).toBe('briefing.ready');
  });

  it('PlayerRequest : move.tile prend (x, y)', () => {
    const mv: PlayerRequest = { type: 'move.tile', payload: { x: 12, y: 8 } };
    if (mv.type === 'move.tile') {
      expect(mv.payload.x).toBe(12);
      expect(mv.payload.y).toBe(8);
    }
  });

  // === ServerEvent lifecycle ===

  it('game.started porte un PublicGameState initial', () => {
    const initialState: PublicGameState = {
      roomId: 'r1',
      status: 'casse',
      adventureId: 'banque-lune',
      players: {
        p1: { id: 'p1', name: 'Léa', color: '#ffcc66', connected: true },
      },
    };
    const evt: ServerEvent = { type: 'game.started', payload: { initialState } };
    if (evt.type === 'game.started') {
      expect(evt.payload.initialState.status).toBe('casse');
    }
  });

  it('game.ended discrimine la cause via endReason', () => {
    const finalState: PublicGameState = {
      roomId: 'r1',
      status: 'ended',
      adventureId: 'banque-lune',
      players: {},
    };
    const fail: ServerEvent = {
      type: 'game.ended',
      payload: { endReason: 'failure-alert', finalState },
    };
    const win: ServerEvent = {
      type: 'game.ended',
      payload: { endReason: 'success-early', finalState },
    };
    if (fail.type === 'game.ended') {
      expect(fail.payload.endReason).toBe('failure-alert');
    }
    if (win.type === 'game.ended') {
      expect(win.payload.endReason).toBe('success-early');
    }
  });

  // === Tours et actions ===

  it('turn.started porte un timer deadline optionnel', () => {
    const evt: TurnEventBroadcast = {
      type: 'turn.started',
      payload: { turnNumber: 3, activePlayerId: 'p1', deadline: 1_700_000_000_000 },
    };
    if (evt.type === 'turn.started') {
      expect(evt.payload.deadline).toBe(1_700_000_000_000);
    }
  });

  it('turn.skipped précise la raison', () => {
    const evt: TurnEventBroadcast = {
      type: 'turn.skipped',
      payload: { turnNumber: 3, playerId: 'p1', reason: 'inactivity' },
    };
    if (evt.type === 'turn.skipped') {
      expect(evt.payload.reason).toBe('inactivity');
    }
  });

  it('TurnEvent reste open-ended (kind + payload generic)', () => {
    const e: TurnEvent = { kind: 'event.alert-raised', payload: { delta: 5 } };
    expect(e.kind).toBe('event.alert-raised');
  });

  it('action.resolved renvoie un ActionResultSummary', () => {
    const summary: ActionResultSummary = {
      proposalId: 'prop-1',
      actionId: 'infiltrate',
      byPlayerId: 'p1',
      success: true,
    };
    const evt: ServerEvent = { type: 'action.resolved', payload: summary };
    if (evt.type === 'action.resolved') {
      expect(evt.payload.success).toBe(true);
    }
  });

  it('action.rejected embarque un ErrorPayload', () => {
    const err: ErrorPayload = {
      code: 'NOT_YOUR_TURN',
      message: "Ce n'est pas à toi de jouer.",
      proposalId: 'prop-2',
    };
    const evt: ServerEvent = {
      type: 'action.rejected',
      payload: { proposalId: 'prop-2', error: err },
    };
    if (evt.type === 'action.rejected') {
      expect(evt.payload.error.code).toBe('NOT_YOUR_TURN');
    }
  });

  // === State sync ===

  it('state.snapshot porte un Snapshot avec audience', () => {
    const snap: Snapshot = {
      version: 0,
      audience: 'player',
      public: {
        roomId: 'r1',
        status: 'briefing',
        adventureId: 'banque-lune',
        players: {},
      },
      private: {
        playerId: 'p1',
        roleId: 'infiltre',
        capabilities: ['infiltrate', 'observe'],
        objective: { id: 'obj-1', description: 'Récupère 3 dossiers', hidden: false },
        dossiers: [],
        pendingPactes: [],
      },
    };
    const evt: ServerEvent = { type: 'state.snapshot', payload: snap };
    if (evt.type === 'state.snapshot') {
      expect(evt.payload.audience).toBe('player');
    }
  });

  it('state.patch porte un StatePatchBatch versionné', () => {
    const batch: StatePatchBatch = {
      version: 5,
      patches: [
        { op: 'replace', path: '/turn/activePlayerId', value: 'p2' },
        { op: 'add', path: '/players/p1/dossiers/-', value: { id: 'd-1', kind: 'photo', label: 'cliché' } },
      ],
    };
    const evt: ServerEvent = { type: 'state.patch', payload: batch };
    if (evt.type === 'state.patch') {
      expect(evt.payload.version).toBe(5);
      expect(evt.payload.patches).toHaveLength(2);
    }
  });

  it('StatePatch supporte les 3 ops + pattern append /-', () => {
    const replace: StatePatch = { op: 'replace', path: '/alert', value: 50 };
    const add: StatePatch = { op: 'add', path: '/players/p1/dossiers/-', value: { id: 'd', kind: 'photo', label: 'x' } };
    const remove: StatePatch = { op: 'remove', path: '/players/p2' };
    expect([replace.op, add.op, remove.op]).toEqual(['replace', 'add', 'remove']);
  });

  // === Privés ===

  it('private.role-revealed est ciblé Player', () => {
    const evt: PrivateEvent = {
      type: 'private.role-revealed',
      payload: { roleId: 'infiltre', capabilities: ['infiltrate'] },
    };
    if (evt.type === 'private.role-revealed') {
      expect(evt.payload.roleId).toBe('infiltre');
    }
  });

  it('private.error porte un ErrorPayload', () => {
    const evt: PrivateEvent = {
      type: 'private.error',
      payload: { code: 'RATE_LIMITED', message: 'Doucement.' },
    };
    if (evt.type === 'private.error') {
      expect(evt.payload.code).toBe('RATE_LIMITED');
    }
  });

  it('PRIVATE_EVENT_TYPES liste exhaustive des privés', () => {
    expect(PRIVATE_EVENT_TYPES).toContain('private.role-revealed');
    expect(PRIVATE_EVENT_TYPES).toContain('private.error');
    expect(PRIVATE_EVENT_TYPES).toContain('private.host-meta');
    // Pas de fuite : un type public ne doit pas être listé ici
    expect(PRIVATE_EVENT_TYPES as ReadonlyArray<string>).not.toContain('game.started');
  });

  it('PRIVATE_PATCH_PATH_PREFIX = "/private"', () => {
    expect(PRIVATE_PATCH_PATH_PREFIX).toBe('/private');
  });

  // === ErrorCode (vérification exhaustive du sous-ensemble) ===

  it('ErrorCode couvre les cas anti-triche principaux', () => {
    const codes: ErrorCode[] = [
      'NOT_YOUR_TURN',
      'NOT_IN_ROOM',
      'ROOM_NOT_FOUND',
      'ROOM_FULL',
      'ROOM_STATE_INVALID',
      'ACTION_UNKNOWN',
      'ACTION_NOT_ALLOWED',
      'INSUFFICIENT_RESOURCE',
      'TARGET_INVALID',
      'PACTE_EXPIRED',
      'RATE_LIMITED',
      'INTERNAL',
    ];
    expect(codes).toHaveLength(12);
  });

  // === PrivatePlayerState ===

  it('PrivatePlayerState contient rôle + objectif + dossiers', () => {
    const priv: PrivatePlayerState = {
      playerId: 'p1',
      roleId: 'negociateur',
      capabilities: ['negotiate'],
      objective: { id: 'o', description: 'Convainc l\'Infiltré', hidden: true },
      dossiers: [{ id: 'd', kind: 'photo', label: 'preuve' }],
      tension: 2,
      pendingPactes: [
        {
          id: 'pac-1',
          fromPlayerId: 'p2',
          terms: 'troc info',
          expiresAt: 1_700_000_000_000,
        },
      ],
    };
    expect(priv.capabilities).toEqual(['negotiate']);
    expect(priv.pendingPactes).toHaveLength(1);
  });

  // === Garde-fous typage ===

  it('garde-fou : payload mal formé rejeté à la compilation', () => {
    // Tests inline (une ligne par cas) pour que @ts-expect-error cible
    // précisément la ligne qui doit échouer — pas la déclaration multi-ligne.
    // @ts-expect-error : actionId manque
    const bad1: PlayerRequest = { type: 'action.propose', payload: { params: {} } };
    const finalState = {} as PublicGameState;
    // @ts-expect-error : endReason invalide
    const bad2: ServerEvent = { type: 'game.ended', payload: { endReason: 'random-string', finalState } };
    // @ts-expect-error : op de patch invalide
    const bad3: StatePatch = { op: 'move', path: '/x', value: 1 };
    expect([bad1, bad2, bad3].length).toBe(3);
  });

  it('PayloadOf fonctionne sur les nouveaux events', () => {
    type GameStartedPayload = PayloadOf<ServerEvent, 'game.started'>;
    type ActionProposePayload = PayloadOf<PlayerRequest, 'action.propose'>;

    const gs: GameStartedPayload = {
      initialState: {
        roomId: 'r1',
        status: 'casse',
        adventureId: 'banque-lune',
        players: {},
      },
    };
    const ap: ActionProposePayload = { actionId: 'observe', params: {} };
    expect(gs.initialState.status).toBe('casse');
    expect(ap.actionId).toBe('observe');
  });
});
