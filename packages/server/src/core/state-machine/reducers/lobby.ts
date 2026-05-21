/**
 * Reducer de l'état `lobby` (cf. `docs/specs/server-state-machine.md §3.1`).
 *
 * Transitions traitées :
 * - `room.join` → ajoute le player, broadcast `player.joined`
 * - `room.leave` → retire le player, broadcast `player.left`
 * - `game.start` → transition `lobby → briefing`, distribue les rôles
 *   via le hook aventure, émet :
 *   - broadcast `game.started` (PublicGameState initial, sans aucun privé)
 *   - dirigés `private.role-revealed` + `private.objective` à chaque player
 *
 * Pas de gestion `disconnect` ici — c'est le `DisconnectHandlers` qui
 * appelle directement la state machine avec un sender pseudo, mais ça
 * arrivera à la slice 3c-3 (timers + grace).
 */

import { nanoid } from 'nanoid';
import type { ClientRequest, PlayerId } from '@pixel-quests/shared';
import type { Room } from '../../Room';
import type { AdventureHooks } from '../hooks';
import { accept, type Emit, type Reaction, type Sender } from '../types';

export interface LobbyReducerDeps {
  hooks: AdventureHooks;
  /**
   * Source de PlayerId pour les nouveaux arrivants. Injectable pour
   * tests déterministes ; en prod c'est `nanoid` sans arguments.
   */
  newPlayerId?: () => PlayerId;
  /**
   * RNG pour la distribution des rôles (déterministe en test).
   * En prod : `Math.random`.
   */
  rng?: () => number;
}

/**
 * Applique un message au reducer lobby.
 *
 * La validation est supposée déjà passée — c'est `RoomStateMachine` qui
 * dispatche après `validateMessage`. Si on arrive ici, le message est
 * légitime pour l'état courant.
 */
export function applyLobby(
  room: Room,
  msg: ClientRequest,
  sender: Sender,
  deps: LobbyReducerDeps,
): Reaction {
  switch (msg.type) {
    case 'room.join':
      return handleJoin(room, msg.payload, sender, deps);
    case 'room.leave':
      return handleLeave(room, sender);
    case 'game.start':
      return handleGameStart(room, deps);
    default:
      // Le dispatcher principal filtre déjà ; ce bras n'est qu'un garde-fou TS.
      return accept([]);
  }
}

// === Handlers internes ===

function handleJoin(
  room: Room,
  payload: { roomCode: string; playerName: string },
  sender: Sender,
  deps: LobbyReducerDeps,
): Reaction {
  const playerId = deps.newPlayerId?.() ?? nanoid();
  // Le sender lors d'un `room.join` est un Player (premier message après
  // connexion). On capture son socketId pour le lier au PlayerId.
  const socketId = sender.kind === 'player' ? sender.socketId : sender.socketId;
  room.addPlayer({
    id: playerId,
    name: payload.playerName.trim(),
    socketId,
    joinedAt: new Date(),
  });
  return accept([
    {
      to: 'room',
      type: 'player.joined',
      payload: {
        playerId,
        playerName: payload.playerName.trim(),
        roomId: room.id,
      },
    },
  ]);
}

function handleLeave(room: Room, sender: Sender): Reaction {
  if (sender.kind !== 'player') {
    // Garde-fou : validators a déjà filtré.
    return accept([]);
  }
  const removed = room.removePlayer(sender.playerId);
  if (!removed) return accept([]);
  return accept([
    {
      to: 'room',
      type: 'player.left',
      payload: { playerId: sender.playerId, roomId: room.id },
    },
  ]);
}

function handleGameStart(room: Room, deps: LobbyReducerDeps): Reaction {
  const playerIds = room.getPlayers().map((p) => p.id);
  // 1) Transition d'état.
  room.setStatus('briefing');
  // 2) Distribution rôles + objectifs via le hook aventure.
  const distribution = deps.hooks.distributeRoles(playerIds, { rng: deps.rng });

  // 3) Construire les emits :
  //    - broadcast `game.started` avec l'initialState public (sans aucun privé)
  //    - dirigé `private.role-revealed` + `private.objective` à chaque player
  const emits: Emit[] = [
    {
      to: 'room',
      type: 'game.started',
      payload: { initialState: distribution.publicState },
    },
  ];
  for (const player of room.getPlayers()) {
    const priv = distribution.privates[player.id];
    if (!priv) continue;
    emits.push({
      to: { socketId: player.socketId },
      type: 'private.role-revealed',
      payload: { roleId: priv.roleId, capabilities: priv.capabilities },
    });
    emits.push({
      to: { socketId: player.socketId },
      type: 'private.objective',
      payload: priv.objective,
    });
    if (priv.dossiers.length > 0) {
      emits.push({
        to: { socketId: player.socketId },
        type: 'private.dossiers',
        payload: { items: priv.dossiers },
      });
    }
  }
  return accept(emits);
}
