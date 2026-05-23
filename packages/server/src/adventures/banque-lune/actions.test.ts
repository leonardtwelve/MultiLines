import { describe, expect, it } from 'vitest';
import type { PublicGameState } from '@pixel-quests/shared';
import { resolveBanqueLuneAction } from './actions';

function makeState(overrides: Partial<PublicGameState> = {}): PublicGameState {
  return {
    roomId: 'r1',
    status: 'casse',
    adventureId: 'banque-lune',
    alert: 20,
    players: {
      p1: { id: 'p1', name: 'Léa', color: '#3affc7', connected: true, credits: 3 },
      p2: { id: 'p2', name: 'Sami', color: '#ffc83a', connected: true, credits: 3 },
    },
    ...overrides,
  };
}

/** RNG truqué qui renvoie toujours `v` (clamp dans [0,1)). */
const fixedRng = (v: number) => () => Math.min(0.9999, Math.max(0, v));

describe('resolveBanqueLuneAction — actions inconnues', () => {
  it("renvoie null si l'action n'existe pas pour le rôle", () => {
    const state = makeState();
    const r = resolveBanqueLuneAction('action-fantome', state, 'p1', 'hacker', {
      rng: fixedRng(0.5),
    });
    expect(r).toBeNull();
  });

  it("renvoie null si l'action existe mais pas pour ce rôle", () => {
    const state = makeState();
    // 'pacte-secret' existe (Négociateur) mais pas pour Hacker.
    const r = resolveBanqueLuneAction('pacte-secret', state, 'p1', 'hacker', {
      rng: fixedRng(0.5),
    });
    expect(r).toBeNull();
  });

  it("renvoie null pour les rôles non encore implémentés (3e-2b)", () => {
    const state = makeState();
    const r = resolveBanqueLuneAction('faux-ordre', state, 'p1', 'faussaire', {
      rng: fixedRng(0.5),
    });
    expect(r).toBeNull();
  });
});

describe('resolveBanqueLuneAction — Hacker / intrusion-systeme (medium)', () => {
  it('succès : alerte -3', () => {
    // medium → succès si total >= 10. rng(0.9) → ~6 sur d6 → 6+6=12 naturel.
    const state = makeState({ alert: 30 });
    const r = resolveBanqueLuneAction(
      'intrusion-systeme',
      state,
      'p1',
      'hacker',
      { rng: fixedRng(0.9) },
    );
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.success).toBe(true);
    expect(r.patches).toContainEqual({ op: 'replace', path: '/alert', value: 27 });
  });

  it('échec critique (1+1) : alerte +20 clampée à 50', () => {
    const state = makeState({ alert: 30 });
    const r = resolveBanqueLuneAction(
      'intrusion-systeme',
      state,
      'p1',
      'hacker',
      { rng: fixedRng(0) },
    );
    if (!r) throw new Error('attendu');
    expect(r.success).toBe(false);
    expect(r.patches).toContainEqual({ op: 'replace', path: '/alert', value: 50 });
    expect(r.events[0]).toMatchObject({ actionId: 'intrusion-systeme' });
  });
});

describe('resolveBanqueLuneAction — Hacker / collecte-donnees (low)', () => {
  it('succès : +2 crédits, pas de change alerte', () => {
    // low → succès si total >= 7. rng(0.5) → 4+4=8 → succès.
    const state = makeState({ alert: 20 });
    const r = resolveBanqueLuneAction(
      'collecte-donnees',
      state,
      'p1',
      'hacker',
      { rng: fixedRng(0.5) },
    );
    if (!r) throw new Error('attendu');
    expect(r.success).toBe(true);
    expect(r.patches).toContainEqual({
      op: 'replace',
      path: '/players/p1/credits',
      value: 5,
    });
    // pas de patch d'alerte (delta 0).
    expect(r.patches.find((p) => p.path === '/alert')).toBeUndefined();
  });

  it("critique (1+1) : alerte +5, pas de gain crédits", () => {
    const state = makeState();
    const r = resolveBanqueLuneAction(
      'collecte-donnees',
      state,
      'p1',
      'hacker',
      { rng: fixedRng(0) },
    );
    if (!r) throw new Error('attendu');
    expect(r.success).toBe(false);
    expect(r.patches.find((p) => p.path === '/players/p1/credits')).toBeUndefined();
    expect(r.patches).toContainEqual({ op: 'replace', path: '/alert', value: 25 });
  });
});

describe('resolveBanqueLuneAction — Hacker / surcharge (high, emblématique)', () => {
  it('succès : +3 crédits, alerte -5', () => {
    // high → succès si total >= 11. rng(0.9) → 6+6=12.
    const state = makeState({ alert: 40 });
    const r = resolveBanqueLuneAction(
      'surcharge',
      state,
      'p2',
      'hacker',
      { rng: fixedRng(0.9) },
    );
    if (!r) throw new Error('attendu');
    expect(r.success).toBe(true);
    expect(r.patches).toContainEqual({
      op: 'replace',
      path: '/players/p2/credits',
      value: 6,
    });
    expect(r.patches).toContainEqual({ op: 'replace', path: '/alert', value: 35 });
  });

  it("critique (1+1) : alerte +30 clampée à 100", () => {
    const state = makeState({ alert: 85 });
    const r = resolveBanqueLuneAction(
      'surcharge',
      state,
      'p1',
      'hacker',
      { rng: fixedRng(0) },
    );
    if (!r) throw new Error('attendu');
    expect(r.success).toBe(false);
    expect(r.patches).toContainEqual({ op: 'replace', path: '/alert', value: 100 });
  });
});

describe('resolveBanqueLuneAction — bornes des patches', () => {
  it("alerte clampée à 100 max", () => {
    const state = makeState({ alert: 99 });
    const r = resolveBanqueLuneAction('surcharge', state, 'p1', 'hacker', {
      rng: fixedRng(0),
    });
    if (!r) throw new Error('attendu');
    const alertPatch = r.patches.find((p) => p.path === '/alert');
    // TS narrowing : remove n'a pas de value, replace/add oui.
    expect(alertPatch && alertPatch.op !== 'remove' ? alertPatch.value : null).toBe(100);
  });

  it("crédits clampés à 0 min (cas pas encore atteignable mais défensif)", () => {
    // Pas de cas où on perd des crédits parmi les 3 actions Hacker —
    // ce test sert juste de garde-fou contre une régression du clamp.
    const state = makeState({
      players: {
        p1: { id: 'p1', name: 'X', color: '#aaa', connected: true, credits: 0 },
      },
    });
    const r = resolveBanqueLuneAction('collecte-donnees', state, 'p1', 'hacker', {
      rng: fixedRng(0),
    });
    if (!r) throw new Error('attendu');
    expect(
      r.patches.find((p) => p.path === '/players/p1/credits'),
    ).toBeUndefined();
  });
});
