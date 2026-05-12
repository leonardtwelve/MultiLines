import { describe, it, expect } from 'vitest';
import { rollRisk, rollDice, clampModifier } from './RiskRoll';
import type { RiskConfig } from './types';

const CONFIG_2D6: RiskConfig = {
  diceCount: 2,
  diceFaces: 6,
  modifierClamp: 4,
  detectCriticalFailure: (d) => d[0] === 1 && d[1] === 1,
  thresholds: {
    low: { successFrom: 7, partialFrom: 4 },
    medium: { successFrom: 10, partialFrom: 7 },
    high: { successFrom: 11, partialFrom: 8 },
  },
};

describe('clampModifier', () => {
  it('clamp à +range', () => {
    expect(clampModifier(10, 4)).toBe(4);
  });
  it('clamp à -range', () => {
    expect(clampModifier(-10, 4)).toBe(-4);
  });
  it('passe valeur dans la plage', () => {
    expect(clampModifier(2, 4)).toBe(2);
    expect(clampModifier(-3, 4)).toBe(-3);
    expect(clampModifier(0, 4)).toBe(0);
  });
});

describe('rollDice', () => {
  it('produit autant de dés que demandé', () => {
    const dice = rollDice(CONFIG_2D6, () => 0);
    expect(dice).toHaveLength(2);
  });

  it('valeurs entre 1 et faces', () => {
    expect(rollDice(CONFIG_2D6, () => 0)).toEqual([1, 1]);
    expect(rollDice(CONFIG_2D6, () => 0.999)).toEqual([6, 6]);
  });
});

describe('rollRisk', () => {
  it('low risk : 8 → succès', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: 0, dice: [4, 4] });
    expect(out.result).toBe('success');
    expect(out.total).toBe(8);
  });

  it('low risk : 5 → partiel', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: 0, dice: [2, 3] });
    expect(out.result).toBe('partial');
  });

  it('low risk : 3 → échec (mais pas critique)', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: 0, dice: [1, 2] });
    expect(out.result).toBe('failure');
  });

  it('échec critique sur 2 naturel, même avec modificateur favorable', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: 4, dice: [1, 1] });
    expect(out.result).toBe('critical-failure');
    expect(out.dice).toEqual([1, 1]);
  });

  it('clamp modificateur positif à +4', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'medium', modifier: 10, dice: [3, 3] });
    expect(out.modifier).toBe(4);
    expect(out.total).toBe(10);
    expect(out.result).toBe('success');
  });

  it('clamp modificateur négatif à -4', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: -10, dice: [6, 6] });
    expect(out.modifier).toBe(-4);
    expect(out.total).toBe(8);
    expect(out.result).toBe('success');
  });

  it('utilise les dés injectés', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'high', modifier: 0, dice: [6, 5] });
    expect(out.dice).toEqual([6, 5]);
    expect(out.result).toBe('success');
  });

  it('lance les dés via rng si dice non fourni', () => {
    const out = rollRisk(CONFIG_2D6, { riskLevel: 'low', modifier: 0, rng: () => 0.5 });
    expect(out.dice).toHaveLength(2);
    expect(out.dice[0]).toBeGreaterThanOrEqual(1);
    expect(out.dice[0]).toBeLessThanOrEqual(6);
  });

  it('high risk : 11 → succès, 10 → partiel, 7 → échec', () => {
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'high', modifier: 0, dice: [5, 6] }).result).toBe('success');
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'high', modifier: 0, dice: [5, 5] }).result).toBe('partial');
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'high', modifier: 0, dice: [3, 4] }).result).toBe('failure');
  });

  it('medium risk : 10 → succès, 9 → partiel, 6 → échec', () => {
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'medium', modifier: 0, dice: [4, 6] }).result).toBe('success');
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'medium', modifier: 0, dice: [4, 5] }).result).toBe('partial');
    expect(rollRisk(CONFIG_2D6, { riskLevel: 'medium', modifier: 0, dice: [2, 4] }).result).toBe('failure');
  });
});
