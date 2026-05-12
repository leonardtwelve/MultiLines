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
Squelette PoC mono-device livré en M1. **Post-pivot Jackbox (12 mai 2026)** :
- L'état de la partie passe **côté serveur** (D7 amendée, F17). Le singleton local
  `state.ts` est archivé dans `archive/pre-pivot-jackbox-2026-05-12`.
- La distribution des rôles et la révélation se feront via le serveur + smartphone
  Player (G5 amendée, F10). Voir issues #41 (impl actions) et #61 (state machine serveur).
- Le plateau passe en **map continue tile-based 40×20** (F12-F15). L'ancien `BoardScene`
  (zones discrètes) est archivé.

DA bible v1.0 figée — voir [`ART.md`](./ART.md). Sprites pixel art à produire en M2.

## Structure du dossier (post-PR #68)
- `manifest.ts` — métadonnées (titre, joueurs, durée, ton).
- `index.ts` — implémentation du contrat `Adventure` (stub transitoire, refonte en Prompt 3).
- `resolution.ts` — config 2d6 (G8) du résolveur de risque.
- `roles/` — types + définitions des 5 rôles + algo de distribution (refonte côté serveur).
- `objectives/` — 30 objectifs privés + algo de tirage (G10).
- `pactes/` — types + 3 templates de Pacte secret (G9).
- `scenes/` — placeholder Phaser : `ResultScene` uniquement (BoardScene archivé).
- `assets/` — sprites, sons, dialogues (à produire en M2).
- `ART.md` — direction artistique de l'aventure.

> ⚠️ Note structurelle : post-merge de la PR #68, ce dossier vit à `packages/front/adventures/banque-lune/` (F16).
