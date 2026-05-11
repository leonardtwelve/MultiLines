/**
 * ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
 *
 * Cette scène est dans un état **transitoire**. Avant le pivot, elle lisait
 * le singleton `getBanqueLuneContext()` (state.ts, archivé) pour afficher le
 * bilan : actions par pièce, verdict alarme, reveal infiltré·e.
 *
 * Avec le pivot :
 * - Les actions / votes / butin viennent du **serveur** (D7 amendée)
 * - Le bilan est calculé côté serveur (#27 spec/calcul-butin)
 * - Le Host reçoit l'événement `adventure.completed` et anime la scène
 *
 * Pour l'instant : placeholder qui affiche un message "M2 en cours". La
 * refonte complète est dans #43 (Acte 3 — Vote secret simultané).
 */
import Phaser from 'phaser';

const SCENE_KEY = 'banque-lune:result';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1a1a3a);

    this.add
      .text(width / 2, height / 2 - 40, 'Bilan — placeholder', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffcc66',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 + 20,
        '⚠ Refonte en cours (pivot Jackbox)\nVoir issue #43 — Acte 3 vote secret + bilan',
        {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#7a85a5',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }
}
