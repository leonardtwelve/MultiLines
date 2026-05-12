import { describe, it, expect } from 'vitest';
import { rollRisk } from '../../src/core/resolution';
import { banqueLuneRisk } from './resolution';
import type { RiskLevel, ResolutionResult } from '../../src/core/resolution';

/**
 * Vérifie que la grille du Casse Lune (§4.2) match les probabilités annoncées.
 * On énumère les 36 combinaisons de 2d6 et on agrège les résultats.
 */
function distributionFor(risk: RiskLevel): Record<ResolutionResult, number> {
  const counts: Record<ResolutionResult, number> = {
    success: 0,
    partial: 0,
    failure: 0,
    'critical-failure': 0,
  };
  for (let a = 1; a <= 6; a += 1) {
    for (let b = 1; b <= 6; b += 1) {
      const out = rollRisk(banqueLuneRisk, { riskLevel: risk, modifier: 0, dice: [a, b] });
      counts[out.result] += 1;
    }
  }
  return counts;
}

const TOTAL = 36;

describe('banqueLuneRisk — probabilités GAMEPLAY §4.2', () => {
  it('Faible risque : ~58% succès, ~33% partiel, ~8% échec (incl. critique)', () => {
    const c = distributionFor('low');
    expect(((c.success / TOTAL) * 100).toFixed(0)).toBe('58'); // 21/36
    expect(((c.partial / TOTAL) * 100).toFixed(0)).toBe('33'); // 12/36
    expect((((c.failure + c['critical-failure']) / TOTAL) * 100).toFixed(0)).toBe('8'); // 3/36
  });

  it('Risque moyen : ~17% succès, ~42% partiel, ~42% échec (incl. critique)', () => {
    const c = distributionFor('medium');
    expect(((c.success / TOTAL) * 100).toFixed(0)).toBe('17'); // 6/36
    expect(((c.partial / TOTAL) * 100).toFixed(0)).toBe('42'); // 15/36
    expect((((c.failure + c['critical-failure']) / TOTAL) * 100).toFixed(0)).toBe('42'); // 15/36
  });

  it('Risque élevé : ~8% succès, ~33% partiel, ~58% échec (incl. critique)', () => {
    const c = distributionFor('high');
    expect(((c.success / TOTAL) * 100).toFixed(0)).toBe('8'); // 3/36
    expect(((c.partial / TOTAL) * 100).toFixed(0)).toBe('33'); // 12/36
    expect((((c.failure + c['critical-failure']) / TOTAL) * 100).toFixed(0)).toBe('58'); // 21/36
  });

  it('Échec critique : 1/36 ≈ 2.8% à tous les niveaux de risque', () => {
    expect(distributionFor('low')['critical-failure']).toBe(1);
    expect(distributionFor('medium')['critical-failure']).toBe(1);
    expect(distributionFor('high')['critical-failure']).toBe(1);
  });
});
