/**
 * Contenu privé révélé à un joueur.
 */
export interface PrivateContent {
  title: string;
  body: string;
  /** Couleur d'accent CSS (titre, encadré). Optionnel. */
  accentColor?: string;
}

export interface PrivateChoice {
  id: string;
  label: string;
  /** Note discrète sous le bouton. */
  hint?: string;
  /** Marquer une action comme dangereuse / sabotage (style alerte). */
  danger?: boolean;
}

/**
 * "Tour son écran" : un joueur consulte une information privée (rôle, indice...)
 * ou choisit une action en privé pendant que les autres détournent le regard.
 */
export interface PrivateView {
  /** Révèle un contenu informatif. La promesse résout quand le joueur a tapé "J'ai vu". */
  reveal(playerName: string, content: PrivateContent): Promise<void>;

  /** Affiche un contenu + un choix d'options. La promesse résout avec l'id choisi. */
  pickAction(
    playerName: string,
    content: PrivateContent,
    options: ReadonlyArray<PrivateChoice>,
  ): Promise<string>;

  /** Ferme l'overlay si une révélation est en cours (interruption d'urgence). */
  close(): void;
}
