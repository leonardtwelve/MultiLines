import Phaser from 'phaser';

/**
 * Registre des scènes Phaser fournies par les aventures. Découple l'instanciation
 * du moteur (qui décide du moment du démarrage) de la déclaration de scènes
 * (qui dépend de l'aventure).
 */
export class SceneManager {
  private readonly scenes: Phaser.Types.Scenes.SceneType[] = [];

  add(scene: Phaser.Types.Scenes.SceneType): void {
    this.scenes.push(scene);
  }

  list(): Phaser.Types.Scenes.SceneType[] {
    return [...this.scenes];
  }

  clear(): void {
    this.scenes.length = 0;
  }
}
