/**
 * Orchestrateur de la machine à états d'une room (cf.
 * `docs/specs/server-state-machine.md §7.2`).
 *
 * Point d'entrée unique pour traiter un message client reçu sur une
 * room donnée. La séquence est :
 *
 *   1. Validation contextuelle (`validators.ts`) — bloque si le message
 *      n'est pas légitime pour le statut courant.
 *   2. Dispatch vers le reducer du statut (`reducers/index.ts`).
 *   3. Le reducer mute la `Room` si nécessaire et renvoie une `Reaction`
 *      (emits + patches optionnels). Les handlers socket.io appellent
 *      ensuite `socket.emit` / `io.to(room).emit` selon `to`.
 *
 * Une instance par room. Construite par le `RoomRegistry` lors de la
 * création (slice 3c-3 quand on câblera les handlers).
 */

import type { ClientRequest } from '@pixel-quests/shared';
import type { Room } from '../Room';
import type { AdventureHooks } from './hooks';
import { applyReducer, type ReducerDeps } from './reducers';
import { accept, reject, type Reaction, type Sender } from './types';
import { validateMessage } from './validators';

export interface RoomStateMachineOptions {
  hooks: AdventureHooks;
  /** Source de PlayerId pour `room.join` (test : injectable). */
  newPlayerId?: () => string;
  /** RNG pour la distribution des rôles + événements de tour (test : injectable). */
  rng?: () => number;
}

export class RoomStateMachine {
  private readonly deps: ReducerDeps;

  constructor(
    public readonly room: Room,
    opts: RoomStateMachineOptions,
  ) {
    this.deps = {
      hooks: opts.hooks,
      newPlayerId: opts.newPlayerId,
      rng: opts.rng,
    };
  }

  /**
   * Point d'entrée unique. Reçoit un message déjà désérialisé +
   * authentifié socket-level, valide, dispatche, renvoie la réaction.
   */
  handle(msg: ClientRequest, sender: Sender): Reaction {
    // 1) Validation contextuelle.
    const err = validateMessage(this.room, msg, sender);
    if (err) {
      return reject(err);
    }
    // 2) Dispatch vers le reducer du statut.
    const reaction = applyReducer(this.room.status, this.room, msg, sender, this.deps);
    if (reaction === null) {
      // Statut pas encore couvert par un reducer (slices ultérieures :
      // casse / vote / reveal). On loggue pour ne pas swallow
      // silencieusement un message qui serait censé être traité.
      // eslint-disable-next-line no-console
      console.warn(
        '[state-machine] no reducer for status=%s msg.type=%s sender=%s — silent accept',
        this.room.status,
        msg.type,
        sender.kind,
      );
      return accept([]);
    }
    return reaction;
  }
}
