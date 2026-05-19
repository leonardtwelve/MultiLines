import { describe, expect, it } from 'vitest';
import {
  type BoardLayout,
  TILE_SIZE,
  findZone,
  isWalkable,
  tileAt,
  tileDistance,
  validateLayout,
  zoneOf,
} from './types';

function makeLayout(): BoardLayout {
  // Mini layout 4x3 :
  //   (0,0) wall   (1,0) floor-A  (2,0) door-D1 (locked)  (3,0) floor-B
  //   (0,1) wall   (1,1) floor-A  (2,1) floor-A            (3,1) floor-B
  //   (0,2) wall   (1,2) floor-A  (2,2) door-D2 (open)     (3,2) floor-B
  return {
    width: 4,
    height: 3,
    zones: [
      { id: 'A', label: 'Zone A', floorColor: 0x111111 },
      { id: 'B', label: 'Zone B', floorColor: 0x222222 },
    ],
    doors: [
      { id: 'D1', x: 2, y: 0, locked: true },
      { id: 'D2', x: 2, y: 2, locked: false },
    ],
    spawns: [{ x: 1, y: 1 }],
    tiles: [
      [
        { type: 'wall' },
        { type: 'floor', zone: 'A' },
        { type: 'door', zone: 'A', doorId: 'D1' },
        { type: 'floor', zone: 'B' },
      ],
      [
        { type: 'wall' },
        { type: 'floor', zone: 'A' },
        { type: 'floor', zone: 'A' },
        { type: 'floor', zone: 'B' },
      ],
      [
        { type: 'wall' },
        { type: 'floor', zone: 'A' },
        { type: 'door', zone: 'A', doorId: 'D2' },
        { type: 'floor', zone: 'B' },
      ],
    ],
  };
}

describe('BoardLayout — helpers', () => {
  it('TILE_SIZE est 32 (F12)', () => {
    expect(TILE_SIZE).toBe(32);
  });

  it('tileAt récupère la tile correcte et undefined hors grille', () => {
    const l = makeLayout();
    expect(tileAt(l, 1, 1)?.type).toBe('floor');
    expect(tileAt(l, -1, 0)).toBeUndefined();
    expect(tileAt(l, 0, 99)).toBeUndefined();
  });

  it("isWalkable : sol → true, mur → false", () => {
    const l = makeLayout();
    expect(isWalkable(l, 1, 1)).toBe(true);
    expect(isWalkable(l, 0, 0)).toBe(false);
  });

  it('isWalkable : porte verrouillée → false, porte ouverte → true', () => {
    const l = makeLayout();
    expect(isWalkable(l, 2, 0)).toBe(false); // D1 locked
    expect(isWalkable(l, 2, 2)).toBe(true); // D2 open
  });

  it('zoneOf renvoie la zone pour sol/porte, undefined pour mur', () => {
    const l = makeLayout();
    expect(zoneOf(l, 1, 0)).toBe('A');
    expect(zoneOf(l, 3, 0)).toBe('B');
    expect(zoneOf(l, 2, 0)).toBe('A'); // porte
    expect(zoneOf(l, 0, 0)).toBeUndefined(); // mur
  });

  it('findZone trouve la métadonnée par id', () => {
    const l = makeLayout();
    expect(findZone(l, 'A')?.label).toBe('Zone A');
    expect(findZone(l, 'inconnue')).toBeUndefined();
  });

  it('tileDistance calcule la distance Manhattan', () => {
    expect(tileDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(tileDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('validateLayout passe sur un layout valide', () => {
    expect(() => validateLayout(makeLayout())).not.toThrow();
  });

  it('validateLayout lève sur une zone inconnue', () => {
    const l = makeLayout() as BoardLayout & {
      tiles: { type: string; zone?: string; doorId?: string }[][];
    };
    (l.tiles as unknown as { type: string; zone: string }[][])[1][1] = {
      type: 'floor',
      zone: 'GHOST',
    };
    expect(() => validateLayout(l)).toThrow(/zone inconnue/);
  });

  it('validateLayout lève si une ligne a la mauvaise largeur', () => {
    const l = makeLayout();
    const broken = {
      ...l,
      tiles: [l.tiles[0].slice(0, 3), ...l.tiles.slice(1)],
    } as unknown as BoardLayout;
    expect(() => validateLayout(broken)).toThrow(/3 tiles/);
  });
});
