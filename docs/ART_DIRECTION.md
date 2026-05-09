# Direction artistique — défauts (à raffiner en atelier)

> ⚠️ **Statut** : valeurs **par défaut** posées pour débloquer le développement du PoC.
> Toutes ces décisions sont à valider en atelier dédié avant d'investir sur des assets.

## Palette
- **Référence** : [Endesga-32](https://lospec.com/palette-list/endesga-32) (CC0). 32 couleurs, contraste fort, néons bien gérés — adaptée au ton cyberpunk du Casse de la Banque Lune.
- **Couleurs accent du jeu** :
  - Or néon `#ffcc66` (titres, actions)
  - Cyan `#5fcde4` (UI froide, hacker)
  - Magenta `#dc2363` (alerte, infiltré)
  - Fond profond `#0b0d10` (canvas)

## Résolution & tile
- **Tile size** : `16 × 16 px`.
- **Canvas logique** : `320 × 180 px` (16:9), scalé en `1280 × 720` (×4) — déjà la résolution Phaser configurée dans `GameEngine`.
- Mode de scaling : `Phaser.Scale.FIT` + `autoCenter`.

## Typographie
- **Titres / UI principale** : [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (OFL).
- **Texte courant** : `monospace` système (fallback) — à remplacer par une pixel font lisible quand on aura plus de texte (m6x11, Pixeloid, Departure Mono à évaluer).
- ⚠️ Vérifier la licence avant d'embarquer une font dans le repo.

## Pipeline d'assets
- **Outil de création** : [Aseprite](https://www.aseprite.org/) (recommandé, pas obligatoire).
- **Format de sortie** : PNG individuels par sprite **ou** atlas JSON (Phaser charge les deux). À choisir aventure par aventure selon la quantité.
- **Naming convention** : `<role-ou-objet>-<action>-<frame>.png`
  - ex: `hacker-idle-01.png`, `coffre-locked.png`, `door-opening-04.png`
- **Emplacement** : `src/adventures/<id>/assets/`. Ne **jamais** mettre d'assets propres à une aventure dans `public/`.
- **Audio** : `src/adventures/<id>/assets/audio/`, format OGG (taille) avec fallback MP3 si nécessaire.

## Moodboard
À constituer en atelier. Pistes :
- Films : *Blade Runner*, *Mr. Robot*, *Ghost in the Shell*, *Heat*.
- Jeux pixel art cyberpunk : *Va-11 Hall-A*, *Katana ZERO*, *The Red Strings Club*, *Citizen Sleeper*.

## À décider (atelier)
- [ ] Confirmer ou changer la palette (Endesga-32 vs custom restreinte).
- [ ] Style de personnage : silhouette + détail vs sprite plein.
- [ ] Cycle d'animation idle (combien de frames ?).
- [ ] Lumière : ambiances par pièce (lobby = bleu froid, couloir = rouge alerte, coffre = doré).
- [ ] Sound design : score continu vs ambiances par pièce.

## Non-objectifs (pour l'instant)
- Animation fluide AAA — on assume du sprite « propre 8-12 fps ».
- Réactivité aux entrées tactiles avancées (ex. multitouch) — l'app est pensée pour 1 doigt à la fois.
