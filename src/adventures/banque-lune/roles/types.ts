export type RoleId = 'hacker' | 'faussaire' | 'infiltre' | 'negociateur' | 'observateur';

export type RoomId = 'entree' | 'couloir' | 'coffre';

export interface RoleAction {
  id: string;
  label: string;
  /** Effet textuel résumé pour le récap final. */
  outcome: string;
  /** true = action de sabotage (déclenche l'alarme). Réservée à l'infiltré·e. */
  sabotage?: boolean;
}

export interface Role {
  id: RoleId;
  name: string;
  description: string;
  /** Couleur d'accent UI (hex), alignée sur la DA bible (ART.md §4). */
  color: string;
  isInfiltre: boolean;
  /** Actions disponibles par pièce. L'infiltré·e a une action de sabotage par pièce en plus. */
  actionsByRoom: Record<RoomId, RoleAction[]>;
}
