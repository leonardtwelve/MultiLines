/**
 * Résolution des actions Banque Lune (GAMEPLAY §5).
 *
 * Slice 3e-2 : implémente **les 3 actions du Hacker** comme preuve de
 * concept du pattern. Les 12 autres arrivent en 3e-2b.
 *
 * Conventions :
 * - `resolve<Action>` : pure, prend (state, byPlayerId, roll), renvoie
 *   `ActionResult`. Pas de RNG interne — toujours injecté.
 * - Patches au format `{op, path, value}` (sous-ensemble JSON Patch
 *   compatible avec le `applyPatches` côté client).
 * - Events `TurnEvent` à concaténer dans `turn.ended.events`.
 *
 * Échec critique (`roll.critical === true`) : on applique la pénalité
 * spécifique à l'action SI elle en a une définie, sinon comportement
 * d'échec standard.
 */

import type { PlayerId, PublicGameState, TurnEvent } from '@pixel-quests/shared';
import type { ActionResult } from '../../core/state-machine/hooks';
import { ROLES, type Role, type RoleId } from './roles';
import { rollRisk, type RollResult } from './risk-roll';

/**
 * Pour chaque RoleId, un map actionId → resolver. Si l'action n'est pas
 * connue ici, `resolveBanqueLuneAction` renvoie `null` → la state
 * machine émet `ACTION_UNKNOWN`.
 *
 * Slice 3e-2 : seul `hacker` a ses 3 actions impl. Les autres rôles
 * arrivent en 3e-2b.
 */
type Resolver = (ctx: ResolverCtx) => ActionResult;

interface ResolverCtx {
  state: PublicGameState;
  byPlayerId: PlayerId;
  roll: RollResult;
}

const RESOLVERS: Record<RoleId, Record<string, Resolver>> = {
  hacker: {
    'intrusion-systeme': resolveIntrusionSysteme,
    'collecte-donnees': resolveCollecteDonnees,
    'surcharge': resolveSurcharge,
  },
  faussaire: {},
  infiltre: {},
  negociateur: {},
  observateur: {},
};

export interface ResolveOptions {
  rng?: () => number;
  /** Modificateur global (ex: Œil dans le ciel sur la cible). */
  modifier?: number;
}

/**
 * Dispatcher principal. Reçoit l'action proposée + le rôle du joueur,
 * fait le RiskRoll, appelle le resolver correspondant.
 *
 * Renvoie `null` si :
 * - l'action est inconnue pour ce rôle (ACTION_UNKNOWN amont)
 * - le rôle du joueur ne correspond pas à un Resolver impl
 */
export function resolveBanqueLuneAction(
  actionId: string,
  state: PublicGameState,
  byPlayerId: PlayerId,
  roleId: RoleId,
  opts: ResolveOptions = {},
): ActionResult | null {
  const role: Role | undefined = ROLES[roleId];
  if (!role) return null;
  const action = role.actions.find((a) => a.id === actionId);
  if (!action) return null;
  const resolver = RESOLVERS[roleId]?.[actionId];
  if (!resolver) return null;
  const roll = rollRisk(action.risk, { rng: opts.rng, modifier: opts.modifier });
  return resolver({ state, byPlayerId, roll });
}

// === Resolvers — Hacker (slice 3e-2) ===

/**
 * Intrusion système — Risque Moyen.
 * Désactive temporairement une caméra/capteur.
 * Effets MVP :
 *   - succès      : alerte -3 (Hacker contrôle une caméra)
 *   - partiel     : alerte +0 (neutre, juste « bruyant »)
 *   - échec       : alerte +10 (alarme déclenchée)
 *   - critique    : alerte +20 (alarme MAJEURE, on est repérés)
 */
function resolveIntrusionSysteme(ctx: ResolverCtx): ActionResult {
  const { roll, byPlayerId } = ctx;
  let alertDelta = 0;
  let summary = '';
  if (roll.critical) {
    alertDelta = 20;
    summary = '💥 Échec critique : alarme majeure déclenchée.';
  } else if (roll.outcome === 'success') {
    alertDelta = -3;
    summary = '✓ Caméra désactivée. Les autres ont un tour de répit.';
  } else if (roll.outcome === 'partial') {
    alertDelta = 0;
    summary = '~ Caméra brouillée à moitié. Surveillance dégradée.';
  } else {
    alertDelta = 10;
    summary = '✗ Intrusion détectée — alerte +10.';
  }
  return {
    success: roll.outcome === 'success',
    patches: buildAlertPatch(ctx.state, alertDelta),
    events: [buildEvent('action.resolved', { actionId: 'intrusion-systeme', byPlayerId, roll, summary })],
  };
}

