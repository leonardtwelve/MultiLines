import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { SceneManager } from './SceneManager';
import { PlayerManager } from '../players/PlayerManager';
import { TurnSystem } from '../players/TurnSystem';
import { SaveManager } from '../persistence/SaveManager';
import { AudioManager } from '../audio/AudioManager';

export interface GameEngineConfig {
  parent: HTMLElement;
  width: number;
  height: number;
}

/**
 * Orchestrateur du moteur générique. Détient les services partagés (joueurs, tour,
 * sauvegarde, audio, événements) et démarre Phaser une fois les scènes enregistrées
 * par l'aventure courante.
 */
export class GameEngine {
  readonly events = new EventBus();
  readonly scenes = new SceneManager();
  readonly players = new PlayerManager();
  readonly turns: TurnSystem;
  readonly save = new SaveManager();
  readonly audio = new AudioManager();

  private game: Phaser.Game | null = null;
  private readonly config: GameEngineConfig;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.turns = new TurnSystem(this.players);
  }

  start(): void {
    if (this.game) return;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.config.parent,
      width: this.config.width,
      height: this.config.height,
      backgroundColor: '#0b0d10',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: this.scenes.list(),
    });
  }

  stop(): void {
    this.game?.destroy(true);
    this.game = null;
    this.events.clear();
    this.scenes.clear();
  }
}
