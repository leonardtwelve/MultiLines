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

## Index des décisions

| ID  | Sujet                       | Statut |
|-----|-----------------------------|--------|
| D1  | Co-location des tests       | Acté   |
| D2  | Format des événements       | Acté   |
| D3  | Stratégie de couverture     | Acté   |
| D4  | Workflow Git                | Acté   |
| D5  | Organisation des assets     | Acté   |
| D6  | Stratégie d'animations      | Acté   |
| D7  | State management            | Acté   |
| D8  | Format du manifest          | Acté   |

---

## Prochaines décisions probables (M2)
- Format de sauvegarde (JSON local ? IndexedDB ? quel chiffrement ?)
- Internationalisation : i18next ou fait maison ?
- Gestion des secrets de jeu (rôles cachés) côté client : comment éviter qu'un joueur curieux ouvre les devtools et lise le rôle des autres ?
- Format des dialogues / scénario (Twine ? YAML ? code TS ?)
- Stratégie de chargement progressif des assets pour démarrage rapide
