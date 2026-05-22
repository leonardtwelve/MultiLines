import type { Server, Socket } from 'socket.io';
import type { PayloadOf, PlayerRequest } from '@pixel-quests/shared/protocol';
import type { RoomRegistry } from '../core/RoomRegistry';
import { applyReaction, senderFor } from './dispatch';

/**
 * Listeners socket.io pour les requêtes Player (smartphone).
 *
 * Toutes les requêtes Player sont routées via la `RoomStateMachine` —
 * c'est elle qui valide le contexte (statut, autorisation, ressources)
 * avant de muter la `Room` et de produire les emits.
 *
 * `room.join` est un cas particulier : le sender n'existe pas encore
 * dans la room au moment du message. On construit donc un sender pseudo
 * (avec le `socketId`) et la state machine génère le `playerId` dans le
 * reducer lobby (cf. `reducers/lobby.ts handleJoin`).
 */
export function registerPlayerHandlers(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
}): void {
  const { io, socket, rooms } = params;

  // === room.join — résolu par roomCode ===

  socket.on('room.join', (payload: PayloadOf<PlayerRequest, 'room.join'>) => {
    const room = rooms.getRoomByCode(payload.roomCode);
    if (!room) {
      socket.emit('room.not-found', { roomCode: payload.roomCode });
      return;
    }
    const sm = rooms.getStateMachine(room.id);
    if (!sm) {
      socket.emit('room.not-found', { roomCode: payload.roomCode });
      return;
    }
    // Sender pseudo-player : le state machine génère le vrai PlayerId.
    const reaction = sm.handle(
      { type: 'room.join', payload },
      { kind: 'player', playerId: 'pending', socketId: socket.id },
    );
    if (reaction.kind === 'accept') {
      // On joint socket.io APRÈS l'accept pour ne pas recevoir des
      // events si la validation refuse (room.full / room.state-invalid).
      void socket.join(room.id);
    }
    applyReaction({ reaction, io, socket, roomId: room.id });
  });

  // === room.leave / briefing.ready — résolus par roomId implicite ===

  socket.on('room.leave', (payload: PayloadOf<PlayerRequest, 'room.leave'>) => {
    routeRoomMessage({
      io,
      socket,
      rooms,
      roomId: payload.roomId,
      build: (room) => {
        const sender = senderFor(socket, room);
        return sender ? { sender, msg: { type: 'room.leave' as const, payload } } : null;
      },
      onAccept: () => void socket.leave(payload.roomId),
    });
  });

  socket.on('briefing.ready', (payload: PayloadOf<PlayerRequest, 'briefing.ready'>) => {
    // `briefing.ready` n'a pas de roomId dans le payload — on cherche
    // la room où ce socket est Player.
    const room = findRoomForPlayerSocket(rooms, socket.id);
    if (!room) {
      socket.emit('private.error', {
        code: 'NOT_IN_ROOM',
        message: 'Tu n’es pas inscrit·e dans une partie.',
      });
      return;
    }
    const sm = rooms.getStateMachine(room.id);
    if (!sm) return;
    const sender = senderFor(socket, room);
    if (!sender) return;
    const reaction = sm.handle({ type: 'briefing.ready', payload }, sender);
    applyReaction({ reaction, io, socket, roomId: room.id });
  });

  // === ping — inline ===

  socket.on('ping', (payload: PayloadOf<PlayerRequest, 'ping'>) => {
    socket.emit('pong', { t: payload.t, serverT: Date.now() });
  });
}

/**
 * Délais de grace avant cleanup effectif après un `disconnect`.
 *
 * Ces valeurs sont **délibérément plus courtes** que celles de la spec
 * server-state-machine.md §5 (120 s Player / 300 s Host) parce qu'on
 * n'a pas encore de `sessionToken` (cf. protocole.md §6.4) pour
 * permettre une vraie reconnexion identifiée. Un joueur qui revient
 * pendant la grace serait traité comme un nouveau player → l'ancien
 * record finirait par expirer de toute façon. Garder ces délais courts
 * évite d'avoir des records fantômes trop longtemps en RAM.
 *
 * Quand sessionToken sera câblé (slice ultérieure), on poussera ces
 * délais à 120/300 et on câblera la vraie réconciliation.
 */
export const PLAYER_DISCONNECT_GRACE_MS = 30_000;
export const HOST_DISCONNECT_GRACE_MS = 60_000;

