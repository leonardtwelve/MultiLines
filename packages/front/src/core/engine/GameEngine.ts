/**
 * ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
 *
 * Le `GameEngine` est en cours de refonte. Avec D7 amendée (source de vérité
 * côté serveur, F17), les responsabilités changent :
 * - **Plus de store local** (D7 → projection serveur, à câbler en Prompt 3).
 * - **Plus de PrivateView intégré** (G5 amendée → info privée = smartphone, F19).
 * - **Plus de TurnSystem côté client** (logique de tour côté serveur, F17).
 *
 * Reste valide pour M2 :
 * - Orchestration Phaser (côté Host tablette)
 * - EventBus local (réception/dispatch d'events serveur)
 * - SceneManager
 * - PlayerManager (lecture seule, à recâbler en projection)
 * - SaveManager (préférences UI locales)
 * - AudioManager
 *
 * Sera scindé / restructuré dans le Prompt 3 (refonte front avec serveur).
 */
import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { SceneManager } from './SceneManager';
import { PlayerManager } from '../players/PlayerManager';
import { SaveManager } from '../persistence/SaveManager';
import { AudioManager } from '../audio/AudioManager';

export interface GameEngineConfig {
  parent: HTMLElement;
  width: number;
  height: number;
}

export class GameEngine {
  readonly events = new EventBus();
  readonly scenes = new SceneManager();
  readonly players = new PlayerManager();
  readonly save = new SaveManager();
  readonly audio = new AudioManager();

  // TODO Prompt 3 : turns retiré (logique côté serveur, F17).
  // TODO Prompt 3 : privateView retiré (G5 amendée — passe par smartphone, F19).
  // TODO Prompt 3 : store retiré (D7 amendée — source côté serveur, F17).

  private game: Phaser.Game | null = null;
  private readonly config: GameEngineConfig;

  constructor(config: GameEngineConfig) {
    this.config = config;
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
