import type { GameEngine } from '../engine/GameEngine';

export type AdventureTone = 'leger' | 'tendu' | 'malicieux';

export interface AdventureManifest {
  /** Identifiant kebab-case unique, sert aussi de dossier sous src/adventures/. */
  id: string;
  title: string;
  shortDescription: string;
  tone: AdventureTone;
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMin: number;
  /** Chemin relatif servi par Vite (depuis public/) vers la vignette. */
  thumbnail: string;
}

/**
 * Contrat que toute aventure doit implémenter. Cf. docs/ADVENTURES_GUIDE.md.
 */
export interface Adventure {
  readonly manifest: AdventureManifest;
  /** Enregistrement des scènes Phaser et init des données propres à l'aventure. */
  init(engine: GameEngine): Promise<void>;
  /** Hook post-démarrage de Phaser (ex: jouer une intro, switcher de scène). */
  start(): void;
  /** Nettoyage des ressources spécifiques. Le moteur appelle Phaser.Game.destroy lui-même. */
  destroy(): void;
}
