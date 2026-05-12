/**
 * Messages WebSocket de Pixel Quests (F20, F21).
 *
 * Conventions (D2 + extensions Jackbox) :
 * - **Requêtes** (client → serveur) : `domaine.action` (présent infinitif).
 * - **Événements** (serveur → clients) : `domaine.action.passé`.
 * - Unions discriminées sur `type`, payload strictement typé par variant.
 *
 * Le protocole reste agnostique de la lib transport (socket.io aujourd'hui,
 * éventuel `ws` plus tard). La couche socket.io est isolée dans `server/`
 * et — futur Prompt 3 — dans `front/` côté client.
 */

import type { PlayerId, RoomCode, RoomId, SocketId } from '../types/common';

// === Requêtes Host → Serveur ===

export type HostRequest =
  | { type: 'room.create'; payload: { adventureId: string } }
  | { type: 'game.start'; payload: { roomId: RoomId } }
  | { type: 'ping'; payload: { t: number } };

// === Requêtes Player → Serveur ===

export type PlayerRequest =
  | { type: 'room.join'; payload: { roomCode: RoomCode; playerName: string } }
  | { type: 'room.leave'; payload: { roomId: RoomId } }
  | { type: 'ping'; payload: { t: number } };

// === Événements Serveur → clients ===

export type ServerEvent =
  | { type: 'room.created'; payload: { roomId: RoomId; roomCode: RoomCode; qrUrl: string } }
  | { type: 'player.joined'; payload: { playerId: PlayerId; playerName: string; roomId: RoomId } }
  | { type: 'player.left'; payload: { playerId: PlayerId; roomId: RoomId } }
  | { type: 'room.full'; payload: { roomId: RoomId } }
  | { type: 'room.not-found'; payload: { roomCode: RoomCode } }
  | { type: 'pong'; payload: { t: number; serverT: number } }
  | { type: 'connection.established'; payload: { socketId: SocketId } };

// === Types utilitaires ===

export type ClientRequest = HostRequest | PlayerRequest;
export type AnyMessage = ClientRequest | ServerEvent;

/** Helper : extrait le payload d'un message par son `type`. */
export type PayloadOf<
  M extends { type: string; payload: unknown },
  T extends M['type'],
> = Extract<M, { type: T }> extends { payload: infer P } ? P : never;
