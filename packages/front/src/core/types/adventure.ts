// ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
// ----------------------------------------------------------------------------
// Les **actions** déclarées par les aventures vont devenir des **intents**
// envoyés au serveur via WebSocket (D7 amendée, F17, F20). Le contrat
// `Adventure` ci-dessous garde son typage actuel pour la migration monorepo,
// mais sera refondu dans le **Prompt 3** :
//   - `start(initialState)` recevra l'état initial produit par le serveur, pas
//     par un store client (D7 amendée).
//   - Les méthodes des rôles qui mutent un store local doivent devenir des
//     émetteurs d'intent vers le serveur autoritaire.
// Voir aussi `docs/ADVENTURES_GUIDE.md` (header post-pivot).
// ----------------------------------------------------------------------------

import type { GameEngine } from '../engine/GameEngine';
import type { GameState } from '../state/GameState';

export type AdventureTone = 'leger' | 'tendu' | 'malicieux';
export type AdventureDifficulty = 'easy' | 'medium' | 'hard';
export type ContentRating = 'all' | '12+' | '16+';

export interface AdventurePricing {
  bundled: boolean;
  standalonePriceEur?: number;
}

/**
 * Métadonnées statiques d'une aventure (D8). Manifest enrichi qui anticipe les
 * besoins jusqu'à M5 ; les champs `pricing` et `languages` peuvent être réduits
 * à un défaut tant qu'ils ne sont pas exploités.
 */
export interface AdventureManifest {
  // identité
  id: string;
  /** Semver. */
  version: string;

  // affichage
  title: string;
  shortDescription: string;
  longDescription: string;
  /** URL ou import résolu (Vite ?url) vers la vignette (256×256 attendu). */
  thumbnail: string;
  /** Bannière 1024×384 attendue. */
  banner: string;
  tone: AdventureTone;
  tags: string[];

  // contraintes de jeu
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMin: number;
  difficulty: AdventureDifficulty;

  // métadonnées
  contentRating: ContentRating;
  /** Codes ISO 639-1 — ex: ['fr', 'en']. */
  languages: string[];

  // commercial (optionnel, M5+)
  pricing?: AdventurePricing;
}

/**
 * Contrat que toute aventure doit implémenter (voir `docs/ADVENTURES_GUIDE.md`).
 *
 * Cycle de vie :
 *   init(engine) → start(initialState) → boucle de tours → destroy()
 */
export interface Adventure {
  readonly manifest: AdventureManifest;

  /**
   * Initialisation : enregistrer scènes, animations, sons auprès du moteur.
   * **Ne PAS démarrer le jeu ici** — l'engine attend `start()`.
   */
  init(engine: GameEngine): Promise<void>;

  /**
   * Démarrage effectif du jeu après `init()` et la phase de setup.
   * @param initialState état déjà rempli avec les joueurs configurés
   */
  start(initialState: Readonly<GameState>): void;

  /**
   * Nettoyage : libérer ressources, retirer listeners.
   * Appelé quand le joueur quitte ou en fin de partie.
   */
  destroy(): void;
}
