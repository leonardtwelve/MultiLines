// ⚠️ POST-PIVOT JACKBOX — refonte prévue Prompt 3.
// Cette scène lisait un singleton context local (archivé `../state`).
// Post-pivot : le bilan reçoit ses données de la **projection serveur**
// (D7 amendée, F17). Le rendu Phaser reste pertinent côté Host tablette,
// mais l'accès aux données passe par le store projection (#63, #74).

import Phaser from 'phaser';

const SCENE_KEY = 'banque-lune:result';

/**
 * Bilan de fin de partie (placeholder M1 / migration monorepo).
 *
 * Statut : visualisation seule, en attente de la projection serveur.
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x1a3a1a);

    this.add
      .text(width / 2, height / 3, 'BILAN', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#ffcc66',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2,
        '⚠ Migration monorepo en cours.\nLe bilan complet (Crédits, Dossiers, Pactes, vote acte 3,\nreveal infiltré) sera reconnecté à la projection serveur\ndans le Prompt 3.',
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#7a85a5',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }
}
