import { describe, expect, it } from 'vitest';
import { createBanqueLuneAdventureHooks, InvalidPlayerCountError } from './hooks';
import { seededRandom } from './roles';

describe('createBanqueLuneAdventureHooks — distributeRoles', () => {
  it("publicState : roomId, status='briefing', adventureId, alert=0", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1', rng: seededRandom(1) });
    const out = hooks.distributeRoles(['p1', 'p2', 'p3']);
    expect(out.publicState.roomId).toBe('r1');
    expect(out.publicState.status).toBe('briefing');
    expect(out.publicState.adventureId).toBe('banque-lune');
    expect(out.publicState.alert).toBe(0);
  });

  it("publicState.players : chaque joueur a credits=3, connected=true", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1', rng: seededRandom(1) });
    const out = hooks.distributeRoles(['p1', 'p2', 'p3']);
    for (const pid of ['p1', 'p2', 'p3']) {
      const p = out.publicState.players[pid];
      expect(p).toBeDefined();
      expect(p?.credits).toBe(3);
      expect(p?.connected).toBe(true);
      expect(p?.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("privates : chaque joueur a un roleId valide + capabilities (3 actions)", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1', rng: seededRandom(1) });
    const out = hooks.distributeRoles(['p1', 'p2', 'p3']);
    const validRoles = new Set(['hacker', 'faussaire', 'infiltre']);
    for (const pid of ['p1', 'p2', 'p3']) {
      const priv = out.privates[pid];
      expect(priv).toBeDefined();
      expect(validRoles.has(priv?.roleId ?? '')).toBe(true);
      expect(priv?.capabilities).toHaveLength(3);
      expect(priv?.dossiers).toEqual([]);
      expect(priv?.tension).toBe(0);
      expect(priv?.pendingPactes).toEqual([]);
    }
  });

  it("privates : chaque joueur a un objectif (visible — hidden=false)", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1', rng: seededRandom(1) });
    const out = hooks.distributeRoles(['p1', 'p2', 'p3']);
    for (const pid of ['p1', 'p2', 'p3']) {
      const obj = out.privates[pid]?.objective;
      expect(obj).toBeDefined();
      expect(obj?.id).toMatch(/^[HFINO]\d+$/);
      expect(obj?.description).toBeTruthy();
      expect(obj?.hidden).toBe(false);
    }
  });

  it("lève InvalidPlayerCountError pour < 3 ou > 5 joueurs", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1' });
    expect(() => hooks.distributeRoles(['p1', 'p2'])).toThrow(InvalidPlayerCountError);
    expect(() =>
      hooks.distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
    ).toThrow(InvalidPlayerCountError);
  });

  it("supporte 5 joueurs (composition étendue avec Observateur)", () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1', rng: seededRandom(42) });
    const out = hooks.distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5']);
    const allRoles = new Set(Object.values(out.privates).map((p) => p.roleId));
    expect(allRoles).toEqual(
      new Set(['hacker', 'faussaire', 'infiltre', 'negociateur', 'observateur']),
    );
  });
});

describe('createBanqueLuneAdventureHooks — stubs slices ultérieures', () => {
  it('resolveAction renvoie null (3e-2 fera l’impl réelle)', () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1' });
    const result = hooks.resolveAction(
      'intrusion-systeme',
      {},
      {
        roomId: 'r1',
        status: 'casse',
        adventureId: 'banque-lune',
        players: {},
      },
      'p1',
    );
    expect(result).toBeNull();
  });

  it('triggerTurnEvents renvoie [] (3e-2 fera l’impl réelle)', () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1' });
    const events = hooks.triggerTurnEvents({
      roomId: 'r1',
      status: 'casse',
      adventureId: 'banque-lune',
      players: {},
    });
    expect(events).toEqual([]);
  });

  it('computeFinalScore : headline cohérent avec endReason + perPlayer rempli', () => {
    const hooks = createBanqueLuneAdventureHooks({ roomId: 'r1' });
    const score = hooks.computeFinalScore(
      {
        roomId: 'r1',
        status: 'ended',
        adventureId: 'banque-lune',
        players: {
          p1: { id: 'p1', name: 'Léa', color: '#abc', connected: true, credits: 5 },
        },
      },
      'success-early',
    );
    expect(score.endReason).toBe('success-early');
    expect(score.headline).toMatch(/succès/i);
    expect(score.perPlayer['p1']).toEqual({ credits: 5, objectiveAchieved: false });
  });
});
