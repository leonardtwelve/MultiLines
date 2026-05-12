import { describe, it, expect } from 'vitest';
import { distributeObjectives } from './distribute';
import { OBJECTIVES, OBJECTIVES_BY_ROLE, BLOCKING_PAIRS } from './definitions';
import { seededRandom } from '../roles/distribute';

describe('OBJECTIVES — table', () => {
  it('contient 30 objectifs au total', () => {
    expect(OBJECTIVES).toHaveLength(30);
  });

  it('6 objectifs par rôle exactement', () => {
    expect(OBJECTIVES_BY_ROLE.hacker).toHaveLength(6);
    expect(OBJECTIVES_BY_ROLE.faussaire).toHaveLength(6);
    expect(OBJECTIVES_BY_ROLE.infiltre).toHaveLength(6);
    expect(OBJECTIVES_BY_ROLE.negociateur).toHaveLength(6);
    expect(OBJECTIVES_BY_ROLE.observateur).toHaveLength(6);
  });

  it('IDs uniques', () => {
    const ids = OBJECTIVES.map((o) => o.id);
    expect(new Set(ids).size).toBe(OBJECTIVES.length);
  });

  it('codes uniques', () => {
    const codes = OBJECTIVES.map((o) => o.code);
    expect(new Set(codes).size).toBe(OBJECTIVES.length);
  });

  it('paire bloquante H4 ↔ F4 référence des codes existants', () => {
    const codes = new Set(OBJECTIVES.map((o) => o.code));
    for (const [a, b] of BLOCKING_PAIRS) {
      expect(codes.has(a)).toBe(true);
      expect(codes.has(b)).toBe(true);
    }
  });
});

describe('distributeObjectives', () => {
  it('attribue un objectif à chaque joueur', () => {
    const result = distributeObjectives(
      [
        { playerId: 'p1', role: 'hacker' },
        { playerId: 'p2', role: 'faussaire' },
        { playerId: 'p3', role: 'infiltre' },
      ],
      seededRandom(42),
    );
    expect(result.size).toBe(3);
    expect(result.get('p1')?.role).toBe('hacker');
    expect(result.get('p2')?.role).toBe('faussaire');
    expect(result.get('p3')?.role).toBe('infiltre');
  });

  it('est déterministe avec la même graine', () => {
    const setup = [
      { playerId: 'p1', role: 'hacker' as const },
      { playerId: 'p2', role: 'faussaire' as const },
      { playerId: 'p3', role: 'negociateur' as const },
      { playerId: 'p4', role: 'observateur' as const },
    ];
    const a = distributeObjectives(setup, seededRandom(1234));
    const b = distributeObjectives(setup, seededRandom(1234));
    for (const [pid, obj] of a) {
      expect(b.get(pid)?.id).toBe(obj.id);
    }
  });

  it("ne produit jamais la paire bloquante H4 ↔ F4 (100 graines)", () => {
    const setup = [
      { playerId: 'p1', role: 'hacker' as const },
      { playerId: 'p2', role: 'faussaire' as const },
    ];
    for (let seed = 1; seed <= 100; seed += 1) {
      const result = distributeObjectives(setup, seededRandom(seed));
      const codes = [...result.values()].map((o) => o.code);
      const hasH4 = codes.includes('richer-than-faussaire');
      const hasF4 = codes.includes('richer-than-hacker');
      expect(hasH4 && hasF4).toBe(false);
    }
  });

  it("dans une partie 5 joueurs (1 par rôle), tous les objectifs viennent du bon rôle", () => {
    const setup = [
      { playerId: 'p1', role: 'hacker' as const },
      { playerId: 'p2', role: 'faussaire' as const },
      { playerId: 'p3', role: 'infiltre' as const },
      { playerId: 'p4', role: 'negociateur' as const },
      { playerId: 'p5', role: 'observateur' as const },
    ];
    const result = distributeObjectives(setup, seededRandom(7));
    for (const [, obj] of result) {
      const expectedPlayer = setup.find((s) => result.get(s.playerId)?.id === obj.id);
      expect(expectedPlayer).toBeDefined();
      expect(obj.role).toBe(expectedPlayer!.role);
    }
  });
});
