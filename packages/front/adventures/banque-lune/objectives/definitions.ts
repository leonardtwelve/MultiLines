import type { Objective } from './types';
import type { RoleId } from '../roles/types';

/**
 * 30 objectifs privés (6 par rôle), définis par GAMEPLAY.md §7.2.
 *
 * Chaque objectif a un *predicate* à implémenter quand l'état de partie sera
 * complet (issue dev liée). Pour M1, on stocke uniquement la métadonnée.
 */
export const OBJECTIVES: ReadonlyArray<Objective> = [
  // 🟢 Hacker (6)
  { id: 'H1', code: 'solo-perfect', role: 'hacker', label: "Termine sans avoir échoué une seule action Intrusion système ou Surcharge.", axis: 'action' },
  { id: 'H2', code: 'data-collector', role: 'hacker', label: "Termine avec au moins un Dossier de chaque type (Compromettant, Accès, Identité).", axis: 'economic' },
  { id: 'H3', code: 'quiet-pro', role: 'hacker', label: "Termine la partie avec une jauge d'alerte finale inférieure à 60%.", axis: 'action' },
  { id: 'H4', code: 'richer-than-faussaire', role: 'hacker', label: "À l'acte 3, aie strictement plus de Crédits que le Faussaire.", axis: 'comparative' },
  { id: 'H5', code: 'power-trip', role: 'hacker', label: "Réussis au moins 2 Surcharges dans la partie.", axis: 'action' },
  { id: 'H6', code: 'info-hoarder', role: 'hacker', label: "Sois le joueur ayant récolté le plus de Dossiers sur la partie.", axis: 'comparative' },

  // 🟡 Faussaire (6)
  { id: 'F1', code: 'master-of-coin', role: 'faussaire', label: "Termine avec au moins 2 lots de butin authentifiés par toi-même.", axis: 'action' },
  { id: 'F2', code: 'serial-substitute', role: 'faussaire', label: "Réussis au moins 3 Substitutions durant la partie.", axis: 'action' },
  { id: 'F3', code: 'truth-keeper', role: 'faussaire', label: "Aucun joueur ne doit révéler que tu as menti sur la valeur d'un lot.", axis: 'narrative' },
  { id: 'F4', code: 'richer-than-hacker', role: 'faussaire', label: "À l'acte 3, aie strictement plus de Crédits que le Hacker.", axis: 'comparative' },
  { id: 'F5', code: 'coffer-keeper', role: 'faussaire', label: "Le butin total final de l'équipe doit être au moins élevé (seuil chiffré en spec/calcul-butin).", axis: 'economic' },
  { id: 'F6', code: 'info-broker', role: 'faussaire', label: "Donne au moins 1 Dossier à un autre joueur via Échange direct.", axis: 'narrative' },

  // 🟣 Infiltré (6)
  { id: 'I1', code: 'explorer', role: 'infiltre', label: "Sois le joueur ayant révélé le plus de zones de la banque.", axis: 'comparative' },
  { id: 'I2', code: 'master-locksmith', role: 'infiltre', label: "Réussis au moins 2 Crochetages durant la partie.", axis: 'action' },
  { id: 'I3', code: 'unbreakable', role: 'infiltre', label: "Termine la partie sans avoir subi aucun échec critique (2 naturel).", axis: 'action' },
  { id: 'I4', code: 'kingpin', role: 'infiltre', label: "Sois le joueur avec le plus de butin au calcul final.", axis: 'comparative' },
  { id: 'I5', code: 'loyal-soldier', role: 'infiltre', label: "Vote Loyal à l'acte 3 ET aie au moins 1 Pacte de loyauté tenu.", axis: 'narrative' },
  { id: 'I6', code: 'lone-wolf', role: 'infiltre', label: "Refuse au moins 2 propositions de Pacte secret durant la partie.", axis: 'narrative' },

  // 🌹 Négociateur (6)
  { id: 'N1', code: 'peacemaker', role: 'negociateur', label: "Termine la partie avec au moins 2 Pactes secrets tenus.", axis: 'narrative' },
  { id: 'N2', code: 'silver-tongue', role: 'negociateur', label: "Utilise ton Magnétisme au moins 3 fois durant la partie.", axis: 'action' },
  { id: 'N3', code: 'kingmaker', role: 'negociateur', label: "Sois le joueur ayant fait gagner le plus de Crédits aux autres (via Magnétisme et Échanges).", axis: 'comparative' },
  { id: 'N4', code: 'string-puller', role: 'negociateur', label: "Au moins 2 autres joueurs doivent avoir voté Loyal grâce à un Pacte avec toi.", axis: 'narrative' },
  { id: 'N5', code: 'keep-your-word', role: 'negociateur', label: "Tous tes Pactes de loyauté doivent être tenus à l'acte 3.", axis: 'narrative' },
  { id: 'N6', code: 'active-banker', role: 'negociateur', label: "Termine avec au moins 4 Crédits restants après avoir utilisé Magnétisme au moins 2 fois.", axis: 'economic' },

  // 🔵 Observateur (6)
  { id: 'O1', code: 'eagle-eye', role: 'observateur', label: "Aie marqué au moins 3 cibles différentes avec Œil dans le ciel.", axis: 'action' },
  { id: 'O2', code: 'intact-drone', role: 'observateur', label: "Termine la partie avec ton drone à 3 PV (intact).", axis: 'action' },
  { id: 'O3', code: 'omniscient', role: 'observateur', label: "Sois le premier à révéler au moins 2 zones de la banque (avant les autres).", axis: 'comparative' },
  { id: 'O4', code: 'support-class', role: 'observateur', label: "Au moins 3 actions des autres joueurs doivent avoir bénéficié d'un bonus de ton Œil dans le ciel.", axis: 'action' },
  { id: 'O5', code: 'from-the-shadows', role: 'observateur', label: "Termine sans avoir activé aucun Dossier ni avoir voté Trahir.", axis: 'narrative' },
  { id: 'O6', code: 'info-supremacy', role: 'observateur', label: "Termine avec au moins 2 Dossiers Identité dans ton inventaire.", axis: 'economic' },
];

/**
 * Index des objectifs par rôle, pour le tirage rapide.
 */
export const OBJECTIVES_BY_ROLE: Readonly<Record<RoleId, ReadonlyArray<Objective>>> = {
  hacker: OBJECTIVES.filter((o) => o.role === 'hacker'),
  faussaire: OBJECTIVES.filter((o) => o.role === 'faussaire'),
  infiltre: OBJECTIVES.filter((o) => o.role === 'infiltre'),
  negociateur: OBJECTIVES.filter((o) => o.role === 'negociateur'),
  observateur: OBJECTIVES.filter((o) => o.role === 'observateur'),
};

/**
 * Paires d'objectifs mutuellement impossibles (G10 §7.4) — re-tirage forcé.
 *
 * Format : codes des deux objectifs, dans n'importe quel ordre.
 */
export const BLOCKING_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['richer-than-faussaire', 'richer-than-hacker'], // H4 ↔ F4
];
