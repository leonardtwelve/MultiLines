import Phaser from 'phaser';
import type { Adventure } from '../../core/types/adventure';
import type { GameEngine } from '../../core/engine/GameEngine';
import type { GameState } from '../../core/state/GameState';
import { testAdventureManifest } from './manifest';

class TestPlaceholderScene extends Phaser.Scene {
  constructor() {
    super('test-adventure:placeholder');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'test-adventure\nOK', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#3affc7',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}

/**
 * Implémentation minimale du contrat `Adventure`. Sert d'exemple de référence
 * pour le tutoriel "Créer une aventure en 30 minutes" (`ADVENTURES_GUIDE.md`).
 */
export const testAdventure: Adventure = {
  manifest: testAdventureManifest,

  async init(engine: GameEngine): Promise<void> {
    engine.scenes.add(TestPlaceholderScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // Phaser démarre la scène placeholder automatiquement.
  },

  destroy(): void {
    // Rien à nettoyer pour cette aventure factice.
  },
};
