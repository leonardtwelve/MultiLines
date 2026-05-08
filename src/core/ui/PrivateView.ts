/**
 * "Tour son écran" : un joueur consulte une information privée pendant que les autres
 * détournent le regard. Le contrat est volontairement minimaliste — l'aventure décide
 * du rendu (carte, rôle, indice...).
 */
export interface PrivateView {
  open(playerId: string, content: string): Promise<void>;
  close(): void;
}
