/**
 * Rôles de l'aventure « Le Casse de la Banque Lune ».
 *
 * Définition serveur — version alignée sur GAMEPLAY.md §5 (3 actions
 * principales + 1 capacité passive par rôle). Ne PAS confondre avec
 * la structure legacy `actionsByRoom` du PoC mono-device (côté front),
 * dépréciée et à supprimer en 3e-2.
 *
 * Couleurs alignées avec la DA bible (ART.md §4).
 */

import type { PlayerId } from '@pixel-quests/shared';

export type RoleId = 'hacker' | 'faussaire' | 'infiltre' | 'negociateur' | 'observateur';

export type ActionRisk = 'low' | 'medium' | 'high';

export interface RoleAction {
  /** Identifiant utilisé dans `action.propose` côté protocole. */
  id: string;
  /** Libellé FR pour les UI. */
  label: string;
  /** Niveau de risque (impacte le 2d6 — cf. GAMEPLAY §4.3). */
  risk: ActionRisk;
  /** Marque l'action « emblématique » du rôle (G2). UI peut la mettre en valeur. */
  emblematic?: boolean;
  /** Note descriptive (visible UI au survol / aide). */
  description: string;
}

export interface Role {
  id: RoleId;
  /** Libellé FR pour les UI. */
  name: string;
  /** Couleur d'accent UI (hex), alignée sur ART.md §4. */
  color: string;
  /** Description courte pour le briefing Player. */
  description: string;
  /**
   * Capacité passive du rôle — texte affiché au briefing. Pas
   * d'effet runtime à ce stade (slice 3e-2 implémentera la mécanique).
   */
  passive: { label: string; description: string };
  /** 3 actions principales (G2). */
  actions: ReadonlyArray<RoleAction>;
}

export const ROLES: Readonly<Record<RoleId, Role>> = {
  hacker: {
    id: 'hacker',
    name: 'Hacker',
    color: '#3affc7',
    description:
      "Maîtrise des systèmes numériques. Voit ce que les autres ne voient pas. Influence à distance.",
    passive: {
      label: 'Vision réseau',
      description:
        "Consulte une fois par tour la jauge d'alerte avec une granularité fine.",
    },
    actions: [
      {
        id: 'intrusion-systeme',
        label: 'Intrusion système',
        risk: 'medium',
        description: 'Désactive temporairement une caméra/capteur (1 tour).',
      },
      {
        id: 'collecte-donnees',
        label: 'Collecte de données',
        risk: 'low',
        description: 'Récupère des Crédits, ~30% chance de produire un Dossier à la place.',
      },
      {
        id: 'surcharge',
        label: 'Surcharge',
        risk: 'high',
        emblematic: true,
        description: 'Court-circuite un système majeur. Débloque une zone autrement inaccessible.',
      },
    ],
  },
  faussaire: {
    id: 'faussaire',
    name: 'Faussaire',
    color: '#ffc83a',
    description: 'Maître des faux papiers, des tromperies physiques, de la valeur transformée.',
    passive: {
      label: "Œil d'expert",
      description: 'Voit la vraie valeur du butin que les autres voient en estimation floue.',
    },
    actions: [
      {
        id: 'faux-ordre',
        label: 'Faux ordre',
        risk: 'low',
        description: 'Génère un faux document qui débloque une porte ou trompe un PNJ.',
      },
      {
        id: 'substitution',
        label: 'Substitution',
        risk: 'low',
        description:
          'Place un faux dans le coffre à la place d’un lot. Crée du flou informationnel.',
      },
      {
        id: 'authentifier',
        label: 'Authentifier',
        risk: 'low',
        emblematic: true,
        description:
          'Évalue précisément un lot de butin. Vraie valeur révélée à toi seul. Peut mentir.',
      },
    ],
  },
  infiltre: {
    id: 'infiltre',
    name: 'Infiltré·e',
    color: '#c93aff',
    description: 'Présence physique dans la banque, accès aux zones interdites.',
    passive: {
      label: 'Couverture',
      description: "Tes actions ratées font monter la jauge d'alerte de moitié.",
    },
    actions: [
      {
        id: 'reconnaissance',
        label: 'Reconnaissance',
        risk: 'low',
        description:
          "Explore une nouvelle zone, révèle son contenu pour tous. Peut découvrir un Dossier.",
      },
      {
        id: 'detournement-garde',
        label: 'Détournement de garde',
        risk: 'medium',
        description: 'Occupe un PNJ pendant un tour. Permet à d’autres d’agir sans risque.',
      },
      {
        id: 'crochetage',
        label: 'Crochetage',
        risk: 'medium',
        emblematic: true,
        description: 'Ouvre un coffre/porte sécurisée physiquement (sans Hacker). Plus lent.',
      },
    ],
  },
  negociateur: {
    id: 'negociateur',
    name: 'Négociateur·rice',
    color: '#ff3a82',
    description: 'La voix, les deals. Manipule par la parole.',
    passive: {
      label: 'Magnétisme',
      description:
        "Une fois par tour, modifie le résultat d'un dé d'un autre joueur de ±1 contre 1 Crédit.",
    },
    actions: [
      {
        id: 'persuader-pnj',
        label: 'Persuader un PNJ',
        risk: 'medium',
        description: 'Évite un événement Sécurité en parlant.',
      },
      {
        id: 'marchandage',
        label: 'Marchandage',
        risk: 'low',
        description: 'Augmente la valeur d’un lot de butin déjà collecté.',
      },
      {
        id: 'pacte-secret',
        label: 'Pacte secret',
        risk: 'low',
        emblematic: true,
        description: 'Propose un pacte privé à un autre joueur, parmi 3 templates cadrés.',
      },
    ],
  },
  observateur: {
    id: 'observateur',
    name: 'Observateur',
    color: '#85b7eb',
    description:
      'Pilote un drone furtif depuis l’extérieur. Vue tactique du layout. Drone à 3 PV.',
    passive: {
      label: 'Vue tactique',
      description: 'Voit tout le layout révélé même hors zone du drone. Sait où sont PNJ/caméras.',
    },
    actions: [
      {
        id: 'reconnaissance-drone',
        label: 'Reconnaissance drone',
        risk: 'low',
        description: 'Déplace le drone, révèle une zone sans risque pour les avatars humains.',
      },
      {
        id: 'brouillage',
        label: 'Brouillage',
        risk: 'medium',
        description: 'Zone large aveuglée (caméras + capteurs) pendant 1 tour. Drone détectable.',
      },
      {
        id: 'oeil-dans-le-ciel',
        label: 'Œil dans le ciel',
        risk: 'low',
        emblematic: true,
        description: 'Marque une cible. Bonus 2 tours sur toutes les actions des autres dessus.',
      },
    ],
  },
};

