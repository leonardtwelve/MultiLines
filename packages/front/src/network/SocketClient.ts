/**
 * Client socket.io typé pour Pixel Quests (F20, F21).
 *
 * Wrapper minimal au-dessus de `socket.io-client` qui :
 * - Type les `emit` / `on` via `@pixel-quests/shared/protocol`.
 * - Expose une API promise-based pour les requêtes Host/Player les plus
 *   courantes (`createRoom`, `joinRoom`, `ping`).
 * - Émet des événements `status` propres au cycle de vie (connecting,
 *   connected, disconnected, error) — utile pour afficher un indicateur UI.
 *
 * Cible Prompt 3a : permettre au Host de créer une room et au Player de la
 * rejoindre depuis un autre appareil. Pas de gameplay encore.
 */

import { io, type Socket as RawSocket } from 'socket.io-client';
import type {
  HostRequest,
  PayloadOf,
  PlayerRequest,
  RoomCode,
  RoomId,
  ServerEvent,
  SocketId,
} from '@pixel-quests/shared';

// === Types publics ===

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface SocketClientOptions {
  /** URL HTTP(S) du serveur. socket.io upgrade en WS automatiquement. */
  url: string;
  /** Timeout (ms) avant de considérer une connexion comme échouée. */
  connectTimeoutMs?: number;
  /** Timeout (ms) avant de considérer une requête sans réponse. */
  requestTimeoutMs?: number;
  /** Mode reconnexion automatique. Désactivable pour les tests. */
  reconnection?: boolean;
}

export interface CreateRoomResult {
  roomId: RoomId;
  roomCode: RoomCode;
  qrUrl: string;
}

export type JoinRoomResult =
  | { ok: true; roomId: RoomId; playerId: string; playerName: string }
  | { ok: false; reason: 'room-not-found' | 'room-full' | 'timeout' };

// === Implémentation ===

const DEFAULT_CONNECT_TIMEOUT_MS = 8000;
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

/**
 * Listener différé : enregistré avant `connect()`, attaché au moment de
 * la connexion réelle. Permet aux consommateurs (wireStore, écrans) de
 * câbler leurs listeners au moment de la construction sans dépendre du
 * cycle de vie de la connexion socket.io.
 */
interface PendingListener {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => void;
}

export class SocketClient {
  private socket: RawSocket | null = null;
  private _status: ConnectionStatus = 'idle';
  private _socketId: SocketId | null = null;
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>();
  /**
   * Listeners enregistrés AVANT que le socket existe (cf. JSDoc
   * `PendingListener`). Drainés sur `connect()` puis vidés. Les
   * listeners enregistrés une fois connecté vont directement sur le
   * socket.io natif.
   */
  private pendingListeners: PendingListener[] = [];

  constructor(private readonly opts: SocketClientOptions) {}

  // --- État ---

  get status(): ConnectionStatus {
    return this._status;
  }

  get socketId(): SocketId | null {
    return this._socketId;
  }

  /** S'abonne aux changements de statut. Renvoie un désabonnement. */
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  // --- Connexion / déconnexion ---

  /**
   * Établit la connexion et attend `connection.established`. Résout avec
   * le `socketId` côté serveur.
   */
  async connect(): Promise<{ socketId: SocketId }> {
    if (this._status === 'connected' && this._socketId) {
      return { socketId: this._socketId };
    }

    this.setStatus('connecting');
    const sock = io(this.opts.url, {
      reconnection: this.opts.reconnection ?? true,
      timeout: this.opts.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
    });
    this.socket = sock;

    sock.on('disconnect', () => this.setStatus('disconnected'));
    sock.on('connect_error', () => this.setStatus('error'));

    // Draine la file des listeners enregistrés AVANT connect.
    // Important : on attache AVANT d'attendre `connection.established`
    // pour ne pas rater l'event lui-même si un caller s'y est abonné.
    for (const p of this.pendingListeners) {
      this.attachToSocket(sock, p.type, p.handler);
    }
    this.pendingListeners = [];

    const established = await waitForEvent<PayloadOf<ServerEvent, 'connection.established'>>(
      sock,
      'connection.established',
      this.opts.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
    );
    this._socketId = established.socketId;
    this.setStatus('connected');
    return { socketId: established.socketId };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._socketId = null;
    // Les listeners pending sont des intentions persistantes du caller :
    // on les CONSERVE pour qu'un éventuel `connect()` ultérieur les
    // ré-attache. Les listeners déjà attachés au socket disparaissent
    // avec le `disconnect()` natif socket.io.
    this.setStatus('idle');
  }

