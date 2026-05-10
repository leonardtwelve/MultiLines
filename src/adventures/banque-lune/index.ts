import type { Adventure } from '../../core/types/adventure';
import type { GameEngine } from '../../core/engine/GameEngine';
import type { GameState } from '../../core/state/GameState';
import { banqueLuneManifest } from './manifest';
import { distributeRoles } from './roles/distribute';
import { EntreeScene } from './scenes/EntreeScene';
import { CouloirScene } from './scenes/CouloirScene';
import { CoffreScene } from './scenes/CoffreScene';
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
    // NOTE : pour M1, banque-lune utilise un singleton interne (`state.ts`).
    // Migration prévue vers `engine.store.dispatch(ADVENTURE_STATE_UPDATED)` en M2.
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

    // Phase 3 — enregistrer les scènes Phaser.
    engine.scenes.add(EntreeScene);
    engine.scenes.add(CouloirScene);
    engine.scenes.add(CoffreScene);
    engine.scenes.add(ResultScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // initialState ignoré pour l'instant — banque-lune lit son contexte via le singleton.
    // Phaser démarre la première scène enregistrée (Entrée) automatiquement.
  },

  destroy(): void {
    clearBanqueLuneContext();
    pendingOptions = null;
  },
};

let pendingOptions: BanqueLuneStartOptions | null = null;
