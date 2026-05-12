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
 * ⚠️ Statut post-migration monorepo : services `turns`, `privateView`, `store`
 * retirés (archivés / refondus côté serveur). Le moteur est temporairement
 * réduit aux services restants. Refonte intégrale dans Prompt 3.
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
