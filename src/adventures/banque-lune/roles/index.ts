import type { Role, RoleId } from './types';

const honest = (id: string, label: string, outcome: string): { id: string; label: string; outcome: string } => ({
  id,
  label,
  outcome,
});

const sabotage = (
  id: string,
  label: string,
  outcome: string,
): { id: string; label: string; outcome: string; sabotage: true } => ({
  id,
  label,
  outcome,
  sabotage: true,
});

/**
 * Rôles du Casse de la Banque Lune. Couleurs et personnalités alignées sur
 * la DA bible — voir `src/adventures/banque-lune/ART.md` §4.
 */
export const ROLES: Record<RoleId, Role> = {
  hacker: {
    id: 'hacker',
    name: 'Hacker',
    description:
      "Tu casses les serrures électroniques et les caméras. Visière cyan, doigts agiles, esprit nerveux.",
    color: '#3affc7',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('boucle-cameras', 'Boucler les caméras', "Caméras de l'entrée bouclées.")],
      couloir: [honest('desactive-capteurs', 'Désactiver les capteurs', 'Capteurs au sol éteints.')],
      coffre: [honest('crack-coffre', 'Cracker le coffre numérique', 'Coffre numérique percé.')],
    },
  },
  faussaire: {
    id: 'faussaire',
    name: 'Faussaire',
    description:
      "Long manteau, mallette dorée. Tu falsifies tout ce qui se présente : badges, sceaux, signatures.",
    color: '#ffc83a',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('faux-badges', 'Présenter de faux badges', "Faux badges acceptés à l'accueil.")],
      couloir: [honest('trompe-scanner', "Falsifier le scanner d'identité", 'Scanner trompé.')],
      coffre: [honest('copie-sceaux', 'Copier les sceaux du coffre', 'Sceaux dupliqués pour la sortie.')],
    },
  },
  infiltre: {
    id: 'infiltre',
    name: 'Infiltré·e',
    description:
      "Tu portes l'uniforme d'un employé de la banque. Tu peux aider l'équipe en restant insoupçonné·e, ou saboter discrètement et déclencher l'alarme silencieuse.",
    color: '#c93aff',
    isInfiltre: true,
    actionsByRoom: {
      entree: [
        honest('mot-complices-entree', 'Glisser un mot aux complices', 'Indication discrète passée.'),
        sabotage('alarme-entree', "Déclencher l'alarme silencieuse", 'ALARME silencieuse déclenchée.'),
      ],
      couloir: [
        honest('desamorce-piege', 'Désamorcer un piège', 'Piège désamorcé sans bruit.'),
        sabotage('signal-couloir', 'Envoyer un signal aux gardes', 'Signal envoyé aux gardes.'),
      ],
      coffre: [
        honest('issue-secours', 'Ouvrir une issue de secours', 'Issue de secours préparée.'),
        sabotage('verrouille-coffre', 'Verrouiller le coffre à distance', 'Coffre verrouillé à distance.'),
      ],
    },
  },
  negociateur: {
    id: 'negociateur',
    name: 'Négociateur·rice',
    description:
      "Posture droite, oreillette rose. Tu parles, tu désamorces, tu fais oublier que cinq inconnus se baladent dans une banque la nuit.",
    color: '#ff3a82',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('distrait-gardien', 'Distraire le gardien', 'Gardien occupé à parler.')],
      couloir: [honest('parlemente-superviseur', 'Parlementer avec le superviseur', 'Superviseur calmé.')],
      coffre: [honest('negocie-acces', "Négocier l'accès final", 'Code final obtenu.')],
    },
  },
  observateur: {
    id: 'observateur',
    name: 'Observateur',
    description:
      "Pilote un drone furtif depuis l'extérieur. Vue tactique du layout, reconnaissance, soutien à distance. Drone fragile (3 PV).",
    color: '#85b7eb',
    isInfiltre: false,
    // Note: la structure room→actions est l'héritage du PoC. Refonte vers les
    // 3 actions GAMEPLAY (Reconnaissance drone / Brouillage / Œil dans le ciel)
    // prévue dans l'issue #38 (Stubs des 5 rôles).
    actionsByRoom: {
      entree: [honest('drone-reco-entree', 'Reconnaissance drone', "Drone survole l'entrée.")],
      couloir: [honest('drone-brouillage', 'Brouillage', 'Capteurs du couloir aveuglés 1 tour.')],
      coffre: [honest('drone-marque', 'Œil dans le ciel', 'Coffre marqué — bonus pour les autres.')],
    },
  },
};
