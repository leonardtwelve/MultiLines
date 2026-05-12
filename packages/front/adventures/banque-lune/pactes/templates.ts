import type { PacteTemplateId } from './types';

/**
 * Métadonnées d'affichage des 3 templates fixes (G9, GAMEPLAY.md §8.2-8.4).
 *
 * Pas de logique ici — voir `templates.ts` est purement déclaratif.
 * La résolution mécanique (acceptation, calcul de gains) vient avec #41.
 */
export interface PacteTemplate {
  id: PacteTemplateId;
  emoji: string;
  name: string;
  /** Brève phrase de proposition affichée à la cible. */
  description: string;
  /** Détails complets affichés en consultation. */
  details: string;
  /** À quel moment la résolution mécanique s'applique. */
  resolvesAt: 'on-accept' | 'act-3';
}

export const PACTE_TEMPLATES: Readonly<Record<PacteTemplateId, PacteTemplate>> = {
  loyalty: {
    id: 'loyalty',
    emoji: '🤝',
    name: 'Pacte de loyauté',
    description: 'On vote tous les deux Loyal à la fin.',
    details:
      "Si tous les deux votent Loyal à l'acte 3 : +1 Crédit converti en butin pour chacun. Si un des deux trahit, celui qui a tenu reçoit 1 Crédit de compensation. Aucune pénalité système pour celui qui a rompu.",
    resolvesAt: 'act-3',
  },
  exchange: {
    id: 'exchange',
    emoji: '💰',
    name: 'Échange direct',
    description: 'Je te donne X, tu me donnes Y (Crédits ou Dossiers).',
    details:
      "Transfert immédiat des termes négociés à l'acceptation. Pacte clos instantanément. Aucune conséquence à l'acte 3.",
    resolvesAt: 'on-accept',
  },
  protection: {
    id: 'protection',
    emoji: '🛡️',
    name: 'Protection de vote allégée',
    description: "Si tu votes Trahir, j'annule mon propre vote.",
    details:
      "Si la cible vote Trahir : le vote du Négociateur compte comme abstention (½ part Loyal). Si la cible vote Loyal : pacte caduc, vote libre. La cible peut racheter sa liberté avant le vote pour 5 Crédits.",
    resolvesAt: 'act-3',
  },
};
