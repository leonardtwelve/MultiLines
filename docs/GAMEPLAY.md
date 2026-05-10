# GAMEPLAY — Le Casse de la Banque Lune

> Spec game design faisant autorité pour la première aventure de Pixel Quests.
> À lire avec `docs/DECISIONS.md` (D1-D8 + G1-G7) et `src/adventures/banque-lune/ART.md`.
>
> Statut : **draft conception** — design tranché côté boucle, rôles, leviers. Chiffrage et tables détaillées encore en spec/ (cf. section finale).

---

## 1. Pilier mécanique

> **Pendant tout le casse, vous êtes une équipe — et votre intérêt est *réellement* de réussir ensemble. Mais au moment du partage, chacun va devoir choisir entre fair-play et trahison, et personne ne sait à l'avance qui fera quoi.** *(G1)*

Le ciment de la première moitié, c'est que **la coop est sincère** *(G6)*. Pas de traître caché à la Loup-Garou. La tension monte parce que vous *savez* que la trahison est possible à la fin, mais elle n'est encore décidée par personne.

**Conséquence design** : aucune action de joueur ne peut nuire à un autre joueur pendant les actes 1 et 2. Tout effet "compétitif" se cristallise à l'acte 3.

**Source de tension pendant le casse** *(qui doit suffire sans trahison continue)* :
- Jauge d'alerte qui monte (échec collectif possible)
- Infos privées révélées progressivement (chacun en sait plus mais doit cacher)
- Crédits et Dossiers accumulés (chacun *prépare* sa trahison potentielle sans la commettre)
- Pactes du Négociateur (engagements oraux qui pourront être tenus ou rompus)

---

## 2. Cadre de partie

| | |
|---|---|
| **Joueurs** | 3 à 5 *(scaling à spécifier en spec/)* |
| **Durée cible** | 30-45 min |
| **Format** | écran partagé tablette en paysage |
| **Acte 1** | Briefing — 3-5 min |
| **Acte 2** | Le casse — 20-30 min, 6-8 tours |
| **Acte 3** | L'extraction & le partage — 5-8 min |

---

## 3. Boucle de jeu

### Acte 1 — Briefing

1. **Sélection des rôles** : chaque joueur choisit ou se voit attribuer un rôle parmi les 5. Couleur HUD = couleur du rôle.
2. **Présentation de la cible** : la Banque Lune se dévoile. Layout du soir variable d'une partie à l'autre *(génération à spécifier en spec/)*.
3. **Distribution des objectifs privés** : tablette tournée vers chaque joueur à tour de rôle *(G5)*. Chacun reçoit son objectif **légèrement tordu** *(G4)*.
4. **Plan d'attaque** : 60 secondes de discussion ouverte. Pas d'info privée échangée à ce stade — chacun bluffe déjà.

### Acte 2 — Le casse

Chaque tour suit ce rythme :

```
PLANIFICATION (60-90s, ouvert)
  └─ Discussion libre. Personne ne joue. On décide qui fait quoi.

ACTIONS (séquentiel, ~30s/joueur)
  └─ Chaque joueur, à son tour :
     1. Choisit son action parmi celles disponibles à son rôle (G2)
     2. Dé de risque : modifié par capacité du rôle, équipement, jauge d'alerte
     3. Résultat : succès / succès partiel (avec coût) / échec
     4. Optionnel : événement de rôle → tablette tournée

ÉVÉNEMENT DE TOUR (révélé à tous)
  └─ Tiré ou scripté selon la jauge d'alerte
     Ex: ronde de gardes, panne, témoin, opportunité

JAUGE D'ALERTE (mise à jour visible)
  └─ Monte selon échecs, événements, actions risquées
```

**Fin de l'acte 2** : déclenchée par **objectif coop atteint** OU **jauge d'alerte au max**. Dans les deux cas, on passe à l'extraction.

### Acte 3 — L'extraction & le partage

1. **Récap du butin** : combien chacun a contribué, quel est le pot commun.
2. **Tablette tournée** vers chaque joueur : confirmation de l'objectif privé + Crédits + Dossiers accumulés. Le système rappelle les conséquences des votes possibles.
3. **Phase pré-vote** (ordre libre) :
   - Activation des Dossiers Identité (révélation indice partiel)
   - Achat de garanties avec Crédits
   - Déclenchement automatique des conséquences de Pactes secrets
