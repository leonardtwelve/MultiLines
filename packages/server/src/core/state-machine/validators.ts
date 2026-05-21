/**
 * Validations runtime par message (cf. `docs/specs/server-state-machine.md §4`).
 *
 * Chaque fonction `validate*` est **pure** : prend la room, le message et
 * l'expéditeur, renvoie `null` si OK ou un `ErrorPayload` sinon. Le code
 * d'erreur (`ErrorCode`) est destiné au client pour afficher un message
 * lisible — le `message` français est déjà rempli côté serveur.
 *
 * Slice 3c-2 ne valide que les messages de lobby + briefing. Les autres
 * (action.*, vote.*, pacte.*) seront ajoutés à la slice 3c-3.
 */

import type { ClientRequest, ErrorPayload } from '@pixel-quests/shared';
import type { Room } from '../Room';
import { MAX_PLAYERS_PER_ROOM, MIN_PLAYERS_TO_START } from '../Room';
import type { Sender } from './types';

/**
 * Vérifie que l'expéditeur est le Host de la room.
 */
export function validateSenderIsHost(room: Room, sender: Sender): ErrorPayload | null {
  if (sender.kind !== 'host' || sender.socketId !== room.hostSocketId) {
    return {
      code: 'ROOM_STATE_INVALID',
      message: 'Cette commande est réservée à l’organisateur de la partie.',
    };
  }
  return null;
}

/**
 * Vérifie que l'expéditeur est un Player présent dans la room.
 */
export function validateSenderIsPlayer(room: Room, sender: Sender): ErrorPayload | null {
  if (sender.kind !== 'player') {
    return {
      code: 'NOT_IN_ROOM',
      message: 'Tu n’es pas inscrit·e dans cette partie.',
    };
  }
  if (!room.getPlayer(sender.playerId)) {
    return {
      code: 'NOT_IN_ROOM',
      message: 'Tu n’es plus inscrit·e dans cette partie.',
    };
  }
  return null;
}

/**
 * Validation contextuelle d'un `room.join` reçu côté serveur.
 *
 * Note : la vérification d'existence de la room elle-même est faite côté
 * registry **avant** d'instancier la state machine (cf. `RoomRegistry`).
 * Ici on valide seulement qu'on peut accueillir un nouveau joueur.
 */
export function validateRoomJoin(
  room: Room,
  playerName: string,
): ErrorPayload | null {
  if (room.status !== 'lobby') {
    return {
      code: 'ROOM_STATE_INVALID',
      message: 'Cette partie est déjà en cours, impossible de rejoindre.',
    };
  }
  if (room.isFull()) {
    return {
      code: 'ROOM_FULL',
      message: `Cette partie est déjà complète (${MAX_PLAYERS_PER_ROOM} joueurs max).`,
    };
  }
  if (!playerName || playerName.trim() === '') {
    return {
      code: 'TARGET_INVALID',
      message: 'Renseigne un pseudo pour rejoindre.',
    };
  }
  return null;
}

/** Validation d'un `room.leave` reçu côté serveur. */
export function validateRoomLeave(room: Room, sender: Sender): ErrorPayload | null {
  return validateSenderIsPlayer(room, sender);
}

/**
 * Validation d'un `game.start` reçu côté serveur.
 *
 * Garde-fous (cf. spec §3.1) :
 * - sender = host
 * - status = lobby
 * - joueurs ≥ MIN_PLAYERS_TO_START (3)
 */
export function validateGameStart(room: Room, sender: Sender): ErrorPayload | null {
  const hostErr = validateSenderIsHost(room, sender);
  if (hostErr) return hostErr;
  if (room.status !== 'lobby') {
    return {
      code: 'ROOM_STATE_INVALID',
      message: 'La partie ne peut être lancée que depuis le salon (lobby).',
    };
  }
  if (room.playerCount() < MIN_PLAYERS_TO_START) {
    return {
      code: 'ROOM_STATE_INVALID',
      message: `Il faut au moins ${MIN_PLAYERS_TO_START} joueurs pour lancer la partie.`,
    };
  }
  return null;
}

/** Validation d'un `briefing.ready` reçu côté serveur (cf. spec §3.2). */
export function validateBriefingReady(room: Room, sender: Sender): ErrorPayload | null {
  if (room.status !== 'briefing') {
    return {
      code: 'ROOM_STATE_INVALID',
      message: 'La phase de briefing n’est pas en cours.',
    };
  }
  return validateSenderIsPlayer(room, sender);
}

/**
 * Dispatch générique des validations connues. Renvoie `null` si la
 * combinaison message/état est OK, sinon un `ErrorPayload`.
 *
 * Couvre uniquement les messages traités par la slice 3c-2 — les autres
 * tombent dans le bras `default` qui les laisse passer (la state machine
 * elle-même filtrera via les reducers en construction).
 */
export function validateMessage(
  room: Room,
  msg: ClientRequest,
  sender: Sender,
): ErrorPayload | null {
  switch (msg.type) {
    case 'room.join':
      return validateRoomJoin(room, msg.payload.playerName);
    case 'room.leave':
      return validateRoomLeave(room, sender);
    case 'game.start':
      return validateGameStart(room, sender);
    case 'briefing.ready':
      return validateBriefingReady(room, sender);
    default:
      // Messages non encore couverts (slice 3c-3+).
      return null;
  }
}
