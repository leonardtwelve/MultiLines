# GAMEPLAY — Le Casse de la Banque Lune

> Spec game design faisant autorité pour la première aventure de Pixel Quests.
> À lire avec `docs/DECISIONS.md` (D1-D8 + G1-G10 + F1-F8), `docs/FRONTEND.md` (design front) et `src/adventures/banque-lune/ART.md`.
>
> Statut : **draft conception v2** — design tranché côté boucle, rôles, leviers, grille de résolution, Pacte secret, objectifs privés. Reste en spec/ : calcul du butin, jauge d'alerte chiffrée, événements, layout, scaling 3/4/5, garanties.

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
3. **Distribution des objectifs privés** : tablette tournée vers chaque joueur à tour de rôle *(G5)*. Chacun reçoit son objectif **légèrement tordu** *(G4)*. Algorithme de tirage cf. section 7.4.
4. **Plan d'attaque** : 60 secondes de discussion ouverte. Pas d'info privée échangée à ce stade — chacun bluffe déjà.

### Acte 2 — Le casse

Chaque tour suit ce rythme :

```
PLANIFICATION (60-90s, ouvert)
  └─ Discussion libre. Personne ne joue. On décide qui fait quoi.

ACTIONS (séquentiel, ~30s/joueur)
  └─ Chaque joueur, à son tour :
     1. Choisit son action parmi celles disponibles à son rôle (G2)
     2. Dé de risque : 2d6 modifié, table d'interprétation selon niveau de risque (cf. §4)
     3. Résultat : succès / succès partiel (avec coût) / échec / échec critique (2 naturel)
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
   - Achat de garanties avec Crédits *(coût à spécifier)*
   - Déclenchement automatique des conséquences de Pactes secrets
4. **Vote secret simultané** *(G3)* : tablette tournée vers chacun, choix *Loyal* ou *Trahir*.
5. **Révélation simultanée** :
   - Tous loyaux → split équitable, tout le monde gagne (bonus narratif si objectif privé rempli)
   - Un seul traître → il rafle la part majoritaire, les autres se partagent les miettes
   - Plusieurs traîtres → ratio dégueu, parfois ils perdent tous (le casse "explose" narrativement)
6. **Bilan narratif** : qui a réussi son objectif privé, qui repart avec quoi, fin variable selon les votes.

---

## 4. Système de résolution chiffré *(G2 + G8)*

### 4.1 — Le dé : 2d6

Chaque action de risque est résolue par un lancer de **2 dés à six faces**. Résultat possible : 2 à 12, distribution en cloche (7 le plus fréquent).

Pourquoi 2d6 :
- Distribution en cloche : modificateurs prévisibles, calibrage maîtrisé
- Lisibilité visuelle : deux dés qui roulent à l'écran, cohérent avec la maquette vivante
- Référence connue : Catan, plein de jeux indé

### 4.2 — Tables d'interprétation

Le résultat brut est interprété selon le **niveau de risque** de l'action.

| Risque | Succès complet | Succès partiel | Échec |
|---|---|---|---|
| **Faible** | 7-12 | 4-6 | 2-3 |
| **Moyen** | 10-12 | 7-9 | 2-6 |
| **Élevé** | 11-12 | 8-10 | 2-7 |

Probabilités *avant modificateurs* :

| Risque | P(succès) | P(partiel) | P(échec) |
|---|---|---|---|
| Faible | 58% | 33% | 8% |
| Moyen | 17% | 42% | 42% |
| Élevé | 8% | 33% | 58% |

### 4.3 — Modificateurs

S'additionnent au résultat des 2d6, plafonnés à **-4 / +4**.

| Modificateur | Effet | Source |
|---|---|---|
| Capacité passive favorable | +1 | Selon contexte (rôle, situation) |
| Cible déjà préparée | +1 | Marquage *Œil dans le ciel*, *Brouillage* actif |
| Équipement / Faux ordre disponible | +1 | Action préalable d'un autre rôle |
| **Magnétisme** du Négociateur | ±1 | 1 par tour, coûte 1 Crédit |
| Jauge d'alerte zone *tendue* | -1 | 31-60% |
| Jauge d'alerte zone *chaude* | -2 | 61-80% |
| Jauge d'alerte zone *critique* | -3 | 81-100% |
| Drone détruit (Observateur uniquement) | -2 | Permanent jusqu'à fin de partie |

### 4.4 — Boost en Crédits

Le joueur peut dépenser des Crédits avant ou après le jet :

| Boost | Coût | Effet |
|---|---|---|
| **+1 sur le résultat** | 1 Crédit | Avant le jet uniquement |
| **Relance** | 2 Crédits | Garde le 2e résultat (forcé) |
| **Relance d'un seul dé** | 1 Crédit | Choisit lequel |
| **Annuler un échec critique** | 3 Crédits | Transforme un 2 naturel en 4 |

### 4.5 — Échec critique

Un **2 naturel** (les deux dés sur 1) déclenche un effet narratif spécifique à l'action. Probabilité = 1/36 ≈ 2.8%.

L'effet précis pour chaque action des 5 rôles est à définir lors de l'implémentation des actions (issue dev liée). Pattern type : interdiction temporaire de réutiliser l'action, déclenchement d'événement, perte de ressource.

### 4.6 — Succès partiel

Trois patterns au choix selon l'action :

| Pattern | Exemple | Concrètement |
|---|---|---|
| **Succès + coût** | Hacker — *Intrusion système* | Caméra désactivée, mais +1 sur la jauge d'alerte |
| **Succès limité** | Infiltré — *Crochetage* | Coffre ouvert, mais ça prend 2 tours au lieu d'1 |
| **Succès conditionnel** | Faussaire — *Authentifier* | Tu vois la valeur, mais avec une marge d'erreur de ±20% |

Chaque action choisit son pattern dans son implémentation.

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

**Principe d'asymétrie** : chaque rôle a la même *quantité* d'actions (3 actions principales + 1 capacité passive). Ce qui change, c'est ce que ces actions *font* dans le système.

### 🟢 Hacker

- **Identité** : maîtrise des systèmes numériques. Voit ce que les autres ne voient pas. Influence à distance.
- **Capacité passive — Vision réseau** : peut consulter une fois par tour la jauge d'alerte avec un cran de granularité supplémentaire. Sait si un événement Sécurité approche.
- **Action 1 — Intrusion système** : désactive temporairement une caméra/capteur (1 tour). *Risque : Moyen.*
- **Action 2 — Collecte de données** : récupère des Crédits, avec une chance (~30%) de produire un Dossier à la place. *Risque : Faible.* Principale source de leviers de l'équipe.
- **Action 3 — Surcharge** ⭐ *(emblématique)* : court-circuite un système majeur (coffre, ascenseur, alarme). Débloque une zone autrement inaccessible. *Risque : Élevé.*
- **Synergie** : Infiltré.

### 🟡 Faussaire

- **Identité** : maître des faux papiers, des tromperies physiques, de la valeur transformée.
- **Capacité passive — Œil d'expert** : voit la **vraie valeur** du butin que les autres voient en estimation floue. Force asymétrique pour l'acte 3.
- **Action 1 — Faux ordre** : génère un faux document qui débloque une porte ou trompe un PNJ. *Risque : Faible.*
- **Action 2 — Substitution** : place un faux dans le coffre à la place d'un lot venant d'être récupéré. **Le butin réel reste dans le pot commun.** Sa nature exacte (vraie valeur vs estimée) est cachée à tous sauf au Faussaire. Effet visible : "le Faussaire a substitué" annoncé. *Risque : Faible.* **Cette action ne vole rien — elle crée du flou informationnel pour préparer la bascule de l'acte 3.**
- **Action 3 — Authentifier** ⭐ *(emblématique)* : évalue précisément un lot de butin. Révèle sa vraie valeur à lui seul (tablette tournée). Peut mentir aux autres. Sur certains coffres-forts spéciaux, peut révéler un Dossier. *Risque : Faible.*
- **Synergie** : Négociateur.

### 🟣 Infiltré·e

- **Identité** : présence physique dans la banque, accès aux zones interdites.
- **Capacité passive — Couverture** : ses actions ratées font monter la jauge d'alerte de moitié.
- **Action 1 — Reconnaissance** : explore une nouvelle zone, révèle son contenu pour tous. Peut découvrir un Dossier abandonné dans certaines zones. *Risque : Faible.*
- **Action 2 — Détournement de garde** : occupe un PNJ pendant un tour. Permet à d'autres d'agir sur sa zone sans risque. *Risque : Moyen.*
- **Action 3 — Crochetage** ⭐ *(emblématique)* : ouvre un coffre/porte sécurisée *physiquement* (sans Hacker). Plus lent mais ne dépend de personne. *Risque : Moyen.*
- **Synergie** : tous.

### 🌹 Négociateur·rice

- **Identité** : la voix, les deals. Manipule par la parole.
- **Capacité passive — Magnétisme** : peut, une fois par tour, modifier le résultat d'un dé d'un autre joueur de ±1, en dépensant 1 Crédit.
- **Action 1 — Persuader un PNJ** : évite un événement Sécurité en parlant. *Risque : Moyen.*
- **Action 2 — Marchandage** : augmente la valeur d'un lot de butin déjà collecté. *Risque : Faible.*
- **Action 3 — Pacte secret** ⭐ *(emblématique)* : tablette tournée, propose un pacte privé à un autre joueur, parmi 3 templates cadrés. Cf. section 8 pour le détail. *Risque : Faible.*
- **Synergie** : Faussaire + Observateur.

### 🔵 Observateur

- **Identité** : pilote un drone furtif à l'intérieur de la banque depuis l'extérieur. Présent sur la maquette via un sprite drone distinct (32×32, plus petit que les avatars 48×48).
- **Capacité passive — Vue tactique** : voit tout le layout révélé même si son drone n'y est pas. Sait où sont PNJ et caméras à chaque tour.
- **Action 1 — Reconnaissance drone** : déplace le drone, révèle une zone non explorée *sans risque pour les avatars humains*. *Risque : Faible.*
- **Action 2 — Brouillage** : zone large brièvement aveuglée (caméras + capteurs) pendant 1 tour. *Risque : Moyen.* Drone peut être détecté.
- **Action 3 — Œil dans le ciel** ⭐ *(emblématique)* : marque une cible. Pendant 2 tours, toutes les actions des autres joueurs sur cette cible bénéficient d'un bonus. Sur un PNJ, peut produire un Dossier Identité. *Risque : Faible.*
- **Tension propre** : drone à **3 PV**. Endommagé par actions risquées et détection. Si détruit → pénalité permanente -2 sur tous ses jets jusqu'à fin de partie.
- **Synergie** : multiplicateur global.

---

## 6. Information privée — leviers et secrets

### 6.1 — Objectif privé

*(G4 — légèrement tordu)*

- Révélé en début d'acte 1 (tablette tournée), jamais montré aux autres pendant le casse.
- Aligné avec la coop, mais avec un twist personnel.
- Vérification à l'acte 3 uniquement *(G10)*.
- Réussite donne **+2 Crédits convertis en butin** + mention narrative au bilan.
- Table complète et règles de tirage : section 7.

### 6.2 — Crédits *(ressource générique)*

Compteur numérique simple par joueur. Représente narrativement *"de la pression accumulée, des petits secrets, des micro-leviers"*.

**Visibilité** : total visible **uniquement par le joueur** sur son HUD personnel.

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
- Acte 2 : booster un dé (cf. §4.4), alimenter le Magnétisme du Négociateur, payer un Pacte secret.
- Acte 3 : acheter des **garanties** *(coût en spec/)*.
- **Les Crédits non dépensés à l'acte 3 sont perdus.** Tension économiser vs dépenser.

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

**Note design — Dossier Identité** : la révélation est *partielle* (cible uniquement, pas la condition) pour préserver le bluff au vote final. Une 2e Identité sur la même cible peut révéler un *aspect* de la condition (ex: "ça concerne ses Crédits") sans préciser plus.

---

## 7. Objectifs privés tordus *(G10)*

### 7.1 — Cadre

- **Vérification** : à l'acte 3 uniquement.
- **Récompense uniforme** : +2 Crédits convertis en butin individuel + mention narrative au bilan.
- **Distribution** : pool par rôle + algorithme anti-blocage (cf. §7.4).
- **Pool total** : 30 objectifs (6 par rôle).
- **Mix d'axes** : économique, comparatif, action, narratif.

### 7.2 — Table des 30 objectifs

#### 🟢 Hacker

| # | Code | Objectif | Axe |
|---|---|---|---|
| H1 | `solo-perfect` | Termine sans avoir échoué une seule action *Intrusion système* ou *Surcharge* | Action |
| H2 | `data-collector` | Termine avec **au moins un Dossier de chaque type** (Compromettant, Accès, Identité) | Économique |
| H3 | `quiet-pro` | Termine la partie avec une jauge d'alerte finale **inférieure à 60%** | Action |
| H4 | `richer-than-faussaire` | À l'acte 3, aie strictement **plus de Crédits que le Faussaire** | Comparatif |
| H5 | `power-trip` | Réussis au moins **2 Surcharges** dans la partie | Action |
| H6 | `info-hoarder` | Sois le joueur ayant **récolté le plus de Dossiers** sur la partie | Comparatif |

#### 🟡 Faussaire

| # | Code | Objectif | Axe |
|---|---|---|---|
| F1 | `master-of-coin` | Termine avec au moins **2 lots de butin authentifiés** par toi-même | Action |
| F2 | `serial-substitute` | Réussis au moins **3 Substitutions** durant la partie | Action |
| F3 | `truth-keeper` | Aucun joueur ne doit révéler que tu as menti sur la valeur d'un lot | Narratif |
| F4 | `richer-than-hacker` | À l'acte 3, aie strictement **plus de Crédits que le Hacker** | Comparatif |
| F5 | `coffer-keeper` | Le **butin total final** de l'équipe doit être au moins **élevé** *(seuil chiffré en `spec/calcul-butin`)* | Économique |
| F6 | `info-broker` | Donne au moins **1 Dossier** à un autre joueur via Échange direct | Narratif |

#### 🟣 Infiltré

| # | Code | Objectif | Axe |
|---|---|---|---|
| I1 | `explorer` | Sois le joueur ayant **révélé le plus de zones** de la banque | Comparatif |
| I2 | `master-locksmith` | Réussis au moins **2 Crochetages** durant la partie | Action |
| I3 | `unbreakable` | Termine la partie sans avoir subi **aucun échec critique** (2 naturel) | Action |
| I4 | `kingpin` | Sois le joueur avec **le plus de butin** au calcul final | Comparatif |
| I5 | `loyal-soldier` | Vote *Loyal* à l'acte 3 ET aie au moins **1 Pacte de loyauté tenu** | Narratif |
| I6 | `lone-wolf` | **Refuse au moins 2 propositions de Pacte secret** durant la partie | Narratif |

#### 🌹 Négociateur

| # | Code | Objectif | Axe |
|---|---|---|---|
| N1 | `peacemaker` | Termine la partie avec au moins **2 Pactes secrets tenus** | Narratif |
| N2 | `silver-tongue` | Utilise ton **Magnétisme** au moins **3 fois** durant la partie | Action |
| N3 | `kingmaker` | Sois le joueur ayant fait **gagner le plus de Crédits aux autres** (via Magnétisme et Échanges) | Comparatif |
| N4 | `string-puller` | Au moins **2 autres joueurs** doivent avoir voté *Loyal* grâce à un Pacte avec toi | Narratif |
| N5 | `keep-your-word` | Tous tes Pactes de loyauté doivent être **tenus** à l'acte 3 | Narratif |
| N6 | `active-banker` | Termine avec au moins **4 Crédits** restants **après avoir utilisé Magnétisme au moins 2 fois** | Économique |

#### 🔵 Observateur

| # | Code | Objectif | Axe |
|---|---|---|---|
| O1 | `eagle-eye` | Aie marqué au moins **3 cibles différentes** avec *Œil dans le ciel* | Action |
| O2 | `intact-drone` | Termine la partie avec ton **drone à 3 PV** (intact) | Action |
| O3 | `omniscient` | Sois le **premier à révéler** au moins 2 zones de la banque (avant les autres) | Comparatif |
| O4 | `support-class` | Au moins **3 actions des autres joueurs** doivent avoir bénéficié d'un bonus de ton *Œil dans le ciel* | Action |
| O5 | `from-the-shadows` | Termine sans avoir activé aucun Dossier ni avoir voté *Trahir* | Narratif |
| O6 | `info-supremacy` | Termine avec au moins **2 Dossiers Identité** dans ton inventaire | Économique |

### 7.3 — Principes de design appliqués

1. Aucun objectif ne demande de saboter activement la coop (respect strict de G6).
2. Tout objectif est atteignable dans une partie normale.
3. La majorité des objectifs sont réalisables sans aller contre les autres ; le twist vient d'un ajustement de comportement.
4. ~5-6 objectifs sur 30 créent une légère tension (Niveau 2) : H4, F4, H6, I4, F5, N4. C'est ce qui donne la couleur "tordue".
5. Les objectifs comparatifs sont calibrés pour ne pas se déclencher trop facilement.

### 7.4 — Algorithme de tirage anti-blocage

À chaque distribution :

1. Pour chaque joueur, tirer un objectif aléatoire dans le pool de son rôle.
2. Vérifier les **paires bloquantes dures** dans la configuration globale :

| Paire | Action |
|---|---|
| **H4 ↔ F4** | Bloquante (mutuellement impossibles) — re-tirer |
| Toute autre paire | Tension douce — autoriser |

3. Si une paire bloquante est détectée, re-tirer pour le joueur dont l'objectif a été tiré en dernier dans la séquence.
4. Garantir que chaque joueur reçoit *exactement un* objectif.

---

## 8. Pacte secret — détail *(G9)*

L'action emblématique du Négociateur. Pacte privé entre 2 joueurs, choisi parmi 3 templates cadrés.

### 8.1 — Règles globales

| | |
|---|---|
| Limite par partie | **3 Pactes max** (toutes templates confondues) |
| Confirmation | **2 parties** (tablette tournée pour chaque) |
| Visibilité publique | Le fait du Pacte oui, le contenu non |
| Coût pour proposer | **1 Crédit** (anti-spam) |
| Révélation au bilan | Tous les Pactes révélés (type, termes, tenu/rompu) |
| Si la cible refuse | Pacte annulé sans coût supplémentaire |

### 8.2 — Template 1 : 🤝 Pacte de loyauté

**Termes** : "On vote tous les deux *Loyal* à la fin."

**Mécanisme** : confirmation des deux. Au vote acte 3, le système vérifie automatiquement les votes.

**Issues** :
- **Tenu** (les 2 votent Loyal) : **+1 Crédit converti en butin** pour chacun.
- **Rompu** (au moins un vote Trahir) : celui qui a tenu reçoit une **compensation de 1 Crédit converti en butin**. Pas de pénalité système pour celui qui a rompu — conséquence narrative à la révélation publique.

### 8.3 — Template 2 : 💰 Échange direct

**Termes** : "Je te donne X, tu me donnes Y." (Crédits ou Dossiers, dans n'importe quelle combinaison.)

**Mécanisme** : confirmation des deux. Transfert immédiat. Pacte clos instantanément.

**Issues** : aucune conséquence acte 3.

### 8.4 — Template 3 : 🛡️ Protection de vote allégée

**Termes** : "Si tu votes *Trahir*, j'annule mon propre vote."

**Mécanisme** : confirmation des deux. À l'acte 3 :
- Si la cible vote **Trahir** → le vote du Négociateur compte comme **abstention** (ni Loyal ni Trahir).
- Si la cible vote **Loyal** → pacte caduc, le Négociateur vote librement.

**Effet de l'abstention** : le Négociateur reçoit la **moitié de la part Loyal**. Pas pénalisé comme un trahi, pas récompensé comme un loyal. Sécurité partielle face à la trahison surprise.

**Rachat possible** : la cible peut **rompre le pacte avant le vote en payant 5 Crédits**. Si elle paie, elle vote librement et le Négociateur aussi. Crée un dilemme : "j'ai sécurisé X mais X peut quand même me lâcher s'il y met le prix".

---

## 9. Tablette tournée

*(G5 — occasionnel : 3-5 fois par partie en moyenne)*

La tablette tournée est un **événement narratif**. Quand elle bouge, les autres joueurs voient qu'une info est révélée, mais pas laquelle. La suspicion monte par le geste lui-même.

**Cas d'usage** :
- Distribution des objectifs privés (acte 1, une fois par joueur)
- Événement de rôle pendant l'acte 2 (3-5 fois par partie sur l'ensemble des joueurs)
- Phase pré-vote acte 3 (consultation Crédits + Dossiers)
- Vote final (acte 3, une fois par joueur)
- Pacte secret du Négociateur (proposition + acceptation)
- Authentifier du Faussaire (sur action)

Total moyen sur une partie : ~5-7 manipulations par joueur.

---

## 10. Jauge d'alerte

Indicateur global et permanent de la tension du casse. Visible en HUD bas de l'écran.

**Fonctions** :
- Pilote l'éclairage global *(cf. ART.md — cool / tendu / chaud / critique)*.
- Modifie les seuils de réussite des dés (cf. §4.3 — modificateurs négatifs par zone).
- Déclenche des événements de tour à seuils.
- Si elle atteint le max → fin forcée de l'acte 2 → passage à l'extraction.

**Sources de montée** *(à chiffrer en spec/)* :
- Échecs d'actions (sauf Infiltré, capacité passive)
- Actions risquées (Surcharge du Hacker notamment)
- Événements de tour défavorables
- Détection du drone de l'Observateur

**Sources de descente** :
- Action *Persuader un PNJ* du Négociateur (sur événement Sécurité réussi)
- Certains événements favorables

Paramètres numériques précis à spécifier en spec/.

---

## 11. Acte 3 en détail — la bascule

### 11.1 — Phase pré-vote (ordre libre, ~2 min)

Chaque joueur, à tour de rôle, peut :

1. **Activer un Dossier Identité** sur une cible → révélation indice partiel à tous.
2. **Acheter une garantie** avec ses Crédits → protection partielle contre la trahison *(coût et effet exact en spec/)*.
3. **Réclamer le respect d'un Pacte secret** non encore déclenché.
4. **Racheter un Pacte de Protection** *(5 Crédits)* si la cible souhaite recouvrer sa liberté de vote.

Phase plafonnée en temps pour éviter l'enlisement.

### 11.2 — Vote secret simultané

Tablette tournée vers chacun, à la suite. Choix *Loyal* ou *Trahir*. Aucun retour visible aux autres. Une fois tous les votes récoltés → révélation simultanée.

### 11.3 — Calcul des gains et bilan

Algorithme général :

1. Base selon la configuration des votes (tous loyaux / un traître / plusieurs).
2. Modulation par les Dossiers Compromettant et Accès activés.
3. Modulation par les garanties achetées.
4. Application des conséquences de Pactes secrets (Loyauté, Protection allégée).
5. Vérification de chaque objectif privé → +2 Crédits convertis en butin si rempli + mention narrative.

Formules précises à spécifier en `spec/calcul-butin`.

---

## 12. 🔲 À spécifier *(reste game design)*

Ces points sont **conçus dans l'esprit** mais pas chiffrés ou détaillés. Chacun fait l'objet d'une issue `spec/game-design`.

| # | Sujet | Description courte |
|---|---|---|
| 1 | Jauge d'alerte chiffrée | Seuils numériques exacts, déclenchement événements, conséquences précises |
| 2 | Table d'événements de tour | Banque ≥20 événements, déclenchement selon jauge, effets |
| 3 | Layout de banque | Génération, variabilité, contraintes d'équilibrage |
| 4 | Calcul du butin | Composition d'un lot, fourchettes de valeur, formules de partage acte 3 |
| 5 | Scaling 3/4/5 joueurs | Rôles obligatoires, ajustements de difficulté, équilibrage |
| 6 | Tension propre Infiltré et Négociateur | Compléter (à ce stade, ces deux rôles sont un peu plats côté contrainte personnelle) |
| 7 | Effet exact des garanties (acte 3) | Coût en Crédits, type de protection, interaction avec les Dossiers |
| 8 | Effets d'échec critique par action | 1 effet narratif spécifique pour chacune des 15 actions |
| 9 | Seuil chiffré de F5 *coffer-keeper* | "Butin total élevé" = combien exactement, dépend de spec/calcul-butin |
| 10 | Objectifs privés "secrets de groupe" *(passe 2)* | Mécanique d'alliance secrète où plusieurs joueurs partagent un objectif |

---

## 13. Liens

- `docs/DECISIONS.md` — registre des décisions structurantes (D1-D8 + G1-G10)
- `src/adventures/banque-lune/ART.md` — DA bible visuelle du Casse
- `docs/ROADMAP.md` — jalons M1-M5
- `docs/ADVENTURES_GUIDE.md` — contrat Adventure générique

---

*Fin du GAMEPLAY.md v2. Pour toute reprise de design, mettre à jour ce document en priorité — il fait autorité.*
