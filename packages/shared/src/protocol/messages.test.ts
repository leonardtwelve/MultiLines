import { describe, it, expect } from 'vitest';
import type {
  AnyMessage,
  ClientRequest,
  HostRequest,
  PayloadOf,
  PlayerRequest,
  ServerEvent,
} from './messages';

describe('Protocol messages — type discrimination', () => {
  it("narrow correctement le payload après discrimination sur 'type' (HostRequest)", () => {
    const msg: HostRequest = { type: 'room.create', payload: { adventureId: 'banque-lune' } };
    if (msg.type === 'room.create') {
      // TS doit savoir que payload a la forme { adventureId: string } ici
      expect(msg.payload.adventureId).toBe('banque-lune');
    }
  });

  it("narrow correctement (PlayerRequest)", () => {
    const msg: PlayerRequest = {
      type: 'room.join',
      payload: { roomCode: 'BLUE-CAT', playerName: 'Léa' },
    };
    if (msg.type === 'room.join') {
      expect(msg.payload.roomCode).toBe('BLUE-CAT');
      expect(msg.payload.playerName).toBe('Léa');
    }
  });

  it('narrow correctement (ServerEvent)', () => {
    const msg: ServerEvent = {
      type: 'room.created',
      payload: { roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: 'https://...' },
    };
    if (msg.type === 'room.created') {
      expect(msg.payload.roomCode).toBe('BLUE-CAT');
    }
  });

  it("ClientRequest = HostRequest | PlayerRequest", () => {
    const a: ClientRequest = { type: 'room.create', payload: { adventureId: 'x' } };
    const b: ClientRequest = { type: 'room.join', payload: { roomCode: 'X-Y', playerName: 'p' } };
    expect(a.type).toBe('room.create');
    expect(b.type).toBe('room.join');
  });

  it('AnyMessage couvre requêtes et événements', () => {
    const req: AnyMessage = { type: 'ping', payload: { t: 0 } };
    const evt: AnyMessage = { type: 'connection.established', payload: { socketId: 'abc' } };
    expect(req.type).toBe('ping');
    expect(evt.type).toBe('connection.established');
  });

  it('PayloadOf helper extrait le bon payload', () => {
    type RoomCreatedPayload = PayloadOf<ServerEvent, 'room.created'>;
    const p: RoomCreatedPayload = { roomId: 'r1', roomCode: 'A-B', qrUrl: 'u' };
    expect(p.roomCode).toBe('A-B');
  });

  it("garde-fou de typage : payload mal formé rejeté à la compilation", () => {
    // @ts-expect-error : adventureId manque dans payload de room.create
    const bad1: HostRequest = { type: 'room.create', payload: {} };
    // @ts-expect-error : type d'event inconnu
    const bad2: ServerEvent = { type: 'unknown.event', payload: {} };
    // @ts-expect-error : roomCode est requis, pas roomId
    const bad3: PlayerRequest = { type: 'room.join', payload: { roomId: 'r1', playerName: 'p' } };
    expect([bad1, bad2, bad3].length).toBe(3);
  });
});
