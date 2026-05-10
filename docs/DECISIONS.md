# DECISIONS

> Document vivant qui trace les décisions techniques structurantes du projet Pixel Quests.
>
> **Règle** : toute décision listée ici est figée. Pour la modifier, ouvrir une issue `[ADR]`, argumenter le changement, et amender ce document dans la même PR.
>
> Format inspiré des Architecture Decision Records (ADR) mais simplifié.

---

## D1 — Co-location des fichiers de tests

**Décidé le** : M1
**Statut** : Acté

### Décision
Les fichiers de tests vivent **à côté** des fichiers qu'ils testent, dans `src/`.

Exemple : `src/core/players/Player.ts` est testé par `src/core/players/Player.test.ts`.

Le dossier `tests/` à la racine est réservé aux tests d'intégration (cross-domaines) et aux fichiers de configuration de test (`setup.ts`, mocks globaux, fixtures partagées).

### Pourquoi
- Quand on lit un fichier source, on trouve son test sans naviguer.
- Lors d'un refactor (renommer, déplacer), on déplace test + source ensemble.
- Convention dominante en TS/JS moderne. Vitest, Jest, Bun la supportent nativement.

### Implications
- Vitest config : `include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`.
- ESLint : ne pas inclure les `*.test.ts` dans la couverture des règles de production (sinon on râle sur les `expect()`).
- Build de prod : exclure les `*.test.ts` (Vite le fait par défaut).

---

## D2 — Format des événements de l'EventBus

**Décidé le** : M1
**Statut** : Acté

### Décision
Les événements transitant par l'`EventBus` sont des **unions discriminées typées TypeScript**. Aucun événement n'est émis avec un type `string` brut.

```typescript
// src/core/types/events.ts
export type GameEvent =
  | { type: 'player.joined'; payload: { playerId: string; name: string } }
  | { type: 'turn.started'; payload: { playerId: string; turnNumber: number } }
  | { type: 'turn.ended'; payload: { playerId: string } }
  | { type: 'adventure.completed'; payload: { winnerId?: string } };
```

### Convention de nommage
- Format : `domaine.action`, en lowercase.
- Domaines `core/` : `player`, `turn`, `adventure`, `game`, `audio`, `ui`.
- Domaines `adventures/` : préfixés par l'id de l'aventure → `banque-lune.role-revealed`, `banque-lune.heist-started`.
- Pas de verbe au présent ("turn.start"), toujours au passé ("turn.started"). Un événement, c'est *quelque chose qui s'est passé*.

### Pourquoi
- TypeScript détecte les erreurs de payload à la compilation.
- Le préfixe `domaine.` empêche les collisions entre core et aventures.
- Le préfixe d'aventure dans les events spécifiques évite que deux aventures écoutent par erreur les events l'une de l'autre.

### Implications
- L'`EventBus` doit être typé : `emit<T extends GameEvent>(event: T)` et `on<TType>(type, handler)`.
- Tout nouvel événement nécessite une mise à jour de `events.ts`.
- Un test garde-fou vérifie que l'EventBus refuse à la compilation un event mal typé (test de types via `// @ts-expect-error`).

---

## D3 — Stratégie de couverture des tests

**Décidé le** : M1
**Statut** : Acté

### Décision
Couverture **différenciée par dossier**, vérifiée par la CI :

| Dossier              | Couverture min |
|----------------------|----------------|
| `src/core/**`        | 80%            |
| `src/adventures/**`  | 50%            |
| `src/app/**`         | aucune (UI thin, testée manuellement) |

Sous le seuil → la CI échoue.

### Règle d'or
**Toute nouvelle fonctionnalité dans `core/` arrive avec ses tests dans la même PR.** Non négociable.

Pour `adventures/`, on est plus souple : tests pour la logique métier (règles du jeu, calculs), pas obligatoires pour le code purement de présentation.

### Pourquoi
- `core/` est l'actif réutilisable du projet : il doit être robuste.
- Sur `adventures/`, beaucoup de code est UI/animation, difficile et coûteux à tester unitairement.
- 100% partout est contre-productif (tests bidons sur des getters).

### Implications
- Vitest config : seuils par chemin via `coverage.thresholds.perFile` ou config par projet.
- CI : `pnpm run test:coverage` après les tests, échoue si seuils non atteints.
- Le rapport de couverture est commenté sur les PR (action : `davelosert/vitest-coverage-report-action` ou équivalent).

