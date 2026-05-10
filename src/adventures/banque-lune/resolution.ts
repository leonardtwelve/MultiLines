import type { RiskConfig } from '../../core/resolution';

/**
 * Configuration du dé de risque pour le Casse de la Banque Lune (G8).
 *
 * - 2d6
 * - Échec critique sur 2 naturel (les deux dés à 1)
 * - Tables d'interprétation par niveau de risque (cf. `docs/GAMEPLAY.md §4.2`)
 * - Modificateur clampé à ±4 (cf. §4.3)
 */
export const banqueLuneRisk: RiskConfig = {
  diceCount: 2,
  diceFaces: 6,
  modifierClamp: 4,
  detectCriticalFailure: (dice) => dice[0] === 1 && dice[1] === 1,
  thresholds: {
    low: { successFrom: 7, partialFrom: 4 },
    medium: { successFrom: 10, partialFrom: 7 },
    high: { successFrom: 11, partialFrom: 8 },
  },
};
