/**
 * Types du Pacte secret du Négociateur·rice (G9, GAMEPLAY.md §8).
 *
 * Cette PR pose la **structure de données seule**. La logique de proposition,
 * d'acceptation, de rachat (Protection) et de résolution à l'acte 3 sera
 * implémentée dans #41 (Implémentation des actions des 5 rôles).
 */

export type PacteTemplateId = 'loyalty' | 'exchange' | 'protection';

/**
 * Statut d'un Pacte au cours de la partie.
 *
 * - `proposed` : émis par le Négociateur, en attente de la réponse de la cible.
 * - `accepted` : confirmé par la cible. En vigueur.
 * - `declined` : refusé par la cible. Le coût d'émission n'est PAS remboursé
 *   (cf. §8.1 : `Si la cible refuse — Pacte annulé sans coût supplémentaire`).
 *   Cependant le Crédit d'émission a déjà été dépensé : il est perdu.
 * - `redeemed` : Pacte de Protection racheté par la cible (5 Crédits, §8.4).
 *   Le Négociateur retrouve sa liberté de vote ; pacte clos.
 * - `fulfilled` : conditions du Pacte satisfaites à l'acte 3.
 * - `broken` : conditions non respectées à l'acte 3.
 */
export type PacteStatus =
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'redeemed'
  | 'fulfilled'
  | 'broken';

/** Termes — Template 1 : Pacte de loyauté. */
export interface PacteTermsLoyalty {
  templateId: 'loyalty';
}

/** Termes — Template 2 : Échange direct (Crédits et/ou Dossiers). */
export interface PacteTermsExchange {
  templateId: 'exchange';
  /** Ce que le proposeur (Négociateur) donne. */
  giver: { credits?: number; dossierIds?: ReadonlyArray<string> };
  /** Ce que la cible donne en retour. */
  receiver: { credits?: number; dossierIds?: ReadonlyArray<string> };
}

/** Termes — Template 3 : Protection de vote allégée. */
export interface PacteTermsProtection {
  templateId: 'protection';
}

export type PacteTerms = PacteTermsLoyalty | PacteTermsExchange | PacteTermsProtection;

export interface Pacte {
  id: string;
  proposerId: string;
  targetId: string;
  terms: PacteTerms;
  status: PacteStatus;
  /** Tour acte 2 où le Pacte a été émis (0 = acte 1, jamais en pratique). */
  proposedAtTurn: number;
}

// --- Constantes économiques (cf. §8.1, §8.2, §8.4) ---

/** Limite de Pactes par partie, toutes templates confondues (§8.1). */
export const MAX_PACTES_PER_GAME = 3;

/** Coût pour proposer un Pacte (anti-spam, §8.1). */
export const PACTE_PROPOSAL_COST_CREDITS = 1;

/** Coût pour racheter un Pacte de Protection (cible, §8.4). */
export const PACTE_PROTECTION_REDEEM_COST_CREDITS = 5;

/** Récompense en Crédits convertis en butin par participant si Pacte de Loyauté tenu (§8.2). */
export const PACTE_LOYALTY_REWARD_KEPT = 1;

/** Compensation pour celui qui a tenu sa parole quand le Pacte de Loyauté est rompu (§8.2). */
export const PACTE_LOYALTY_COMPENSATION_BROKEN = 1;
