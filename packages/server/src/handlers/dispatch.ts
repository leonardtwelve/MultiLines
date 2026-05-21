/**
 * Utilitaires de pont entre la `RoomStateMachine` et socket.io.
 *
 * La state machine renvoie une `Reaction` typée — c'est ici qu'on
 * traduit ça en `socket.emit` / `io.to(room).emit` / `private.error`.
 *
 * Volontairement minimal et testable indépendamment des handlers.
 */

import type { Server, Socket } from 'socket.io';
import type { Reaction, Sender } from '../core/state-machine';
import type { Room } from '../core/Room';

/**
 * Identifie l'auteur d'un message reçu sur un socket dans le contexte
 * d'une room précise. Renvoie `null` si le socket n'a aucun lien avec
 * la room (ni Host, ni Player) — le handler décide alors quoi faire.
 *
 * Convention : pour les messages qui s'appliquent à une room précise,
 * cette fonction est appelée par le handler après avoir trouvé la room
 * (via `roomId` du payload OU via la 1ère room où ce socket apparaît).
 */
export function senderFor(socket: Socket, room: Room): Sender | null {
  if (socket.id === room.hostSocketId) {
    return { kind: 'host', socketId: socket.id };
  }
  const player = room.getPlayers().find((p) => p.socketId === socket.id);
  if (player) {
    return { kind: 'player', playerId: player.id, socketId: socket.id };
  }
  return null;
}

/**
 * Applique une `Reaction` côté socket.io :
 * - `accept` : pour chaque `emit`, route vers `io.to(roomId)` ou
 *   `io.to(socketId)`.
 * - `reject` : envoie `private.error` au socket d'origine. Le client
 *   l'affiche dans son HUD (cf. protocole §4.3).
 *
 * Note : on n'applique pas `reaction.patches` ici — ce sera fait à la
 * slice 3c-4 quand le `state.patch` sera câblé bout en bout côté front.
 */
export function applyReaction(params: {
  reaction: Reaction;
  io: Server;
  socket: Socket;
  roomId: string;
}): void {
  const { reaction, io, socket, roomId } = params;
  if (reaction.kind === 'reject') {
    socket.emit('private.error', reaction.error);
    return;
  }
  for (const emit of reaction.emits) {
    if (emit.to === 'room') {
      io.to(roomId).emit(emit.type, emit.payload);
    } else {
      io.to(emit.to.socketId).emit(emit.type, emit.payload);
    }
  }
}
