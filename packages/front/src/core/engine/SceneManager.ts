import Phaser from 'phaser';

/**
 * Registre des scènes Phaser fournies par les aventures.
 *
 * Découple l'instanciation du moteur (qui décide du moment du démarrage)
 * de la déclaration de scènes (qui dépend de l'aventure). Chaque scène
 * est ajoutée avec sa clé pour qu'on puisse la démarrer par nom plus tard
 * — c'est nécessaire pour passer des données à `init()` (cf. MapScene qui
 * reçoit un `BoardLayout`).
 */
export interface RegisteredScene {
  key: string;
  scene: Phaser.Types.Scenes.SceneType;
}

export class SceneManager {
  private readonly scenes: RegisteredScene[] = [];

  /**
   * Enregistre une scène avec sa clé (la même que le `super(KEY)` du
   * constructeur). Le moteur l'ajoutera ensuite au `Phaser.Game` en
   * mode passif — le démarrage explicite passe par
   * `GameEngine.startScene(key, data)`.
   */
  add(key: string, scene: Phaser.Types.Scenes.SceneType): void {
    this.scenes.push({ key, scene });
  }

  list(): ReadonlyArray<RegisteredScene> {
    return [...this.scenes];
  }

  clear(): void {
    this.scenes.length = 0;
  }
}