---

## D4 — Workflow Git

**Décidé le** : M1
**Statut** : Acté

### Décision
**Trunk-based simplifié** :
- `main` : stable, déployable, protégée (pas de push direct, PR uniquement).
- `develop` : intégration continue, protégée.
- `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>` : branches de travail, partent de `develop`, mergées dans `develop` via PR.
- `develop` est mergée dans `main` aux jalons (M1, M2, M3...).

**Squash merge** sur les PR (un commit propre par PR sur `develop`).

### Conventions
- **Branches** : `feat/m2-tour-system`, `fix/eslint-config`, `chore/upgrade-vite`.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- **PR** : titre = sujet du commit final (squash). Description = lien vers issue + résumé.

### Branch protection
Sur `main` et `develop` :
- PR obligatoire (pas de push direct, même solo).
- CI verte requise pour merger.
- Au moins 1 review (auto-review acceptée pour solo).
- Pas de force push.

### Pourquoi
- Simple à comprendre, supporte solo et équipe.
- `develop` permet d'intégrer plusieurs features sans casser `main`.
- Squash merge garde un historique lisible.
- Les protections évitent les "oups j'ai pushé sur main".

### Implications
- Configurer les branch protection rules sur GitHub.
- Documenter dans `CONTRIBUTING.md`.

---

## D5 — Organisation des assets

**Décidé le** : M1
**Statut** : Acté

### Décision
Les assets sont rangés **par aventure**, sous-divisés par type.

```
src/adventures/banque-lune/assets/
├── sprites/
│   ├── characters/
│   │   ├── hacker/
│   │   │   ├── hacker_idle.png
│   │   │   ├── hacker_action.png
│   │   │   └── hacker.aseprite
│   │   └── ...
│   ├── tilesets/
│   └── ui/
├── audio/
│   ├── music/
│   └── sfx/
├── fonts/
└── data/
    └── dialogues.json
```

### Règle "asset partagé = preuve de réutilisation"
Un asset n'est promu dans `src/core/assets/` **qu'au moment où une 2e aventure en a besoin**, pas par anticipation.

### Pourquoi
- Isolation claire : un freelance bossant sur une aventure ne touche que son dossier.
- Évite la sur-généralisation prématurée (on ne sait pas à l'avance ce qui sera réutilisé).
- Cohérent avec la séparation `core/` ↔ `adventures/`.

### Implications
- Phaser charge les assets au démarrage de l'aventure (pas au démarrage de l'app), pour ne pas alourdir le chargement initial.
- Les chemins d'assets dans le code utilisent des constantes : `import { ASSETS } from './assets/manifest'`.

---

## D6 — Stratégie d'animations

**Décidé le** : M1
**Statut** : Acté

### Décision
**Sprite atlases** chargés et joués via un `AnimationManager` centralisé dans `src/core/animation/`.

- Outil de production : **Aseprite** (export `.json` + atlas PNG).
- Format d'atlas : "Phaser 3 array" ou "JSON Hash" (au choix de l'artiste, mais documenté).
- Chaque aventure déclare ses animations dans un manifeste : `src/adventures/banque-lune/animations.ts` qui exporte une liste typée.
- Le moteur les enregistre au chargement de l'aventure.

### Convention de nommage des animations
`{role|entity}.{action}` → `'hacker.idle'`, `'hacker.action'`, `'door.open'`.

### Pourquoi
- Performance GPU (un atlas = un draw call par sprite).
- Aseprite est l'outil de référence du pixel art moderne.
- Décorrélation entre déclaration (manifeste) et utilisation (scènes Phaser) : on peut référencer une animation par son nom sans connaître sa source.

### Implications
- Tout brief à un pixel artist mentionne : "livraison `.aseprite` + atlas exporté + screenshot".
- Le `AnimationManager` est testable : on lui donne un manifeste, on vérifie que les animations sont bien enregistrées.
- Les animations purement UI (transitions, fondus) restent gérées par les tweens Phaser, pas par l'`AnimationManager`.

---

## D7 — State management

**Décidé le** : M1
**Statut** : Acté — **décision la plus structurante du M1**

### Décision
**Store unique typé fait maison** dans `src/core/state/`.

