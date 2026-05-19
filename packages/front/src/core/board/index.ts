/**
 * API publique des données du plateau.
 *
 * ⚠️ Volontairement n'exporte PAS `MapScene` (qui dépend de Phaser).
 * Phaser initialise des features canvas/WebGL au import, ce qui casse
 * jsdom. Les tests sur les types restent purs ; les consommateurs de
 * la scène l'importent explicitement depuis `./MapScene`.
 */

export * from './types';
