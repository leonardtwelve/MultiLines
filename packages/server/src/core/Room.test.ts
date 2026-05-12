import { describe, it, expect } from 'vitest';
import { MAX_PLAYERS_PER_ROOM, Room, type Player } from './Room';

function makeRoom() {
  return new Room({
    id: 'room-1',
    code: 'BLUE-CAT',
    adventureId: 'banque-lune',
    hostSocketId: 'sock-host',
  });
}

function makePlayer(id: string, name = id): Player {
  return { id, name, socketId: `sock-${id}`, joinedAt: new Date() };
}

describe('Room', () => {
  it('démarre vide', () => {
    const room = makeRoom();
    expect(room.playerCount()).toBe(0);
    expect(room.isEmpty()).toBe(true);
    expect(room.isFull()).toBe(false);
  });

  it('ajoute un joueur', () => {
    const room = makeRoom();
    room.addPlayer(makePlayer('p1', 'Léa'));
    expect(room.playerCount()).toBe(1);
    expect(room.getPlayer('p1')?.name).toBe('Léa');
  });

  it('refuse un doublon de playerId', () => {
    const room = makeRoom();
    room.addPlayer(makePlayer('p1'));
    expect(() => room.addPlayer(makePlayer('p1'))).toThrow(/déjà présent/);
  });

  it(`refuse au-delà de ${MAX_PLAYERS_PER_ROOM} joueurs`, () => {
    const room = makeRoom();
    for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i += 1) room.addPlayer(makePlayer(`p${i}`));
    expect(room.isFull()).toBe(true);
    expect(() => room.addPlayer(makePlayer('p-extra'))).toThrow(/déjà \d+ joueurs/);
  });

  it('retire un joueur et renvoie sa fiche', () => {
    const room = makeRoom();
    room.addPlayer(makePlayer('p1'));
    const removed = room.removePlayer('p1');
    expect(removed?.id).toBe('p1');
    expect(room.playerCount()).toBe(0);
  });

  it('removePlayer sur id inconnu renvoie undefined', () => {
    const room = makeRoom();
    expect(room.removePlayer('inconnu')).toBeUndefined();
  });

  it('getPlayers retourne une copie immuable', () => {
    const room = makeRoom();
    room.addPlayer(makePlayer('p1'));
    const list = room.getPlayers();
    // Tenter de muter ne doit pas affecter l'état interne.
    (list as Player[]).push(makePlayer('phantom'));
    expect(room.playerCount()).toBe(1);
  });

  it("touch() met à jour lastActivityAt", async () => {
    const room = makeRoom();
    const before = room.getLastActivityAt().getTime();
    // wait > 1ms pour garantir un Date différent
    await new Promise((r) => setTimeout(r, 5));
    room.touch();
    expect(room.getLastActivityAt().getTime()).toBeGreaterThan(before);
  });
});
