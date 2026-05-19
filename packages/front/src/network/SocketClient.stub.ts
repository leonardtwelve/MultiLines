/**
 * Stub testable du SocketClient, utilisé par les tests DOM des écrans
 * (HostLobbyScreen, JoinScreen) sans monter de vrai serveur socket.io.
 *
 * Permet de piloter manuellement les événements serveur depuis le test :
 *
 *   const stub = new SocketClientStub();
 *   stub.queueCreateRoom({ roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: '...' });
 *   await screen.render();
 *   stub.fireServerEvent('player.joined', { playerId: 'p1', playerName: 'Léa', roomId: 'r1' });
 */

import type { PayloadOf, ServerEvent } from '@pixel-quests/shared';
import type {
  ConnectionStatus,
  CreateRoomResult,
  JoinRoomResult,
  SocketClient,
} from './SocketClient';

type Listener = (payload: unknown) => void;

export class SocketClientStub implements Pick<
  SocketClient,
  'status' | 'socketId' | 'connect' | 'disconnect' | 'createRoom' | 'joinRoom' | 'on' | 'onStatusChange' | 'ping'
> {
  private _status: ConnectionStatus = 'idle';
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>();
  private readonly eventListeners = new Map<string, Set<Listener>>();
  private queuedCreateRoom: CreateRoomResult | Error | null = null;
  private queuedJoinRoom: JoinRoomResult | Error | null = null;

  public connectShouldFail = false;
  public socketId: string | null = null;

  // === API publique : pilotage depuis les tests ===

  queueCreateRoom(result: CreateRoomResult | Error): void {
    this.queuedCreateRoom = result;
  }

  queueJoinRoom(result: JoinRoomResult | Error): void {
    this.queuedJoinRoom = result;
  }

  fireServerEvent<T extends ServerEvent['type']>(
    type: T,
    payload: PayloadOf<ServerEvent, T>,
  ): void {
    const set = this.eventListeners.get(type);
    if (!set) return;
    for (const l of set) l(payload);
  }

  setStatus(s: ConnectionStatus): void {
    this._status = s;
    for (const l of this.statusListeners) l(s);
  }

  // === API consommée par les écrans ===

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(): Promise<{ socketId: string }> {
    if (this.connectShouldFail) {
      this.setStatus('error');
      throw new Error('stub: connect failed');
    }
    this.socketId = 'stub-socket';
    this.setStatus('connected');
    return { socketId: this.socketId };
  }

  disconnect(): void {
    this.setStatus('idle');
    this.socketId = null;
  }

  async createRoom(_adventureId: string): Promise<CreateRoomResult> {
    if (!this.queuedCreateRoom) {
      throw new Error('stub: appelle queueCreateRoom() avant render().');
    }
    if (this.queuedCreateRoom instanceof Error) throw this.queuedCreateRoom;
    return this.queuedCreateRoom;
  }

  async joinRoom(_roomCode: string, _playerName: string): Promise<JoinRoomResult> {
    if (!this.queuedJoinRoom) {
      return { ok: false, reason: 'timeout' };
    }
    if (this.queuedJoinRoom instanceof Error) throw this.queuedJoinRoom;
    return this.queuedJoinRoom;
  }

  on<T extends ServerEvent['type']>(
    type: T,
    handler: (payload: PayloadOf<ServerEvent, T>) => void,
  ): () => void {
    let set = this.eventListeners.get(type);
    if (!set) {
      set = new Set();
      this.eventListeners.set(type, set);
    }
    const wrapped = handler as Listener;
    set.add(wrapped);
    return () => set?.delete(wrapped);
  }

  onStatusChange(handler: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  async ping(): Promise<{ t: number; serverT: number; rttMs: number }> {
    return { t: 0, serverT: 0, rttMs: 0 };
  }
}