- Une seule source de vérité par partie (`GameState`).
- Modifications uniquement via des **actions** définies (`startTurn`, `endTurn`, `playerJoined`...).
- Chaque action mute l'état (ou retourne un nouvel état immuable, à trancher en M2 selon les perfs Phaser) et émet un événement sur l'`EventBus`.
- Les aventures stockent leur état spécifique dans `state.adventureState`, typé par chaque aventure.

```typescript
interface GameState {
  players: Record<string, PlayerState>;
  currentTurn: { playerId: string; phase: TurnPhase; turnNumber: number };
  adventureState: unknown; // chaque aventure le caste vers son type
  status: 'setup' | 'playing' | 'ended';
}
```

### Pourquoi
- **Sauvegarde de partie** : on sérialise le store, c'est tout.
- **Tests** : on teste des actions sur un état initial, déterministe.
- **Debug** : on peut logger toutes les actions et reproduire un bug.
- **Évolutions futures** :
  - Replay / undo : possible si l'état est immuable.
  - Mode online un jour : on synchronise un store, pas un éparpillement de variables.
- Un Redux/Zustand externe est une dépendance et un paradigme à apprendre — pour un projet de cette taille, fait maison léger suffit. Si la complexité explose en M3, on pourra migrer vers Zustand sans gros refacto (l'API sera proche).

### Implications
- Pas d'état métier dans les classes Phaser. Les scènes Phaser **lisent** le store et **dispatchent** des actions. Elles ne contiennent pas la logique de jeu.
- Tous les services du moteur (TurnSystem, PlayerManager) sont des "façades" autour du store.
- Documenter le pattern dans `ARCHITECTURE.md` avec un schéma : Action → Store → EventBus → Listeners (UI, audio, sauvegarde).

---

## D8 — Format du manifest d'aventure

**Décidé le** : M1
**Statut** : Acté

### Décision
**Manifest enrichi** anticipant les besoins jusqu'à M5, avec des champs optionnels pour les phases ultérieures.

```typescript
export interface AdventureManifest {
  // identité
  id: string;
  version: string;                     // semver

  // affichage
  title: string;
  shortDescription: string;
  longDescription: string;
  thumbnail: string;
  banner: string;
  tone: 'leger' | 'tendu' | 'malicieux';
  tags: string[];

  // contraintes de jeu
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMin: number;
  difficulty: 'easy' | 'medium' | 'hard';

  // métadonnées
  contentRating: 'all' | '12+' | '16+';
  languages: string[];

  // commercial (optionnel, M5+)
  pricing?: {
    bundled: boolean;
    standalonePriceEur?: number;
  };
}
```

### Pourquoi
- Le coût d'anticipation est faible (juste écrire l'interface).
- Le coût de rattrapage est élevé (migration des manifests existants quand il y en aura 5).
- Les champs optionnels (`pricing?`) ne polluent pas tant qu'on ne les utilise pas.

### Implications
- Validation runtime du manifest au chargement : si un manifest est mal formé, l'aventure n'apparaît pas dans l'écran d'accueil et l'erreur est loggée.
- Le manifest est **statique** (constante TypeScript), pas chargé d'un JSON. Ça permet de bénéficier du typage à 100%.
- Si on fait du i18n plus tard, `title` / `descriptions` deviendront des clés de traduction.

---

# Décisions game design — Casse de la Banque Lune

> Ces décisions G1-G7 sont issues d'une session game design dédiée à la première aventure (Le Casse de la Banque Lune).
>
> Elles sont **aussi immutables que D1-D8** : aucune modification sans amendement formel (issue `[ADR]`, argumentation, mise à jour de ce document dans la même PR).
>
> À lire **conjointement avec** [`GAMEPLAY.md`](./GAMEPLAY.md) — qui détaille la mécanique entière issue de ces décisions et fait autorité sur les questions opérationnelles.

---

## G1 — Pilier mécanique

**Décidé le** : M1 (session game design Casse Lune)
**Statut** : Acté

### Décision
**Coop tendue → moment de bascule individuelle.**

La coopération est sincère pendant tout le casse (acte 1 + acte 2). La trahison n'est techniquement possible qu'à l'acte 3, via un vote secret simultané.

