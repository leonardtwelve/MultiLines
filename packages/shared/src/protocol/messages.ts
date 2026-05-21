/**
 * Messages WebSocket de Pixel Quests (F20, F21).
 *
 * Conventions (cf. `docs/specs/protocole.md`) :
 * - **Requêtes** (client → serveur) : `domaine.action` (présent infinitif).
 * - **Événements** (serveur → clients) : `domaine.action.passé`.
 * - **Privés** (serveur → un socket précis) : préfixe `private.*` ou
 *   `state.snapshot` audience-tagué.
 * - Unions discriminées sur `type`, payload strictement typé par variant.
 *
 * Le protocole reste agnostique de la lib transport (socket.io aujourd'hui,
 * éventuel `ws` plus tard). Le `type` est utilisé comme nom d'event
 * socket.io directement — pas d'enveloppe `Message<T>` (cf. spec §1.1).
 */

import type { PlayerId, RoomCode, RoomId, SocketId } from '../types/common';
import type { ErrorPayload } from './errors';
import type {
  HostMeta,
  PrivatePlayerState,
  PublicGameState,
  Snapshot,
} from './state';
import type { StatePatchBatch } from './patches';

// =============================================================================
// Requêtes Host → Serveur
// =============================================================================

export type HostRequest =
  | { type: 'room.create'; payload: { adventureId: string } }
  | { type: 'game.start'; payload: { roomId: RoomId } }
  | { type: 'game.pause'; payload: { roomId: RoomId } }
  | { type: 'game.resume'; payload: { roomId: RoomId } }
  | { type: 'game.cancel'; payload: { roomId: RoomId } }
  | { type: 'state.resync.request'; payload: Record<string, never> }
  | { type: 'ping'; payload: { t: number } };

// =============================================================================
// Requêtes Player → Serveur
// =============================================================================

export type PlayerRequest =
  | { type: 'room.join'; payload: { roomCode: RoomCode; playerName: string } }
  | { type: 'room.leave'; payload: { roomId: RoomId } }
  | { type: 'briefing.ready'; payload: Record<string, never> }
  | {
      type: 'action.propose';
      payload: { actionId: string; params: Readonly<Record<string, unknown>> };
    }
  | { type: 'action.cancel'; payload: { proposalId: string } }
  | { type: 'pacte.propose'; payload: { targetPlayerId: PlayerId; terms: string } }
  | { type: 'pacte.respond'; payload: { pacteId: string; accept: boolean } }
  | { type: 'vote.cast'; payload: { ballotId: string; choice: string } }
  | { type: 'move.tile'; payload: { x: number; y: number } }
  | { type: 'state.resync.request'; payload: Record<string, never> }
  | { type: 'ping'; payload: { t: number } };

// =============================================================================
// Événements Serveur → clients
// =============================================================================

// --- Lobby / connexion (broadcast room sauf mention) ---

export type LobbyEvent =
  | {
      type: 'connection.established';
      payload: { socketId: SocketId; serverVersion: string };
    }
  | { type: 'room.created'; payload: { roomId: RoomId; roomCode: RoomCode; qrUrl: string } }
  | {
      type: 'player.joined';
      payload: { playerId: PlayerId; playerName: string; roomId: RoomId };
    }
  | { type: 'player.left'; payload: { playerId: PlayerId; roomId: RoomId } }
  | { type: 'player.disconnected'; payload: { playerId: PlayerId; roomId: RoomId } }
  | { type: 'player.reconnected'; payload: { playerId: PlayerId; roomId: RoomId } }
  | { type: 'room.full'; payload: { roomId: RoomId } }
  | { type: 'room.not-found'; payload: { roomCode: RoomCode } }
  | { type: 'pong'; payload: { t: number; serverT: number } };

// --- Briefing ---

export type BriefingEvent = {
  type: 'briefing.ready-changed';
  payload: { readyPlayerIds: ReadonlyArray<PlayerId> };
};

// --- Game lifecycle (broadcast room) ---

/** `endReason` discrimine la cause de fin pour la UI bilan (cf. state-machine §3.3). */
export type GameEndReason =
  | 'host-timeout'
  | 'massive-disconnect'
  | 'failure-alert'
  | 'success-early'
  | 'turn-limit'
  | 'host-cancel';

