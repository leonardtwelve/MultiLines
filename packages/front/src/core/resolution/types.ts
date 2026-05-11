/**
 * Système de résolution générique pour les actions à risque (G2).
 * L'aventure fournit sa propre `RiskConfig` (type de dé, seuils par niveau de risque)
 * et appelle `rollRisk(config, ctx)` pour résoudre une action.
 *
 * La grille chiffrée du Casse Lune (G8) vit dans `src/adventures/banque-lune/resolution.ts`.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export type ResolutionResult = 'success' | 'partial' | 'failure' | 'critical-failure';

export interface RiskThresholds {
  /** Seuil minimum (inclus) pour un succès complet, après modificateur. */
  successFrom: number;
  /** Seuil minimum (inclus) pour un succès partiel, après modificateur. Sinon échec. */
  partialFrom: number;
}

export interface RiskConfig {
  /** Nombre de dés à lancer. */
  diceCount: number;
  /** Nombre de faces par dé. */
  diceFaces: number;
  /** Détecte un échec critique sur les dés bruts (avant modificateur). */
  detectCriticalFailure?: (dice: readonly number[]) => boolean;
  /** Seuils par niveau de risque. */
  thresholds: Record<RiskLevel, RiskThresholds>;
  /** Plafond du modificateur (cumul). Ex: 4 → modificateur clampé à ±4. */
  modifierClamp: number;
}

export interface RollContext {
  riskLevel: RiskLevel;
  /** Modificateur cumulé (capacités, équipement, jauge, etc.). Sera clampé. */
  modifier: number;
  /** RNG injectable. Par défaut : Math.random. */
  rng?: () => number;
  /** Dés injectés pour tests déterministes (bypasse rng). */
  dice?: readonly number[];
}

export interface RollOutcome {
  /** Dés tirés, dans l'ordre. */
  dice: readonly number[];
  /** Somme brute des dés. */
  rawSum: number;
  /** Modificateur appliqué (clampé). */
  modifier: number;
  /** Total après modificateur. */
  total: number;
  /** Verdict de la table d'interprétation. */
  result: ResolutionResult;
}
