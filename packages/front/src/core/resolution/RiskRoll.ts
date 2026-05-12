import type { RiskConfig, RollContext, RollOutcome } from './types';

/**
 * Lance les dés selon la config (par défaut Math.random).
 * Exposée pour les tests et les usages avancés (relance partielle).
 */
export function rollDice(config: RiskConfig, rng: () => number = Math.random): number[] {
  const dice: number[] = [];
  for (let i = 0; i < config.diceCount; i += 1) {
    dice.push(Math.floor(rng() * config.diceFaces) + 1);
  }
  return dice;
}

/**
 * Limite un modificateur à ±range. Utilitaire exposé pour les tests.
 */
export function clampModifier(value: number, range: number): number {
  if (value > range) return range;
  if (value < -range) return -range;
  return value;
}

/**
 * Résout une action à risque.
 *
 * - Tire les dés (ou utilise `ctx.dice` si fourni — déterministe).
 * - Applique le modificateur clampé à ±`config.modifierClamp`.
 * - Détecte un échec critique sur les dés bruts (avant modificateur).
 * - Sinon, interprète selon les seuils du niveau de risque.
 *
 * Pure : ne lit/écrit pas d'état externe.
 */
export function rollRisk(config: RiskConfig, ctx: RollContext): RollOutcome {
  const dice = ctx.dice ?? rollDice(config, ctx.rng);
  const rawSum = dice.reduce((s, d) => s + d, 0);
  const modifier = clampModifier(ctx.modifier, config.modifierClamp);
  const total = rawSum + modifier;

  if (config.detectCriticalFailure?.(dice)) {
    return { dice, rawSum, modifier, total, result: 'critical-failure' };
  }

  const thresholds = config.thresholds[ctx.riskLevel];
  if (total >= thresholds.successFrom) {
    return { dice, rawSum, modifier, total, result: 'success' };
  }
  if (total >= thresholds.partialFrom) {
    return { dice, rawSum, modifier, total, result: 'partial' };
  }
  return { dice, rawSum, modifier, total, result: 'failure' };
}
