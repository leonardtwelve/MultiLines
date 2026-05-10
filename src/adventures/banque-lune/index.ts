import type { Adventure } from '../../core/types/adventure';
import type { GameEngine } from '../../core/engine/GameEngine';
import type { GameState } from '../../core/state/GameState';
import { banqueLuneManifest } from './manifest';
import { distributeRoles } from './roles/distribute';
import { BoardScene } from './scenes/BoardScene';
import { ResultScene } from './scenes/ResultScene';
import { clearBanqueLuneContext, createRunState, setBanqueLuneContext } from './state';

export interface BanqueLuneStartOptions {
  /** Callback appelé après l'écran de résultat (ex: revenir à l'accueil). */
  onFinish: () => void;
  /** Pour les tests : injecter un RNG seedable. Sinon Math.random. */
  rng?: () => number;
}

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
    const options = pendingOptions;
    const players = engine.players.list();
    if (players.length < 3 || players.length > 5) {
      throw new Error('Banque Lune : 3 à 5 joueurs requis');
    }

    const playerRoles = distributeRoles(players.map((p) => p.id), options.rng);

    // Phase 1 — révélation privée des rôles, joueur par joueur.
    for (const player of players) {
      const role = playerRoles.get(player.id);
      if (!role) continue;
      await engine.privateView.reveal(player.name, {
        title: `Tu es ${role.name}`,
        body: role.description,
        accentColor: role.color,
      });
    }

    // Phase 2 — préparer l'état partagé entre scènes.
    // NOTE M1 : singleton interne hérité du PoC. Migration vers
    // engine.store.adventureState prévue avec l'arrivée des actions M2.
    const state = createRunState(players, playerRoles);
    setBanqueLuneContext({
      state,
      view: engine.privateView,
      onFinish: () => {
        clearBanqueLuneContext();
        pendingOptions = null;
        options.onFinish();
      },
    });

    // Phase 3 — enregistrer les scènes Phaser :
    //   BoardScene = plateau principal acte 2 (visualisation seule en M1)
    //   ResultScene = bilan acte 3
    // Les actions, événements de tour et calcul de butin viennent en M2.
    engine.scenes.add(BoardScene);
    engine.scenes.add(ResultScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // initialState ignoré — banque-lune lit son contexte via le singleton (M1).
    // Phaser démarre la première scène enregistrée (BoardScene).
  },

  destroy(): void {
    clearBanqueLuneContext();
    pendingOptions = null;
  },
};

let pendingOptions: BanqueLuneStartOptions | null = null;
