import Phaser from 'phaser';
import type { Adventure } from '../../src/core/types/adventure';
import type { GameEngine } from '../../src/core/engine/GameEngine';
import type { GameState } from '../../src/core/state/GameState';
import { testAdventureManifest } from './manifest';

const TEST_SCENE_KEY = 'test-adventure:placeholder';

class TestPlaceholderScene extends Phaser.Scene {
  constructor() {
    super(TEST_SCENE_KEY);
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

let engineRef: GameEngine | null = null;

/**
 * Implémentation minimale du contrat `Adventure`. Sert d'exemple de référence
 * pour le tutoriel "Créer une aventure en 30 minutes" (`ADVENTURES_GUIDE.md`).
 */
export const testAdventure: Adventure = {
  manifest: testAdventureManifest,

  async init(engine: GameEngine): Promise<void> {
    engineRef = engine;
    engine.scenes.add(TEST_SCENE_KEY, TestPlaceholderScene);
  },

  start(_initialState: Readonly<GameState>): void {
    engineRef?.startScene(TEST_SCENE_KEY);
  },

  destroy(): void {
    engineRef = null;
  },
};