/** Composition d'équipe selon le nombre de joueurs (cf. G7). */
const ROLES_BY_PLAYER_COUNT: Readonly<Record<1 | 2 | 3 | 4 | 5, ReadonlyArray<RoleId>>> = {
  // Compositions DEV / SOLO — non-canoniques (G7 dit 3+ minimum), mais
  // utiles pour playtest solo / debug avec DEV_ALLOW_SOLO=true côté
  // serveur. On donne le Hacker en priorité parce qu'il a Surcharge,
  // l'action emblématique la plus visible pour une démo en local.
  1: ['hacker'],
  2: ['hacker', 'faussaire'],
  // Canoniques (G7) :
  3: ['hacker', 'faussaire', 'infiltre'],
  4: ['hacker', 'faussaire', 'infiltre', 'negociateur'],
  5: ['hacker', 'faussaire', 'infiltre', 'negociateur', 'observateur'],
};

export class InvalidPlayerCountError extends Error {
  constructor(count: number) {
    super(`Banque Lune nécessite 1 à 5 joueurs (reçu : ${count})`);
    this.name = 'InvalidPlayerCountError';
  }
}

/**
 * Distribue les rôles aux joueurs (aléatoire mais reproductible via `rng`).
 * Renvoie une `Map<PlayerId, RoleId>`. Lève `InvalidPlayerCountError` si
 * `playerIds.length` n'est pas dans [1, 5].
 *
 * **Compositions canoniques** (G7) : 3, 4, 5 joueurs.
 * **Compositions DEV/SOLO** : 1, 2 joueurs — réservées au playtest
 * activé par `DEV_ALLOW_SOLO=true` côté serveur. La validation upstream
 * (validateGameStart) refuse 1-2 joueurs sans ce flag.
 */
export function distributeRoles(
  playerIds: ReadonlyArray<PlayerId>,
  rng: () => number = Math.random,
): Map<PlayerId, RoleId> {
  const count = playerIds.length;
  if (count < 1 || count > 5) {
    throw new InvalidPlayerCountError(count);
  }
  const pool = [...ROLES_BY_PLAYER_COUNT[count as 1 | 2 | 3 | 4 | 5]];
  shuffleInPlace(pool, rng);
  const out = new Map<PlayerId, RoleId>();
  playerIds.forEach((pid, i) => out.set(pid, pool[i]));
  return out;
}

/**
 * Retourne la liste des `actionId` autorisés pour un rôle. Utilisée par
 * la state machine pour valider qu'une `action.propose` est dans les
 * capabilities du joueur (cf. server-state-machine §4 anti-triche).
 */
export function capabilitiesOf(roleId: RoleId): ReadonlyArray<string> {
  return ROLES[roleId].actions.map((a) => a.id);
}

// === Helpers ===

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
}

/**
 * RNG seedable simple (LCG). Suffisant pour distribuer aléatoirement
 * des rôles. Pour des besoins cryptographiques, utiliser
 * `crypto.randomInt`.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
