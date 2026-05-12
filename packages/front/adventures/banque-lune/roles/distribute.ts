// ⚠️ POST-PIVOT JACKBOX — refonte prévue Prompt 3.
// La distribution des rôles est désormais une opération **côté serveur**
// (F17 : source de vérité autoritaire). Le client peut conserver une copie
// déterministe pour des tests, mais le serveur arbitre en partie réelle.

import type { Role, RoleId } from './types';
import { ROLES } from './index';

/**
 * Composition d'équipe selon le nombre de joueurs.
 *
 * Aligné sur la DA bible (ART.md §4) et G7 : Observateur (drone, "à l'extérieur")
 * n'apparaît qu'à 5 joueurs ; Négociateur·rice arrive à 4 joueurs.
 *
 * - 3 joueurs : minimum viable, intérieur uniquement (Hacker + Faussaire + Infiltré·e).
 * - 4 joueurs : + Négociateur·rice (renforce l'intérieur).
 * - 5 joueurs : + Observateur (extension extérieure via drone — G7).
 */
const ROLES_BY_PLAYER_COUNT: Record<3 | 4 | 5, RoleId[]> = {
  3: ['hacker', 'faussaire', 'infiltre'],
  4: ['hacker', 'faussaire', 'infiltre', 'negociateur'],
  5: ['hacker', 'faussaire', 'infiltre', 'negociateur', 'observateur'],
};

/**
 * RNG seedable simple (LCG). Suffisant pour distribuer aléatoirement des rôles.
 * Pour des besoins cryptographiques, voir crypto.getRandomValues.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export class InvalidPlayerCountError extends Error {
  constructor(count: number) {
    super(`Banque Lune nécessite 3 à 5 joueurs (reçu : ${count})`);
    this.name = 'InvalidPlayerCountError';
  }
}

/**
 * Distribue les rôles aux joueurs. Le mapping joueur→rôle est aléatoire mais
 * reproductible si rng est fourni (pour les tests).
 */
export function distributeRoles(playerIds: string[], rng: () => number = Math.random): Map<string, Role> {
  const count = playerIds.length;
  if (count !== 3 && count !== 4 && count !== 5) {
    throw new InvalidPlayerCountError(count);
  }
  const roleIds = [...ROLES_BY_PLAYER_COUNT[count]];
  shuffleInPlace(roleIds, rng);

  const result = new Map<string, Role>();
  playerIds.forEach((playerId, index) => {
    const role = ROLES[roleIds[index] as RoleId];
    result.set(playerId, role);
  });
  return result;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
}