  /**
   * Demande un nouveau snapshot au serveur. Appelée par le
   * `ClientStore` quand il détecte un gap de version ou une erreur
   * d'application de patch (cf. store-projection §4 désynchronisation).
   */
  requestResync(): void {
    const sock = this.requireSocket();
    sock.emit('state.resync.request', {});
  }

  // --- Requêtes Host ---

  async createRoom(adventureId: string): Promise<CreateRoomResult> {
    const sock = this.requireSocket();
    const payload: PayloadOf<ServerEvent, 'room.created'> = await emitAndWait(
      sock,
      'room.create' satisfies HostRequest['type'],
      { adventureId } satisfies PayloadOf<HostRequest, 'room.create'>,
      'room.created',
      this.opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    return payload;
  }

  /**
   * Demande au serveur de lancer la partie. Fire-and-forget — la
   * réponse arrive de façon asynchrone via le listener `game.started`
   * que le caller doit avoir installé. En cas d'erreur (< 3 joueurs,
   * sender invalide…), le serveur émet `private.error` ciblé.
   */
  startGame(roomId: RoomId): void {
    const sock = this.requireSocket();
    sock.emit('game.start', { roomId } satisfies PayloadOf<HostRequest, 'game.start'>);
  }

  /**
   * Player : signale qu'il a fini de lire son briefing privé. Quand
   * tous les Players l'ont envoyé, le serveur transitionne en `casse`.
   */
  markBriefingReady(): void {
    const sock = this.requireSocket();
    sock.emit('briefing.ready', {});
  }

  // --- Requêtes Player ---

  /**
   * Rejoint une room. Résout avec un résultat discriminé : succès ou
   * raison de l'échec (room introuvable / pleine / timeout). Pas de throw,
   * pour que la UI puisse présenter le message proprement.
   */
  async joinRoom(roomCode: RoomCode, playerName: string): Promise<JoinRoomResult> {
    const sock = this.requireSocket();
    const timeoutMs = this.opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

    return new Promise<JoinRoomResult>((resolve) => {
      const cleanup: Array<() => void> = [];
      const off = (): void => {
        for (const fn of cleanup) fn();
      };
      const onJoined = (p: PayloadOf<ServerEvent, 'player.joined'>): void => {
        // Le serveur broadcast player.joined à la room — c'est aussi nous.
        if (p.playerName === playerName) {
          off();
          resolve({ ok: true, roomId: p.roomId, playerId: p.playerId, playerName });
        }
      };
      const onNotFound = (p: PayloadOf<ServerEvent, 'room.not-found'>): void => {
        if (p.roomCode === roomCode) {
          off();
          resolve({ ok: false, reason: 'room-not-found' });
        }
      };
      const onFull = (): void => {
        off();
        resolve({ ok: false, reason: 'room-full' });
      };
      const t = setTimeout(() => {
        off();
        resolve({ ok: false, reason: 'timeout' });
      }, timeoutMs);
      cleanup.push(() => clearTimeout(t));
      cleanup.push(() => sock.off('player.joined', onJoined));
      cleanup.push(() => sock.off('room.not-found', onNotFound));
      cleanup.push(() => sock.off('room.full', onFull));

      sock.on('player.joined', onJoined);
      sock.on('room.not-found', onNotFound);
      sock.on('room.full', onFull);

      const req: PlayerRequest = {
        type: 'room.join',
        payload: { roomCode, playerName },
      };
      sock.emit(req.type, req.payload);
    });
  }

  // --- Listeners typés ---

  /**
   * Écoute un événement serveur typé. Renvoie un désabonnement.
   *
   * @example
   *   const off = client.on('player.joined', ({ playerName }) => { ... });
   *   off();
   */
  on<T extends ServerEvent['type']>(
    type: T,
    handler: (payload: PayloadOf<ServerEvent, T>) => void,
  ): () => void {
    // Cas A : socket connecté → attache directement.
    if (this.socket) {
      this.attachToSocket(this.socket, type, handler);
      return () => this.detachFromSocket(this.socket, type, handler);
    }
    // Cas B : pas encore connecté → met en file d'attente. Le listener
    // sera attaché au moment du `connect()` (cf. drain dans `connect`).
    // C'est l'usage typique de `wireStore(client, store)` qui s'abonne
    // aux events SANS attendre que la connexion soit effective.
    const pending: PendingListener = { type, handler: handler as PendingListener['handler'] };
    this.pendingListeners.push(pending);
    return () => {
      // Désabonnement post-connect : enlève du socket attaché.
      if (this.socket) {
        this.detachFromSocket(this.socket, type, handler);
      }
      // Désabonnement pré-connect : enlève de la file.
      const idx = this.pendingListeners.indexOf(pending);
      if (idx !== -1) this.pendingListeners.splice(idx, 1);
    };
  }

  // === Helpers internes pour le socket bas niveau ===

  /**
   * socket.io-client expose des génériques très restrictifs sur on/off ;
   * on bypass leur signature via un cast en EventEmitter brut. La sécurité
   * de typage est portée par l'API publique `on<T>`.
   */
  private attachToSocket(
    sock: RawSocket,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (...args: any[]) => void,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = sock as unknown as { on(ev: string, fn: (...args: any[]) => void): void };
    raw.on(type, handler);
  }

  private detachFromSocket(
    sock: RawSocket | null,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (...args: any[]) => void,
  ): void {
    if (!sock) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = sock as unknown as { off(ev: string, fn: (...args: any[]) => void): void };
    raw.off(type, handler);
  }

  // --- Diagnostic ---

  /** Mesure le RTT serveur (ping → pong). */
  async ping(): Promise<{ t: number; serverT: number; rttMs: number }> {
    const sock = this.requireSocket();
    const t = Date.now();
    const pong = await emitAndWait<
      HostRequest | PlayerRequest,
      'ping',
      PayloadOf<ServerEvent, 'pong'>
    >(
      sock,
      'ping',
      { t },
      'pong',
      this.opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    return { t: pong.t, serverT: pong.serverT, rttMs: Date.now() - t };
  }

  // --- Internes ---

  private requireSocket(): RawSocket {
    if (!this.socket || this._status !== 'connected') {
      throw new Error('SocketClient: non connecté. Appelez connect() d’abord.');
    }
    return this.socket;
  }

  private setStatus(s: ConnectionStatus): void {
    if (s === this._status) return;
    this._status = s;
    for (const l of this.statusListeners) l(s);
  }
}

// === Helpers internes ===

function waitForEvent<P>(sock: RawSocket, event: string, timeoutMs: number): Promise<P> {
  return new Promise<P>((resolve, reject) => {
    const t = setTimeout(() => {
      sock.off(event, onEvent);
      reject(new Error(`SocketClient: timeout (${timeoutMs}ms) en attente de "${event}".`));
    }, timeoutMs);
    const onEvent = (payload: P): void => {
      clearTimeout(t);
      resolve(payload);
    };
    sock.once(event, onEvent);
  });
}

function emitAndWait<
  _Req extends { type: string; payload: unknown },
  _ReqType extends string,
  ResPayload,
>(
  sock: RawSocket,
  emitType: string,
  emitPayload: unknown,
  awaitEvent: string,
  timeoutMs: number,
): Promise<ResPayload> {
  const promise = waitForEvent<ResPayload>(sock, awaitEvent, timeoutMs);
  sock.emit(emitType, emitPayload);
  return promise;
}
