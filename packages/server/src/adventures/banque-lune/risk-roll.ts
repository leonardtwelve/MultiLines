/**
 * Résolution du dé de risque côté serveur (GAMEPLAY §4).
 *
 * 2d6 + modificateurs, interprétation selon le `risk` de l'action.
 *
 * Tables (§4.2) :
 *   Risque   | Succès | Partiel | Échec
 *   Faible   | 7-12   | 4-6     | 2-3
 *   Moyen    | 10-12  | 7-9     | 2-6
 *   Élevé    | 11-12  | 8-10    | 2-7
 *
 * Échec critique : 2 naturel (= 1+1 sur les deux dés AVANT modificateurs).
 *
 * Modificateurs (§4.3, slice 3e-2 = subset) :
 *   - Œil dans le ciel de l'Observateur sur la cible → +1
 *   - Couverture passive Infiltré sur échec → alerte/2 (géré ailleurs)
 *   - Magnétisme Négociateur → ±1 (géré côté pacte/state machine ult.)
 *
 * Plage finale clampée à [2, 12] pour rester dans les tables.
 *
 * Le RNG est injectable pour des tests déterministes.
 */

import type { ActionRisk } from './roles';

export type RollOutcome = 'success' | 'partial' | 'failure';

export interface RollResult {
  /** Résultat global. */
  outcome: RollOutcome;
  /** Total final 2d6 + modificateurs, clampé [2, 12]. */
  total: number;
  /** Total brut 2d6 sans modificateurs (utile pour critique). */
  natural: number;
  /** Détail des 2 dés (utile UI debug + animation). */
  dice: [number, number];
  /** Modificateurs appliqués (somme algébrique). */
  modifier: number;
  /** True si critique (2 naturel = échec catastrophique). */
  critical: boolean;
}

export interface RollOptions {
  /** Modificateur global (somme des bonus/malus). */
  modifier?: number;
  /** RNG injectable (test). Défaut: Math.random. */
  rng?: () => number;
}

/**
 * Effectue un jet 2d6 + modificateurs et l'interprète selon `risk`.
 * Pure — pas d'effet de bord ni de mutation.
 */
export function rollRisk(risk: ActionRisk, opts: RollOptions = {}): RollResult {
  const rng = opts.rng ?? Math.random;
  const modifier = opts.modifier ?? 0;
  const d1 = rollD6(rng);
  const d2 = rollD6(rng);
  const natural = d1 + d2;
  const total = clamp(natural + modifier, 2, 12);
  const outcome = interpretRoll(risk, total);
  return {
    outcome,
    total,
    natural,
    dice: [d1, d2],
    modifier,
    critical: natural === 2,
  };
}

/**
 * Interprète un total 2d6 selon le niveau de risque (GAMEPLAY §4.2).
 * Pure — peut être appelée hors d'un roll réel (utile pour les
 * preview UI : « si tu obtiens 8 sur cette action moyenne, succès
 * partiel »).
 */
export function interpretRoll(risk: ActionRisk, total: number): RollOutcome {
  switch (risk) {
    case 'low':
      if (total >= 7) return 'success';
      if (total >= 4) return 'partial';
      return 'failure';
    case 'medium':
      if (total >= 10) return 'success';
      if (total >= 7) return 'partial';
      return 'failure';
    case 'high':
      if (total >= 11) return 'success';
      if (total >= 8) return 'partial';
      return 'failure';
    default: {
      // exhaustive
      const _x: never = risk;
      void _x;
      return 'failure';
    }
  }
}

// === Internes ===

function rollD6(rng: () => number): number {
  return 1 + Math.floor(rng() * 6);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
