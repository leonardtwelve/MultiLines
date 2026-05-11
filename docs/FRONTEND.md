# FRONTEND — Le Casse de la Banque Lune

> ⚠️ **Document v1 partiellement obsolète — pivot Jackbox du 12 mai 2026.**
>
> La **§2 Plateau interactif** ci-dessous décrit le modèle initial "zones discrètes" (F2). Suite au pivot, la mise en œuvre devient **map continue tile-based** (F12-F15) — les 9 zones canoniques restent en arrière-plan logique (F14) mais le rendu n'a plus de séparation physique. Les principes de §1 et la liste des écrans/composants à spécifier restent valides.
>
> Autres changements depuis cette v1 :
> - §2.8 "tap / long press / drag" décrit l'interaction côté tablette unique. Avec G5 amendée + F9, l'**interaction privée** (proposition d'action, vote secret, consultation Crédits/Dossiers/objectif privé) passe désormais par le **smartphone Player**, pas la tablette.
> - §2.1 mentionne "F1 Z9 en haut" comme principe — F1 amendée a généralisé ce principe sans référence à Z9 spécifiquement.
>
> Refonte complète prévue dans le **Prompt 3** (refonte front post-serveur). En attendant, voir aussi `docs/DECISIONS.md` (F9-F20).

> Spec design front faisant autorité pour la première aventure de Pixel Quests.
> Couvre le plateau interactif, les écrans, et les composants d'UI.
>
> À lire avec :
> - `docs/GAMEPLAY.md` — la spec mécanique
> - `src/adventures/banque-lune/ART.md` — la DA visuelle (palette, sprites, ambiance)
> - `docs/DECISIONS.md` — les décisions structurantes (D1-D8, G1-G10, F1-F20)
>
> Statut : **draft v1** — section plateau interactif spécifiée. Sections écrans et composants à compléter dans une prochaine passe.
>
> **Frontière avec ART.md** : ART.md couvre le **visuel pur** (palette, sprites, ambiance, animations). FRONTEND.md couvre le **structurel et l'interactif** (layouts, interactions, navigation, composants). Les deux sont complémentaires et ne se répètent pas.

---

## 1. Principes directeurs

- **"Maquette vivante"** : le plateau est représenté comme une maquette vue du dessus, pas un environnement 3D ni un simple tableau de données. Les sprites animent les zones en permanence (animations d'ambiance discrètes mais permanentes, cf. ART.md).
- **Lisibilité d'ensemble > détail par zone** : on doit pouvoir voir tout le plateau d'un seul coup d'œil. Pas de scroll. Les détails s'obtiennent par interaction (long press) ou par les modales d'action.
- **Schéma narratif assumé** *(F1)* : la maquette n'est pas une carte fidèle. C'est un plan tactique où l'organisation spatiale sert le gameplay et la lisibilité, pas le réalisme architectural. Z9 (toit) en haut du plan est cohérent dans cette grille de lecture.
- **Tablette en paysage, joueurs autour** : les interactions sont conçues pour être visibles par tous les joueurs et claires depuis n'importe quel angle de table.

---

## 2. Le plateau interactif

### 2.1 — Nature du plateau *(F2)*

**Zones discrètes avec sprites vivants** (Option C dans la session de design).

- Le plateau est un **graphe de zones** (pas une grille tile-based, pas de pathfinding).
- Chaque zone est un **conteneur visuel** dans lequel les sprites d'avatars peuvent s'animer librement (mouvement d'ambiance, idle).
- Les **actions** ciblent une zone ou un objet dans une zone, jamais une coordonnée précise.
- Le **déplacement** d'un avatar entre zones est une **transition visuelle** (sprite glisse d'une zone à l'autre), pas un déplacement libre dans l'espace.

### 2.2 — Caractéristiques du plateau

| Aspect | Décision | Référence |
|---|---|---|
| Nombre de zones par layout | 7-9 zones | F2 |
| Visibilité initiale | Fog partiel — structure visible, contenus cachés | F3 |
| Présence simultanée | Illimitée par zone | F4 |
| Coût du déplacement | Libre avant l'action (pas une action en soi) | F5 |
| PNJ | Sprite générique visible, sans individualité narrative | F6 |
| Variabilité du layout | **Layout fixe** pour le MVP, contenus variables d'une partie à l'autre | F7 |
| Affichage | **Tout sur un écran sans scroll**, résolution interne 480×270 scalée | F8 |

### 2.3 — Le layout type du Casse de la Banque Lune

Le layout est **fixe** : sa topologie ne change pas entre deux parties. Ce qui varie, c'est le **contenu** des zones (où est le butin, quels Dossiers, quels événements y déclenchent, etc.).

#### Les 9 zones canoniques

| # | Zone | Type | Contient | Connectée à |
|---|---|---|---|---|
| Z1 | **Parvis** | Sortie | Drone départ, point d'extraction frontal | Z2 |
| Z2 | **Hall principal** | Public | 1-2 PNJ employés, comptoir | Z1, Z3, Z5 |
| Z3 | **Bureaux** | Interne | Terminaux, dossiers papier | Z2, Z4 |
| Z4 | **Salle de pause** | Interne | PNJ employés, opportunité Détournement | Z3, Z6 |
| Z5 | **Sas sécurité** | Restreint (verrouillé) | Sas verrouillé, caméras | Z2, Z7 (si débloqué) |
| Z6 | **Couloir technique** | Restreint (verrouillé) | Serveurs, panneau électrique | Z4, Z8, Z9 |
| Z7 | **Salle des coffres** | Cœur | 3-4 coffres, butin principal | Z5 |
| Z8 | **Bureau du directeur** | Cœur | Coffre-fort spécial, Dossiers possibles | Z6 |
| Z9 | **Toit** | Sortie alternative | Point d'extraction par les hauteurs | Z6 (escalier) |

#### Topologie

```
                [Z9 Toit]
                    ↑ escalier
[Z1 Parvis] ─ [Z2 Hall] ─ [Z5 Sas] ─ [Z7 Coffres]
                  │
              [Z3 Bureaux]
                  │
              [Z4 Pause] ─ [Z6 Couloir] ─ [Z8 Directeur]
```

#### Verrouillage initial et déblocage

| Zone | Verrouillée au départ ? | Comment débloquer |
|---|---|---|
| Z1 Parvis | Non (extérieur) | — |
| Z2 Hall | Non | Toujours accessible |
| Z3 Bureaux | Non | Reconnaissance |
| Z4 Pause | Non | Reconnaissance |
| Z5 Sas | **Oui** | Hacker (Surcharge) ou Faussaire (Faux ordre) |
| Z6 Couloir | **Oui** | Reconnaissance + Faux ordre |
| Z7 Coffres | **Oui** | Z5 débloquée + Crochetage/Surcharge |
| Z8 Directeur | **Oui** | Z6 débloquée + Crochetage |
| Z9 Toit | **Oui** | Z6 débloquée |

#### Caractérisation thématique des zones

Chaque zone hérite d'une **teinte dominante** de la palette plateforme (cf. ART.md) selon son type :

- **Sorties (Z1, Z9)** : bleu glacé `#85b7eb` — neutralité, ouverture, extérieur
- **Public (Z2)** : bleu nocturne `#11182b` dominant — lieu social calme
- **Interne (Z3, Z4)** : variations grisées `#252d45` — fonctionnel
- **Restreint (Z5, Z6)** : néons cyan/magenta plus forts — alerte sécurité
- **Cœur (Z7, Z8)** : ambre `#ffc83a` pulsant — valeur, butin

#### Densité d'animations par zone

| Zone | Densité d'animations |
|---|---|
| Z1 Parvis | Faible (drone, néons distants) |
| Z2 Hall | Moyenne (employés en mouvement, écrans) |
| Z3 Bureaux | Faible (lumières clignotantes) |
| Z4 Pause | Moyenne (machine à café, néons) |
| Z5 Sas | Faible (caméras pivotantes) |
| Z6 Couloir | Forte (serveurs, fans, hologrammes) |
| Z7 Coffres | Très forte (coffres luminescents) |
| Z8 Directeur | Faible (silencieux, tendu) |
| Z9 Toit | Faible (vent, néons distants) |

### 2.4 — Affichage *(F8)*

- **Résolution interne** : 480×270 (cf. ART.md), scalée 2x ou 3x à l'affichage final (960×540 ou 1440×810).
- **Mode plein écran tablette en paysage** : le plateau occupe la majeure partie de l'écran, avec le HUD bas (jauge d'alerte, tour, butin, temps) en surimpression.
- **Pas de scroll, pas de zoom** : tout le plateau est visible simultanément.
- **Pas de mini-map** : superflu si tout est visible.

#### Répartition spatiale indicative (résolution interne 480×270)

```
┌─────────────────────────────────────────────┐
│  HUD HAUT (titre tour, joueur actif)        │ 24px
├─────────────────────────────────────────────┤
│                                             │
│           PLATEAU (9 zones)                 │ ~210px
│                                             │
├─────────────────────────────────────────────┤
│  HUD BAS (4 zones : tour | butin | alerte | temps)│ 36px
└─────────────────────────────────────────────┘
```

À 2x scaling, on a 960×540 — confortable pour 9 zones lisibles.

### 2.5 — Représentation visuelle d'une zone

Chaque zone est une **boîte rectangulaire** sur le plateau, avec :

- Un **fond** coloré selon le type de la zone (cf. §2.3 — caractérisation thématique).
- Un **contour** discret (1-2 px), plus épais et lumineux quand la zone est verrouillée ou récemment activée.
- Un **label** discret (nom court de la zone) en bas à gauche, en typographie m5x7 (cf. ART.md).
- Des **sprites animés** : avatars présents (48×48), PNJ (32×32), objets interactifs (coffres, terminaux).
- Des **icônes d'état** quand pertinent : 🔒 pour verrouillé, ⚠️ pour alerte locale, ⭐ pour zone-cœur avec butin.

Les zones non encore explorées sont **assombries** (overlay 60% noir) pour matérialiser le fog partiel : leur structure se voit, leur contenu est masqué.

### 2.6 — Connexions entre zones

Les connexions entre zones sont **représentées visuellement** par :

- Des **portes** ou **sas** pour les passages standards (animation discrète d'ouverture/fermeture).
- Des **flèches en pointillés** quand le passage est "narratif" (ex: escalier vers Z9 — on ne voit pas l'escalier, juste l'indication).
- Une porte verrouillée affiche un **cadenas pixel art** sur la connexion. Une porte ouverte ne l'affiche plus.

Pas de représentation de couloir ni d'espace vide entre les zones — les connexions sont des liens, pas des chemins parcourus visuellement.

### 2.7 — Présence des avatars dans les zones

- Quand un avatar est dans une zone, son sprite (48×48) est positionné **dans la boîte de la zone**, à une position légèrement randomisée pour éviter la superposition stricte.
- Les sprites ont une **animation idle** subtile (respiration, regard qui bouge) pour donner vie aux scènes.
- Si plusieurs avatars sont dans la même zone, ils sont alignés de gauche à droite, avec un léger offset vertical.
- Le **drone de l'Observateur** (32×32) est représenté distinctement, *au-dessus* des avatars, avec un petit halo cyan pour le différencier.

### 2.8 — Interactions tactiles

| Geste | Effet |
|---|---|
| **Tap sur une zone** | Sélection : focus visuel sur la zone, affichage du panneau d'info latéral (zone + contenu visible + actions disponibles depuis cette zone) |
| **Tap sur une action** (depuis le HUD ou le panneau) | Exécution : l'action s'applique à la zone sélectionnée ou à un sous-élément spécifique |
| **Long press sur une zone** | Affichage d'une fiche détaillée (lore, état, contenu si visible) |
| **Long press sur un avatar / PNJ / objet** | Info contextuelle (qui c'est, quel état) |
| **Drag** | **Réservé au drone de l'Observateur** : drag pour déplacer le drone d'une zone à l'autre. Aucun autre élément n'est draggable. |

#### Précisions importantes

- **Aucune interaction ne se fait à l'aveugle** : un tap sur une zone qui n'est pas accessible (ex: verrouillée) affiche un message clair indiquant ce qui manque pour la débloquer.
- **Le focus de sélection est visuel** : la zone sélectionnée est entourée d'un contour lumineux dans la couleur du joueur courant.
- **Pas de double-tap** : trop ambigu sur tablette partagée.

### 2.9 — Mouvement d'avatar

Quand un joueur déplace son avatar d'une zone à une autre :

1. Le système vérifie que les deux zones sont **connectées et débloquées**.
2. Animation : le sprite **glisse** de la zone source à la zone destination, en suivant une ligne droite (~0.5s).
3. Pas de pathfinding ni d'animation de marche complète — c'est une transition narrative.
4. Pendant la transition, le joueur ne peut pas agir.

Si la zone destination n'est pas accessible (verrouillée, non-connectée), le tap est rejeté avec un retour visuel (vibration discrète si supporté + message).

### 2.10 — Représentation des PNJ

- Les PNJ sont des **sprites génériques 32×32** avec 2-3 variantes visuelles (employé, garde, autre).
- Ils sont **statiques** dans leur zone (pas de patrouille entre zones pour le MVP). Cela simplifie le design et évite de tracker leurs déplacements.
- Une animation idle subtile leur donne vie (regard, posture).
- Quand un PNJ est **occupé** (Détournement, Persuader, etc.), une icône d'état apparaît au-dessus de lui (ex: point d'interrogation, étoiles tournantes).

### 2.11 — Représentation des objets interactifs

- **Coffres** : sprite distinct, animation luminescente quand débloqué, fermé sinon.
- **Terminaux** : icône avec effet glitch quand un Hacker y travaille.
- **Caméras** : sprite avec lentille rouge (active) ou éteinte (désactivée par Hacker ou Brouillage).
- **Panneau électrique** : icône cyan dans Z6, anime quand utilisé.

Le détail visuel précis de ces objets relève d'`ART.md` — FRONTEND.md ne fixe que leur **présence et leur comportement interactif**.

---

## 3. Écrans

> 🔲 Section à compléter dans une prochaine session de design.
>
> Couvrira : architecture des scènes (briefing acte 1, tour acte 2, vote acte 3, bilan), navigation entre scènes, états transitoires (notamment "tablette tournée"), gestion des modales.

---

## 4. Composants d'UI

> 🔲 Section à compléter dans une prochaine session de design.
>
> Couvrira : HUD personnel (Crédits, Dossiers, objectif privé), HUD partagé (jauge d'alerte, tour, butin, temps), panneau d'action latéral, modales (proposition de Pacte, vote final, briefing), composant "tablette tournée".

---

## 5. 🔲 À spécifier *(reste front)*

Ces points sont **conçus dans l'esprit** mais pas encore détaillés. Chacun fera l'objet d'une issue `spec/frontend` ou `spec/ux`.

| # | Sujet | Description courte |
|---|---|---|
| 1 | Architecture des écrans | Scènes Phaser : briefing, tour, vote, bilan + transitions |
| 2 | HUD personnel | Affichage Crédits, Dossiers, objectif privé sur tablette tournée |
| 3 | HUD partagé | Jauge d'alerte (4 paliers visuels), tour actif, butin courant, temps restant |
| 4 | Panneau d'action latéral | Liste des actions disponibles pour le joueur courant, costing en Crédits |
| 5 | Modale "tablette tournée" | UX de la rotation tablette, signal aux autres joueurs, retour à l'écran partagé |
| 6 | Modale Pacte secret | Proposition (Négociateur), confirmation (cible), affichage des termes |
| 7 | Modale vote final | UX du vote acte 3, révélation simultanée, animation de bascule |
| 8 | Écran de briefing | Sélection des rôles, distribution objectifs privés, plan d'attaque |
| 9 | Écran de bilan | Calcul gains, mention objectifs remplis, révélation Pactes |
| 10 | Animation transition zone | Mouvement d'avatar entre zones, timing, easing |
| 11 | Variabilité de contenu (F7) | Comment générer/varier le contenu des 9 zones d'une partie à l'autre — algo, paramètres, contraintes d'équilibrage |
| 12 | Représentation détaillée des coffres | Apparence visuelle, animations, états (fermé / débloqué / vidé) |

---

## 6. Liens

- `src/adventures/banque-lune/ART.md` — DA visuelle (palette, sprites, ambiance)
- `docs/GAMEPLAY.md` — spec mécanique (boucle, rôles, actions)
- `docs/DECISIONS.md` — registre des décisions structurantes
- `docs/ROADMAP.md` — jalons M1-M5
- `docs/ADVENTURES_GUIDE.md` — contrat Adventure générique

---

*Fin de FRONTEND.md v1. Pour toute reprise de design front, mettre à jour ce document en priorité — il fait autorité.*
