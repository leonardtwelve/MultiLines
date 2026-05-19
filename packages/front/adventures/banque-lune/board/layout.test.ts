import { describe, expect, it } from 'vitest';
import { isWalkable, tileAt, validateLayout, zoneOf } from '../../../src/core/board';
import { BANQUE_LUNE_LAYOUT } from './layout';
import { BANQUE_LUNE_ZONES } from './zones';

describe('Banque Lune — layout', () => {
  it('respecte la dimension F13 : 40 × 20', () => {
    expect(BANQUE_LUNE_LAYOUT.width).toBe(40);
    expect(BANQUE_LUNE_LAYOUT.height).toBe(20);
  });

  it('valide structurellement (validateLayout)', () => {
    expect(() => validateLayout(BANQUE_LUNE_LAYOUT)).not.toThrow();
  });

  it("expose les 9 zones de game design (F14)", () => {
    expect(BANQUE_LUNE_LAYOUT.zones).toHaveLength(9);
    const ids = BANQUE_LUNE_LAYOUT.zones.map((z) => z.id).sort();
    expect(ids).toEqual(
      [
        'bureaux',
        'coffres',
        'data-center',
        'escalier',
        'hall',
        'parking',
        'reception',
        'salle-controle',
        'salle-serveurs',
      ].sort(),
    );
    expect(BANQUE_LUNE_LAYOUT.zones).toBe(BANQUE_LUNE_ZONES);
  });

  it('place toutes les portes dans la grille et associe une zone (F15)', () => {
    for (const door of BANQUE_LUNE_LAYOUT.doors) {
      expect(door.x).toBeGreaterThanOrEqual(0);
      expect(door.x).toBeLessThan(BANQUE_LUNE_LAYOUT.width);
      expect(door.y).toBeGreaterThanOrEqual(0);
      expect(door.y).toBeLessThan(BANQUE_LUNE_LAYOUT.height);
      const t = tileAt(BANQUE_LUNE_LAYOUT, door.x, door.y);
      expect(t?.type).toBe('door');
    }
  });

  it('la porte D1 (parking → hall) est ouverte au départ', () => {
    const d1 = BANQUE_LUNE_LAYOUT.doors.find((d) => d.id === 'D1');
    expect(d1?.locked).toBe(false);
  });

  it('les portes des étages supérieurs sont verrouillées au départ', () => {
    const dRestricted = BANQUE_LUNE_LAYOUT.doors.filter((d) =>
      ['D5', 'D6', 'D7'].includes(d.id),
    );
    expect(dRestricted).toHaveLength(3);
    expect(dRestricted.every((d) => d.locked)).toBe(true);
  });

  it('a 5 spawns pour les joueurs', () => {
    expect(BANQUE_LUNE_LAYOUT.spawns).toHaveLength(5);
    for (const s of BANQUE_LUNE_LAYOUT.spawns) {
      expect(isWalkable(BANQUE_LUNE_LAYOUT, s.x, s.y)).toBe(true);
      expect(zoneOf(BANQUE_LUNE_LAYOUT, s.x, s.y)).toBe('parking');
    }
  });

  it('toutes les 9 zones sont effectivement présentes dans la grille', () => {
    const found = new Set<string>();
    for (let y = 0; y < BANQUE_LUNE_LAYOUT.height; y += 1) {
      for (let x = 0; x < BANQUE_LUNE_LAYOUT.width; x += 1) {
        const z = zoneOf(BANQUE_LUNE_LAYOUT, x, y);
        if (z) found.add(z);
      }
    }
    expect(found.size).toBe(9);
    for (const z of BANQUE_LUNE_LAYOUT.zones) {
      expect(found.has(z.id)).toBe(true);
    }
  });

  it("a une bordure de murs (les bords de la grille ne sont pas marchables)", () => {
    for (let x = 0; x < BANQUE_LUNE_LAYOUT.width; x += 1) {
      expect(isWalkable(BANQUE_LUNE_LAYOUT, x, 0)).toBe(false);
      expect(isWalkable(BANQUE_LUNE_LAYOUT, x, BANQUE_LUNE_LAYOUT.height - 1)).toBe(false);
    }
    for (let y = 0; y < BANQUE_LUNE_LAYOUT.height; y += 1) {
      expect(isWalkable(BANQUE_LUNE_LAYOUT, 0, y)).toBe(false);
      expect(isWalkable(BANQUE_LUNE_LAYOUT, BANQUE_LUNE_LAYOUT.width - 1, y)).toBe(false);
    }
  });
});
