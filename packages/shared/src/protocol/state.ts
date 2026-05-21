/**
 * Modèles d'état projetés côté client (cf. `docs/specs/store-projection.md §1`).
 *
 * **Important** :
 * - `PublicGameState` est diffusé à tous (broadcast room socket.io).
 * - `PrivatePlayerState` est ciblé sur le socket du joueur concerné
 *   (`io.to(socketId).emit`). Sécurité par construction — un autre joueur
 *   ne reçoit jamais ce payload.
 * - `HostState` ajoute des métadonnées que seul le Host voit (ex: progress
 *   d'un vote en cours sans révéler les choix individuels).
 *
 * Ces types restent **génériques** (pas spécifiques à une aventure). Les
 * champs spécifiques (Banque Lune : `dossiers`, `alert`, etc.) viendront
 * par augmentation/extension dans `packages/server/` et `packages/front/`
 * via des types d'aventure.
 */

import type { PlayerId, RoomId } from '../types/common';

// === Statuts globaux d'une room (cf. server-state-machine.md §1.1) ===

export type RoomStatus =
  | 'lobby'
  | 'briefing'
  | 'casse'
  | 'extraction'
  | 'vote'
  | 'reveal'
  | 'ended'
  | 'paused'
  | 'cancelled';

// === Vue publique d'un joueur (visible par tous) ===

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  /** Couleur d'avatar (hex `#RRGGBB`). */
  color: string;
  /** false pendant la grace de reconnexion. */
  connected: boolean;
  /** Ressource publique affichée au HUD partagé. Optionnel selon l'aventure. */
  credits?: number;
}

// === État du plateau (cf. F12-F15) ===

export interface PublicBoardState {
  /** État de verrouillage des portes (les positions sont dans la BoardLayout côté front). */
  doors: ReadonlyArray<{ id: string; locked: boolean }>;
  /** Position courante de chaque joueur sur la grille tile-based. */
  positions: Readonly<Record<PlayerId, { x: number; y: number }>>;
}

// === Phase de tour (cf. server-state-machine.md §1.2) ===

export interface TurnState {
  number: number;
  activePlayerId: PlayerId;
  /** Timestamp epoch (ms) de fin de tour si timer actif côté serveur. */
  deadline?: number;
}

// === State public partagé ===

export interface PublicGameState {
  roomId: RoomId;
  status: RoomStatus;
  adventureId: string;
  players: Readonly<Record<PlayerId, PublicPlayer>>;
  /** Présent uniquement en `casse` / `vote` / `reveal`. */
  turn?: TurnState;
  /** Présent dès `briefing`. */
  board?: PublicBoardState;
  /** Jauge d'alerte 0..100 (Banque Lune). Optionnel selon l'aventure. */
  alert?: number;
}

// === Objectif privé d'un joueur ===

export interface PrivateObjective {
  id: string;
  /** Texte localisé FR prêt à afficher. */
  description: string;
  /** Objectif tordu / secret de groupe — la UI peut afficher un teaser plutôt que la description complète (cf. spec #23). */
  hidden: boolean;
  /** Progression 0..1 ou contextuelle selon l'objectif. */
  progress?: number;
}

// === Dossier (info privée Banque Lune) ===

export interface DossierItem {
  id: string;
  /** Catégorie ou type — utilisé par la UI Player pour le rendu. */
  kind: string;
  /** Texte localisé FR. */
  label: string;
}

// === Offre de Pacte en attente ===

export interface PacteOffer {
  id: string;
  fromPlayerId: PlayerId;
  /** Description libre des termes — localisée FR. */
  terms: string;
  /** Timestamp epoch (ms) après lequel le Pacte expire automatiquement. */
  expiresAt: number;
}

// === State privé par Player (ciblé) ===

export interface PrivatePlayerState {
  playerId: PlayerId;
  roleId: string;
  /** Actions disponibles pour ce rôle (ids consommables par `action.propose`). */
  capabilities: ReadonlyArray<string>;
  objective: PrivateObjective;
  dossiers: ReadonlyArray<DossierItem>;
  /** Ressource privée (Infiltré, Négociateur — spec #29). */
  tension?: number;
  pendingPactes: ReadonlyArray<PacteOffer>;
}

// === Métadonnées Host (visible par Host uniquement) ===

export interface HostMeta {
  /** Progression d'un vote en cours sans révéler les choix individuels. */
  voteProgress?: { received: number; total: number };
}

// === Snapshot complet (envoyé à la (re)connexion) ===

/**
 * Audience du snapshot — détermine quels champs sont peuplés.
 *
 * - `host` : `public` + `hostMeta`, pas de `private`.
 * - `player` : `public` + `private` (de CE joueur uniquement), pas de `hostMeta`.
 */
export type SnapshotAudience = 'host' | 'player';

export interface Snapshot {
  /** Version monotone correspondant au state ici. Le client démarre `lastVersion` à cette valeur. */
  version: number;
  audience: SnapshotAudience;
  public: PublicGameState;
  /** Présent ssi `audience === 'player'`. */
  private?: PrivatePlayerState;
  /** Présent ssi `audience === 'host'`. */
  hostMeta?: HostMeta;
}