/**
 * Handler global de déconnexion. Implémente une grace **minimaliste** en
 * attendant le câblage complet sessionToken / paused-state (cf. spec
 * §5 et faiblesse #2 de la review review 3c-3).
 *
 * - **Player disconnect** : émet immédiatement `player.disconnected`
 *   (purement informatif) puis programme le `player.left` + suppression
 *   dans 30 s. Pendant la grace, l'enregistrement du joueur reste en
 *   place pour ne pas perdre son state interne.
 * - **Host disconnect** : programme la destruction de la room dans 60 s.
 *   Pendant la grace, aucun event n'est émis aux Players — le serveur
 *   garde l'option de Host-reconnect (à implémenter avec sessionToken).
 */
export function registerDisconnectHandler(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
  /**
   * Délais injectables — par défaut `PLAYER_DISCONNECT_GRACE_MS` /
   * `HOST_DISCONNECT_GRACE_MS`. Permet aux tests d'intégration de
   * raccourcir les graces (sinon chaque cas bloque 30-60 s).
   */
  playerGraceMs?: number;
  hostGraceMs?: number;
}): void {
  const { io, socket, rooms } = params;
  const playerGraceMs = params.playerGraceMs ?? PLAYER_DISCONNECT_GRACE_MS;
  const hostGraceMs = params.hostGraceMs ?? HOST_DISCONNECT_GRACE_MS;

  socket.on('disconnect', () => {
    for (const room of [...findRoomsForSocket(rooms, socket.id)]) {
      if (room.hostSocketId === socket.id) {
        // Host : pas de broadcast immédiat. On laisse la room en vie
        // pendant la grace pour préserver le state. Si on enchaîne le
        // câblage sessionToken, le Host pourra reprendre la main.
        setTimeout(() => {
          // Vérifie que la room existe toujours (peut avoir été
          // supprimée entretemps par cleanup ou game.cancel).
          if (!rooms.getRoom(room.id)) return;
          // Re-check : si le hostSocketId a été remplacé par une vraie
          // reconnexion (post-sessionToken), on annule la destruction.
          if (rooms.getRoom(room.id)?.hostSocketId !== socket.id) return;
          io.to(room.id).emit('room.not-found', { roomCode: room.code });
          rooms.deleteRoom(room.id);
        }, hostGraceMs);
      } else {
        const player = room.getPlayers().find((p) => p.socketId === socket.id);
        if (!player) continue;
        // Notification immédiate (UX : les autres joueurs voient que le
        // joueur s'est déconnecté sans qu'il soit retiré pour autant).
        io.to(room.id).emit('player.disconnected', {
          playerId: player.id,
          roomId: room.id,
        });
        setTimeout(() => {
          // Re-check : si entretemps le player a été remplacé (même id,
          // socket différent — possible si sessionToken câblé), on
          // annule la suppression.
          const current = rooms.getRoom(room.id)?.getPlayer(player.id);
          if (!current) return; // déjà parti
          if (current.socketId !== socket.id) return; // reconnecté
          rooms.getRoom(room.id)?.removePlayer(player.id);
          io.to(room.id).emit('player.left', { playerId: player.id, roomId: room.id });
        }, playerGraceMs);
      }
    }
  });
}

// === Helpers ===

/**
 * Route un message au reducer adapté pour une room donnée. Si la room
 * ou le sender est invalide, émet une `private.error` correctement
 * codée.
 */
function routeRoomMessage<P>(params: {
  io: Server;
  socket: Socket;
  rooms: RoomRegistry;
  roomId: string;
  build: (room: import('../core/Room').Room) =>
    | {
        sender: import('../core/state-machine').Sender;
        msg: Parameters<import('../core/state-machine').RoomStateMachine['handle']>[0];
      }
    | null;
  onAccept?: () => void;
  _typeMarker?: P;
}): void {
  const { io, socket, rooms, roomId, build, onAccept } = params;
  const room = rooms.getRoom(roomId);
  const sm = rooms.getStateMachine(roomId);
  if (!room || !sm) {
    socket.emit('private.error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Cette partie n’existe plus.',
    });
    return;
  }
  const built = build(room);
  if (!built) {
    socket.emit('private.error', {
      code: 'NOT_IN_ROOM',
      message: 'Tu n’es pas inscrit·e dans cette partie.',
    });
    return;
  }
  const reaction = sm.handle(built.msg, built.sender);
  if (reaction.kind === 'accept' && onAccept) onAccept();
  applyReaction({ reaction, io, socket, roomId: room.id });
}

function findRoomForPlayerSocket(
  rooms: RoomRegistry,
  socketId: string,
): import('../core/Room').Room | undefined {
  for (const room of rooms.snapshotRooms()) {
    if (room.getPlayers().some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

function* findRoomsForSocket(rooms: RoomRegistry, socketId: string) {
  for (const room of rooms.snapshotRooms()) {
    if (room.hostSocketId === socketId) {
      yield room;
      continue;
    }
    if (room.getPlayers().some((p) => p.socketId === socketId)) {
      yield room;
    }
  }
}
