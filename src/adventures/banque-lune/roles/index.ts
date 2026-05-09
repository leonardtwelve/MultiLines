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

export const ROLES: Record<RoleId, Role> = {
  hacker: {
    id: 'hacker',
    name: 'Hacker',
    description: "Tu casses les serrures électroniques et les caméras. La technique est ton terrain.",
    color: '#5fcde4',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('boucle-cameras', 'Boucler les caméras', 'Caméras de l\'entrée bouclées.')],
      couloir: [honest('desactive-laser', 'Désactiver la grille laser', 'Grille laser éteinte.')],
      coffre: [honest('crack-coffre', 'Cracker le coffre numérique', 'Coffre numérique percé.')],
    },
  },
  ingenieur: {
    id: 'ingenieur',
    name: 'Ingénieure',
    description: 'Tu maîtrises le métal et les explosifs. La force, mesurée.',
    color: '#ffcc66',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('forcer-porte', "Forcer la porte d'accès", "Porte d'accès forcée.")],
      couloir: [honest('renforcer-sol', 'Sécuriser le sol piégé', 'Sol piégé sécurisé.')],
      coffre: [honest('charge-explosive', 'Poser une charge sur le verrou', 'Verrou explosé.')],
    },
  },
  acrobate: {
    id: 'acrobate',
    name: 'Acrobate',
    description: "Souple, silencieux. Tu passes là où personne d'autre ne peut.",
    color: '#a3e635',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('conduits', "Passer par les conduits d'aération", 'Équipe entrée par les conduits.')],
      couloir: [honest('saute-pieges', 'Franchir les capteurs au sol', 'Capteurs au sol évités.')],
      coffre: [honest('attrape-cle', "Récupérer la clé physique en hauteur", 'Clé physique récupérée.')],
    },
  },
  stratege: {
    id: 'stratege',
    name: 'Stratège',
    description: "Tu lis le terrain, anticipes, coordonnes. Sans toi, personne ne sait quoi faire.",
    color: '#c084fc',
    isInfiltre: false,
    actionsByRoom: {
      entree: [honest('briefing', "Briefer l'équipe", 'Plan d\'attaque clarifié.')],
      couloir: [honest('coordonner', 'Coordonner les passages', 'Mouvements synchronisés.')],
      coffre: [honest('synchroniser', "Synchroniser l'ouverture finale", 'Ouverture finale synchronisée.')],
    },
  },
  infiltre: {
    id: 'infiltre',
    name: 'Infiltré·e',
    description:
      "Tu es l'agent double. Ton objectif : faire échouer le casse sans être démasqué. À chaque pièce, tu choisis : aider (et passer pour un coéquipier loyal) ou saboter (et risquer d'être repéré).",
    color: '#dc2363',
    isInfiltre: true,
    actionsByRoom: {
      entree: [
        honest('aide-discrete-entree', "Aider discrètement", 'Aide discrète apportée.'),
        sabotage('alarme-entree', "Déclencher l'alarme silencieuse", 'ALARME silencieuse déclenchée.'),
      ],
      couloir: [
        honest('aide-discrete-couloir', 'Aider discrètement', 'Aide discrète apportée.'),
        sabotage('signal-couloir', 'Envoyer un signal aux gardes', 'Signal envoyé aux gardes.'),
      ],
      coffre: [
        honest('aide-discrete-coffre', 'Aider discrètement', 'Aide discrète apportée.'),
        sabotage('verrouiller-coffre', 'Verrouiller le coffre à distance', 'Coffre verrouillé à distance.'),
      ],
    },
  },
};
