/**
 * Reducer de l'état `briefing` (cf. `docs/specs/server-state-machine.md §3.2`).
 *
 * Phase pendant laquelle chaque Player consulte son rôle + objectif sur
 * son smartphone et clique « prêt ». La transition vers `casse` se
 * déclenche quand **tous** les Players ont émis `briefing.ready`.
 *
 * Transitions traitées :
 * - `briefing.ready` (Player) → enregistre le ready dans la room,
 *   broadcast `briefing.ready-changed`. Si tous prêts → transition
 *   `briefing → casse` + broadcast d'un placeholder de démarrage.
 *
 * Pas de gestion de l'inverse (un Player qui annule son ready) au MVP —
 * une fois clic, c'est définitif. À reconsidérer au playtest.
 */

import type { ClientRequest } from '@pixel-quests/shared';
import type { Room } from '../../Room';
import type { AdventureHooks } from '../hooks';
import { accept, type Emit, type Reaction, type Sender } from '../types';
import { enterCasse } from './casse';

export interface BriefingReducerDeps {
  hooks: AdventureHooks;
}

export function applyBriefing(
  room: Room,
  msg: ClientRequest,
  sender: Sender,
  _deps: BriefingReducerDeps,
): Reaction {
  if (msg.type === 'briefing.ready') {
    return handleReady(room, sender);
  }
  // Les autres messages sont filtrés par le dispatcher principal.
  return accept([]);
}

function handleReady(room: Room, sender: Sender): Reaction {
  // Validators a déjà filtré : on est en briefing et sender ∈ players.
  if (sender.kind !== 'player') return accept([]);
  // Idempotent : si déjà ready, on ne re-emit pas pour éviter les
  // doublons sur du double-tap mobile.
  if (room.isBriefingReady(sender.playerId)) {
    return accept([]);
  }
  room.markBriefingReady(sender.playerId);

  const emits: Emit[] = [
    {
      to: 'room',
      type: 'briefing.ready-changed',
      payload: { readyPlayerIds: room.briefingReadyIds() },
    },
  ];

  // Tous prêts → transition vers `casse`. On délègue à `enterCasse`
  // (slice 3e-2) pour initialiser le tour 1 + émettre turn.started +
  // state.patch posant status='casse'.
  if (room.allBriefingReady()) {
    room.setStatus('casse');
    const casseReaction = enterCasse(room);
    if (casseReaction.kind === 'accept') {
      emits.push(...casseReaction.emits);
    }
  }
  return accept(emits);
}