export type GameLifecycleEvent =
  | { type: 'game.started'; payload: { initialState: PublicGameState } }
  | { type: 'game.paused'; payload: { at: number } }
  | { type: 'game.resumed'; payload: { at: number } }
  | {
      type: 'game.ended';
      payload: { endReason: GameEndReason; finalState: PublicGameState };
    };

// --- Tours et actions (broadcast room) ---

/**
 * Événement de tour générique. Le `kind` est volontairement open-string ;
 * les aventures déclarent leurs propres kinds (ex: `'event.alert-raised'`).
 */
export interface TurnEvent {
  kind: string;
  payload: Readonly<Record<string, unknown>>;
}

/** Petit résultat synthétique d'une action — utile à la UI/audio. */
export interface ActionResultSummary {
  proposalId: string;
  actionId: string;
  byPlayerId: PlayerId;
  /** true si l'action a réussi à atteindre son effet principal. */
  success: boolean;
}

export type TurnEventBroadcast =
  | {
      type: 'turn.started';
      payload: { turnNumber: number; activePlayerId: PlayerId; deadline?: number };
    }
  | {
      type: 'turn.skipped';
      payload: { turnNumber: number; playerId: PlayerId; reason: 'inactivity' };
    }
  | { type: 'turn.ended'; payload: { turnNumber: number; events: ReadonlyArray<TurnEvent> } }
  | { type: 'action.resolved'; payload: ActionResultSummary }
  | { type: 'action.rejected'; payload: { proposalId: string; error: ErrorPayload } }
  | { type: 'door.unlocked'; payload: { doorId: string; by: PlayerId } }
  | { type: 'alert.changed'; payload: { level: number } }
  | { type: 'player.position-changed'; payload: { playerId: PlayerId; x: number; y: number } }
  | { type: 'pacte.resolved'; payload: { pacteId: string; accepted: boolean } }
  | { type: 'vote.received'; payload: { received: number; total: number } };

// --- Synchronisation du store (mix broadcast + ciblé) ---

export type StateSyncEvent =
  | { type: 'state.snapshot'; payload: Snapshot }
  | { type: 'state.patch'; payload: StatePatchBatch };

// --- Privés (ciblés sur un socket précis, jamais broadcast) ---

export type PrivateEvent =
  | {
      type: 'private.role-revealed';
      payload: { roleId: string; capabilities: ReadonlyArray<string> };
    }
  | { type: 'private.objective'; payload: PrivatePlayerState['objective'] }
  | { type: 'private.dossiers'; payload: { items: PrivatePlayerState['dossiers'] } }
  | {
      type: 'private.pacte-proposed';
      payload: { pacteId: string; fromPlayerId: PlayerId; terms: string; expiresAt: number };
    }
  | {
      type: 'private.action-options';
      payload: { proposalId: string; availableActions: ReadonlyArray<string> };
    }
  | { type: 'private.host-meta'; payload: HostMeta }
  | { type: 'private.error'; payload: ErrorPayload };

// =============================================================================
// Union ServerEvent
// =============================================================================

export type ServerEvent =
  | LobbyEvent
  | BriefingEvent
  | GameLifecycleEvent
  | TurnEventBroadcast
  | StateSyncEvent
  | PrivateEvent;

// =============================================================================
// Types utilitaires
// =============================================================================

export type ClientRequest = HostRequest | PlayerRequest;
export type AnyMessage = ClientRequest | ServerEvent;

/** Helper : extrait le payload d'un message par son `type`. */
export type PayloadOf<
  M extends { type: string; payload: unknown },
  T extends M['type'],
> = Extract<M, { type: T }> extends { payload: infer P } ? P : never;

/** Liste des types de messages privés (utile au serveur pour le routing). */
export const PRIVATE_EVENT_TYPES = [
  'private.role-revealed',
  'private.objective',
  'private.dossiers',
  'private.pacte-proposed',
  'private.action-options',
  'private.host-meta',
  'private.error',
] as const;

/** Préfixe des paths privés dans les patches (cf. store-projection.md §5). */
export const PRIVATE_PATCH_PATH_PREFIX = '/private';
