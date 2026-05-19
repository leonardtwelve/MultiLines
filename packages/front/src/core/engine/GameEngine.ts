// ⚠️ POST-PIVOT JACKBOX — refonte prévue Prompt 3.
// La forme actuelle (orchestrateur Phaser + store local + privateView) est
// le moteur du PoC mono-device. Suite au pivot :
//   - le Store passe côté serveur (D7 amendée, F17) — `initStore`/`store`
//     supprimés ci-dessous, le client travaillera avec une **projection** (#63)
//   - PrivateView (tablette tournée) est obsolète (G5 amendée) — l'info
//     privée passe sur smartphone Player (F10)
//   - TurnSystem côté client est obsolète (F17 : logique serveur)
// Le GameEngine sera vraisemblablement refondu en un orchestrateur Host
// (rendu Phaser + connexion WebSocket + projection store) dans le Prompt 3.

import Phaser from 'phaser';
import { EventBus } from '@pixel-quests/shared/events';
import { SceneManager } from './SceneManager';
import { PlayerManager } from '../players/PlayerManager';
import { SaveManager } from '../persistence/SaveManager';
import { AudioManager } from '../audio/AudioManager';

export interface GameEngineConfig {
  parent: HTMLElement;
  width: number;
  height: number;
}

/**
 * Orchestrateur du moteur générique. Détient les services partagés (joueurs,
 * sauvegarde, audio, événements) et démarre Phaser une fois les scènes
 * enregistrées par l'aventure courante.
 *
 * Cycle :
 *   const engine = new GameEngine(...);
 *   adventure.init(engine);              // enregistre les scènes
 *   engine.start();                       // boot Phaser (aucune scène active)
 *   engine.startScene(key, data);         // démarre la première scène
 *
 * ⚠️ Statut post-migration monorepo : services `turns`, `privateView`, `store`
 * retirés (archivés / refondus côté serveur). Refonte intégrale dans Prompt 3.
 */
export class GameEngine {
  readonly events = new EventBus();
  readonly scenes = new SceneManager();
  readonly players = new PlayerManager();
  readonly save = new SaveManager();
  readonly audio = new AudioManager();

  private game: Phaser.Game | null = null;
  private readonly config: GameEngineConfig;

  constructor(config: GameEngineConfig) {
    this.config = config;
  }

  /**
   * Crée le `Phaser.Game` et y ajoute toutes les scènes enregistrées en
   * mode **passif** (aucune n'est démarrée automatiquement). Appeler
   * `startScene(key, data)` ensuite.
   */
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
      scene: [], // ajout manuel ci-dessous pour pouvoir passer des data
    });
    for (const { key, scene } of this.scenes.list()) {
      // 3e arg = autoStart : false → on contrôle le démarrage.
      this.game.scene.add(key, scene, false);
    }
  }

  /** Démarre une scène par clé en lui passant les `data` de son `init()`. */
  startScene(key: string, data?: object): void {
    if (!this.game) {
      throw new Error('GameEngine: appelle start() avant startScene().');
    }
    this.game.scene.start(key, data);
  }

  stop(): void {
    this.game?.destroy(true);
    this.game = null;
    this.events.clear();
    this.scenes.clear();
  }
}
