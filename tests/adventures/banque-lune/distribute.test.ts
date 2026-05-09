import { describe, it, expect } from 'vitest';
import {
  distributeRoles,
  seededRandom,
  InvalidPlayerCountError,
} from '../../../src/adventures/banque-lune/roles/distribute';

describe('distributeRoles', () => {
  it('refuse moins de 3 joueurs', () => {
    expect(() => distributeRoles(['a', 'b'])).toThrow(InvalidPlayerCountError);
  });

  it('refuse plus de 5 joueurs', () => {
    expect(() => distributeRoles(['a', 'b', 'c', 'd', 'e', 'f'])).toThrow(InvalidPlayerCountError);
  });

  it('attribue 3 rôles distincts à 3 joueurs, dont l\'infiltré', () => {
    const result = distributeRoles(['p1', 'p2', 'p3'], seededRandom(42));
    expect(result.size).toBe(3);
    const roleIds = [...result.values()].map((r) => r.id);
    expect(new Set(roleIds).size).toBe(3);
    expect(roleIds).toContain('hacker');
    expect(roleIds).toContain('ingenieur');
    expect(roleIds).toContain('infiltre');
  });

  it('ajoute Acrobate à 4 joueurs', () => {
    const result = distributeRoles(['p1', 'p2', 'p3', 'p4'], seededRandom(7));
    const roleIds = [...result.values()].map((r) => r.id);
    expect(roleIds).toContain('acrobate');
    expect(roleIds.filter((id) => id === 'infiltre')).toHaveLength(1);
  });

  it('ajoute Acrobate et Stratège à 5 joueurs', () => {
    const result = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seededRandom(99));
    const roleIds = [...result.values()].map((r) => r.id);
    expect(roleIds).toContain('acrobate');
    expect(roleIds).toContain('stratege');
    expect(roleIds.filter((id) => id === 'infiltre')).toHaveLength(1);
  });

  it('exactement 1 infiltré quel que soit le nombre de joueurs', () => {
    for (const ids of [['a', 'b', 'c'], ['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd', 'e']]) {
      const result = distributeRoles(ids, seededRandom(1));
      const infiltres = [...result.values()].filter((r) => r.isInfiltre);
      expect(infiltres).toHaveLength(1);
    }
  });

  it('est déterministe avec la même graine', () => {
    const a = distributeRoles(['p1', 'p2', 'p3', 'p4'], seededRandom(1234));
    const b = distributeRoles(['p1', 'p2', 'p3', 'p4'], seededRandom(1234));
    for (const [playerId, role] of a) {
      expect(b.get(playerId)?.id).toBe(role.id);
    }
  });
});
