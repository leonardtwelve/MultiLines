import { describe, it, expect } from 'vitest';
import { RoomRegistry } from './RoomRegistry';

describe('RoomRegistry', () => {
  it('crée une room avec id et code uniques', () => {
    const reg = new RoomRegistry();
    const a = reg.createRoom('banque-lune', 'sock-1');
    const b = reg.createRoom('banque-lune', 'sock-2');
    expect(a.id).not.toBe(b.id);
    expect(a.code).not.toBe(b.code);
    expect(reg.size()).toBe(2);
  });

  it('getRoom et getRoomByCode retrouvent la même room', () => {
    const reg = new RoomRegistry();
    const r = reg.createRoom('banque-lune', 'sock-1');
    expect(reg.getRoom(r.id)).toBe(r);
    expect(reg.getRoomByCode(r.code)).toBe(r);
  });

  it('deleteRoom supprime des deux index', () => {
    const reg = new RoomRegistry();
    const r = reg.createRoom('banque-lune', 'sock-1');
    expect(reg.deleteRoom(r.id)).toBe(true);
    expect(reg.getRoom(r.id)).toBeUndefined();
    expect(reg.getRoomByCode(r.code)).toBeUndefined();
    expect(reg.size()).toBe(0);
  });

  it('cleanup retire les rooms vides', () => {
    const reg = new RoomRegistry();
    reg.createRoom('banque-lune', 'sock-1');
    reg.createRoom('banque-lune', 'sock-2');
    const removed = reg.cleanup();
    expect(removed).toBe(2);
    expect(reg.size()).toBe(0);
  });

  it('cleanup retire les rooms expirées (inactivité > expiryMs)', () => {
    const reg = new RoomRegistry({ expiryMs: 100 }); // 100 ms
    const r = reg.createRoom('banque-lune', 'sock-1');
    r.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    // Simule passage du temps
    const future = new Date(Date.now() + 500);
    const removed = reg.cleanup(future);
    expect(removed).toBe(1);
  });

  it("instancie une RoomStateMachine pour chaque room créée", () => {
    const reg = new RoomRegistry();
    const r = reg.createRoom('banque-lune', 'sock-1');
    expect(reg.getStateMachine(r.id)).toBeDefined();
    expect(reg.getStateMachine('inconnu')).toBeUndefined();
  });

  it("route 'banque-lune' vers BanqueLuneAdventureHooks (slice 3e-1)", () => {
    // On vérifie indirectement via la state machine : si on lance
    // game.start avec 3 joueurs, les rôles distribués doivent être des
    // vrais rôles Banque Lune (hacker/faussaire/infiltre), pas l'agent
    // générique du NoOp.
    const reg = new RoomRegistry();
    const room = reg.createRoom('banque-lune', 'sock-host');
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
    const sm = reg.getStateMachine(room.id);
    if (!sm) throw new Error('state machine attendue');

    const reaction = sm.handle(
      { type: 'game.start', payload: { roomId: room.id } },
      { kind: 'host', socketId: 'sock-host' },
    );
    expect(reaction.kind).toBe('accept');
    if (reaction.kind !== 'accept') return;

    const snapshotEmits = reaction.emits.filter((e) => e.type === 'state.snapshot');
    const playerSnaps = snapshotEmits.filter(
      (e) => typeof e.to === 'object' && e.to.socketId.startsWith('sock-p'),
    );
    expect(playerSnaps).toHaveLength(3);
    const validRoles = new Set(['hacker', 'faussaire', 'infiltre']);
    for (const snap of playerSnaps) {
      if (snap.type !== 'state.snapshot') continue;
      expect(validRoles.has(snap.payload.private?.roleId ?? '')).toBe(true);
    }
  });

  it("route un adventureId inconnu vers NoOpAdventureHooks (fallback)", () => {
    const reg = new RoomRegistry();
    const room = reg.createRoom('aventure-inconnue', 'sock-host');
    room.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    room.addPlayer({ id: 'p2', name: 'Sami', socketId: 'sock-p2', joinedAt: new Date() });
    room.addPlayer({ id: 'p3', name: 'Aïcha', socketId: 'sock-p3', joinedAt: new Date() });
    const sm = reg.getStateMachine(room.id);
    if (!sm) throw new Error('state machine attendue');
    const reaction = sm.handle(
      { type: 'game.start', payload: { roomId: room.id } },
      { kind: 'host', socketId: 'sock-host' },
    );
    expect(reaction.kind).toBe('accept');
    if (reaction.kind !== 'accept') return;
    const playerSnaps = reaction.emits.filter(
      (e) =>
        e.type === 'state.snapshot' &&
        typeof e.to === 'object' &&
        e.to.socketId.startsWith('sock-p'),
    );
    for (const snap of playerSnaps) {
      if (snap.type !== 'state.snapshot') continue;
      expect(snap.payload.private?.roleId).toBe('agent'); // ← NoOp générique
    }
  });

  it("supprime la state machine quand on deleteRoom", () => {
    const reg = new RoomRegistry();
    const r = reg.createRoom('banque-lune', 'sock-1');
    reg.deleteRoom(r.id);
    expect(reg.getStateMachine(r.id)).toBeUndefined();
  });
});
