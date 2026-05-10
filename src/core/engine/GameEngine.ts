import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { SceneManager } from './SceneManager';
import { PlayerManager } from '../players/PlayerManager';
import { TurnSystem } from '../players/TurnSystem';
import { SaveManager } from '../persistence/SaveManager';
import { AudioManager } from '../audio/AudioManager';
import type { PrivateView } from '../ui/PrivateView';
import { DomPrivateView } from '../ui/DomPrivateView';
import { Store } from '../state/Store';
import type { GameState } from '../state/GameState';

export interface GameEngineConfig {
  parent: HTMLElement;
  width: number;
  height: number;
  /** PrivateView injectable (par défaut : DomPrivateView monté sur document.body). */
  privateView?: PrivateView;
}

/**
 * Orchestrateur du moteur générique. Détient les services partagés (joueurs, tour,
 * sauvegarde, audio, événements, store, vue privée) et démarre Phaser une fois
 * les scènes enregistrées par l'aventure courante.
 */
export class GameEngine {
  readonly events = new EventBus();
  readonly scenes = new SceneManager();
  readonly players = new PlayerManager();
  readonly turns: TurnSystem;
  readonly save = new SaveManager();
  readonly audio = new AudioManager();
  readonly privateView: PrivateView;

  private _store: Store | null = null;
  private game: Phaser.Game | null = null;
  private readonly config: GameEngineConfig;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.turns = new TurnSystem(this.players);
    this.privateView = config.privateView ?? new DomPrivateView();
  }

  /**
   * Initialise le store de partie. Doit être appelé avant `adventure.init()`
   * (le store est en lecture pour `adventure.start(initialState)`).
   */
  initStore(initial: GameState): Store {
    if (this._store) {
      throw new Error('GameEngine.initStore : store déjà initialisé.');
    }
    this._store = new Store(initial, this.events);
    return this._store;
  }

  get store(): Store {
    if (!this._store) {
      throw new Error('GameEngine.store : non initialisé. Appelle initStore(...) avant.');
    }
    return this._store;
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
    this.privateView.close();
    this.game?.destroy(true);
    this.game = null;
    this.events.clear();
    this.scenes.clear();
    this._store = null;
  }
}
