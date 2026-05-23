/**
 * Implémentation `AdventureHooks` pour Banque Lune (slice 3e-1).
 *
 * **Cette slice** : la distribution de rôles + objectifs + le snapshot
 * public initial. Les hooks `resolveAction`, `triggerTurnEvents` et
 * `computeFinalScore` sont des **stubs minimaux** — leur implémentation
 * réelle arrive en slice 3e-2 (reducer `casse`) puis 3e-4 (bilan).
 *
 * Conventions de `publicState` (cf. spec store-projection §1.1) :
 * - `players[id].credits = 3` (mise initiale, à valider en playtest)
 * - `alert = 0` (jauge d'alerte départ)
 * - `status = 'briefing'` (transition pilotée par le state-machine)
 *
 * Conventions de `private` :
 * - `roleId` + `capabilities` (action ids du rôle, utilisés par les
 *   validators du state-machine pour vérifier `action.propose`)
 * - `objective` : 1 objectif tiré dans le pool du rôle (G10 §7.4)
 * - `dossiers: []` (vide au départ — récupérés via actions au tour)
 * - `tension: 0` (Infiltré / Négociateur ; champ existant mais non
 *   utilisé en 3e-1)
 */

import type {
  GameEndReason,
  PlayerId,
  PrivatePlayerState,
  PublicGameState,
  PublicPlayer,
  TurnEvent,
} from '@pixel-quests/shared';
import type {
  ActionResult,
  AdventureHooks,
  FinalScore,
  RoleDistribution,
} from '../../core/state-machine/hooks';
import {
  capabilitiesOf,
  distributeRoles,
  InvalidPlayerCountError,
  ROLES,
  type RoleId,
} from './roles';
import { distributeObjectives, type Objective } from './objectives';
import { resolveBanqueLuneAction } from './actions';

const ADVENTURE_ID = 'banque-lune';

/** Crédits de départ par joueur (Banque Lune MVP — ajustable en playtest). */
const INITIAL_CREDITS = 3;

export interface BanqueLuneHooksOptions {
  roomId: string;
  /** RNG injectable pour des tests reproductibles. Défaut: Math.random. */
  rng?: () => number;
}

export function createBanqueLuneAdventureHooks(
  opts: BanqueLuneHooksOptions,
): AdventureHooks {
  const rng = opts.rng ?? Math.random;
  /**
   * Mémoire interne de la distribution des rôles. Remplie au premier
   * appel de `distributeRoles`, consultée par `resolveAction` pour
   * router l'action vers le bon resolver (cf. actions.ts).
   */
  const playerRoles = new Map<PlayerId, RoleId>();

  return {
    adventureId: ADVENTURE_ID,

    distributeRoles(playerIds: ReadonlyArray<PlayerId>): RoleDistribution {
      // 1) Rôles (lève InvalidPlayerCountError si ∉ [3,5]).
      const distribution = distributeRoles(playerIds, rng);
      // Mémorise pour `resolveAction` (closure).
      playerRoles.clear();
      for (const [pid, rid] of distribution) playerRoles.set(pid, rid);

      // 2) Objectifs (avec anti-blocage G10).
      const objectives = distributeObjectives(
        playerIds.map((pid) => ({
          playerId: pid,
          roleId: playerRoles.get(pid) as RoleId,
        })),
        rng,
      );

      // 3) Construire privates + publicPlayers.
      const privates: Record<PlayerId, PrivatePlayerState> = {};
      const players: Record<PlayerId, PublicPlayer> = {};
      for (const pid of playerIds) {
        const roleId = playerRoles.get(pid) as RoleId;
        const role = ROLES[roleId];
        const objective = objectives.get(pid) as Objective;
        privates[pid] = {
          playerId: pid,
          roleId,
          capabilities: [...capabilitiesOf(roleId)],
          objective: {
            id: objective.id,
            description: objective.label,
            // Les objectifs Banque Lune sont visibles par leur propriétaire ;
            // `hidden: true` est réservé aux objectifs « tordus » de groupe
            // (post-MVP, cf. issue #52).
            hidden: false,
          },
          dossiers: [],
          tension: 0,
          pendingPactes: [],
        };
        players[pid] = {
          id: pid,
          // Le nom + la couleur viennent de la Room (le reducer lobby
          // les overlay sur ce publicState — cf. fix #1 review 3c-3).
          // On met des placeholders cohérents au cas où.
          name: pid,
          color: role.color,
          connected: true,
          credits: INITIAL_CREDITS,
        };
      }

      const publicState: PublicGameState = {
        roomId: opts.roomId,
        status: 'briefing',
        adventureId: ADVENTURE_ID,
        players,
        alert: 0,
      };

      return { privates, publicState };
    },

    // === Slice 3e-2 : impl partielle ===

    /**
     * Résolution d'une action proposée. Slice 3e-2 implémente les 3
     * actions du Hacker (Intrusion système, Collecte de données,
     * Surcharge). Les actions des 4 autres rôles arrivent en 3e-2b →
     * renvoient `null` ici, ce qui déclenche `ACTION_UNKNOWN` côté
     * state machine.
     *
     * Le `roleId` du joueur est récupéré depuis la closure mémorisée
     * lors de `distributeRoles` — évite de polluer la signature du
     * hook avec un param `roleId`.
     */
    resolveAction: (
      actionId: string,
      _params: Readonly<Record<string, unknown>>,
      state: PublicGameState,
      byPlayerId: PlayerId,
    ): ActionResult | null => {
      const roleId = playerRoles.get(byPlayerId);
      if (!roleId) return null;
      return resolveBanqueLuneAction(actionId, state, byPlayerId, roleId, { rng });
    },

    /**
     * Événements de tour — MVP slice 3e-2.
     *
     * Pour l'instant aucun événement scripté (porte qui s'ouvre,
     * patrouille de garde, etc.). L'alerte augmente naturellement via
     * les résolutions d'actions risquées (cf. actions.ts). Les vrais
     * événements (table d'événements de tour, spec #25) arrivent en
     * 3e-2b.
     */
    triggerTurnEvents: (_state: PublicGameState): ReadonlyArray<TurnEvent> => [],

    /**
     * Bilan final — stub minimal. Arrive en 3e-4 avec calcul réel
     * (atteinte des objectifs privés, butin, partage).
     */
    computeFinalScore: (state: PublicGameState, endReason: GameEndReason): FinalScore => {
      const headline =
        endReason === 'success-early'
          ? 'Succès — extraction avant la fin du timer.'
          : endReason === 'failure-alert'
            ? "Échec — l'alerte a tout fait sauter."
            : endReason === 'turn-limit'
              ? 'Fin du timer — partie évaluée sur la situation.'
              : endReason === 'host-timeout' || endReason === 'massive-disconnect'
                ? 'Partie interrompue.'
                : 'Partie terminée.';
      const perPlayer: Record<PlayerId, { credits: number; objectiveAchieved: boolean }> = {};
      for (const [pid, p] of Object.entries(state.players)) {
        perPlayer[pid] = {
          credits: p.credits ?? 0,
          // Évaluation réelle des objectifs en slice 3e-4 (predicate
          // par axis : action / economic / comparative / narrative).
          objectiveAchieved: false,
        };
      }
      return { endReason, headline, perPlayer };
    },
  };
}

// === Re-export utile aux consommateurs externes ===

export { InvalidPlayerCountError };
