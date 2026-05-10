# DA Bible — Le Casse de la Banque Lune

> Document de référence pour la direction artistique de l'aventure "Le Casse de la Banque Lune", première aventure de la plateforme Pixel Quests.
>
> Toute production visuelle (sprites, écrans, animations, UI) doit respecter ce document. Tout écart doit faire l'objet d'une mise à jour de cette bible.
>
> Statut : v1.0 — figé en M1 après itérations
> À mettre à jour au fil des productions et des playtests

---

## 1. Vision artistique

### 1.1 La promesse en une phrase

> Une **maquette vivante** vue du dessus, où le plateau de jeu et le jeu vidéo fusionnent : les joueurs voient un environnement cyberpunk respirant comme un mini-monde, mais le lisent et l'interprètent comme un plateau partagé.

### 1.2 Positionnement créatif

Pixel art **rétro moderne** (16/32-bits, pas pur 8-bits) au service d'un jeu hybride :

- **Côté plateau** : vue de dessus orthogonale, salles lisibles, pions reconnaissables à 3 mètres, tableau de bord clair, codes couleurs forts par rôle.
- **Côté jeu vidéo** : animations ambiantes discrètes mais permanentes (écrans qui clignotent, alerte qui pulse, ambiance qui évolue), sprites 3/4 avec volume, profondeur lumineuse.
- **Le pont** : tout ce qui est animé a une fonction de jeu (pas de décoration gratuite). Tout ce qui est statique reste lisible comme un plateau.

### 1.3 Univers narratif

- **Époque** : 2099, monde cyberpunk
- **Lieu** : Banque Lune, secteur 07 d'une mégalopole asiatique-nord-américaine
- **Action** : un casse coordonné par 3 à 5 spécialistes, en pleine nuit, durée 30-45 min
- **Ambiance** : malicieuse et tendue. On rigole, on suspecte, on trahit, on triomphe.

### 1.4 Références maîtresses

| Référence            | Ce qu'on retient                          | Ce qu'on ne reprend pas      |
|----------------------|-------------------------------------------|------------------------------|
| Loop Hero            | Lisibilité top-down, UI riche, palette    | Le côté médiéval             |
| Hotline Miami        | Énergie, sprites 3/4, violence stylisée   | La gore, le néon outré       |
| Mindustry            | Clarté du plateau, indicateurs            | Le côté usine froide         |
| Cyberpunk: Edgerunners | Palette néon, tension urbaine           | L'animation 3D fluide        |
| VA-11 Hall-A         | UI cyberpunk chill, polices, ambiance     | Le format dialogue uniquement |

---

## 2. Spécifications techniques

### 2.1 Vue et perspective

- **Vue de dessus orthogonale** (90° vertical strict)
- Sprites de personnages rendus en **top-down 3/4** : on voit la tête, les épaules, légèrement le buste — on n'est pas en *strict* top-down (qui ne montrerait que le crâne)
- La carte (décors, mobilier) est rendue à plat, pas en perspective

### 2.2 Résolution et tailles

