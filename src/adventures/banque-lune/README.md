# Le Casse de la Banque Lune

Aventure cyberpunk lunaire pour 3 à 5 joueurs, ~35 min, ton malicieux.

## Pitch
2099. La Banque Lune — citadelle financière du secteur 07 — abrite les coffres-forts privés de la haute société terrienne. Une équipe de spécialistes a une nuit pour s'y introduire. Mais l'un d'eux est un infiltré.

## Rôles asymétriques (alignés sur la DA bible)
- **Hacker** (cyan) — casse serrures électroniques et caméras.
- **Faussaire** (ambre) — falsifie badges, sceaux et signatures.
- **Infiltré·e** (magenta) — agent double dans l'uniforme de la banque ; aide ou sabote.
- **Négociateur·rice** (rose) — distrait, parlemente, désamorce.
- **Observateur** (bleu glacé) — extérieur, prépare et exécute l'extraction.

Composition selon le nombre de joueurs :
- **3** : Hacker + Faussaire + Infiltré·e
- **4** : + Négociateur·rice
- **5** : + Observateur (le seul rôle "extérieur")

## Statut
Squelette jouable bout-en-bout (PoC). DA bible v1.0 figée — voir [`ART.md`](./ART.md).
Sprites pixel art à produire en M2.

## Structure du dossier
- `manifest.ts` — métadonnées (titre, joueurs, durée, ton).
- `index.ts` — implémentation du contrat `Adventure`.
- `state.ts` — contexte de partie partagé entre les scènes Phaser.
- `scenes/` — scènes Phaser (Entrée, Couloir, Coffre, Result).
- `roles/` — types, définitions, distribution.
- `assets/` — sprites, sons, dialogues (à produire en M2).
- `ART.md` — direction artistique de l'aventure.