4. **Vote secret simultané** *(G3)* : tablette tournée vers chacun, choix *Loyal* ou *Trahir*.
5. **Révélation simultanée** :
   - Tous loyaux → split équitable, tout le monde gagne (bonus narratif si objectif privé rempli)
   - Un seul traître → il rafle la part majoritaire, les autres se partagent les miettes
   - Plusieurs traîtres → ratio dégueu, parfois ils perdent tous (le casse "explose" narrativement)
6. **Bilan narratif** : qui a réussi son objectif privé, qui repart avec quoi, fin variable selon les votes.

---

## 4. Système de résolution

*(G2 — choix d'action + dé de risque modifié)*

- Le joueur **choisit son action** (pas de hasard sur le choix).
- Le **dé de risque** détermine la réussite, modifié par : capacité passive du rôle, équipement, contexte, jauge d'alerte.
- Trois résultats possibles : **succès** / **succès partiel** (avec coût) / **échec**.
- Possibilité de **dépenser des Crédits pour booster** : relance, +1, etc.
- Chiffrage exact (faces du dé, table de modificateurs, coûts) à spécifier en spec/.

---

## 5. Les 5 rôles

### Vue d'ensemble

| Rôle | Couleur | Action emblématique | Force unique | Tension propre |
|---|---|---|---|---|
| 🟢 Hacker | `#3affc7` cyan | Surcharge | Vision interne | — |
| 🟡 Faussaire | `#ffc83a` ambre | Authentifier | Asymétrie info butin | — |
| 🟣 Infiltré | `#c93aff` magenta | Crochetage | Échecs amortis | — |
| 🌹 Négociateur | `#ff3a82` rose | Pacte secret | Modifie dés des autres | Pactes engagent au final |
| 🔵 Observateur | `#85b7eb` bleu glacé | Œil dans le ciel | Vue globale | Drone fragile (3 PV) |

**Principe d'asymétrie** : chaque rôle a la même *quantité* d'actions (3 actions principales + 1 capacité passive). Ce qui change, c'est ce que ces actions *font* dans le système. Pas de rôle "plus fort" qu'un autre, juste différent.

### 🟢 Hacker

- **Identité** : maîtrise des systèmes numériques. Voit ce que les autres ne voient pas. Influence à distance.
- **Capacité passive — Vision réseau** : peut consulter une fois par tour la jauge d'alerte avec un cran de granularité supplémentaire. Sait si un événement Sécurité approche.
- **Action 1 — Intrusion système** : désactive temporairement une caméra/capteur (1 tour). *Risque : Moyen.*
- **Action 2 — Collecte de données** : récupère des Crédits, avec une chance (~30%) de produire un Dossier à la place. *Risque : Faible.* C'est la principale source de leviers de l'équipe.
- **Action 3 — Surcharge** ⭐ *(emblématique)* : court-circuite un système majeur (coffre, ascenseur, alarme). Débloque une zone autrement inaccessible. *Risque : Élevé.*
- **Synergie** : Infiltré.

### 🟡 Faussaire

- **Identité** : maître des faux papiers, des tromperies physiques, de la valeur transformée.
- **Capacité passive — Œil d'expert** : voit la **vraie valeur** du butin que les autres voient en estimation floue. C'est sa force asymétrique pour l'acte 3.
- **Action 1 — Faux ordre** : génère un faux document qui débloque une porte ou trompe un PNJ. *Risque : Faible.*
- **Action 2 — Substitution** : au moment où l'équipe récupère un lot de butin, le Faussaire peut placer un faux dans le coffre à la place du vrai. **Le butin réel reste dans le pot commun.** Sa nature exacte (vraie valeur vs estimée) est cachée à tous sauf au Faussaire. Effet visible : "le Faussaire a substitué" est annoncé. *Risque : Faible.* **Cette action ne vole rien — elle crée du flou informationnel pour préparer la bascule de l'acte 3.**
- **Action 3 — Authentifier** ⭐ *(emblématique)* : évalue précisément un lot de butin. Révèle sa vraie valeur à lui seul (tablette tournée). Peut mentir aux autres dessus. Sur certains coffres-forts spéciaux, peut révéler un Dossier. *Risque : Faible.*
- **Synergie** : Négociateur.

### 🟣 Infiltré·e

- **Identité** : présence physique dans la banque, accès aux zones interdites, mouvement.
- **Capacité passive — Couverture** : ses actions ratées font monter la jauge d'alerte de moitié.
- **Action 1 — Reconnaissance** : explore une nouvelle zone de la banque, révèle son contenu pour tous. Peut découvrir un Dossier abandonné dans certaines zones. *Risque : Faible.*
- **Action 2 — Détournement de garde** : occupe un PNJ pendant un tour. Permet à d'autres joueurs d'agir sur sa zone sans risque. *Risque : Moyen.*
- **Action 3 — Crochetage** ⭐ *(emblématique)* : ouvre un coffre/une porte sécurisée *physiquement* (sans Hacker). Plus lent mais ne dépend de personne. *Risque : Moyen.*
- **Synergie** : tous.

### 🌹 Négociateur·rice

- **Identité** : la voix, les deals, l'humain. Manipule par la parole, pas par la technique.
- **Capacité passive — Magnétisme** : peut, une fois par tour, modifier le résultat d'un dé d'un autre joueur de ±1, en dépensant 1 Crédit.
- **Action 1 — Persuader un PNJ** : évite un événement Sécurité (ronde, témoin) en parlant. *Risque : Moyen.*
- **Action 2 — Marchandage** : augmente la valeur d'un lot de butin déjà collecté (négocier sa revente future). *Risque : Faible.*
- **Action 3 — Pacte secret** ⭐ *(emblématique)* : tablette tournée, propose un **pacte privé** à un autre joueur. Le pacte est tracké par le système — tenu ou rompu, ça a des conséquences au bilan final. *Risque : Faible.* **Mécanique précise à spécifier en spec/.**
- **Synergie** : Faussaire + Observateur.

### 🔵 Observateur

- **Identité** : pilote un drone furtif à l'intérieur de la banque depuis l'extérieur. Vue d'ensemble + reconnaissance + soutien à distance. Présent sur la maquette via un sprite drone distinct (32×32, plus petit que les avatars humains 48×48).
- **Capacité passive — Vue tactique** : voit tout le layout révélé même si son drone n'y est pas. Sait où sont les PNJ et caméras à chaque tour.
- **Action 1 — Reconnaissance drone** : déplace le drone, révèle une zone non explorée *sans risque pour les avatars humains*. *Risque : Faible.*
- **Action 2 — Brouillage** : le drone émet un brouillage sur une zone : caméras et capteurs y sont aveugles pendant 1 tour. Différent du Hacker (qui désactive un point précis) : l'Observateur couvre une zone large mais brièvement. *Risque : Moyen.* Le drone peut être détecté.
- **Action 3 — Œil dans le ciel** ⭐ *(emblématique)* : marque une cible (PNJ ou objet). Pendant 2 tours, toutes les actions des autres joueurs concernant cette cible bénéficient d'un bonus. Sur un PNJ, peut produire un Dossier de type Identité. *Risque : Faible.*
- **Tension propre** : son drone a une **jauge d'intégrité** (3 PV). Chaque action moyennement risquée peut l'endommager. S'il est détruit, l'Observateur perd une partie de ses capacités jusqu'à la fin de la partie.
- **Synergie** : multiplicateur global.

---

## 6. Information privée

Trois couches d'info privée structurent le jeu.

### 6.1 — Objectif privé

*(G4 — légèrement tordu)*

- Révélé en début d'acte 1 (tablette tournée), jamais montré aux autres pendant le casse.
- Aligné avec la coop, mais avec un twist personnel.
- Exemples : "ramène au moins X de butin", "récupère spécifiquement le coffre 3", "le Hacker doit avoir moins de Crédits que toi à la fin".
- Sa réussite donne un bonus de butin individuel ou un effet narratif au bilan.
- Table d'objectifs et règles de tirage à spécifier en spec/.

### 6.2 — Crédits *(ressource générique)*

Compteur numérique simple par joueur. Représente narrativement *"de la pression accumulée, des petits secrets, des micro-leviers"*.

**Visibilité** : son total est visible **uniquement par le joueur** sur son HUD personnel (tablette tournée pour consultation rare).

**Obtention** *(barème indicatif, à finaliser en playtesting)* :

| Source | Crédits |
|---|---|
| Action réussie (succès complet) | +1 |
| Action *Collecte de données* du Hacker (réussie) | +2 |
| Succès partiel | +0 |
| Échec d'action | -1 si solde ≥ 3, sinon 0 |
| Événement de tour favorable | +1 à +2 |
| Objectif coop intermédiaire atteint | +1 pour tous |

**Volume cible** : 4-8 Crédits par joueur en fin de casse.

**Usages** :
- Acte 2 : booster un dé (relance, +1), alimenter le Magnétisme du Négociateur (1 Crédit), payer un Pacte secret.
- Acte 3 : acheter des **garanties** ("je dépense 3 Crédits pour me protéger d'une trahison" — coût exact à spécifier).
- **Les Crédits non dépensés à l'acte 3 sont perdus.** Crée la tension économiser vs dépenser tout de suite.

### 6.3 — Dossiers *(leviers narratifs)*

Cartes typées nominatives. Plus rares (1-2 par joueur sur la partie, parfois 0). Chaque Dossier a une **cible** (joueur ou PNJ) et un **type**.

| Type | Cible | Effet acte 3 |
|---|---|---|
| 📸 **Compromettant** | Joueur | Si tu votes Trahir et que la cible vote Loyal, tu prends une part supplémentaire d'elle ("chantage") |
| 🔑 **Accès** | PNJ ou banque | Donne un bonus de butin personnel si tu votes Loyal (récompense l'ancrage coop) |
| 🎭 **Identité** | Joueur | Active avant le vote : révèle la **cible** de l'objectif privé du joueur visé (ex: "son objectif concerne le Hacker"), pas la condition exacte. Le bluff sur la condition reste possible. |

**Asymétrie intentionnelle** : Compromettant favorise la trahison, Accès favorise la loyauté, Identité crée du chaos public sans tout révéler.

**Obtention** :
- Hacker — *Collecte de données* : ~30% de chance de produire un Dossier (type aléatoire) au lieu de Crédits.
- Faussaire — *Authentifier* sur certains coffres-forts spéciaux.
- Infiltré — *Reconnaissance* dans certaines zones (Dossiers abandonnés).
- Observateur — *Œil dans le ciel* sur un PNJ : peut produire un Dossier Identité.
- Événements de tour scriptés.
- Négociateur — pas de génération directe, mais peut en demander dans un Pacte secret.

**Volume cible** : 1-2 Dossiers par joueur en fin de partie (parfois 0). C'est un *bonus narratif*, pas un *pivot mécanique*.

**Note design — Dossier Identité** : la révélation est *partielle* (cible uniquement, pas la condition) pour préserver le bluff au vote final. Une 2e Identité sur la même cible peut révéler un *aspect* de la condition (ex: "ça concerne ses Crédits") sans préciser plus. Comportement précis à spécifier en spec/.

---

## 7. Tablette tournée

*(G5 — occasionnel : 3-5 fois par partie)*

La tablette tournée est un **événement narratif**. Quand elle bouge, les autres joueurs voient qu'une info est révélée, mais pas laquelle. La suspicion monte par le geste lui-même.

**Cas d'usage** :
- Distribution des objectifs privés (acte 1, une fois par joueur)
- Événement de rôle pendant l'acte 2 (3-5 fois par partie sur l'ensemble des joueurs, variables selon les rôles joués et les actions choisies)
- Phase pré-vote acte 3 (consultation Crédits + Dossiers)
- Vote final (acte 3, une fois par joueur)
- Pacte secret du Négociateur (déclenché par action)
- Authentifier du Faussaire (sur action)

Total moyen sur une partie : ~5-7 manipulations par joueur.

---

## 8. Jauge d'alerte

Indicateur global et permanent de la tension du casse. Visible en HUD bas de l'écran.

**Fonctions** :
- Pilote l'éclairage global *(cf. ART.md — cool / tendu / chaud / critique)*.
- Modifie les seuils de réussite des dés de risque (plus la jauge est haute, plus c'est dur).
- Déclenche des événements de tour à seuils.
- Si elle atteint le max → fin forcée de l'acte 2 → passage à l'extraction.

**Sources de montée** *(à chiffrer en spec/)* :
- Échecs d'actions (sauf pour l'Infiltré, capacité passive)
- Actions risquées (Surcharge du Hacker notamment)
- Événements de tour défavorables
- Détection du drone de l'Observateur

**Sources de descente** :
- Action *Persuader un PNJ* du Négociateur (sur événement Sécurité réussi)
- Certains événements favorables
- Action *Préparer l'extraction* (effet réservé à des actions de soutien encore à concevoir)

Paramètres numériques à spécifier en spec/.

---

## 9. Acte 3 en détail — la bascule

C'est le moment qui doit être **inoubliable**. Trois sous-phases :

### 9.1 — Phase pré-vote (ordre libre)

Chaque joueur, à tour de rôle, peut :

1. **Activer un Dossier Identité** sur une cible → révélation indice partiel à tous.
2. **Acheter une garantie** avec ses Crédits → protection partielle contre la trahison (effet exact à spécifier).
3. **Réclamer le respect d'un Pacte secret** non encore déclenché.

Phase plafonnée en temps (~2 min) pour éviter l'enlisement.

### 9.2 — Vote secret simultané

Tablette tournée vers chacun, à la suite. Choix *Loyal* ou *Trahir*. Aucun retour visible aux autres. Une fois tous les votes récoltés → révélation simultanée.

### 9.3 — Calcul des gains et bilan

Algorithme général :

1. Base selon la configuration des votes (tous loyaux / un traître / plusieurs).
2. Modulation par les Dossiers Compromettant et Accès activés.
3. Modulation par les garanties achetées.
4. Application des conséquences de Pactes secrets tenus ou rompus.
5. Vérification de chaque objectif privé → bonus narratif si rempli.

Formules précises à spécifier en spec/.

---

## 10. 🔲 À spécifier *(reste game design)*

Ces points sont **conçus dans l'esprit** mais pas chiffrés ou détaillés. Chacun fait l'objet d'une issue `spec/game-design`.

| # | Sujet | Description courte |
|---|---|---|
| 1 | Mécanique détaillée du Pacte secret | Engagement, traçage, types de pactes possibles, conséquences tenu/rompu |
| 2 | Grille de résolution chiffrée du dé | Faces, modificateurs (capacités, alerte, équipement), coûts de boost |
| 3 | Table des objectifs privés tordus | ≥30 objectifs, règles de tirage, anti-configurations injouables |
| 4 | Jauge d'alerte chiffrée | Seuils numériques, déclenchement d'événements, conséquences précises |
| 5 | Table d'événements de tour | Banque ≥20 événements, déclenchement selon jauge, effets |
| 6 | Layout de banque | Génération, variabilité, contraintes d'équilibrage |
| 7 | Calcul du butin | Composition d'un lot, fourchettes de valeur, formules de partage acte 3 |
| 8 | Scaling 3/4/5 joueurs | Rôles obligatoires, ajustements de difficulté, équilibrage |
| 9 | Tension propre Infiltré et Négociateur | Compléter (à ce stade, ces deux rôles sont un peu plats côté contrainte personnelle) |
| 10 | Effet exact des garanties (acte 3) | Coût en Crédits, type de protection, interaction avec les Dossiers |

---

## 11. Liens

- `docs/DECISIONS.md` — registre des décisions structurantes (D1-D8 + G1-G7)
- `src/adventures/banque-lune/ART.md` — DA bible visuelle du Casse
- `docs/ROADMAP.md` — jalons M1-M5
- `docs/ADVENTURES_GUIDE.md` — contrat Adventure générique

---

*Fin du GAMEPLAY.md. Pour toute reprise de design, mettre à jour ce document en priorité — il fait autorité.*
