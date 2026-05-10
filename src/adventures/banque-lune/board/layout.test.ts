import { describe, it, expect } from 'vitest';
import { ZONES, CONNECTIONS } from './layout';
import type { ZoneId } from './types';

const ALL_IDS: ZoneId[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9'];

describe('layout — Casse Lune (FRONTEND §2.3)', () => {
  it('définit exactement 9 zones', () => {
    expect(Object.keys(ZONES)).toHaveLength(9);
    for (const id of ALL_IDS) {
      expect(ZONES[id]).toBeDefined();
    }
  });

  it('Z1 et Z2 sont initialement révélées (F3)', () => {
    expect(ZONES.Z1.initiallyRevealed).toBe(true);
    expect(ZONES.Z2.initiallyRevealed).toBe(true);
  });

  it('Z5, Z6, Z7, Z8, Z9 sont initialement verrouillées', () => {
    for (const id of ['Z5', 'Z6', 'Z7', 'Z8', 'Z9'] as const) {
      expect(ZONES[id].initiallyLocked).toBe(true);
      expect(ZONES[id].unlockHint.length).toBeGreaterThan(0);
    }
  });

  it("connexions de Z2 (FRONTEND §2.3) : Z1, Z3, Z5", () => {
    expect([...ZONES.Z2.connections].sort()).toEqual(['Z1', 'Z3', 'Z5']);
  });

  it('connexions de Z6 : Z4, Z8, Z9 (couloir central)', () => {
    expect([...ZONES.Z6.connections].sort()).toEqual(['Z4', 'Z8', 'Z9']);
  });

  it('connexions sont symétriques (si A connecte B, B connecte A)', () => {
    for (const zone of Object.values(ZONES)) {
      for (const otherId of zone.connections) {
        expect(ZONES[otherId].connections).toContain(zone.id);
      }
    }
  });

  it("toutes les connexions de CONNECTIONS référencent des zones existantes", () => {
    for (const c of CONNECTIONS) {
      expect(ZONES[c.from]).toBeDefined();
      expect(ZONES[c.to]).toBeDefined();
    }
  });

  it('CONNECTIONS reflète bien les liens du graphe (un par paire)', () => {
    const undirected = new Set<string>();
    for (const zone of Object.values(ZONES)) {
      for (const otherId of zone.connections) {
        const key = [zone.id, otherId].sort().join('|');
        undirected.add(key);
      }
    }
    expect(CONNECTIONS).toHaveLength(undirected.size);
  });

  it('toutes les zones ont une position dans le canvas 1280×720', () => {
    for (const zone of Object.values(ZONES)) {
      expect(zone.position.x).toBeGreaterThan(0);
      expect(zone.position.x).toBeLessThan(1280);
      expect(zone.position.y).toBeGreaterThan(0);
      expect(zone.position.y).toBeLessThan(720);
    }
  });

  it("zones Z1 et Z9 sont des sorties, Z7 et Z8 sont des cœurs", () => {
    expect(ZONES.Z1.type).toBe('sortie');
    expect(ZONES.Z9.type).toBe('sortie');
    expect(ZONES.Z7.type).toBe('coeur');
    expect(ZONES.Z8.type).toBe('coeur');
  });

  it("Z6 → Z9 est une connexion narrative (escalier)", () => {
    const z6Z9 = CONNECTIONS.find(
      (c) => (c.from === 'Z6' && c.to === 'Z9') || (c.from === 'Z9' && c.to === 'Z6'),
    );
    expect(z6Z9).toBeDefined();
    expect(z6Z9?.kind).toBe('narrative');
  });
});
