export type RoleId = 'hacker' | 'ingenieur' | 'acrobate' | 'stratege' | 'infiltre';

export type RoomId = 'entree' | 'couloir' | 'coffre';

export interface RoleAction {
  id: string;
  label: string;
  /** Effet textuel résumé pour le récap final. */
  outcome: string;
  /** true = action de sabotage (déclenche l'alarme). Réservée à l'infiltré. */
  sabotage?: boolean;
}

export interface Role {
  id: RoleId;
  name: string;
  description: string;
  /** Couleur d'accent UI (hex). */
  color: string;
  isInfiltre: boolean;
  /** Actions disponibles par pièce. L'infiltré a une action de sabotage par pièce en plus. */
  actionsByRoom: Record<RoomId, RoleAction[]>;
}
