# Game design — Le Casse de la Banque Lune

> Document **faisant autorité** sur le game design du Casse Lune. À lire en premier par tout dev avant de toucher au gameplay.
>
> Doit être lu conjointement avec [`DECISIONS.md`](./DECISIONS.md) §G1-G7 (décisions structurantes) et [`../src/adventures/banque-lune/ART.md`](../src/adventures/banque-lune/ART.md) (DA bible).
>
> Toute valeur chiffrée (faces de dé, seuils, durées exactes, montants) est volontairement absente. Elle vit dans les issues `spec/game-design` listées en section finale [🔲 À spécifier](#-à-spécifier).

---

## 1. Pilier mécanique

> **Coop tendue → moment de bascule individuelle.** (G1)

Le casse se joue en coopération **sincère** pendant tout l'acte 2 (G6). La trahison n'est pas envisageable techniquement avant l'acte 3 — c'est un choix structurel, pas une carence d'outillage.

L'expérience cible : on transpire ensemble pendant 25 minutes, puis le cœur du jeu se révèle au moment du partage final. Le vote d'extraction (G3) cristallise toutes les tensions accumulées.

---

## 2. Boucle de jeu — 3 actes, 30-45 min

### Acte 1 — Briefing (3-5 min)

1. Sélection des rôles (couleur du HUD = couleur du rôle, voir [ART.md §3](../src/adventures/banque-lune/ART.md#3-palette-de-couleurs)).
2. Présentation de la cible : layout de banque variable d'une partie à l'autre — voir [`spec/layout-banque`](#-à-spécifier).
3. Distribution des objectifs privés : tablette tournée vers chaque joueur (voir §[5. Information privée](#5-information-privée--trois-couches)).
4. Plan d'attaque ouvert : 60 secondes de discussion libre, sans contrainte.

### Acte 2 — Le casse (20-30 min, 6-8 tours)

Chaque tour suit ce rythme strict :

1. **Planification ouverte** (60-90s, tous joueurs, pas de joueur actif) — discussion libre, lecture du plateau.
2. **Actions séquentielles** (~30s par joueur, ordre = ordre des rôles) :
   1. Choix d'action (parmi les 3 actions du rôle — voir §[4. Rôles](#4-les-5-rôles)).
   2. Dé de risque modifié par capacité, équipement, contexte, jauge d'alerte (voir §[3. Système de résolution](#3-système-de-résolution)).
   3. Résultat : succès / succès partiel (avec coût) / échec.
   4. Optionnel : événement de rôle qui demande une décision privée → tablette tournée (G5, occasionnel : 3-5 fois par partie).
3. **Événement de tour** révélé à tous (tiré ou scripté selon la jauge d'alerte — voir [`spec/evenements`](#-à-spécifier)).
4. **Mise à jour de la jauge d'alerte** (visible de tous).

**Conditions de fin de l'acte 2** : objectif coop atteint **OU** jauge d'alerte au max → passage à l'extraction.

### Acte 3 — L'extraction & le partage (5-8 min)

1. **Récap du butin** : contributions individuelles, pot commun, valeurs estimées (voir [`spec/calcul-butin`](#-à-spécifier)).
2. **Tablette tournée vers chaque joueur** (G5) :
   - Confirmation de l'objectif privé (rempli ou non).
   - Récap des leviers accumulés.
   - Récap des conséquences possibles du vote.
3. **Vote secret simultané** (G3) — tablette tournée, chaque joueur choisit `Loyal` ou `Trahir`.
4. **Révélation simultanée** :
   - **Tous loyaux** → split équitable, tous gagnent. Bonus narratif si l'objectif privé est rempli.
   - **Un seul traître** → il rafle la part majoritaire, les autres se partagent les miettes.
   - **Plusieurs traîtres** → ratio dégueu, parfois tous perdent (le casse "explose" narrativement).
5. **Bilan narratif** : qui a réussi quoi, qui repart avec quoi, fin variable.

> Pondération exacte des parts, effet des leviers sur le vote, formules de partage : voir [`spec/calcul-butin`](#-à-spécifier).

---

## 3. Système de résolution

> **Choix d'action déterministe, dé de risque sur la réussite.** (G2)

Aucun hasard sur le choix de l'action : chaque rôle a 3 actions disponibles, le joueur en sélectionne une.

Le hasard ne porte que sur la **réussite** :

1. Joueur choisit son action (capacité du rôle + 3 actions emblématiques).
2. Dé de risque lancé, modifié par :
   - Capacité passive du rôle.
   - Équipement (M2+).
   - Contexte (zone, alliés présents, état du PNJ ciblé).
   - Niveau actuel de la jauge d'alerte.
3. Trois résultats possibles :
   - **Succès** : effet plein.
   - **Succès partiel** : effet partiel + coût (jauge d'alerte qui monte, ressource consommée, etc.).
   - **Échec** : pas d'effet + conséquence négative (variable selon l'action).
4. **Boost** : possibilité de dépenser des ressources (leviers ?) pour relancer ou modifier le dé.

Chiffrage exact (taille du dé, table de modificateurs, coûts de boost, table des conséquences) → [`spec/grille-resolution`](#-à-spécifier).

---

## 4. Les 5 rôles

> Identité visuelle, palette individuelle et règles narratives : voir [ART.md §4](../src/adventures/banque-lune/ART.md#4-identité-des-5-rôles).

| Rôle             | Couleur          | Action emblématique | Force unique                                      |
|------------------|------------------|---------------------|---------------------------------------------------|
| Hacker           | cyan `#3affc7`   | Surcharge           | Influence à distance + lecture fine de la jauge   |
| Faussaire        | ambre `#ffc83a`  | Authentifier        | Seul à voir la vraie valeur du butin              |
| Infiltré·e       | magenta `#c93aff`| Crochetage          | Seule présence physique dans la banque            |
| Négociateur·rice | rose `#ff3a82`   | Pacte secret        | Magnétisme — modifie les dés, propose des pactes  |
| Observateur      | bleu glacé `#85b7eb` | Œil dans le ciel | Vue tactique globale via drone (G7)               |

Les actions sont décrites avec un niveau de risque qualitatif (faible / moyen / élevé). La traduction en valeur chiffrée vit dans [`spec/grille-resolution`](#-à-spécifier).

### 🟢 Hacker — cyan `#3affc7`

**Identité** : maîtrise des systèmes numériques. Influence à distance.

**Capacité passive — Vision réseau** : consulte une fois par tour la jauge d'alerte avec un cran de granularité supplémentaire. Sait si un événement Sécurité approche.

| # | Action                  | Risque | Effet                                                                       |
|---|-------------------------|--------|-----------------------------------------------------------------------------|
| 1 | Intrusion système       | Moyen  | Désactive temporairement une caméra/capteur (1 tour).                       |
| 2 | Collecte de données     | Faible | Récupère un levier (info compromettante).                                   |
| 3 | **Surcharge** ⭐         | Élevé  | Court-circuite un système majeur (coffre, ascenseur, alarme).               |

**Synergie** : Infiltré·e.

### 🟡 Faussaire — ambre `#ffc83a`

**Identité** : maître des faux papiers, des tromperies physiques, de la valeur transformée.

**Capacité passive — Œil d'expert** : voit la vraie valeur du butin que les autres voient en estimation floue.

| # | Action                  | Risque | Effet                                                                       |
|---|-------------------------|--------|-----------------------------------------------------------------------------|
| 1 | Faux ordre              | Faible | Génère un faux document qui débloque une porte ou trompe un PNJ.            |
| 2 | Substitution            | Faible | Place un faux dans le coffre à la place d'un lot venant d'être récupéré. Le butin réel reste dans le pot commun, mais sa nature exacte (vraie valeur vs estimée) est cachée à tous sauf au Faussaire. Effet visible : « Faussaire a substitué ». **Ne vole rien** — crée du flou informationnel pour préparer la bascule de l'acte 3. |
| 3 | **Authentifier** ⭐      | Faible | Évalue précisément un lot de butin. Révèle sa vraie valeur à lui seul (tablette tournée). Peut mentir aux autres. |

**Synergie** : Négociateur·rice.

### 🟣 Infiltré·e — magenta `#c93aff`

**Identité** : présence physique dans la banque, accès aux zones interdites.

**Capacité passive — Couverture** : ses actions ratées font monter la jauge d'alerte de moitié.

| # | Action                  | Risque | Effet                                                                       |
|---|-------------------------|--------|-----------------------------------------------------------------------------|
| 1 | Reconnaissance          | Faible | Explore une nouvelle zone, révèle son contenu pour tous.                    |
| 2 | Détournement de garde   | Moyen  | Occupe un PNJ pendant 1 tour, libère sa zone.                               |
| 3 | **Crochetage** ⭐        | Moyen  | Ouvre un coffre/porte sécurisée physiquement (alternative au Hacker).       |

**Synergie** : tous.

**Tension propre** : à compléter — voir [`spec/tension-roles`](#-à-spécifier).

### 🌹 Négociateur·rice — rose `#ff3a82`

**Identité** : la voix, les deals. Manipule par la parole.

**Capacité passive — Magnétisme** : peut, une fois par tour, modifier le résultat d'un dé d'un autre joueur de ±1, en dépensant un levier.

| # | Action                  | Risque | Effet                                                                       |
|---|-------------------------|--------|-----------------------------------------------------------------------------|
| 1 | Persuader un PNJ        | Moyen  | Évite un événement Sécurité en parlant.                                     |
| 2 | Marchandage             | Faible | Augmente la valeur d'un lot de butin déjà collecté.                         |
| 3 | **Pacte secret** ⭐      | Faible | Tablette tournée. Propose un pacte privé à un autre joueur (ex : « si on vote tous deux Loyal, je te donne mon levier sur X »). Pacte tracké par le système — tenu ou rompu, conséquences au bilan final. |

**Synergie** : Faussaire + Observateur.

**Tension propre** : à compléter — voir [`spec/tension-roles`](#-à-spécifier).

Mécanique précise du Pacte secret (engagement, traçage, conséquences) → [`spec/pacte-secret`](#-à-spécifier).

### 🔵 Observateur — bleu glacé `#85b7eb`

> Remplace le Conducteur initialement prévu (G7).

**Identité** : pilote un drone furtif à l'intérieur de la banque depuis l'extérieur. Vue d'ensemble + reconnaissance + soutien à distance. Présent sur la maquette via un sprite drone distinct **32×32** (plus petit que les avatars humains 48×48).

**Capacité passive — Vue tactique** : voit tout le layout révélé même si son drone n'y est pas. Sait où sont les PNJ et caméras à chaque tour.

| # | Action                  | Risque | Effet                                                                       |
|---|-------------------------|--------|-----------------------------------------------------------------------------|
| 1 | Reconnaissance drone    | Faible | Déplace le drone, révèle une zone non explorée sans risque pour les avatars humains. |
| 2 | Brouillage              | Moyen  | Zone large brièvement aveuglée (caméras + capteurs) pendant 1 tour. Drone peut être détecté. |
| 3 | **Œil dans le ciel** ⭐  | Faible | Marque une cible (PNJ ou objet). Pendant 2 tours, toutes les actions des autres joueurs sur cette cible bénéficient d'un bonus. |

**Tension propre** : le drone a une **jauge d'intégrité (3 PV)**. Chaque action moyennement risquée peut l'endommager. S'il est détruit, l'Observateur perd une partie de ses capacités jusqu'à fin de partie.

**Synergie** : multiplicateur global.

---

## 5. Information privée — trois couches

| Couche                  | Acquis                  | Visible quand            | Détail                                                                  |
|-------------------------|-------------------------|--------------------------|-------------------------------------------------------------------------|
| Objectif privé          | Acte 1 (distribution)   | Jamais après distribution | Légèrement tordu, aligné coop avec twist (G4). Voir [`spec/objectifs-prives`](#-à-spécifier). |
| Leviers de fin          | Acte 2 (collectés au fil du jeu) | Acte 3 (utilisation) | Photos compromettantes, codes, identités. **Inactifs pendant le casse**, donnent du pouvoir à l'acte 3. Voir [`spec/leviers`](#-à-spécifier). |
| Capacité unique du rôle | Acte 1 (sélection)      | Connue de tous           | Asymétrique mais publique — pas vraiment cachée.                        |

Toute consultation/manipulation d'info privée passe par la **tablette tournée** (G5, occasionnel — 3-5 fois par partie sur événements de rôle, plus la phase d'objectifs en acte 1 et le vote en acte 3).

---

## 6. Coopération sincère stricte (G6)

Pendant **tout l'acte 2**, la coopération est sincère stricte : aucune trahison technique possible. Cette contrainte est structurelle (le moteur ne propose pas d'action de trahison pendant le casse), pas comportementale.

La trahison n'a qu'un seul lieu d'expression : le vote secret de l'acte 3 (G3).

Implications :
- Pas d'action « voler à un coéquipier » pendant l'acte 2.
- Pas de combat PvP.
- Le butin amassé alimente un **pot commun**, pas des poches individuelles.
- Les leviers collectés donnent des prises **pour l'acte 3**, ils ne sont pas utilisables contre les coéquipiers en acte 2.

---

## 7. Tablette tournée (G5)

Usage **occasionnel** : 3 à 5 fois par partie sur des événements de rôle, plus la phase de distribution des objectifs (acte 1) et le vote (acte 3).

Cas d'usage typiques :
- Distribution de l'objectif privé (acte 1, 1× par joueur).
- Action emblématique avec révélation privée (ex : Authentifier, Pacte secret).
- Événement de rôle déclenché par le résultat d'une action (ex : « le drone a vu quelque chose qu'il ne devrait pas »).
- Confirmation de l'objectif et leviers à l'acte 3.
- Vote secret final.

Réalisation côté UI : `engine.privateView` (voir [ADVENTURES_GUIDE.md §5](./ADVENTURES_GUIDE.md#5-services-du-moteur-disponibles)). Ce composant est déjà implémenté côté core.

---

## 🔲 À spécifier

Ce qui reste à concevoir avant que le développement puisse aboutir. Une **issue `spec/game-design`** par sujet, à traiter en M2.

| Sujet                                                         | Issue                                              | Bloque                                       |
|---------------------------------------------------------------|----------------------------------------------------|----------------------------------------------|
| Système de leviers — nature, obtention, usage acte 3         | [`spec/leviers`](#-à-spécifier)                    | Implémentation actions, calcul butin, vote   |
| Grille de résolution chiffrée du dé de risque                | [`spec/grille-resolution`](#-à-spécifier)          | Implémentation système de résolution         |
| Table d'objectifs privés tordus (≥30, règles de tirage)      | [`spec/objectifs-prives`](#-à-spécifier)           | Distribution acte 1, calcul bonus narratif   |
| Mécanique détaillée du Pacte secret                          | [`spec/pacte-secret`](#-à-spécifier)               | Action 3 du Négociateur·rice                 |
| Jauge d'alerte — paramètres numériques, seuils, événements   | [`spec/jauge-alerte`](#-à-spécifier)               | HUD jauge, fin acte 2, modificateurs dé      |
| Table d'événements de tour (≥20)                             | [`spec/evenements`](#-à-spécifier)                 | Phase 3 du tour acte 2                       |
| Layout de banque — génération, variabilité                   | [`spec/layout-banque`](#-à-spécifier)              | Rendu de la maquette, exploration            |
| Calcul du butin — composition, valeur, partage               | [`spec/calcul-butin`](#-à-spécifier)               | Acte 3 partage, formules de vote             |
| Scaling 3/4/5 joueurs — rôles obligatoires, ajustements      | [`spec/scaling-joueurs`](#-à-spécifier)            | Setup, équilibrage                           |
| Tension propre Infiltré·e et Négociateur·rice                | [`spec/tension-roles`](#-à-spécifier)              | Profondeur des deux rôles                    |

> Les liens cliquables vers les issues GitHub seront mis à jour quand les issues seront créées (étape 3 du chantier de formalisation).