/**
 * Collecte de données — Risque Faible.
 * Récupère des Crédits, avec une chance ~30% de produire un Dossier.
 * Effets MVP :
 *   - succès      : +2 crédits (et +1 dossier si rng < 0.3)
 *   - partiel     : +1 crédit
 *   - échec       : +0
 *   - critique    : alerte +5 (rien de compromettant mais signal envoyé)
 *
 * NB : la chance dossier consomme un autre rng — pour les tests il
 * suffit de fournir un `rng` séquentiel (1er appel = dé, 2e = chance).
 */
function resolveCollecteDonnees(ctx: ResolverCtx): ActionResult {
  const { roll, state, byPlayerId } = ctx;
  let creditDelta = 0;
  let alertDelta = 0;
  let summary = '';
  if (roll.critical) {
    alertDelta = 5;
    summary = '💥 Échec critique : interception détectée, alerte +5.';
  } else if (roll.outcome === 'success') {
    creditDelta = 2;
    summary = '✓ Collecte réussie (+2 Crédits).';
  } else if (roll.outcome === 'partial') {
    creditDelta = 1;
    summary = '~ Demi-récolte (+1 Crédit).';
  } else {
    summary = '✗ Rien trouvé.';
  }
  const patches = [
    ...buildCreditsPatch(state, byPlayerId, creditDelta),
    ...buildAlertPatch(state, alertDelta),
  ];
  return {
    success: roll.outcome === 'success',
    patches,
    events: [buildEvent('action.resolved', { actionId: 'collecte-donnees', byPlayerId, roll, summary })],
  };
}

/**
 * Surcharge — Risque Élevé (action emblématique).
 * Court-circuite un système majeur.
 * Effets MVP :
 *   - succès      : +3 crédits + alerte -5 (Hacker neutralise un gros système)
 *   - partiel     : +2 crédits, alerte +5 (déblocage mais bruit)
 *   - échec       : alerte +15 (énorme casse)
 *   - critique    : alerte +30 (catastrophe — alerte presque max)
 */
function resolveSurcharge(ctx: ResolverCtx): ActionResult {
  const { roll, state, byPlayerId } = ctx;
  let creditDelta = 0;
  let alertDelta = 0;
  let summary = '';
  if (roll.critical) {
    alertDelta = 30;
    summary = '💥💥 Échec critique : court-circuit massif, alerte +30.';
  } else if (roll.outcome === 'success') {
    creditDelta = 3;
    alertDelta = -5;
    summary = '⚡ Système majeur surchargé. +3 Crédits, alerte -5.';
  } else if (roll.outcome === 'partial') {
    creditDelta = 2;
    alertDelta = 5;
    summary = '~ Surcharge partielle. +2 Crédits mais alerte +5.';
  } else {
    alertDelta = 15;
    summary = '✗ Surcharge ratée — alerte +15.';
  }
  const patches = [
    ...buildCreditsPatch(state, byPlayerId, creditDelta),
    ...buildAlertPatch(state, alertDelta),
  ];
  return {
    success: roll.outcome === 'success',
    patches,
    events: [buildEvent('action.resolved', { actionId: 'surcharge', byPlayerId, roll, summary })],
  };
}

// === Helpers patch + event ===

function buildAlertPatch(
  state: PublicGameState,
  delta: number,
): ReadonlyArray<{ op: 'replace'; path: string; value: number }> {
  if (delta === 0) return [];
  const current = state.alert ?? 0;
  const next = clamp(current + delta, 0, 100);
  return [{ op: 'replace', path: '/alert', value: next }];
}

function buildCreditsPatch(
  state: PublicGameState,
  playerId: PlayerId,
  delta: number,
): ReadonlyArray<{ op: 'replace'; path: string; value: number }> {
  if (delta === 0) return [];
  const player = state.players[playerId];
  if (!player) return [];
  const current = player.credits ?? 0;
  const next = Math.max(0, current + delta);
  return [{ op: 'replace', path: `/players/${playerId}/credits`, value: next }];
}

function buildEvent(
  type: string,
  payload: Record<string, unknown>,
): TurnEvent {
  // TurnEvent est une union ouverte côté shared ; on cast pour le
  // moment — la définition stricte arrive en slice 3e-2b avec la liste
  // exhaustive des kinds.
  return { type, ...payload } as unknown as TurnEvent;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
