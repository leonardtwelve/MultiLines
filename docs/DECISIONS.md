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
**Amendé le** : 12 mai 2026 (pivot Jackbox — la source de vérité passe côté serveur)
**Statut** : Acté

### Décision (amendée)
**Store unique typé. La source de vérité vit côté serveur Node.**

Le Host et les Players sont des **projections** (vues) sur cet état, mis à jour par messages WebSocket. Chaque client maintient un store local en **lecture**, qui se synchronise via les événements reçus du serveur. Les modifications passent par des messages serveur, **jamais** par mutation locale directe.

- Une seule source de vérité par partie (`GameState`), hébergée sur le serveur.
- Modifications uniquement via des **actions** envoyées au serveur, qui valide + applique + diffuse l'événement de mise à jour.
- Chaque client (Host tablette, Player smartphone) reconstruit son store local à partir des événements reçus.
- Les aventures stockent leur état spécifique dans `state.adventureState`, typé par chaque aventure.

### Raison de l'amendement (12 mai 2026)
Avec le pivot multi-device (F9-F11), un store unique côté client ne suffit plus. Le serveur doit arbitrer entre Host et Players, et survivre aux reconnexions.

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

### Décision (amendée le 12 mai 2026)
**Information privée sur écran personnel.**

La tablette centrale **n'affiche jamais d'information privée**. Toute info privée (objectif privé, Crédits, Dossiers, choix d'action, vote secret, propositions de Pacte) passe exclusivement par le **smartphone du joueur concerné** (F10).

La tablette centrale est réservée à l'affichage **public** : maquette, jauge d'alerte, résultats publics de dés, révélations finales.

### Raison de l'amendement (12 mai 2026)
La mécanique « tablette tournée » devient obsolète avec le pivot Jackbox (F9). On la remplace par un principe plus large qui guide tout le design d'écrans : *info privée ⇔ smartphone perso, info publique ⇔ tablette centrale*.

### Implications
- Pattern « tablette tournée à chaque tour » **abandonné**.
- `DomPrivateView` (overlay tablette du PoC M1) sera remplacé par une UI Player sur smartphone (F19).
- Le serveur (F11) route les infos privées vers la bonne paire d'yeux : un message `private:role-revealed` ne va qu'au socket du joueur concerné.

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

# Décisions design front — Casse de la Banque Lune

> Décisions F1-F8 issues de la session design front (passe 1 — plateau interactif).
>
> Mêmes règles d'immutabilité que D1-D8 et G1-G10.
> À lire conjointement avec [`FRONTEND.md`](./FRONTEND.md) qui détaille la mise en œuvre du plateau, des écrans et des composants.

---

## F1 — Métaphore visuelle du plateau

**Décidé le** : M1 (passe 1 design front)
**Amendé le** : 12 mai 2026 (généralisée — détachée du layout zones-discrètes initial)
**Statut** : Acté

### Décision (amendée)
**Schéma narratif assumé.** La maquette est une représentation tactique du Casse, conçue pour la lisibilité et le gameplay, pas pour le réalisme architectural. Les conventions spatiales (haut/bas, gauche/droite) servent la lecture, pas la fidélité cartographique.

### Raison de l'amendement (12 mai 2026)
La formulation initiale liait F1 à la justification de Z9 dans le layout zones-discrètes. Avec la map continue (F12-F13), on garde le principe mais on enlève la mention de Z9 spécifiquement.

### Implications
- Pas de proportions architecturales à respecter.
- Les positions sur la map servent la lecture, pas la cohérence d'un plan d'architecte.

---

## F2 — Zones discrètes avec sprites vivants

**Décidé le** : M1
**Statut** : Acté

### Décision
Le plateau est un **graphe de zones** (option C explorée en session). Pas de grille tile-based, pas de pathfinding. Chaque zone est un conteneur visuel ; les actions ciblent des zones ou des objets dans des zones, jamais des coordonnées.

### Pourquoi
- Pas de pathfinding nécessaire → simplicité d'implémentation, pas de moteur de mouvement.
- **Zones = unités sémantiques** : faciles à nommer, à raconter, à animer.
- Les animations d'ambiance s'inscrivent naturellement dans des boîtes connues.

### Implications
- Mouvement = transition visuelle (sprite glisse), pas physique.
- Distance entre zones n'a pas de sens mécanique — adjacence binaire.
- Pathfinding et grille tile-based **rejetés** pour cette aventure (et probablement les suivantes du même type).

---

## F3 — Visibilité initiale (fog partiel)

**Décidé le** : M1
**Amendé le** : 12 mai 2026 (alignement avec map continue F12-F15)
**Statut** : Acté

### Décision (amendée)
**Fog partiel.** La **structure du plateau** (tous les espaces de la map) est visible dès le début. Les **portes verrouillées sont visibles** mais infranchissables (cadenas pixel art, F15). Les **contenus précis** (butin dans les coffres, présence de Dossiers, PNJ exacts) sont révélés par les actions de jeu (Reconnaissance, Authentifier, etc.).

### Raison de l'amendement (12 mai 2026)
Reformulation pour s'aligner avec F12-F15 (map continue tile-based, portes physiques visibles avec cadenas). La version précédente parlait de "boîtes assombries" — ça n'a plus de sens sur une map continue.

### Implications
- Le joueur peut voir le plan global dès l'ouverture de la partie (zones, couloirs, portes).
- Les portes verrouillées sont visibles physiquement → le joueur sait *quoi* débloquer.
- Le brouillard ne concerne plus la *structure* mais le *contenu* (butin, Dossiers, état des PNJ).

---

## F4 — ~~Présence simultanée illimitée par zone~~

**Décidé le** : M1
**Abrogée le** : 12 mai 2026 (sans objet sur map continue)
**Statut** : ❌ **Abrogée**

### Raison de l'abrogation
Sur une map continue tile-based (F12), la notion de « présence simultanée par zone » n'a plus de sens — plusieurs avatars peuvent évidemment être proches, ils sont sur des cases distinctes ou se chevauchent visuellement. Cette décision était spécifique au plateau zones-discrètes initial qui a été remplacé.

Pas de remplacement nécessaire : la collision/superposition d'avatars devient une question de rendu (F14), pas une règle de gameplay.

---

## F5 — Coût du déplacement

**Décidé le** : M1
**Amendé le** : 12 mai 2026 (mécanique tile-based concrète)
**Statut** : Acté

### Décision (amendée)
Pendant son tour, le joueur peut **déplacer son avatar sur la map** avant de choisir son action. Le déplacement est **libre dans la limite d'une portée de mouvement** (à chiffrer en `spec/portee-deplacement` — typiquement N tiles par tour). Le déplacement ne compte **pas comme une action** mais conditionne *où* l'action peut être faite.

### Raison de l'amendement (12 mai 2026)
Adaptation au modèle map continue (F12). Le déplacement reste « libre avant l'action » dans l'esprit, mais devient une mécanique tactile concrète (l'avatar bouge case par case, avec une portée chiffrée).

### Implications
- Un joueur peut se déplacer même s'il ne fait aucune action ce tour-ci.
- La **portée de déplacement** devient un paramètre de jeu (cf. `spec/portee-deplacement`).
- Les portes verrouillées (F15) bloquent le mouvement, pas la portée elle-même.

---

## F6 — PNJ génériques sans individualité narrative

**Décidé le** : M1
**Statut** : Acté

### Décision
Les PNJ sont des **sprites génériques 32×32** avec 2-3 variantes visuelles (employé, garde, autre). Pas de noms, pas d'histoires individuelles.

### Pourquoi
- MVP : on évite la production narrative pour 5-10 PNJ par partie.
- Le focus narratif est sur les 5 joueurs, pas sur le décor humain.
- Simplifie les événements — pas de PNJ spécifiques à tracker au long cours.

### Implications
- Action *Persuader un PNJ* / *Détournement* : neutralise un PNJ, sans dialogue ni embranchement.
- Pas de Wikipédia interne sur les PNJ.
- Si une future aventure requiert des PNJ nommés, c'est une **nouvelle décision** (pas un renoncement à F6 pour le Casse).

---

## F7 — Layout fixe pour le MVP

**Décidé le** : M1
**Statut** : Acté

### Décision
La **topologie du plateau est fixe** d'une partie à l'autre. La variabilité vient des **contenus** : où est le butin, quels Dossiers, quels événements se déclenchent.

### Pourquoi
- Génération procédurale de layout = travail majeur (`spec/layout-banque` reportée en suite de M2).
- Le Casse Lune est conçu autour d'un layout cohérent narrativement (Z1-Z9 nommées et reliées).
- La rejouabilité vient du **game design** (rôles asymétriques, objectifs privés, événements), pas du plan.

### Implications
- Les 9 zones canoniques (Z1 Parvis → Z9 Toit) sont connues et fixes.
- Le **contenu** de chaque zone est tiré au début de partie (algo à `spec/`, voir `FRONTEND.md §5` ligne 11).
- Pas un blocage pour M2. Si lassitude observée en playtests, on rouvre une décision.

---

## F8 — Tout sur un écran sans scroll

**Décidé le** : M1
**Statut** : Acté

### Décision
**Résolution interne** 480×270, scalée 2x ou 3x à l'affichage final. Plateau + HUD haut + HUD bas visibles **simultanément**. Pas de scroll, pas de zoom, pas de mini-map.

### Pourquoi
- **Lisibilité d'ensemble** = principe directeur.
- Scroll/zoom = friction sur écran partagé entre 3-5 joueurs autour d'une tablette.
- Tablette en paysage = format idéal pour ce framing.

### Implications
- Layout serré : 9 zones doivent rentrer (résolution 480×210 utiles pour le plateau).
- HUD haut = 24px (titre tour, joueur actif).
- HUD bas = 36px (4 zones : tour, butin, alerte, temps).
- Mini-map / vue d'ensemble alternative **rejetée** — superflu si tout est déjà visible.

---

## F9 — Modèle de jeu (hybride Jackbox)

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
**Hybride à la Jackbox Party**, avec parties plus longues (30-45 min) et plus tactiques. **Tablette centrale** affiche le plateau et l'ambiance, **chaque joueur utilise son smartphone** comme manette personnelle pour ses infos privées et ses choix.

### Implications
- Le PoC mono-device M1 devient une **étape technique**, remplacée par l'architecture multi-device pour M2.
- Toute la suite des décisions F (F10-F20) découle de ce pivot.
- Les chartes visuelles (#11, #12) restent valides pour la tablette ; il faudra une charte visuelle Player (smartphone) en suite.

---

## F10 — Smartphone

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
Smartphone **obligatoire** pour chaque joueur. **Page web responsive** (pas d'app à installer). Connexion à la partie via **QR code** affiché sur la tablette, avec **code à 4-6 lettres en fallback**.

### Implications
- Pas d'App Store ni de Play Store à gérer — la PWA suffit.
- Le QR doit être généré côté serveur et affiché grand sur la tablette pour scan à distance.
- Code de fallback indispensable : un joueur sans caméra ou avec QR cassé doit pouvoir rejoindre.
- À spec : taille/expiration/régénération du QR, format du code, sécurité (`spec/connexion-qr`).

---

## F11 — Architecture réseau

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
**Serveur central WebSocket cloud-only.** Pas de mode LAN, pas de serveur local sur la tablette. Le serveur est toujours hébergé en ligne, ce qui permet aussi de jouer à distance (avec call audio en parallèle).

### Implications
- Connexion internet **requise** pour toute partie — abandon explicite du mode LAN.
- Bonus : partie à distance possible (joueurs séparés géographiquement avec call audio).
- Coût d'hébergement à assumer (F18).
- Le serveur survit aux reconnexions de clients (D7 amendée).

---

## F12 — Granularité du déplacement

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
Déplacement **tile-based 32×32**. L'avatar se déplace case par case sur la map continue. Pas de joystick, pas de point-and-click avec pathfinding — un tap sur une case fait déplacer l'avatar.

### Implications
- Pas de moteur de pathfinding nécessaire — le joueur clique la case voulue.
- Cohérent avec la grille pixel art 32×32 (cf. `ART.md §2.2`).
- L'animation de marche reste (sprites par direction, cf. ART.md §2.3), mais ne traverse pas chaque tile intermédiaire visiblement — il glisse d'un point A à un point B.

---

## F13 — Taille de la map

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
Map **40×20 tiles** (1280×640 px), affichée sans scroll dans la zone map de l'écran Host. Tout le plateau est visible simultanément.

### Implications
- Aligné avec F8 (pas de scroll).
- Surface assez large pour 9 zones thématiques (F14) sans entasser.
- La zone HUD bas (jauge d'alerte, tour, butin, temps) prend les ~80 px restants sur 720.

---

## F14 — Zones mécaniques sur map continue

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
Les 9 zones du game design (Hall, Bureaux, Coffres, etc.) sont **conservées en arrière-plan logique** mais visuellement représentées **sans séparation physique**. Décor, mobilier et éclairage différencient les zones — pas de boîtes ni de murs entre elles, sauf pour les zones verrouillées (F15).

### Raison
Concilie F2 (zones thématiques narratives) et la map continue (F12-F13). Les 9 zones canoniques (FRONTEND.md §2.3) restent le **modèle de référence** côté gameplay, mais le rendu est environnemental.

### Implications
- Côté code : une couche `zone` reste en arrière-plan logique pour rattacher tile → zone (utile aux actions).
- Côté rendu : tilemaps + objets décoratifs + éclairage différencient les ambiances.

---

## F15 — Verrouillages physiques

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
Les passages entre zones verrouillées sont représentés par des **portes physiques** avec un **cadenas pixel art** visible. Une porte ouverte (débloquée) n'affiche plus le cadenas. L'avatar ne peut pas franchir une porte verrouillée.

### Implications
- Lisibilité immédiate : on voit où sont les portes, on voit lesquelles sont verrouillées.
- Le déblocage déclenche une animation d'ouverture (porte s'efface, cadenas disparaît).
- Aligné avec F3 amendée (les portes verrouillées sont visibles dès le départ).

---

## F16 — Structure du projet

**Décidé le** : 12 mai 2026
**Amendé le** : 13 mai 2026 (passage de 2 à 3 packages, shared/ devient un package à part entière)
**Statut** : Acté

### Décision (amendée)
**Monorepo à 3 packages** :

```
pixel-quests/
├── packages/
│   ├── front/     # Clients web : Host (tablette) + Player (smartphone)
│   ├── server/    # Serveur Node + WebSocket (socket.io, cf. F21)
│   └── shared/    # Types, protocole, logique pure de game design, EventBus typé
└── pnpm-workspace.yaml
```

Le package `shared/` est consommé par `front/` et `server/` via pnpm workspaces (`@pixel-quests/shared` en dépendance interne). Source de vérité unique pour les types d'événements (D2), le protocole WebSocket (F20), et toute logique pure réutilisable entre les deux côtés du réseau.

### Raison de l'amendement (13 mai 2026)
La formulation initiale parlait d'un *sous-dossier* `shared/`. Au moment de l'implémenter (Prompt 2), la promotion en **package à part entière** s'est imposée :
- pnpm workspaces gère nativement le link symbolique via `workspace:*`
- TypeScript compile une fois (`tsup`) avec des `.d.ts` propres consommés par les autres packages
- ESLint, tests, build sont isolés par package — pas de surface attaque cross-cutting

### Implications
- Le `pnpm-workspace.yaml` déclare `packages/*` — couvre les 3 packages automatiquement.
- `front` et `server` déclarent `"@pixel-quests/shared": "workspace:*"` en dépendance.
- `shared/` est buildé en premier dans la CI (les autres en dépendent).
- Les types d'événements `GameEvent` (D2) + le bus typé `EventBus` vivent désormais dans `@pixel-quests/shared/events`.
- Les types de messages WebSocket (F20) vivent dans `@pixel-quests/shared/protocol`.

---

## F17 — Source de vérité

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
**Le serveur est la source de vérité.** Le store de partie vit sur le serveur. Le Host et les Players sont des vues sur cet état, mis à jour par messages WebSocket. Voir aussi **D7 amendée**.

### Implications
- Les clients ne mutent rien localement — ils proposent des actions au serveur.
- Le serveur valide (anti-triche), applique, diffuse l'événement de mise à jour à tous.
- Pattern de **projection** côté client (`spec/store-projection`).

---

## F18 — Hébergement

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
**Vercel** pour le front statique (Host + Player) + **Fly.io** pour le serveur Node + WebSocket. Free tier suffisant pour tout le playtesting. Coût marginal (~5-10€/mois) après commercialisation. Le mode LAN est abandonné.

### Implications
- Vercel déjà connecté (https://multi-lines.vercel.app) — reste à reconfigurer post-migration F16.
- Fly.io à provisionner pour le serveur ; CI/CD à câbler.
- À spec : config de déploiement serveur, gestion des secrets, scaling.

---

## F19 — Framework UI Player

**Décidé le** : 12 mai 2026
**Statut** : Acté avec une marge de manœuvre

### Décision
**Décision différée au démarrage du Player.** Probablement vanilla TS + Web Components, ou framework léger (Lit, Preact). **Pas React** par défaut, pour rester cohérent avec la légèreté du projet, mais à confirmer.

### Implications
- À trancher dans une issue dédiée quand le dev du Player démarre.
- La sortie ne doit pas être lourde côté smartphone (perf + connexion mobile).
- Pas de SPA monstrueuse — chaque écran Player reste simple et stateful localement.

---

## F20 — Protocole réseau

**Décidé le** : 12 mai 2026
**Statut** : Acté

### Décision
**WebSocket + JSON.** Messages typés depuis le code partagé (`shared/`). Pattern :

- **Actions du joueur** : Player → serveur (ex: `action.propose`)
- **Événements de partie** : serveur → tous les clients (ex: `turn.started`, `state.updated`)
- **Commandes Host** : Host → serveur (ex: `game.start`, `partie.end`)

Détail dans `spec/protocole`.

### Implications
- Pas de gRPC ni de Protobuf — JSON est suffisant pour la taille de payload.
- Tous les types de messages **typés** depuis `shared/` (cf. F16).
- Le serveur fait la **validation** (anti-triche, ordre des messages, état attendu).

---

## F21 — Bibliothèque WebSocket

**Décidé le** : 13 mai 2026
**Statut** : Acté

### Décision
**socket.io** (côté serveur ET côté clients).

Rooms natives, reconnexion automatique, heartbeat, fallback HTTP long-poll, événements typés. Préféré à `ws` brut pour éviter de recoder ces mécaniques à la main.

### Pourquoi
- **Rooms** natives : map les rooms socket.io 1:1 avec nos `Room` (game lobby), broadcast trivial vers tous les sockets d'une room.
- **Reconnexion** automatique avec backoff exponentiel — critique pour le smartphone Player (réseau mobile capricieux).
- **Heartbeat** intégré, pas de garde-fou à écrire.
- **Fallback HTTP long-poll** : robustesse sur les réseaux d'entreprise / wifi corporate qui bloquent WebSocket.
- Écosystème mature, types officiels, `socket.io-client` côté Player + Host.

### Implications
- `socket.io@^4` côté serveur (`packages/server`).
- `socket.io-client@^4` côté front (`packages/front` — à ajouter quand l'intégration commence, Prompt 3) et en devDep côté serveur pour les tests d'intégration.
- Le protocole F20 (messages JSON typés depuis `@pixel-quests/shared/protocol`) reste agnostique de la lib transport — si on devait migrer plus tard vers `ws` ou un autre, l'effort se concentre sur la couche socket.io adapter.
- Coût négligeable côté bundle Player (~50 kB gzipped).

---

## Note sur F2 et F12-F15 (cohabitation)

F2 acte « zones discrètes avec sprites vivants » (session 11 mai), et F12-F15 actent « map continue tile-based » (session 12 mai). Les deux peuvent sembler contradictoires.

**Lecture cohérente** :

- **F2** acte le **principe** : le jeu est organisé en zones thématiques avec des sprites animés qui leur donnent vie.
- **F12-F15** actent la **mise en œuvre** : la map est continue tile-based, mais les zones thématiques sont conservées en arrière-plan logique (F14).

Si une future session veut clarifier, on pourra fusionner F2 et F14 en une seule décision. Pour l'instant on les garde séparées car elles ont été actées à des moments différents et expriment des aspects complémentaires.

---

## Sujets à creuser dans `spec/`

Plusieurs sujets sont actés dans l'esprit mais demandent une spec technique détaillée. À traiter au démarrage du dev correspondant :

- **spec/protocole** — Format précis des messages WebSocket, gestion erreurs, reconnexion
- **spec/server-state-machine** — Machine à états de la partie côté serveur, transitions, validations
- **spec/connexion-qr** — Génération du QR, code de fallback, expiration, sécurité
- **spec/store-projection** — Comment les clients construisent leurs projections depuis les événements serveur
- **spec/monorepo-setup** — Configuration des workspaces pnpm, gestion du code partagé
- **spec/portee-deplacement** — Combien de tiles par tour, modificateurs éventuels
- **spec/sprite-drone-mouvement** — Le drone de l'Observateur a-t-il une mécanique de déplacement spécifique (drag) ou suit-il les mêmes règles que les avatars ?

---

## Index des décisions

| ID  | Famille      | Sujet                                                         | Statut |
|-----|--------------|---------------------------------------------------------------|--------|
| D1  | Tech         | Co-location des tests                                         | ✅ Acté |
| D2  | Tech         | Format des événements                                         | ✅ Acté |
| D3  | Tech         | Stratégie de couverture                                       | ✅ Acté |
| D4  | Tech         | Workflow Git                                                  | ✅ Acté |
| D5  | Tech         | Organisation des assets                                       | ✅ Acté |
| D6  | Tech         | Stratégie d'animations                                        | ✅ Acté |
| D7  | Tech         | State management (**source serveur**)                         | 🔄 Amendée 12/05 |
| D8  | Tech         | Format du manifest                                            | ✅ Acté |
| G1  | Game Design  | Pilier mécanique (coop tendue → bascule)                      | ✅ Acté |
| G2  | Game Design  | Système de résolution (choix + dé de risque)                  | ✅ Acté |
| G3  | Game Design  | Acte 3 : vote secret simultané                                | ✅ Acté |
| G4  | Game Design  | Objectifs privés tordus                                       | ✅ Acté |
| G5  | Game Design  | Information privée sur écran personnel (**smartphone**)       | 🔄 Amendée 12/05 |
| G6  | Game Design  | Coop sincère stricte pendant le casse                         | ✅ Acté |
| G7  | Game Design  | 5e rôle = Observateur (drone)                                 | ✅ Acté |
| G8  | Game Design  | Système de résolution chiffré (2d6 + tables)                  | ✅ Acté |
| G9  | Game Design  | Pacte secret cadré en 3 templates                             | ✅ Acté |
| G10 | Game Design  | Objectifs privés vérifiés acte 3, récompense uniforme         | ✅ Acté |
| F1  | Front        | Métaphore visuelle (généralisée)                              | 🔄 Amendée 12/05 |
| F2  | Front        | Zones discrètes avec sprites vivants                          | ✅ Acté (cf. note F2/F14) |
| F3  | Front        | Visibilité initiale (fog partiel reformulé)                   | 🔄 Amendée 12/05 |
| F4  | Front        | ~~Présence simultanée illimitée~~                             | ❌ Abrogée 12/05 |
| F5  | Front        | Coût du déplacement (tile-based)                              | 🔄 Amendée 12/05 |
| F6  | Front        | PNJ génériques sans individualité narrative                   | ✅ Acté |
| F7  | Front        | Layout fixe pour le MVP                                       | ✅ Acté |
| F8  | Front        | Tout sur un écran sans scroll                                 | ✅ Acté |
| F9  | Front        | Modèle de jeu (hybride Jackbox)                               | 🆕 12/05 |
| F10 | Front        | Smartphone obligatoire (PWA + QR)                             | 🆕 12/05 |
| F11 | Front        | Architecture réseau (serveur WebSocket cloud-only)            | 🆕 12/05 |
| F12 | Front        | Granularité du déplacement (tile 32×32)                       | 🆕 12/05 |
| F13 | Front        | Taille de la map (40×20 tiles)                                | 🆕 12/05 |
| F14 | Front        | Zones mécaniques sur map continue                             | 🆕 12/05 |
| F15 | Front        | Verrouillages physiques (portes + cadenas)                    | 🆕 12/05 |
| F16 | Front        | Structure du projet (monorepo **3 packages** : front, server, shared) | 🔄 Amendée 13/05 |
| F17 | Front        | Source de vérité (serveur)                                    | 🆕 12/05 |
| F18 | Front        | Hébergement (Vercel + Fly.io)                                 | 🆕 12/05 |
| F19 | Front        | Framework UI Player (décision différée)                       | 🆕 12/05 |
| F20 | Front        | Protocole réseau (WebSocket + JSON)                           | 🆕 12/05 |
| F21 | Front        | Bibliothèque WebSocket (socket.io)                            | 🆕 13/05 |

---

## Prochaines décisions probables (M2)
- Format de sauvegarde (JSON local ? IndexedDB ? quel chiffrement ?)
- Internationalisation : i18next ou fait maison ?
- Gestion des secrets de jeu (rôles cachés) côté client : comment éviter qu'un joueur curieux ouvre les devtools et lise le rôle des autres ?
- Format des dialogues / scénario (Twine ? YAML ? code TS ?)
- Stratégie de chargement progressif des assets pour démarrage rapide
