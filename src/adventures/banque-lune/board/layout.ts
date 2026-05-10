import type { Connection, Zone, ZoneId } from './types';

export const ZONE_WIDTH = 240;
export const ZONE_HEIGHT = 110;

/**
 * Couleurs de zone par type (FRONTEND.md §2.3).
 * Hex Phaser (sans #).
 */
const ZONE_COLORS = {
  sortie: 0x4a6a8a, // bleu glacé moyen — neutralité, ouverture
  public: 0x2a3a5a, // bleu nocturne — lieu social calme
  interne: 0x353d55, // grisé — fonctionnel
  restreint: 0x3a5570, // cyan-tinted — alerte sécurité
  coeur: 0x6a4a18, // ambre dark — valeur, butin (pulsation à l'animation)
} as const;

/**
 * Layout fixe du Casse Lune (F7), 9 zones canoniques (FRONTEND.md §2.3).
 *
 * Topologie 4×4 sur 1280×720 :
 *
 *                   [Z9 Toit] (col2, row1)
 *                       │ escalier (narrative)
 *   [Z1 P]  [Z2 H]  [Z5 S]  [Z7 C]    (row2)
 *             │
 *           [Z3 B]                    (row3)
 *             │
 *           [Z4 Pause] [Z6 Couloir] [Z8 Directeur]   (row4)
 */
export const ZONES: Readonly<Record<ZoneId, Zone>> = {
  Z1: {
    id: 'Z1',
    name: 'Parvis',
    type: 'sortie',
    description: "Drone de départ, point d'extraction frontal.",
    position: { x: 160, y: 300 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: false,
    unlockHint: '',
    initiallyRevealed: true,
    connections: ['Z2'],
    themeColor: ZONE_COLORS.sortie,
  },
  Z2: {
    id: 'Z2',
    name: 'Hall principal',
    type: 'public',
    description: '1-2 PNJ employés, comptoir.',
    position: { x: 480, y: 300 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: false,
    unlockHint: '',
    initiallyRevealed: true,
    connections: ['Z1', 'Z3', 'Z5'],
    themeColor: ZONE_COLORS.public,
  },
  Z3: {
    id: 'Z3',
    name: 'Bureaux',
    type: 'interne',
    description: 'Terminaux, dossiers papier.',
    position: { x: 480, y: 440 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: false,
    unlockHint: 'Action Reconnaissance pour révéler le contenu.',
    initiallyRevealed: false,
    connections: ['Z2', 'Z4'],
    themeColor: ZONE_COLORS.interne,
  },
  Z4: {
    id: 'Z4',
    name: 'Salle de pause',
    type: 'interne',
    description: 'PNJ employés, opportunité Détournement.',
    position: { x: 320, y: 580 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: false,
    unlockHint: 'Action Reconnaissance pour révéler le contenu.',
    initiallyRevealed: false,
    connections: ['Z3', 'Z6'],
    themeColor: ZONE_COLORS.interne,
  },
  Z5: {
    id: 'Z5',
    name: 'Sas sécurité',
    type: 'restreint',
    description: 'Sas verrouillé, caméras.',
    position: { x: 800, y: 300 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: true,
    unlockHint: 'Hacker (Surcharge) ou Faussaire (Faux ordre) requis.',
    initiallyRevealed: false,
    connections: ['Z2', 'Z7'],
    themeColor: ZONE_COLORS.restreint,
  },
  Z6: {
    id: 'Z6',
    name: 'Couloir technique',
    type: 'restreint',
    description: 'Serveurs, panneau électrique.',
    position: { x: 640, y: 580 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: true,
    unlockHint: 'Reconnaissance + Faux ordre requis.',
    initiallyRevealed: false,
    connections: ['Z4', 'Z8', 'Z9'],
    themeColor: ZONE_COLORS.restreint,
  },
  Z7: {
    id: 'Z7',
    name: 'Salle des coffres',
    type: 'coeur',
    description: '3-4 coffres, butin principal.',
    position: { x: 1120, y: 300 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: true,
    unlockHint: 'Z5 débloquée + Crochetage ou Surcharge requis.',
    initiallyRevealed: false,
    connections: ['Z5'],
    themeColor: ZONE_COLORS.coeur,
  },
  Z8: {
    id: 'Z8',
    name: 'Bureau du directeur',
    type: 'coeur',
    description: 'Coffre-fort spécial, Dossiers possibles.',
    position: { x: 960, y: 580 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: true,
    unlockHint: 'Z6 débloquée + Crochetage requis.',
    initiallyRevealed: false,
    connections: ['Z6'],
    themeColor: ZONE_COLORS.coeur,
  },
  Z9: {
    id: 'Z9',
    name: 'Toit',
    type: 'sortie',
    description: "Point d'extraction par les hauteurs.",
    position: { x: 480, y: 130 },
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
    initiallyLocked: true,
    unlockHint: 'Z6 débloquée pour accès via escalier.',
    initiallyRevealed: false,
    connections: ['Z6'],
    themeColor: ZONE_COLORS.sortie,
  },
};

/**
 * Connexions visuelles entre zones. Toutes bidirectionnelles côté gameplay
 * (cf. invariant testé), mais ici déclarées une fois par paire pour le rendu.
 */
export const CONNECTIONS: ReadonlyArray<Connection> = [
  { from: 'Z1', to: 'Z2', kind: 'door' },
  { from: 'Z2', to: 'Z5', kind: 'door' },
  { from: 'Z5', to: 'Z7', kind: 'door' },
  { from: 'Z2', to: 'Z3', kind: 'door' },
  { from: 'Z3', to: 'Z4', kind: 'door' },
  { from: 'Z4', to: 'Z6', kind: 'door' },
  { from: 'Z6', to: 'Z8', kind: 'door' },
  { from: 'Z6', to: 'Z9', kind: 'narrative' }, // escalier vers le toit
];
