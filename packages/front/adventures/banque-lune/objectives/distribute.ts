import type { Objective } from './types';
import type { RoleId } from '../roles/types';
import { BLOCKING_PAIRS, OBJECTIVES_BY_ROLE } from './definitions';

/**
 * Distribue un objectif privé à chaque joueur selon son rôle (G10 §7.4).
 *
 * Algorithme :
 * 1. Pour chaque joueur dans l'ordre, filtrer le pool de son rôle pour exclure
 *    les objectifs qui forment une **paire bloquante** avec un objectif déjà
 *    distribué.
 * 2. Tirer aléatoirement (RNG injectable) dans le pool filtré.
 * 3. Si le pool filtré est vide (cas dégénéré, ne devrait jamais arriver
 *    avec H4/F4 et 6 objectifs par rôle), tirer dans le pool complet du rôle.
 *
 * @param playerRoles ordre = ordre de distribution
 * @param rng par défaut Math.random ; injectable pour tests déterministes
 */
export function distributeObjectives(
  playerRoles: ReadonlyArray<{ playerId: string; role: RoleId }>,
  rng: () => number = Math.random,
): Map<string, Objective> {
  const result = new Map<string, Objective>();
  const drawn: Objective[] = [];

  for (const { playerId, role } of playerRoles) {
    const fullPool = OBJECTIVES_BY_ROLE[role];
    const filtered = fullPool.filter((candidate) => !causesBlockingPair(candidate, drawn));
    const pool = filtered.length > 0 ? filtered : fullPool;
    const picked = pool[Math.floor(rng() * pool.length)] as Objective;
    drawn.push(picked);
    result.set(playerId, picked);
  }

  return result;
}

function causesBlockingPair(candidate: Objective, drawn: ReadonlyArray<Objective>): boolean {
  for (const other of drawn) {
    for (const [a, b] of BLOCKING_PAIRS) {
      if (
        (candidate.code === a && other.code === b) ||
        (candidate.code === b && other.code === a)
      ) {
        return true;
      }
    }
  }
  return false;
}
