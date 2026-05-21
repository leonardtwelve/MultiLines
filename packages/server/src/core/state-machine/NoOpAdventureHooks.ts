/**
 * Implémentation par défaut des `AdventureHooks` — utilisée en attendant
 * l'aventure réelle (Banque Lune impl prévue dans une slice ultérieure).
 *
 * Comportement :
 * - `distributeRoles` : attribue à chaque player un rôle `agent` générique,
 *   un objectif placeholder « Joue ton mieux », pas de dossier ni de tension.
 *   Le `publicState` initial liste tous les players avec `connected: true`.
 * - `resolveAction` : renvoie toujours `null` (action inconnue) — toute
 *   action proposée sera rejetée avec `ACTION_UNKNOWN` par le futur reducer
 *   `casse` (slice ultérieure).
 * - `triggerTurnEvents` : aucun événement de tour.
 * - `computeFinalScore` : bilan vide avec un titre générique.
 *
 * Cohérent avec le scope MVP 3c-3 : on câble la machinerie réseau,
 * pas encore les règles métier.
 */

import type {
  GameEndReason,
  PlayerId,
  PrivatePlayerState,
  PublicGameState,
  PublicPlayer,
  RoomStatus,
  TurnEvent,
} from '@pixel-quests/shared';
import type { AdventureHooks, FinalScore, RoleDistribution } from './hooks';

export interface NoOpAdventureHooksOptions {
  adventureId?: string;
  roomId?: string;
  /** Permet de tester la transition de status post-briefing. Défaut: 'briefing'. */
  initialStatus?: RoomStatus;
}

export function createNoOpAdventureHooks(opts: NoOpAdventureHooksOptions = {}): AdventureHooks {
  const adventureId = opts.adventureId ?? 'noop';
  const initialStatus: RoomStatus = opts.initialStatus ?? 'briefing';

  return {
    adventureId,

    distributeRoles(playerIds: ReadonlyArray<PlayerId>): RoleDistribution {
      const privates: Record<PlayerId, PrivatePlayerState> = {};
      const players: Record<PlayerId, PublicPlayer> = {};
      for (const [i, id] of playerIds.entries()) {
        privates[id] = {
          playerId: id,
          roleId: 'agent',
          capabilities: [],
          objective: {
            id: 'objective-default',
            description: 'Joue ton mieux et amuse-toi.',
            hidden: false,
          },
          dossiers: [],
          pendingPactes: [],
        };
        players[id] = {
          id,
          // Placeholder de nom — l'identité réelle vient de la Room côté serveur.
          name: `Joueur ${i + 1}`,
          // Palette deterministe par index pour la phase de dev.
          color: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
          connected: true,
        };
      }
      const publicState: PublicGameState = {
        roomId: opts.roomId ?? 'unknown-room',
        status: initialStatus,
        adventureId,
        players,
      };
      return { privates, publicState };
    },

    resolveAction: () => null,

    triggerTurnEvents: (): ReadonlyArray<TurnEvent> => [],

    computeFinalScore: (
      _state: PublicGameState,
      endReason: GameEndReason,
    ): FinalScore => ({
      endReason,
      headline: 'Partie terminée',
      perPlayer: {},
    }),
  };
}

const PLACEHOLDER_COLORS = ['#ffcc66', '#66ddaa', '#66aaff', '#ff6688', '#aa88ff'] as const;
