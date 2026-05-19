/**
 * Layout 40×20 de la Banque Lune (F13).
 *
 * Construction procédurale plutôt qu'un gros tableau hardcodé : c'est
 * plus lisible pour itérer, et ça reste 100% sérialisable une fois
 * exporté (tests passent au runtime sur le résultat final).
 *
 * Disposition :
 *
 *   Y\X   0    5    10   15   20   25   30   35   40
 *    0    ┌──────────────────────────────────────┐
 *         │ COFFRES         │  DATA-CENTER       │  Étage 2 (sécurisé) — Y 0..5
 *    5    ├────D5─────D6────┤
 *         │ SALLE SERVEURS  │
 *    7    ├─────D7──────────┴────────────────────┤
 *         │ BUREAUX │ ESCALIER │ SALLE CONTROLE  │  Étage 1 — Y 7..13
 *   13    ├─────D2────D1───D3───D4──────────────-┤
 *         │ HALL CENTRAL                         │  Rez-de-chaussée — Y 13..19
 *   16    │
 *         │ PARKING        │   RECEPTION         │
 *   19    └──────────────────────────────────────┘
 *
 * Doors numérotation : D1..D7. État initial : verrouillées (sauf D1 :
 * accès parking → hall, naturellement ouvert).
 */

import {
  type BoardLayout,
  type Door,
  type SpawnPoint,
  type Tile,
} from '../../../src/core/board';
import { BANQUE_LUNE_ZONES } from './zones';

const WIDTH = 40;
const HEIGHT = 20;

// Bandes verticales (étages) — bornes inclusives.
const FLOOR_2_END = 6; // Y 0..6 (étage sécurisé)
const FLOOR_1_END = 13; // Y 7..13 (bureaux)
// Y 14..19 = rez-de-chaussée

// Bandes horizontales pour les zones.
const WEST_END = 19; // X 0..19 (côté ouest)
// X 20..39 (côté est)

// === Portes ===

const DOORS: Door[] = [
  // Rez-de-chaussée — accès intérieur
  { id: 'D1', x: 19, y: 16, locked: false, unlockHint: 'Entrée libre (parking → hall)' },
  { id: 'D2', x: 8, y: 13, locked: true, unlockHint: 'Bureaux : badge employé' },
  { id: 'D3', x: 24, y: 13, locked: true, unlockHint: 'Salle de contrôle : code accueil' },
  { id: 'D4', x: 35, y: 13, locked: true, unlockHint: 'Issue de secours (sortie)' },

  // Étage 1 → Étage 2
  { id: 'D5', x: 7, y: 6, locked: true, unlockHint: 'Coffres-forts : empreinte directeur' },
  { id: 'D6', x: 14, y: 6, locked: true, unlockHint: 'Data Center : badge IT' },
  { id: 'D7', x: 22, y: 7, locked: true, unlockHint: 'Salle serveurs : double-auth' },
];

// === Construction de la grille ===

function buildLayout(): BoardLayout {
  // Initialise une grille pleine de murs.
  const tiles: Tile[][] = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, (): Tile => ({ type: 'wall' })),
  );

  // Helpers locaux pour remplir des rectangles de sol.
  const fillRect = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    zone: string,
  ): void => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        tiles[y][x] = { type: 'floor', zone };
      }
    }
  };

  // --- Étage 2 (sécurisé) ---
  fillRect(1, 1, 18, FLOOR_2_END - 2, 'coffres'); // Y 1..4
  fillRect(21, 1, 38, FLOOR_2_END - 2, 'data-center');
  fillRect(1, FLOOR_2_END - 1, 38, FLOOR_2_END - 1, 'salle-serveurs'); // Y 5 (un couloir)
  // (Y=6 reste mur, sauf portes — coupure entre étages)

  // --- Étage 1 (bureaux + contrôle, séparés par un escalier vertical) ---
  fillRect(1, 8, WEST_END - 4, FLOOR_1_END - 1, 'bureaux'); // X 1..15, Y 8..12
  fillRect(WEST_END - 3, 8, WEST_END - 1, FLOOR_1_END - 1, 'escalier'); // X 16..18
  fillRect(WEST_END, 8, 38, FLOOR_1_END - 1, 'salle-controle'); // X 19..38

  // --- Rez-de-chaussée ---
  fillRect(1, 14, 38, 15, 'hall'); // Hall qui traverse
  fillRect(1, 16, 19, 18, 'parking');
  fillRect(20, 16, 38, 18, 'reception');

  // --- Portes : on remplace les murs par des tiles "door" ---
  for (const d of DOORS) {
    // Définit la zone de destination de la porte. Choix simple : prendre
    // la zone juste au-dessus si on est sur une frontière horizontale
    // (sinon à droite). Suffit pour notre layout.
    const aboveZone = tiles[d.y - 1]?.[d.x];
    const leftZone = tiles[d.y]?.[d.x - 1];
    const rightZone = tiles[d.y]?.[d.x + 1];
    const candidate =
      (aboveZone && aboveZone.type !== 'wall' ? aboveZone : null) ??
      (leftZone && leftZone.type !== 'wall' ? leftZone : null) ??
      (rightZone && rightZone.type !== 'wall' ? rightZone : null);
    const zone =
      candidate && (candidate.type === 'floor' || candidate.type === 'door')
        ? candidate.zone
        : 'hall';
    tiles[d.y][d.x] = { type: 'door', zone, doorId: d.id };
  }

  // --- Spawns : 5 emplacements dans le parking (rez-de-chaussée) ---
  const spawns: SpawnPoint[] = [
    { x: 4, y: 17 },
    { x: 7, y: 17 },
    { x: 10, y: 17 },
    { x: 13, y: 17 },
    { x: 16, y: 17 },
  ];

  return {
    width: WIDTH,
    height: HEIGHT,
    zones: BANQUE_LUNE_ZONES,
    doors: DOORS,
    spawns,
    tiles,
  };
}

/**
 * Layout exporté. Construit une seule fois au chargement du module —
 * immuable (les tests vérifient l'intégrité).
 */
export const BANQUE_LUNE_LAYOUT: BoardLayout = Object.freeze(buildLayout());
