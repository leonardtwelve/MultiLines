/**
 * ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
 *
 * Cette aventure est dans un état **transitoire**. Avant le pivot, elle :
 * - distribuait les rôles localement puis les révélait via `engine.privateView`
 * - stockait son état via un singleton local (`state.ts`, archivé)
 * - enregistrait `BoardScene` (9 zones discrètes, archivée)
 *
 * Avec le pivot :
 * - Les rôles seront distribués **côté serveur** (#61 spec/server-state-machine)
 *   et révélés sur les **smartphones** des joueurs (#62 spec/connexion-qr, G5 amendée)
 * - L'état vit côté serveur (D7 amendée, F17). Le Host reçoit une projection
 *   (#63 spec/store-projection)
 * - Le plateau devient une **map continue** tile-based (F12-F15), à implémenter
 *   dans le Prompt 3 (chantier #67 phase D)
 *
 * Pour l'instant : stub qui satisfait le contrat `Adventure` sans rien faire
 * de significatif. Voir #41 pour l'implémentation des actions des 5 rôles.
 */
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

  async init(_engine: GameEngine): Promise<void> {
    if (!pendingOptions) {
      throw new Error("Banque Lune : appelle adventure.configure({ onFinish }) avant init().");
    }
    // TODO Prompt 3 : distribution rôles + révélation passent par le serveur.
    //   - distributeRoles : appel au serveur via WebSocket (intent → state.updated)
    //   - reveal des rôles : message privé envoyé au smartphone du joueur cible (G5 amendée)
    //   - setBanqueLuneContext : remplacé par lecture de engine.store (projection serveur)
    //
    // Pour le moment, on n'enregistre que ResultScene comme placeholder Phaser.
    // BoardScene a été archivée — la map continue tile-based sera implémentée
    // dans le chantier #67 phase D.
    _engine.scenes.add(ResultScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // TODO Prompt 3 : démarrer la partie côté serveur, attendre les events
    // initiaux (briefing, distribution rôles, etc.).
  },

  destroy(): void {
    pendingOptions = null;
  },
};

let pendingOptions: BanqueLuneStartOptions | null = null;