### Pourquoi
- Évite l'impasse sociale du traître caché à la *Loup-Garou* qui empoisonne toute discussion d'équipe.
- Concentre la dramatisation sur **un seul moment** (l'acte 3) au lieu de la diluer.
- Permet à des joueurs occasionnels de profiter du casse sans paranoïa permanente.

### Implications
- Aucune action de joueur ne peut nuire à un autre joueur en actes 1-2 (cf. G6).
- L'acte 3 doit être structurellement riche (pré-vote, vote, calcul) pour porter la charge dramatique — voir `GAMEPLAY.md §9`.
- Pas de mécanique « joueur attaque joueur » en acte 2.

---

## G2 — Système de résolution

**Décidé le** : M1
**Statut** : Acté

### Décision
**Choix d'action déterministe, dé de risque sur la réussite.**

Le joueur choisit son action ; le hasard ne porte que sur la réussite. Le dé est modifié par capacité du rôle, équipement, contexte, jauge d'alerte. Trois résultats : succès / succès partiel (avec coût) / échec.

### Pourquoi
- Le joueur doit toujours sentir qu'il a fait un vrai choix, même quand ça rate.
- Le hasard sur la réussite donne du frisson sans frustrer (un échec est compréhensible).
- Trois niveaux de résultat (vs binaire) ouvrent un espace de design pour les « succès coûteux » qui font monter l'alerte.

### Implications
- Pas d'action « carte piochée au hasard » dans le moteur du casse.
- Les Crédits permettent de booster (relance, +1) — ressource gérée par le joueur.
- La jauge d'alerte modifie les seuils de réussite : couplage gameplay/HUD.
- Chiffrage exact à `spec/grille-resolution`.

---

## G3 — Acte 3 : vote secret simultané

**Décidé le** : M1
**Statut** : Acté

### Décision
**Vote secret simultané** (Loyal / Trahir) en clôture du casse. Tablette tournée vers chaque joueur successivement, révélation simultanée à la fin.

### Pourquoi
- Crée un moment de bascule maximal (le suspense atteint son pic au moment de la révélation).
- Empêche les « votes par influence » (où un joueur s'aligne sur les votes déjà observés).
- Le geste de la tablette tournée porte le secret physiquement.

### Implications
- L'UI « tablette tournée » (PrivateView) est utilisée 1× par joueur en acte 3.
- Le vote n'est pas réversible une fois soumis.
- Logique de calcul des gains côté core (configurations vote → parts) : voir `GAMEPLAY.md §9.3` et `spec/calcul-butin`.

---

## G4 — Objectifs privés tordus

**Décidé le** : M1
**Statut** : Acté

### Décision
**Chaque joueur reçoit en acte 1 un objectif privé légèrement tordu** — aligné avec la coop mais avec un twist personnel. Sa réussite donne un bonus de butin individuel ou un effet narratif au bilan.

### Pourquoi
- Donne à chaque joueur une boussole personnelle qui colore ses choix sans le forcer à trahir.
- Le « twist » garde la place pour la trahison sans la rendre obligatoire.
- Les objectifs trop alignés coop n'apportent aucune tension ; trop trahison-orientés tueraient la coop.

### Implications
- Table d'objectifs ≥30 à concevoir (voir `spec/objectifs-prives`).
- Chaque objectif doit être **vérifiable mécaniquement** par le moteur en fin de partie.
- Le calcul des gains acte 3 prend en compte la réussite ou l'échec de l'objectif privé.

---

## G5 — Tablette tournée occasionnelle

**Décidé le** : M1
**Statut** : Acté

### Décision
**Usage occasionnel** : 3-5 fois par partie sur événements de rôle, plus la distribution des objectifs (acte 1, 1× par joueur) et le vote (acte 3, 1× par joueur). **Pas systématique.**

### Pourquoi
- Trop fréquent → friction physique pénible (tablette qui tourne en permanence).
- Trop rare → la dramaturgie du geste se perd.
- Le geste lui-même devient un signal narratif : « la tablette bouge, quelque chose se passe ».

### Implications
- Volume cible : **~5-7 manipulations par joueur** sur l'ensemble d'une partie.
- L'engine doit supporter un PrivateView interruptible et chaînable (déjà en place via `DomPrivateView`).
- Pas de pattern « tablette tournée à chaque tour » dans les designs futurs.

---

## G6 — Coop sincère stricte pendant le casse

**Décidé le** : M1
**Statut** : Acté

### Décision
Pendant **tout l'acte 2**, la coopération est sincère stricte. **Aucune trahison n'est possible techniquement.** Le moteur ne propose pas d'action « voler à un coéquipier » ou similaire.

### Pourquoi
- Garantit le pilier G1 (la coop tient pendant le casse).
- Évite que le bluff polluerait toutes les discussions, dévalorisant les conversations stratégiques.
- Les Crédits/Dossiers permettent de **préparer** la trahison sans la commettre — tension sans toxicité.

### Implications
- Pas de PvP en acte 2.
- Le butin amassé alimente un **pot commun**, pas des poches individuelles.
- Les leviers (Crédits, Dossiers) ne peuvent pas être utilisés contre des coéquipiers en acte 2 — leur dimension compétitive ne s'active qu'à l'acte 3.

---

## G7 — 5e rôle = Observateur (drone)

**Décidé le** : M1
**Statut** : Acté

### Décision
Le 5e rôle (à 5 joueurs) est l'**Observateur**, pilote d'un drone furtif depuis l'extérieur. Remplace le Conducteur initialement prévu.

### Pourquoi
- Le Conducteur « extérieur statique » ne participait pas vraiment au casse — frustrant pour le joueur qui l'incarnait.
- L'Observateur a une présence active via son drone (sprite distinct 32×32) et des actions complémentaires (reco, brouillage, marquage).
- Sa **tension propre** (drone fragile à 3 PV) crée un mini-jeu de gestion du risque intéressant.

### Implications
- Sprite drone 32×32 + jauge intégrité (3 PV) à intégrer (voir `ART.md §2.3`).
- Code rôle « conducteur » a été supprimé / remplacé dans PR #18 (alignement DA).
- L'Observateur garde sa **vue tactique** (capacité passive) même si son drone est détruit — assure son utilité jusqu'au bout.

---

## G8 — Système de résolution chiffré (2d6 + tables)

**Décidé le** : M1 (passe 2 game design)
**Statut** : Acté

### Décision
**2d6 modifiés** comme dé de risque, avec **tables d'interprétation** par niveau de risque (faible / moyen / élevé) qui définissent les seuils succès / succès partiel / échec. Modificateurs plafonnés à ±4. Boost en Crédits standardisé (+1 = 1¢ avant jet, relance = 2¢, annuler échec critique = 3¢). Échec critique = **2 naturel** (1/36 ≈ 2.8%).

Chiffrage complet dans `GAMEPLAY.md §4`.

### Pourquoi
- **Distribution en cloche** : modificateurs prévisibles, calibrage maîtrisé (ce qu'un d20 ne donne pas).
- **Lisibilité visuelle** : deux dés qui roulent à l'écran, cohérent avec la maquette vivante.
- **Référence familière** : Catan, jeux indé. Pas de courbe d'apprentissage tactile.
- Permet d'ouvrir un espace de design pour les **succès partiels** avec 3 patterns documentés (succès+coût, succès limité, succès conditionnel).

### Implications
- L'implémentation du système de résolution générique (issue dev) prend la grille de §4 comme spec figée.
- Les 15 actions des 5 rôles doivent chacune choisir leur pattern de succès partiel et leur effet d'échec critique (la liste précise reste à `spec/echec-critique`).
- Le HUD doit afficher les 2d6 en clair (pas de masquage) — la transparence du jet est essentielle au sentiment de fairness.

---

## G9 — Pacte secret cadré en 3 templates

**Décidé le** : M1 (passe 2 game design)
**Statut** : Acté

### Décision
L'action *Pacte secret* du Négociateur·rice n'autorise **que 3 templates fixes** : 🤝 Pacte de loyauté / 💰 Échange direct / 🛡️ Protection de vote allégée. Pas de pacte verbal libre. Coût d'émission **1 Crédit**, limite **3 Pactes/partie**.

Mécanique complète dans `GAMEPLAY.md §8`.

### Pourquoi
- Un pacte verbal libre est **invérifiable mécaniquement** par le moteur — le système ne peut pas tracer "tenu vs rompu" sans grille.
- **3 templates couvrent les trois axes** stratégiques : engagement de vote (Loyauté), transaction marchande (Échange), filet de sécurité (Protection allégée).
- Le coût de 1 Crédit empêche le **spam** de propositions tactiques. La limite de 3 par partie évite la saturation du dispositif.

### Implications
- Implémentation côté core : type `PactTemplate = 'loyalty' | 'exchange' | 'protection'`.
- Le Pacte de Protection introduit un mécanisme d'**abstention au vote** (½ part Loyal) qui doit être pris en compte par `spec/calcul-butin`.
- Les Pactes sont **révélés au bilan** (type, termes, tenu/rompu) — déclenche un moment narratif fort.
- Pas de roadmap de templates supplémentaires en M2 — si besoin, nouvelle ADR.

---

## G10 — Objectifs privés vérifiés acte 3, récompense uniforme

**Décidé le** : M1 (passe 2 game design)
**Statut** : Acté

### Décision
- **Vérification** : à l'acte 3 uniquement (pas de check incrémental pendant le casse).
- **Récompense uniforme** : **+2 Crédits convertis en butin** + mention narrative au bilan. Pas de bonus différencié selon difficulté.
- **Pool** : 30 objectifs (6 par rôle), répartis sur 4 axes (économique / comparatif / action / narratif).
- **Algorithme de tirage** : aléatoire dans le pool du rôle, avec re-tirage sur paires bloquantes dures (cf. §7.4).

Table complète dans `GAMEPLAY.md §7`.

### Pourquoi
- **Vérification acte 3** seulement : évite que le moteur dévoile mécaniquement la cible d'un objectif au cours du casse (préserve le bluff).
- **Récompense uniforme** : simplifie le calcul, évite le min-max sur les objectifs faciles. Le vrai gain de la réussite est narratif.
- **Pool fini de 30** : équilibrable, testable, anti-doublons. Les "secrets de groupe" sont reportés en passe 2 si l'expérience le justifie.
- **Anti-blocage** : la paire H4 ↔ F4 est mutuellement impossible (les deux veulent être plus riche que l'autre). La détecter au tirage évite une frustration sourde.

### Implications
- Chaque objectif a un **predicate** vérifiable mécaniquement par le moteur en fin de partie (pas d'objectif type "tu as roleplayé bien").
- Les objectifs comparatifs (`H6 info-hoarder`, `I1 explorer`, etc.) requièrent un **stockage des compteurs** côté store pendant tout le casse.
- F5 *coffer-keeper* dépend du `spec/calcul-butin` pour le seuil chiffré exact (issue dédiée).
- Si les playtests révèlent un objectif déséquilibré, on amende ce document + la table §7 dans la même PR.

---

## Index des décisions

| ID  | Sujet                                               | Statut |
|-----|-----------------------------------------------------|--------|
| D1  | Co-location des tests                               | Acté   |
| D2  | Format des événements                               | Acté   |
| D3  | Stratégie de couverture                             | Acté   |
| D4  | Workflow Git                                        | Acté   |
| D5  | Organisation des assets                             | Acté   |
| D6  | Stratégie d'animations                              | Acté   |
| D7  | State management                                    | Acté   |
| D8  | Format du manifest                                  | Acté   |
| G1  | Pilier mécanique (coop tendue → bascule)            | Acté   |
| G2  | Système de résolution (choix + dé de risque)        | Acté   |
| G3  | Acte 3 : vote secret simultané                      | Acté   |
| G4  | Objectifs privés tordus                             | Acté   |
| G5  | Tablette tournée occasionnelle                      | Acté   |
| G6  | Coop sincère stricte pendant le casse               | Acté   |
| G7  | 5e rôle = Observateur (drone)                       | Acté   |
| G8  | Système de résolution chiffré (2d6 + tables)        | Acté   |
| G9  | Pacte secret cadré en 3 templates                   | Acté   |
| G10 | Objectifs privés vérifiés acte 3, récompense uniforme | Acté |

---

## Prochaines décisions probables (M2)
- Format de sauvegarde (JSON local ? IndexedDB ? quel chiffrement ?)
- Internationalisation : i18next ou fait maison ?
- Gestion des secrets de jeu (rôles cachés) côté client : comment éviter qu'un joueur curieux ouvre les devtools et lise le rôle des autres ?
- Format des dialogues / scénario (Twine ? YAML ? code TS ?)
- Stratégie de chargement progressif des assets pour démarrage rapide
