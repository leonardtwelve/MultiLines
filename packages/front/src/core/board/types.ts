/**
 * Types du plateau tile-based — moteur générique (F12, F13, F14, F15).
 *
 * Une aventure définit sa carte sous forme d'une `BoardLayout` : grille
 * 2D de tiles, chaque tile rattachée à une `Zone` logique et à un type
 * (sol marchable, mur, porte). Les portes ont un état verrouillé /
 * débloqué (F15) et peuvent référencer une clé d'unlock côté gameplay.
 *
 * Le rendu Phaser (MapScene) consomme ce contrat — aucune connaissance
 * spécifique de Banque Lune dans `core/`.
 */

/** Taille canonique d'une tile en pixels (F12). */
export const TILE_SIZE = 32;

/**
 * Identifiants de zones logiques. Le `BoardLayout` mappe chaque tile vers
 * un ZoneId. L'aventure fournit la liste de zones + leur métadonnée.
 *
 * Restreint à `string` (pas de literal type cross-package) — chaque
 * aventure définit ses propres ids.
 */
export type ZoneId = string;

/** Métadonnée d'une zone (couleur de sol, libellé, etc.). */
export interface Zone {
  id: ZoneId;
  label: string;
  /**
   * Couleur de fond utilisée par le rendu placeholder (avant le vrai
   * tileset pixel art, cf. #11/#12 chartes). Format `0xRRGGBB`.
   */
  floorColor: number;
}

/** Tile de plateau. */
export type Tile =
  | { type: 'floor'; zone: ZoneId }
  | { type: 'wall' }
  | { type: 'door'; zone: ZoneId; doorId: string };

/**
 * Porte (F15). Position dans la grille + état + (optionnel) zone requise
 * pour débloquer (utile au gameplay).
 */
export interface Door {
  id: string;
  /** Coordonnée tile (0 ≤ x < width, 0 ≤ y < height). */
  x: number;
  y: number;
  /** État de verrouillage. Une porte non verrouillée est traversable. */
  locked: boolean;
  /**
   * Label libre indiquant comment débloquer (« badge accueil », « code coffre »…).
   * Non utilisé par le moteur — pure indication UI / debug.
   */
  unlockHint?: string;
}

/** Position spawn de l'avatar d'un joueur. */
export interface SpawnPoint {
  x: number;
  y: number;
}

/**
 * Layout complet d'un plateau. Sérialisable (pas de classe, pas de
 * fonction) — sourcé par une aventure, consommé par MapScene.
 */
export interface BoardLayout {
  /** Largeur en tiles (40 canonique, F13). */
  width: number;
  /** Hauteur en tiles (20 canonique, F13). */
  height: number;
  /** Grille `tiles[y][x]`. */
  tiles: ReadonlyArray<ReadonlyArray<Tile>>;
  zones: ReadonlyArray<Zone>;
  doors: ReadonlyArray<Door>;
  /**
   * Spawn par index de joueur (0 = premier joueur, etc.). Le serveur
   * choisira son spawn quand la projection arrivera (Prompt 3c) ; pour
   * le PoC mono-device on tape dans cette liste.
   */
  spawns: ReadonlyArray<SpawnPoint>;
}

// === Helpers purs (testables sans Phaser) ===

/** Récupère la tile à (x,y) — undefined si hors-grille. */
export function tileAt(layout: BoardLayout, x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) return undefined;
  return layout.tiles[y]?.[x];
}

/** Une tile est-elle franchissable (sol OU porte non verrouillée) ? */
export function isWalkable(layout: BoardLayout, x: number, y: number): boolean {
  const t = tileAt(layout, x, y);
  if (!t) return false;
  if (t.type === 'floor') return true;
  if (t.type === 'door') {
    const door = layout.doors.find((d) => d.id === t.doorId);
    return door ? !door.locked : false;
  }
  return false;
}

/** Récupère la zone d'une tile (undefined si mur). */
export function zoneOf(layout: BoardLayout, x: number, y: number): ZoneId | undefined {
  const t = tileAt(layout, x, y);
  if (!t) return undefined;
  if (t.type === 'floor' || t.type === 'door') return t.zone;
  return undefined;
}

/** Distance Manhattan entre deux tiles. */
export function tileDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Cherche la métadonnée d'une zone par id. Renvoie undefined si la zone
 * n'existe pas dans le layout (cas de configuration invalide).
 */
export function findZone(layout: BoardLayout, id: ZoneId): Zone | undefined {
  return layout.zones.find((z) => z.id === id);
}

/**
 * Vérifie l'intégrité d'un layout — utile au démarrage et aux tests.
 * Lève une erreur descriptive si quelque chose cloche.
 */
export function validateLayout(layout: BoardLayout): void {
  if (layout.tiles.length !== layout.height) {
    throw new Error(
      `BoardLayout invalide : ${layout.tiles.length} lignes, ${layout.height} attendues.`,
    );
  }
  const zoneIds = new Set(layout.zones.map((z) => z.id));
  const doorIds = new Set(layout.doors.map((d) => d.id));
  for (let y = 0; y < layout.height; y += 1) {
    const row = layout.tiles[y];
    if (!row || row.length !== layout.width) {
      throw new Error(
        `BoardLayout invalide : ligne ${y} a ${row?.length ?? 0} tiles, ${layout.width} attendues.`,
      );
    }
    for (let x = 0; x < layout.width; x += 1) {
      const t = row[x];
      if (!t) {
        throw new Error(`BoardLayout invalide : tile manquante à (${x},${y}).`);
      }
      if ((t.type === 'floor' || t.type === 'door') && !zoneIds.has(t.zone)) {
        throw new Error(
          `BoardLayout invalide : tile (${x},${y}) référence zone inconnue "${t.zone}".`,
        );
      }
      if (t.type === 'door' && !doorIds.has(t.doorId)) {
        throw new Error(
          `BoardLayout invalide : tile (${x},${y}) référence porte inconnue "${t.doorId}".`,
        );
      }
    }
  }
}
