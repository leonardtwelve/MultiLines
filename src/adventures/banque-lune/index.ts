import Phaser from 'phaser';
import type { Adventure } from '../../core/types/adventure';
import type { GameEngine } from '../../core/engine/GameEngine';
import { banqueLuneManifest } from './manifest';

class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('banque-lune-placeholder');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Casse de la Banque Lune\nbientôt disponible', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffcc66',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}

export const banqueLuneAdventure: Adventure = {
  manifest: banqueLuneManifest,

  async init(engine: GameEngine): Promise<void> {
    engine.scenes.add(PlaceholderScene);
  },

  start(): void {
    // Phaser démarre la scène enregistrée automatiquement.
    // Hooks futurs : intro animée, sélection des rôles, etc.
  },

  destroy(): void {
    // Le moteur appelle Phaser.Game.destroy() ; rien de spécifique à nettoyer ici pour l'instant.
  },
};
