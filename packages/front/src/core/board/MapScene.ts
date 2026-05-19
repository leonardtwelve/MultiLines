/**
 * Scène Phaser de plateau tile-based (F12, F13, F14, F15).
 *
 * Reçoit un `BoardLayout` à l'init (cf. types.ts) et :
 * - Rend le sol par zone, les murs, les portes (sprites placeholder).
 * - Place les avatars sur les `spawns` du layout.
 * - Permet de **déplacer le premier avatar** sur un tap (mono-device PoC).
 *   En multijoueur (Prompt 3c) ce sera remplacé par la projection du
 *   serveur — le client n'arbitrera plus.
 *
 * Volontairement minimaliste : pas de pathfinding (F12), pas
 * d'animations de marche (sprites par direction = #39), pas de fog
 * (#73 critère séparé). Le but : qu'on voie la map et qu'on bouge.
 */

import Phaser from 'phaser';
import {
  type BoardLayout,
  TILE_SIZE,
  findZone,
  isWalkable,
  tileAt,
  validateLayout,
} from './types';
import { TEXTURE_KEYS, ensureBoardTextures } from './placeholderTextures';

export const MAP_SCENE_KEY = 'core:map';

export interface MapSceneData {
  layout: BoardLayout;
}

export interface PlacedAvatar {
  /** Index 0..N-1 (correspond aux spawns du layout). */
  index: number;
  tileX: number;
  tileY: number;
  sprite: Phaser.GameObjects.Image;
}

export class MapScene extends Phaser.Scene {
  private layout: BoardLayout | null = null;
  private avatars: PlacedAvatar[] = [];
  private hoverHighlight: Phaser.GameObjects.Image | null = null;

  constructor() {
    super(MAP_SCENE_KEY);
  }

  init(data: MapSceneData): void {
    if (!data?.layout) {
      throw new Error('MapScene: data.layout requis.');
    }
    validateLayout(data.layout);
    this.layout = data.layout;
  }

  create(): void {
    if (!this.layout) return;
    const layout = this.layout;

    ensureBoardTextures(this, layout.zones);

    this.cameras.main.setBackgroundColor(0x0b0d10);

    // === Couche tiles ===
    for (let y = 0; y < layout.height; y += 1) {
      for (let x = 0; x < layout.width; x += 1) {
        const t = tileAt(layout, x, y);
        if (!t) continue;
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        if (t.type === 'wall') {
          this.add.image(px, py, TEXTURE_KEYS.wall);
        } else if (t.type === 'floor') {
          this.add.image(px, py, TEXTURE_KEYS.zoneFloor(t.zone));
        } else if (t.type === 'door') {
          const door = layout.doors.find((d) => d.id === t.doorId);
          // Le sol de la porte est rendu avec la couleur de zone
          // hôte (utile visuellement, et logique : on traverse vers
          // cette zone).
          this.add.image(px, py, TEXTURE_KEYS.zoneFloor(t.zone));
          this.add.image(
            px,
            py,
            door?.locked ? TEXTURE_KEYS.doorLocked : TEXTURE_KEYS.doorOpen,
          );
        }
      }
    }

    // === Labels de zone (texte discret en haut de chaque zone) ===
    this.renderZoneLabels(layout);

    // === Highlight de hover ===
    this.hoverHighlight = this.add
      .image(-1000, -1000, TEXTURE_KEYS.zoneFloor(layout.zones[0]?.id ?? ''))
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD);

    // === Avatars sur les spawns ===
    layout.spawns.forEach((spawn, index) => {
      const sprite = this.add.image(
        spawn.x * TILE_SIZE + TILE_SIZE / 2,
        spawn.y * TILE_SIZE + TILE_SIZE / 2,
        TEXTURE_KEYS.avatar,
      );
      sprite.setDepth(10);
      this.avatars.push({ index, tileX: spawn.x, tileY: spawn.y, sprite });
    });

    // === Input : tap / move ===
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
  }

  // === Interactions ===

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (!this.layout || !this.hoverHighlight) return;
    const { tx, ty } = toTile(p);
    if (!isWalkable(this.layout, tx, ty)) {
      this.hoverHighlight.setPosition(-1000, -1000);
      return;
    }
    this.hoverHighlight.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (!this.layout || this.avatars.length === 0) return;
    const { tx, ty } = toTile(p);
    if (!isWalkable(this.layout, tx, ty)) return;
    // PoC mono-device : on bouge le 1er avatar. En multijoueur, c'est
    // le serveur qui propagera les positions via `state.updated`.
    const av = this.avatars[0];
    av.tileX = tx;
    av.tileY = ty;
    this.tweens.add({
      targets: av.sprite,
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
      duration: 200,
      ease: 'Sine.easeInOut',
    });
  }

  // === Rendu auxiliaire ===

  private renderZoneLabels(layout: BoardLayout): void {
    // Pour chaque zone, on cherche le centroïde des tiles sol de la zone
    // et on y dépose un petit label. Aide à la lecture des 9 zones.
    const acc = new Map<string, { sx: number; sy: number; n: number }>();
    for (let y = 0; y < layout.height; y += 1) {
      for (let x = 0; x < layout.width; x += 1) {
        const t = tileAt(layout, x, y);
        if (!t || t.type === 'wall') continue;
        const z = t.type === 'floor' || t.type === 'door' ? t.zone : null;
        if (!z) continue;
        const cur = acc.get(z) ?? { sx: 0, sy: 0, n: 0 };
        cur.sx += x;
        cur.sy += y;
        cur.n += 1;
        acc.set(z, cur);
      }
    }
    for (const [zoneId, { sx, sy, n }] of acc) {
      const zone = findZone(layout, zoneId);
      if (!zone || n === 0) continue;
      const cx = (sx / n) * TILE_SIZE + TILE_SIZE / 2;
      const cy = (sy / n) * TILE_SIZE + TILE_SIZE / 2;
      this.add
        .text(cx, cy, zone.label.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#e6e8eb',
          backgroundColor: 'rgba(11,13,16,0.55)',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(5)
        .setAlpha(0.85);
    }
  }
}

function toTile(p: Phaser.Input.Pointer): { tx: number; ty: number } {
  return {
    tx: Math.floor(p.worldX / TILE_SIZE),
    ty: Math.floor(p.worldY / TILE_SIZE),
  };
}
