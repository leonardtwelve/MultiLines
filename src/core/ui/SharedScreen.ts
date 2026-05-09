/**
 * Contrats UX pour l'écran partagé (tablette posée au centre de la table).
 * Implémentation effective déléguée aux scènes Phaser de chaque aventure.
 */
export interface ScreenZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SharedScreen {
  readonly zones: readonly ScreenZone[];
  showZone(id: string): void;
  hideZone(id: string): void;
  transitionTo(zoneId: string): Promise<void>;
}
