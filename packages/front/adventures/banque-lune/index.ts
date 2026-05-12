// ⚠️ POST-PIVOT JACKBOX — refonte profonde prévue Prompt 3.
// Cette implémentation actuelle (PoC mono-device) :
//   - distribuait les rôles côté client → deviendra une opération **serveur** (F17)
//   - utilisait un singleton context local (archivé `state.ts`) → projecteur d'événements serveur (D7 amendée)
//   - appelait engine.privateView pour révéler les rôles → smartphone Player (G5 amendée)
//   - enregistrait BoardScene (zones-discrètes archivée) → map continue tile-based (F12-F15)
// TODO Prompt 3 : refonte intégrale du flux init/start/destroy.

import type { Adventure } from '../../src/core/types/adventure';
import type { GameEngine } from '../../src/core/engine/GameEngine';
import type { GameState } from '../../src/core/state/GameState';
import { banqueLuneManifest } from './manifest';
import { ResultScene } from './scenes/ResultScene';

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

    // TODO Prompt 3 : tout ce qui suit est obsolète post-pivot Jackbox.
    // - La distribution des rôles passe côté serveur (F17, voir issue #41 re-scope).
    // - La révélation privée passe sur smartphone Player (G5 amendée, voir #43 re-scope).
    // - Le singleton de contexte (archivé) est remplacé par la projection (D7 amendée).
    // - L'enregistrement des scènes inclura le rendu map continue (F12-F15).
    //
    // Code conservé pour référence pendant la migration ; commenté pour qu'il
    // compile sans dépendre des modules archivés (state.ts, BoardScene.ts) :
    //
    // const players = engine.players.list();
    // if (players.length < 3 || players.length > 5) throw new Error('...');
    // const playerRoles = distributeRoles(players.map((p) => p.id), pendingOptions.rng);
    // for (const player of players) {
    //   const role = playerRoles.get(player.id);
    //   if (!role) continue;
    //   await engine.privateView.reveal(player.name, { ... });
    // }
    // const state = createRunState(players, playerRoles);
    // setBanqueLuneContext({ state, view: engine.privateView, onFinish: ... });

    // Seule ResultScene survit à la migration (refondue côté Host dans
    // Prompt 3 quand le bilan recevra ses données du serveur).
    engine.scenes.add(ResultScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // TODO Prompt 3 : `initialState` viendra de la projection serveur, plus
    // d'un store local. Le démarrage Phaser sera piloté par un event
    // `adventure.started` (D2) reçu du serveur.
  },

  destroy(): void {
    // TODO Prompt 3 : appeler les cleanups serveur + désabonnements WebSocket.
    pendingOptions = null;
  },
};

let pendingOptions: BanqueLuneStartOptions | null = null;
