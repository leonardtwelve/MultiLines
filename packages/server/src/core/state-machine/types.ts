/**
 * Types internes de la machine à états serveur (cf.
 * `docs/specs/server-state-machine.md §7.2`).
 *
 * Volontairement isolés du protocole partagé : ce sont les **briques de
 * traitement interne**, pas le contrat réseau. Les `Emit` sont ensuite
 * traduits en `socket.emit(...)` par les handlers.
 */

import type {
  ErrorPayload,
  PlayerId,
  ServerEvent,
  SocketId,
  StatePatchBatch,
} from '@pixel-quests/shared';

/**
 * Identité d'un expéditeur (auteur d'un message reçu côté serveur).
 *
 * - `host` : le client Host n'a pas de PlayerId — on l'identifie au
 *   `socketId` et à son rôle dans la room (`Room.hostSocketId`).
 * - `player` : a un `playerId` rattaché à un slot de la room.
 */
export type Sender =
  | { kind: 'host'; socketId: SocketId }
  | { kind: 'player'; playerId: PlayerId; socketId: SocketId };

/**
 * Cible d'un événement à diffuser côté serveur.
 *
 * - `'room'` : broadcast à toute la room socket.io (tous les Players + le Host).
 * - `{ socketId }` : émission ciblée à un socket précis (cf. spec §5 anti-triche,
 *   et messages `private.*` jamais broadcastés).
 */
export type EmitTarget = 'room' | { socketId: SocketId };

/**
 * Événement à émettre par le handler après une réaction acceptée.
 *
 * `type` et `payload` correspondent exactement au contrat
 * `@pixel-quests/shared/protocol` — toute valeur valide pour `ServerEvent`
 * est acceptée ici, le type-system garantit la cohérence à l'appel.
 */
export type Emit = {
  to: EmitTarget;
} & ServerEvent;

/**
 * Réaction d'un reducer ou de la state machine à un message reçu.
 *
 * - `accept` : message légitime, on diffuse les `emits`, et optionnellement
 *   on applique un batch de patches (slice 3c-3/3c-4 quand le state
 *   modèle est branché). Au MVP slice 3c-2 (lobby/briefing), `patches`
 *   reste undefined — les transitions n'ont pas encore d'état projeté.
 * - `reject` : validation échouée. Le handler retourne l'erreur à
 *   l'expéditeur via `private.error` ou `action.rejected` selon le contexte.
 */
export type Reaction =
  | { kind: 'accept'; emits: ReadonlyArray<Emit>; patches?: StatePatchBatch }
  | { kind: 'reject'; error: ErrorPayload };

/** Helper : construit un `Reaction.accept` sans patches. */
export function accept(emits: ReadonlyArray<Emit>): Reaction {
  return { kind: 'accept', emits };
}

/** Helper : construit un `Reaction.reject` typé. */
export function reject(error: ErrorPayload): Reaction {
  return { kind: 'reject', error };
}
