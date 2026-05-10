import type { RoleId } from '../roles/types';

export type ObjectiveAxis = 'economic' | 'comparative' | 'action' | 'narrative';

/**
 * Objectif privé d'un joueur (G10). Vérifié à l'acte 3 uniquement, récompense
 * uniforme : +2 Crédits convertis en butin + mention narrative au bilan.
 *
 * Voir `docs/GAMEPLAY.md §7` pour le contexte design et la table complète.
 */
export interface Objective {
  /** ID court de l'objectif (`H1`, `F4`, etc.). */
  id: string;
  /** Slug technique (`solo-perfect`, `richer-than-faussaire`...). */
  code: string;
  /** Rôle auquel cet objectif est réservé. */
  role: RoleId;
  /** Description pour le joueur (tablette tournée). */
  label: string;
  /** Axe stratégique pour la composition d'un set d'objectifs équilibré. */
  axis: ObjectiveAxis;
}

/**
 * Récompense uniforme appliquée à l'acte 3 si l'objectif est rempli (G10).
 */
export const OBJECTIVE_REWARD_CREDITS = 2;
