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

  // Tous prêts → transition vers `casse`. Le démarrage effectif de
  // l'acte 2 (initial state casse + emission `turn.started` etc.) sera
  // câblé à la slice 3c-3 quand on aura les reducers `casse` et le hook
  // d'initialisation de tour.
  if (room.allBriefingReady()) {
    room.setStatus('casse');
    // Pas de broadcast supplémentaire pour le moment — le passage en
    // `casse` sera reflété par le prochain `state.patch` ou par le
    // premier `turn.started` (slice 3c-3).
  }
  return accept(emits);
}