- **Tile de référence** : 32×32 pixels (unité de la grille du plateau)
- **Sprites de personnages** : 48×48 pixels (légèrement plus grand que la tile, pour qu'ils dominent visuellement leur case)
- **Sprites de PNJ** (gardes, civils) : 32×32 pixels (plus petits, car secondaires)
- **Tilesets de décor** : 32×32 pixels par tile
- **Mobilier large** (coffre, comptoir) : multiples de 32 (64×32, 64×64, etc.)

### 2.3 Directions et animations par personnage

- **4 directions** : haut, bas, gauche, droite
  (les diagonales sont gérées par interpolation visuelle pendant les déplacements, pas par sprite dédié)
- **Animations standard par rôle** :
  - Idle : 2 frames (légère respiration)
  - Marche : 4 frames par direction, soit 16 sprites de marche par rôle
  - Action : 3-4 frames spécifiques au rôle (hack, infiltration…), une seule direction (face à l'objectif)
- **Total estimé par rôle** : ~25-30 sprites
- **Total pour les 5 rôles du Casse** : ~125-150 sprites

### 2.4 Format de production

- **Outil** : Aseprite (standard, voir D6 dans `DECISIONS.md`)
- **Export** : sprite atlas PNG + JSON Hash compatible Phaser 3
- **Convention de nommage** :
  - Fichier source : `{role}.aseprite`
  - Atlas exporté : `{role}_atlas.png` + `{role}_atlas.json`
  - Animations dans l'atlas : `{role}_idle`, `{role}_walk_north`, `{role}_walk_south`, `{role}_walk_east`, `{role}_walk_west`, `{role}_action`
- **Anti-aliasing** : aucun. Pixel art rendu net, `Phaser.Scale.NEAREST`.
- **Background des sprites** : transparent (PNG-32)

### 2.5 Aspect ratio et résolution écran

- **Cible primaire** : tablette 10" en paysage, 16:9
- **Résolution interne du jeu** : 480×270 pixels, scalée par 2x ou 3x selon l'écran (donne 960×540 ou 1440×810)
- **Safe zone UI** : 16:9 strict, mais éléments critiques rentrent aussi en 4:3 (iPad classique)

---

## 3. Palette de couleurs

### 3.1 Palette plateforme (héritée, à confirmer)

À définir dans `CHARTE_VISUELLE_PLATEFORME.md`. Pour le Casse, on utilise pour les éléments d'UI partagés.

### 3.2 Palette spécifique Casse de la Banque Lune

#### Fonds et environnement

| Rôle                    | Hex       | Usage                                         |
|-------------------------|-----------|-----------------------------------------------|
| Nuit profonde           | `#0a0e1a` | Fond général, hors-carte                      |
| Bleu nocturne           | `#11182b` | Fond du tableau de bord                       |
| Sol banque sombre       | `#1a1f33` | Tile de sol principale                        |
| Sol banque alternatif   | `#1e2540` | Tile de sol damier (alternance)               |
| Mur bleu acier          | `#252d45` | Murs et structures principales                |
| Outline grise-bleue     | `#3a4565` | Bordures de salles, lignes de grille          |
| Texte secondaire        | `#7a85a5` | Légendes UI, états neutres                    |

#### Néons et accents

| Rôle                       | Hex       | Usage                                              |
|----------------------------|-----------|----------------------------------------------------|
| Cyan tech                  | `#3affc7` | Hacker, succès, données, indicateurs OK            |
| Magenta serveurs           | `#c93aff` | Infiltré, systèmes, écrans de données              |
| Rose alerte                | `#ff3a82` | Négociateur, alertes, danger immédiat              |
| Ambre butin                | `#ffc83a` | Faussaire, butin, gloire, succès financier         |
| Doré chaud                 | `#ffb648` | Lumière naturelle, lobby                           |
| Rouge laser                | `#ff1a40` | Lasers de sécurité, alarme niveau max              |

#### Règles d'usage

- **Une couleur = une fonction**. Le cyan dit "tech / OK / Hacker". Le rose dit "alerte / Négociateur / urgence". On ne mélange jamais.
- **Maximum 2 néons forts simultanés** sur un écran. Sinon ça devient illisible.
- **Le doré est rare** : il marque les moments de gloire (ouverture du coffre, partage du butin).
- **Le rouge laser** ne sort que lors des alertes critiques (jauge > 80%).

### 3.3 Couleurs sémantiques d'UI

Les éléments d'interface (boutons, jauges, icônes) suivent une convention sémantique stricte indépendante des néons d'ambiance :

| Sens          | Hex       | Usage                                  |
|---------------|-----------|----------------------------------------|
| Succès        | `#3affc7` | Confirmation, action réussie            |
| Échec         | `#ff3a82` | Erreur, action ratée                    |
| Avertissement | `#ffc83a` | Risque, choix limite                    |
| Information   | `#85b7eb` | Tutorial, info contextuelle             |
| Neutre        | `#7a85a5` | Désactivé, en attente                   |

---

## 4. Identité des 5 rôles

Chaque rôle a une **palette personnelle de 4 couleurs** (peau, vêtement principal, vêtement secondaire, accent). Le code couleur principal est repris dans l'UI pour identifier le joueur.

### 4.1 Hacker — couleur principale `#3affc7` (cyan)

- **Silhouette** : corps fin, visière sur les yeux, sac à dos avec antenne
- **Élément distinctif** : visière cyan luminescente
- **Personnalité visuelle** : nerveux, geek, jeune
- **Palette** : peau `#d4a87c`, capuche bleu nuit `#1a3540`, vêtement cyan `#3affc7`, accent terminal `#0a0e1a`

### 4.2 Faussaire — couleur principale `#ffc83a` (ambre)

- **Silhouette** : élégant·e, longue veste, mallette à la main
- **Élément distinctif** : mallette dorée et chapeau / bonnet stylé
- **Personnalité visuelle** : raffiné, bourgeois décadent
- **Palette** : peau `#d4a87c`, manteau brun `#5a3a14`, gilet ambre `#ffc83a`, mallette `#ffb648`

### 4.3 Infiltré·e — couleur principale `#c93aff` (magenta)

- **Silhouette** : uniforme d'employé de banque (déguisement), badge visible
- **Élément distinctif** : badge magenta clignotant subtilement
- **Personnalité visuelle** : passe inaperçu·e, regard inquiet
- **Palette** : peau `#d4a87c`, costume sombre `#2a1838`, chemise blanche `#f0f0f8`, badge `#c93aff`

### 4.4 Négociateur·rice — couleur principale `#ff3a82` (rose)

- **Silhouette** : posture droite, oreillette visible, micro
- **Élément distinctif** : casque-micro rose pulsant quand iel parle
- **Personnalité visuelle** : charismatique, en contrôle
- **Palette** : peau `#d4a87c`, blazer noir `#1a1f33`, écharpe rose `#ff3a82`, oreillette `#ff7eaa`

### 4.5 Conducteur·rice — couleur principale `#85b7eb` (bleu glacé) — *à valider*

- **Silhouette** : casque de moto ou bonnet, tenue technique
- **Élément distinctif** : clés ou télécommande de van à la main
- **Personnalité visuelle** : pragmatique, attentif·ve, externe à l'action
- **Palette** : peau `#d4a87c`, blouson `#252d45`, accent glacé `#85b7eb`, gants noirs

> Note : Conducteur·rice est positionné·e à l'extérieur de la banque pour la majorité de la partie, donc moins visible mais avec une fonction stratégique forte. Sa palette tranche avec les 4 néons des autres rôles, justement parce qu'iel n'est pas dans la même action.

---

## 5. Typographie

### 5.1 Système à deux polices

**Press Start 2P** — pour l'affichage et l'impact

- Titre du jeu sur l'écran d'accueil
- Gros chiffres du HUD (montant du butin, compte à rebours)
- Boutons principaux ("LANCER", "CONFIRMER")
- Titres de sections / écrans
- Effets de fin (VICTOIRE, ÉCHEC)
- Toujours en MAJUSCULES (la police le rend mieux ainsi)

**m5x7** (ou m6x11 pour les écrans denses) — pour la lecture

- Dialogues entre personnages
- Briefings de mission
- Descriptions des rôles (sur l'écran de setup)
- Événements scénarisés ("Une patrouille arrive dans 2 tours")
- Tooltips, légendes UI, statistiques détaillées
- Casse normale (lisibilité maximale)

### 5.2 Tailles standard

| Usage                         | Police         | Taille          |
|-------------------------------|----------------|-----------------|
| Titre principal (accueil)     | Press Start 2P | 32 px           |
| Titre de section              | Press Start 2P | 16 px           |
| Boutons primaires             | Press Start 2P | 12 px           |
| Gros chiffres HUD             | Press Start 2P | 24 px           |
| Texte courant                 | m5x7           | 16 px           |
| Dialogue                      | m5x7           | 16 px           |
| Légende UI                    | m5x7           | 12 px           |
| Tooltip                       | m5x7           | 11 px           |

### 5.3 Licences

- Press Start 2P : OFL (Open Font License) — gratuit, usage commercial autorisé
- m5x7 / m6x11 : Daniel Linssen, gratuit, usage commercial autorisé

À vérifier au moment de l'intégration et conserver les notices de licence dans `src/adventures/banque-lune/assets/fonts/LICENSES.txt`.

---

## 6. Animations et vie ambiante

### 6.1 Principe directeur

**Animations discrètes mais permanentes**. Aucune animation gratuite : chaque effet animé porte une information de jeu.

### 6.2 Animations ambiantes (en boucle)

| Élément                   | Animation                                    | Fréquence              |
|---------------------------|----------------------------------------------|------------------------|
| Écrans de serveurs        | Lignes de "données" qui défilent             | Continue, 2 sec/cycle  |
| Néons des salles          | Légère variation d'intensité (±10%)          | Continue, 4 sec/cycle  |
| Voyant ALERT (UI)         | Clignotement rouge                           | Continue, 1.2 sec/cycle |
| PNJ patrouilles           | Marche en boucle sur trajet pré-défini        | Continue               |
| Ventilation               | Pixels lumineux flottants discrets            | Très lent, 8 sec/cycle |

### 6.3 Animations contextuelles (déclenchées)

| Événement                       | Animation                                          |
|---------------------------------|----------------------------------------------------|
| Tour qui démarre                | Pulsation cyan autour du joueur actif (3 cycles)   |
| Action réussie (hack ok)        | Flash cyan de 0.3 sec sur l'objectif               |
| Action ratée                    | Flash rose de 0.3 sec + petit shake (2 px)        |
| Alerte qui monte                | Pulsation rouge progressive sur le voyant         |
| Coffre ouvert (moment de gloire)| Particules dorées + ralenti 1 sec                  |
| Patrouille arrivée              | Apparition du PNJ avec fade-in + son              |

### 6.4 Ambiance lumineuse évolutive

L'éclairage global de la scène évolue avec la jauge d'alerte :

- **0–30%** (cool) : tons bleus dominants, néons cyan/magenta équilibrés, pas de variation
- **31–60%** (tendu) : températures froides s'accentuent, légère vibration des néons, shake léger lors d'événements
- **61–80%** (chaud) : teinte rouge subtile sur les ombres, voyants qui clignotent plus vite
- **81–100%** (critique) : flash rouge périodique sur toute la scène, lasers de sécurité visibles, shake permanent

### 6.5 Non-objectifs explicites

Pour ne pas dériver :

- **Pas de pluie permanente** (trop chargé visuellement, distrait du gameplay)
- **Pas de réflexions complexes** (coût de prod et perfs)
- **Pas de cinématique en plein écran** (on reste sur la maquette tout le temps, c'est ce qui fait la promesse)
- **Pas de zoom dynamique** (la caméra ne bouge pas, c'est un plateau)

---

## 7. Direction sonore

### 7.1 Esthétique

**Lo-fi futuriste / chill cyberpunk** — référence : la radio jazz de *Cyberpunk 2077*, *VA-11 Hall-A*, *The Red Strings Club*.

Beats lents, synthés rêveurs, samples de saxophone ou piano feutré. Pas d'agressivité gratuite, même dans les phases tendues. La tension vient du gameplay, pas de la musique.

### 7.2 Couches sonores

**Musique de fond** (boucle 2-3 min, transition douce entre niveaux) :

- Couche calme : pour 0-50% d'alerte
- Couche tendue : pour 51-80% (ajout de basses, rythme plus marqué)
- Couche critique : pour 81-100% (cuts plus secs, urgence sans cassure du style)

**Ambiance constante** :

- Bruit blanc urbain léger (vent, climatisation distante)
- Bourdonnement électrique des néons
- Ronronnement des serveurs

**SFX d'action** (sons brefs, pixel-art adaptés) :

- Hack en cours / réussi / échoué
- Pas du joueur sur le sol
- Bip de badge, de console
- Cri d'alerte des gardes
- Clic des boutons UI
- Notification de tour

**SFX de moments forts** :

- Ouverture du coffre (son satisfaisant, type "thunk" + musique de gloire courte)
- Victoire / échec global
- Patrouille proche (battement de cœur subtil)

### 7.3 Production sonore

À ce stade, options :

- Banques de sons libres (freesound.org, Kenney audio packs)
- Composition originale par freelance (~500-1500€ pour la BO complète)
- Outils de génération chiptune (LMMS, FamiTracker) si auto-prod

À trancher en M3 (polish jouable). Pour M2 (vertical slice), placeholders depuis Kenney suffisent.

---

## 8. UI — Tableau de bord central

### 8.1 Position et rôle

**En bas de l'écran**, sur toute la largeur, hauteur ~16% de l'écran. Toujours visible, n'occulte pas la carte.

C'est le **tableau de bord partagé** : tous les joueurs le lisent en même temps, c'est la source de vérité collective. Inspiration : feuille de score d'un jeu de plateau, mais vivante.

### 8.2 Composition (4 zones)

```
┌──────────────┬────────────────────┬──────────────┬──────────────┐
│ TOUR ACTIF   │ BUTIN              │ ALERTE       │ TEMPS        │
│ (rôle qui    │ (montant total +   │ (jauge +     │ (compte à    │
│  joue + état)│  jauge progression)│  niveau %)   │  rebours)    │
└──────────────┴────────────────────┴──────────────┴──────────────┘
```

**Zone 1 — Tour actif** (140 px) : couleur du rôle actif, animation pulsée subtile, indication phase.

**Zone 2 — Butin** (160 px) : montant en gros chiffres ambre, jauge horizontale de progression vers l'objectif (ex: "142 500 / 350 000 ₡"), reste neutre tant qu'il monte normalement.

**Zone 3 — Alerte** (120 px) : jauge horizontale qui passe du gris (0%) au rose (50%) au rouge (100%), label dynamique ("discret" / "tendu" / "alerte" / "critique").

**Zone 4 — Temps** (130 px) : compte à rebours vers le prochain événement temporel (patrouille, équipe de nuit, lever du soleil…), couleur cyan tant que tranquille, vire au rouge sous 30 secondes.

### 8.3 Comportement

- Le tableau de bord ne se cache jamais en cours de partie
- Lors d'événements importants (alerte qui monte, coffre ouvert), les zones concernées s'animent brièvement (flash, pulsation) puis reviennent au calme
- Les chiffres se mettent à jour avec un effet de "compteur qui tourne" (interpolation 0.5 sec)

### 8.4 Information privée vs partagée

Le tableau de bord ne montre **que de l'information partagée** (ce que tout le monde sait). L'information privée (rôle secret, butin personnel négocié, alliances cachées) passe par le mécanisme **"tour son écran"** détaillé dans `ADVENTURES_GUIDE.md` : le joueur tourne la tablette vers soi, regarde son info, valide, retourne la tablette face commune.

---

## 9. Écrans clés à concevoir

À produire en mockups avant la production des assets. Liste des écrans à mocker pour le M2 :

1. **Écran d'accueil de la plateforme** (élément hors aventure, géré par `CHARTE_VISUELLE_PLATEFORME.md`)
2. **Écran de présentation du Casse** : titre, court pitch, "lancer la partie"
3. **Écran de setup joueurs** : choix du nombre, nom, attribution couleur/avatar
4. **Écran de briefing** : "Ce soir, vous attaquez la Banque Lune. Voici votre équipe."
5. **Écran de distribution des rôles privés** : mécanique tour-son-écran
6. **Écran principal de jeu** (la maquette + tableau de bord)
7. **Modale d'action** : choix d'action pendant son tour
8. **Écran de partage du butin** : mécanique de fin de partie (négociation/trahison)
9. **Écran de fin** : récapitulatif, gagnant, statistiques de la partie

---

## 10. Production : checklist d'assets pour M2

À utiliser comme brief si tu sous-traites à un freelance, ou comme to-do list si tu produis toi-même.

### 10.1 Sprites de personnages (5 rôles)

Pour chacun des 5 rôles (Hacker, Faussaire, Infiltré·e, Négociateur·rice, Conducteur·rice) :

- [ ] Idle 4 directions × 2 frames = 8 sprites
- [ ] Marche 4 directions × 4 frames = 16 sprites
- [ ] Action spéciale 1 direction × 3-4 frames = 3-4 sprites
- [ ] Portrait haute résolution (96×96) pour les écrans de présentation

**Total par rôle** : ~28 sprites + 1 portrait. **Pour 5 rôles** : ~140 sprites + 5 portraits.

### 10.2 PNJ

- [ ] Garde de sécurité : idle 4 dir + marche 4 dir × 4 frames = 24 sprites
- [ ] Civil banque (placeholder employé) : idle 4 dir + marche 2 dir × 2 frames = 8 sprites

### 10.3 Tilesets et décors

- [ ] Tileset sol banque (16 tiles : sol normal, damier, transitions)
- [ ] Tileset murs (16 tiles : droits, coins, T, croisement, portes)
- [ ] Mobilier : coffre fermé, coffre ouvert, console serveur, comptoir, distributeur, plante déco
- [ ] Détecteurs de sécurité (laser, caméra)
- [ ] Décor extérieur (parvis de la banque, pour Conducteur·rice)

### 10.4 UI

- [ ] Boutons (3 états : normal, hover, pressed) × 3 tailles (S, M, L)
- [ ] Cadres de modale (3 tailles)
- [ ] Icônes d'actions (~20 icônes) en 16×16 et 32×32
- [ ] Jauges et barres (alerte, butin, temps)
- [ ] Pictogrammes des rôles (icônes + portraits)

### 10.5 Animations contextuelles

- [ ] Particules dorées (ouverture coffre)
- [ ] Flash de succès / échec
- [ ] Pulsation tour actif
- [ ] Patrouille arrivée

### 10.6 Effets ambiants

- [ ] Frames d'animation des écrans de serveurs (4 frames de "données qui défilent")
- [ ] Variation d'intensité des néons (calque overlay animé)
- [ ] Système de teinte global pour l'ambiance évolutive selon l'alerte

---

## 11. Ce que cette DA bible **n'est pas**

- Ce n'est **pas** un design document de gameplay. La mécanique du Casse (règles, déroulement, équilibrage) sera traitée dans un autre document après cette DA.
- Ce n'est **pas** un cahier des charges pour développeurs. Les specs techniques d'implémentation sont dans `DECISIONS.md`, `ADVENTURES_GUIDE.md` et les futures specs M2.
- Ce n'est **pas** figé pour l'éternité. Si un playtest révèle qu'un choix visuel ne fonctionne pas (ex : 4 directions trop limitées), on rouvre le débat. Mais on ne touche pas à la bible sans en discuter et la documenter.

---

## 12. Annexes

### 12.1 Glossaire visuel

- **Top-down 3/4** : vue de dessus avec léger angle qui laisse voir tête + épaules
- **Tile** : unité de la grille (32×32 pixels ici)
- **Atlas** : un seul fichier PNG qui contient plusieurs sprites + un JSON qui décrit leur position
- **Sprite** : une image de personnage / objet, transparente, animée ou non
- **Tileset** : grille de tiles assemblables pour construire les décors
- **HUD** : Heads-Up Display, le tableau de bord superposé à la scène

### 12.2 Liens utiles

- Aseprite : https://www.aseprite.org/
- m5x7 et m6x11 par Daniel Linssen : https://managore.itch.io/m5x7
- Press Start 2P : https://fonts.google.com/specimen/Press+Start+2P
- Kenney audio packs : https://kenney.nl/assets?q=audio
- freesound.org : https://freesound.org/

### 12.3 Historique des décisions

- v1.0 (M1) : version initiale, après itérations sur l'angle (orthogonal vs iso), la résolution sprites (rebascule 64→48), le système de polices (single→dual)

---

## 13. Reste à produire pour boucler #12

Cette bible **textuelle** couvre la majeure partie de l'issue #12. Restent les livrables visuels qui demandent un atelier ou un freelance :

- [ ] Mood board : 5-10 images de référence dans `src/adventures/banque-lune/assets/moodboard/` + `references.md` annoté.
- [ ] Concepts des 5 rôles : silhouettes ou rough pixel-art (placeholder OK pour M1, version produite en M2).
- [ ] Concept du décor principal : esquisse rough de l'intérieur de la Banque Lune (entrée, salle des coffres, salle de contrôle).
- [ ] Validation explicite que cette charte respecte la `CHARTE_VISUELLE_PLATEFORME.md` (issue #11) — à faire une fois #11 produite.
