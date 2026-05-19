// ⚠️ POST-PIVOT JACKBOX — refonte profonde prévue Prompt 3.
// État actuel (post-Prompt 3a + 3b) :
//   - Connexion réseau câblée côté front (HostLobby + Player /player)
//   - Map continue tile-based 40×20 implémentée (MapScene + BANQUE_LUNE_LAYOUT)
//   - Mais : pas encore de game.start serveur, pas de projection store
//     (Prompt 3c). En mono-device on enchaîne quand même la map après le
//     setup classique pour pouvoir tester le rendu.
// TODO Prompt 3c :
//   - distribution des rôles côté serveur (F17, voir issue #41 re-scope)
//   - révélation privée sur smartphone Player (G5 amendée, voir #43 re-scope)
//   - projection store (D7 amendée, issue #74)

import type { Adventure } from '../../src/core/types/adventure';
import type { GameEngine } from '../../src/core/engine/GameEngine';
import type { GameState } from '../../src/core/state/GameState';
import { MapScene, MAP_SCENE_KEY } from '../../src/core/board/MapScene';
import { banqueLuneManifest } from './manifest';
import { BANQUE_LUNE_LAYOUT } from './board/layout';
import { ResultScene, RESULT_SCENE_KEY } from './scenes/ResultScene';

export interface BanqueLuneStartOptions {
  /** Callback appelé après l'écran de résultat (ex: revenir à l'accueil). */
  onFinish: () => void;
  /** Pour les tests : injecter un RNG seedable. Sinon Math.random. */
  rng?: () => number;
}

let pendingOptions: BanqueLuneStartOptions | null = null;
let engineRef: GameEngine | null = null;

export const banqueLuneAdventure: Adventure & {
  configure(options: BanqueLuneStartOptions): void;
} = {
  manifest: banqueLuneManifest,

  /** Doit être appelé AVANT init() pour passer le callback de fin de partie. */
  configure(options: BanqueLuneStartOptions): void {
    pendingOptions = options;
  },

  async init(engine: GameEngine): Promise<void> {
    if (!pendingOptions) {
      throw new Error("Banque Lune : appelle adventure.configure({ onFinish }) avant init().");
    }
    engineRef = engine;
    // Scènes enregistrées en mode passif — `engine.startScene(...)` les
    // démarrera explicitement avec les data attendues.
    engine.scenes.add(MAP_SCENE_KEY, MapScene);
    engine.scenes.add(RESULT_SCENE_KEY, ResultScene);
  },

  start(_initialState: Readonly<GameState>): void {
    if (!engineRef) {
      throw new Error("Banque Lune : start() appelé avant init().");
    }
    // Prompt 3b : démarre la map avec le layout Banque Lune. Phaser
    // appelle `init(data)` → `create()` → input ready.
    // TODO Prompt 3c : remplacer par une réception de `game.started`
    // serveur + projection (issue #74).
    engineRef.startScene(MAP_SCENE_KEY, { layout: BANQUE_LUNE_LAYOUT });
  },

  destroy(): void {
    pendingOptions = null;
    engineRef = null;
  },
};
