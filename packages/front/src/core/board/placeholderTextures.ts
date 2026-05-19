/**
 * Génération procédurale des textures placeholder du plateau.
 *
 * Le vrai tileset pixel art Banque Lune arrivera avec les chartes
 * visuelles (#11/#12, livrables Aseprite, D6). En attendant, on génère
 * les sprites runtime via `Phaser.Graphics` pour que le rendu soit
 * fonctionnel + lisible :
 * - Tile sol : carré coloré (la couleur vient de Zone.floorColor) avec
 *   un léger pattern damier pour repérer la grille
 * - Tile mur : gris foncé
 * - Porte ouverte : encadrement + vide
 * - Porte verrouillée : encadrement + 🔒 stylisé en pixels
 * - Avatar : petit carré accent (palette Player.color réutilisée plus tard)
 *
 * Toutes les textures sont enregistrées dans le `TextureManager` de la
 * scène avec des clés stables réutilisables.
 */

import Phaser from 'phaser';
import { TILE_SIZE, type Zone } from './types';

export const TEXTURE_KEYS = {
  wall: 'board:tile:wall',
  doorLocked: 'board:tile:door-locked',
  doorOpen: 'board:tile:door-open',
  avatar: 'board:avatar',
  zoneFloor: (zoneId: string): string => `board:tile:floor:${zoneId}`,
  zoneHighlight: (zoneId: string): string => `board:tile:hover:${zoneId}`,
} as const;

/**
 * Crée les textures du plateau pour la scène donnée. Idempotent — appel
 * répété ne refait rien (utile aux scènes redémarrées).
 */
export function ensureBoardTextures(scene: Phaser.Scene, zones: ReadonlyArray<Zone>): void {
  const tm = scene.textures;

  if (!tm.exists(TEXTURE_KEYS.wall)) {
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1f26);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Hachure légère pour différencier des sols sombres.
    g.lineStyle(1, 0x2a2f36, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(TILE_SIZE, TILE_SIZE);
    g.strokePath();
    g.generateTexture(TEXTURE_KEYS.wall, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  if (!tm.exists(TEXTURE_KEYS.doorOpen)) {
    const g = scene.add.graphics();
    // Sol clair + encadrement.
    g.fillStyle(0x3a4a5a);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(2, 0x7a8a9a);
    g.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    g.generateTexture(TEXTURE_KEYS.doorOpen, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  if (!tm.exists(TEXTURE_KEYS.doorLocked)) {
    const g = scene.add.graphics();
    // Porte fermée : sol clair, encadrement, "cadenas" central simplifié.
    g.fillStyle(0x3a4a5a);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(2, 0x7a8a9a);
    g.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    // Cadenas (corps + anse) en jaune accent.
    g.fillStyle(0xffcc66);
    g.fillRect(TILE_SIZE / 2 - 5, TILE_SIZE / 2 - 2, 10, 9); // corps
    g.lineStyle(2, 0xffcc66);
    g.beginPath();
    g.arc(TILE_SIZE / 2, TILE_SIZE / 2 - 4, 4, Math.PI, 0);
    g.strokePath();
    g.generateTexture(TEXTURE_KEYS.doorLocked, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  if (!tm.exists(TEXTURE_KEYS.avatar)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffcc66);
    // Avatar = pastille avec contour. Placeholder en attendant les
    // sprites par rôle (#39).
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 4);
    g.lineStyle(2, 0x0b0d10);
    g.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 4);
    g.generateTexture(TEXTURE_KEYS.avatar, TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  for (const zone of zones) {
    const floorKey = TEXTURE_KEYS.zoneFloor(zone.id);
    if (!tm.exists(floorKey)) {
      const g = scene.add.graphics();
      // Damier subtil : alterne 2 nuances de la couleur de zone pour
      // que la grille reste lisible.
      g.fillStyle(zone.floorColor);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(darken(zone.floorColor, 0.92));
      g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
      g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
      g.generateTexture(floorKey, TILE_SIZE, TILE_SIZE);
      g.destroy();
    }

    const hoverKey = TEXTURE_KEYS.zoneHighlight(zone.id);
    if (!tm.exists(hoverKey)) {
      const g = scene.add.graphics();
      g.fillStyle(lighten(zone.floorColor, 1.25));
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.lineStyle(1, 0xffcc66, 0.8);
      g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.generateTexture(hoverKey, TILE_SIZE, TILE_SIZE);
      g.destroy();
    }
  }
}

// === Helpers internes ===

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function applyFactor(hex: number, factor: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return (clampByte(r * factor) << 16) | (clampByte(g * factor) << 8) | clampByte(b * factor);
}

function darken(hex: number, factor: number): number {
  return applyFactor(hex, factor);
}

function lighten(hex: number, factor: number): number {
  return applyFactor(hex, factor);
}
