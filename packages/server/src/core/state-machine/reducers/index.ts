/**
 * Dispatcher des reducers par statut courant + type de message.
 *
 * Le `RoomStateMachine` interroge ce module pour savoir QUEL reducer
 * appeler. Le reducer choisi est ensuite invoqué avec `(room, msg,
 * sender, deps)` — voir `RoomStateMachine.handle`.
 *
 * Slice 3c-2 couvre uniquement les statuts `lobby` et `briefing` ; les
 * autres tombent sur un reducer no-op (à remplacer en 3c-3+ par
 * `casseReducer`, `voteReducer`, etc.).
 */

import type { ClientRequest, RoomStatus } from '@pixel-quests/shared';
import type { Room } from '../../Room';
import type { AdventureHooks } from '../hooks';
import { accept, type Reaction, type Sender } from '../types';
import { applyBriefing, type BriefingReducerDeps } from './briefing';
import { applyLobby, type LobbyReducerDeps } from './lobby';

export interface ReducerDeps extends LobbyReducerDeps, BriefingReducerDeps {
  hooks: AdventureHooks;
}

/**
 * Sélectionne et invoque le reducer adapté au statut courant.
 *
 * Retourne `null` si aucun reducer n'est encore implémenté pour ce
 * statut (slices futures) — l'appelant (`RoomStateMachine`) traite ce
 * cas comme un no-op accept (le message est ignoré sans erreur, mais
 * loggué côté serveur en attendant).
 */
export function applyReducer(
  status: RoomStatus,
  room: Room,
  msg: ClientRequest,
  sender: Sender,
  deps: ReducerDeps,
): Reaction | null {
  switch (status) {
    case 'lobby':
      return applyLobby(room, msg, sender, deps);
    case 'briefing':
      return applyBriefing(room, msg, sender, deps);
    case 'casse':
    case 'extraction':
    case 'vote':
    case 'reveal':
    case 'ended':
    case 'paused':
    case 'cancelled':
      // Slices futures.
      return null;
    default: {
      // Garde-fou TS — toutes les valeurs RoomStatus sont couvertes ci-dessus.
      const _exhaustive: never = status;
      void _exhaustive;
      return accept([]);
    }
  }
}
