import { describe, expect, it } from 'vitest';
import { interpretRoll, rollRisk } from './risk-roll';
import { seededRandom } from './roles';

describe('interpretRoll — tables d’interprétation (GAMEPLAY §4.2)', () => {
  it('risque faible : 7-12 succès, 4-6 partiel, 2-3 échec', () => {
    expect(interpretRoll('low', 12)).toBe('success');
    expect(interpretRoll('low', 7)).toBe('success');
    expect(interpretRoll('low', 6)).toBe('partial');
    expect(interpretRoll('low', 4)).toBe('partial');
    expect(interpretRoll('low', 3)).toBe('failure');
    expect(interpretRoll('low', 2)).toBe('failure');
  });

  it('risque moyen : 10-12 succès, 7-9 partiel, 2-6 échec', () => {
    expect(interpretRoll('medium', 12)).toBe('success');
    expect(interpretRoll('medium', 10)).toBe('success');
    expect(interpretRoll('medium', 9)).toBe('partial');
    expect(interpretRoll('medium', 7)).toBe('partial');
    expect(interpretRoll('medium', 6)).toBe('failure');
    expect(interpretRoll('medium', 2)).toBe('failure');
  });

  it('risque élevé : 11-12 succès, 8-10 partiel, 2-7 échec', () => {
    expect(interpretRoll('high', 12)).toBe('success');
    expect(interpretRoll('high', 11)).toBe('success');
    expect(interpretRoll('high', 10)).toBe('partial');
    expect(interpretRoll('high', 8)).toBe('partial');
    expect(interpretRoll('high', 7)).toBe('failure');
    expect(interpretRoll('high', 2)).toBe('failure');
  });
});

describe('rollRisk — jet 2d6', () => {
  it('chaque dé dans [1, 6], total dans [2, 12]', () => {
    for (let seed = 1; seed < 100; seed += 1) {
      const r = rollRisk('low', { rng: seededRandom(seed) });
      expect(r.dice[0]).toBeGreaterThanOrEqual(1);
      expect(r.dice[0]).toBeLessThanOrEqual(6);
      expect(r.dice[1]).toBeGreaterThanOrEqual(1);
      expect(r.dice[1]).toBeLessThanOrEqual(6);
      expect(r.natural).toBeGreaterThanOrEqual(2);
      expect(r.natural).toBeLessThanOrEqual(12);
      expect(r.dice[0] + r.dice[1]).toBe(r.natural);
    }
  });

  it('reproductible avec le même seed', () => {
    const a = rollRisk('medium', { rng: seededRandom(42) });
    const b = rollRisk('medium', { rng: seededRandom(42) });
    expect(a).toEqual(b);
  });

  it("modificateur additionne au total mais ne touche pas au natural", () => {
    const rng = seededRandom(42);
    const baseline = rollRisk('low', { rng: seededRandom(42) });
    const modified = rollRisk('low', { rng, modifier: 2 });
    expect(modified.natural).toBe(baseline.natural);
    expect(modified.total).toBe(Math.min(12, baseline.natural + 2));
    expect(modified.modifier).toBe(2);
  });

  it('total clampé à 12 max', () => {
    // RNG truqué : retourne toujours 6 (donc 2d6 = 12 naturel).
    const r = rollRisk('low', { rng: () => 0.99, modifier: 5 });
    expect(r.natural).toBe(12);
    expect(r.total).toBe(12);
  });

  it('total clampé à 2 min', () => {
    // RNG truqué : retourne toujours 1 (donc 2d6 = 2 naturel).
    const r = rollRisk('low', { rng: () => 0, modifier: -5 });
    expect(r.natural).toBe(2);
    expect(r.total).toBe(2);
  });

  it("critique = natural=2 (1+1) — modificateurs n'évitent pas le critique", () => {
    const r = rollRisk('low', { rng: () => 0, modifier: 10 });
    expect(r.dice).toEqual([1, 1]);
    expect(r.natural).toBe(2);
    expect(r.critical).toBe(true);
    // Total final est 12 grâce au modif, mais critique reste vrai.
    expect(r.total).toBe(12);
  });

  it("pas critique sur natural=3 (1+2 ou 2+1)", () => {
    // RNG truqué : premier dé = 1, deuxième dé = 2.
    let i = 0;
    const rng = (): number => (i++ === 0 ? 0 : 0.2);
    const r = rollRisk('low', { rng });
    expect(r.dice).toEqual([1, 2]);
    expect(r.natural).toBe(3);
    expect(r.critical).toBe(false);
  });

  it("outcome cohérent avec total + risk (sanity)", () => {
    const r = rollRisk('low', { rng: () => 0.99 }); // total = 12
    expect(r.outcome).toBe('success');
    const r2 = rollRisk('high', { rng: () => 0 }); // total = 2
    expect(r2.outcome).toBe('failure');
  });
});
