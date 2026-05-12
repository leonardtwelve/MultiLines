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
    const reg = new RoomRegistry(100); // 100 ms
    const r = reg.createRoom('banque-lune', 'sock-1');
    r.addPlayer({ id: 'p1', name: 'Léa', socketId: 'sock-p1', joinedAt: new Date() });
    // Simule passage du temps
    const future = new Date(Date.now() + 500);
    const removed = reg.cleanup(future);
    expect(removed).toBe(1);
  });
});
