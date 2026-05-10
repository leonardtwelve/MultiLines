/**
 * Plateau du Casse de la Banque Lune (FRONTEND.md §2).
 *
 * Le plateau est un **graphe de zones** (F2). Chaque zone est un conteneur
 * visuel ; les connexions sont des liens logiques (pas des chemins parcourus).
 * F7 acte que la **topologie est fixe** pour le MVP (variabilité = contenu).
 */

export type ZoneId = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Z7' | 'Z8' | 'Z9';

export type ZoneType = 'sortie' | 'public' | 'interne' | 'restreint' | 'coeur';

export interface Zone {
  id: ZoneId;
  /** Nom court affiché en label de zone. */
  name: string;
  type: ZoneType;
  /** Description courte du contenu (FRONTEND.md §2.3). */
  description: string;
  /** Position du **centre** de la zone sur le plateau (canvas 1280×720). */
  position: { x: number; y: number };
  width: number;
  height: number;
  /** True si la zone démarre verrouillée (F3). */
  initiallyLocked: boolean;
  /** Hint affiché au joueur quand il tape une zone verrouillée. */
  unlockHint: string;
  /** True si la zone est révélée par défaut au démarrage (F3). */
  initiallyRevealed: boolean;
  /** IDs des zones connectées (bidirectionnel — voir invariant testé). */
  connections: ReadonlyArray<ZoneId>;
  /** Couleur de fond de la zone (Phaser hex). */
  themeColor: number;
}

export type ConnectionKind = 'door' | 'narrative';

export interface Connection {
  from: ZoneId;
  to: ZoneId;
  /** 'door' = porte/sas standard, 'narrative' = lien narratif (escalier, etc.). */
  kind: ConnectionKind;
}

/**
 * État d'une zone en cours de partie. Stocké dans le store (à câbler en M2).
 * Pour l'instant, BoardScene calcule l'état initial à partir de la définition statique.
 */
export interface ZoneRuntimeState {
  id: ZoneId;
  revealed: boolean;
  unlocked: boolean;
}
