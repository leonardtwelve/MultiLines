# Specs détaillées — M1 P0

> Les références à `DECISIONS.md` (D1 → D8) pointent vers [`docs/DECISIONS.md`](./DECISIONS.md) (Architecture Decision Records du projet).

> Ces specs sont prêtes à être passées à Claude Code, une par une.
> Chaque spec référence les décisions de `DECISIONS.md`.
>
> **Ordre de traitement recommandé** :
> 1. Issue 8 (Contrat Adventure) — fondation de tout le reste
> 2. Issue 5 (CI complète) — pour que les issues suivantes soient protégées
> 3. Issue 1 (Charte plateforme) — peut être délégué à un freelance en parallèle
> 4. Issue 2 (Charte Casse Lune) — après Issue 1

---

## SPEC P0-1 — Contrat Adventure et guide de création (issue 8)

### Pourquoi cette issue est la première
C'est la fondation conceptuelle du projet. Tant qu'elle n'est pas faite, le moteur n'est pas vraiment un moteur, c'est juste du code rangé en dossiers. Cette issue transforme la séparation `core/` ↔ `adventures/` d'une convention en un vrai contrat.

### Livrables attendus
1. Code dans `src/core/types/adventure.ts` (l'interface enrichie)
2. Code dans `src/core/types/events.ts` (les événements typés du moteur, conformes à D2)
3. Code dans `src/core/state/` (squelette du store, conforme à D7)
4. Code dans `src/core/engine/EventBus.ts` enrichi pour respecter D2 (typage des events)
5. Adapter `src/adventures/banque-lune/manifest.ts` au manifest enrichi (D8)
6. Documentation : `docs/ADVENTURES_GUIDE.md` complètement réécrit
7. Tests : suite de tests unitaires sur l'EventBus typé, le store, et le contrat Adventure

### Spécifications détaillées

#### 1. Interface `Adventure` enrichie
Fichier : `src/core/types/adventure.ts`

```typescript
import type { GameEngine } from '../engine/GameEngine';
import type { GameState } from '../state/GameState';

export type AdventureTone = 'leger' | 'tendu' | 'malicieux';
export type AdventureDifficulty = 'easy' | 'medium' | 'hard';
export type ContentRating = 'all' | '12+' | '16+';

export interface AdventureManifest {
  // identité
  id: string;
  version: string;

  // affichage
  title: string;
  shortDescription: string;
  longDescription: string;
  thumbnail: string;
  banner: string;
  tone: AdventureTone;
  tags: string[];

  // contraintes de jeu
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMin: number;
  difficulty: AdventureDifficulty;

  // métadonnées
  contentRating: ContentRating;
  languages: string[];

  // commercial (optionnel, M5+)
  pricing?: {
    bundled: boolean;
    standalonePriceEur?: number;
  };
}

export interface Adventure {
  /** Métadonnées statiques */
  readonly manifest: AdventureManifest;

  /**
   * Initialisation : enregistrer animations, sons, scènes auprès du moteur.
   * Ne PAS démarrer le jeu ici — l'engine attend `start()`.
   */
  init(engine: GameEngine): Promise<void>;

  /**
   * Démarrage effectif du jeu après `init()` et la phase de setup.
   * @param initialState état initial déjà rempli avec les joueurs configurés
   */
  start(initialState: GameState): void;

  /**
   * Nettoyage : libérer ressources, retirer listeners.
   * Appelé quand le joueur quitte ou en fin de partie.
   */
  destroy(): void;
}
```

Validation runtime du manifest : créer une fonction `validateManifest(manifest: unknown): manifest is AdventureManifest` qui vérifie au chargement que tous les champs requis sont présents et valides. Si invalide, l'aventure est ignorée et un warning est loggé.

#### 2. Événements typés (D2)
Fichier : `src/core/types/events.ts`

```typescript
export type CoreGameEvent =
  | { type: 'player.joined'; payload: { playerId: string; name: string } }
  | { type: 'player.left'; payload: { playerId: string } }
  | { type: 'turn.started'; payload: { playerId: string; turnNumber: number } }
  | { type: 'turn.ended'; payload: { playerId: string } }
  | { type: 'adventure.started'; payload: { adventureId: string } }
  | { type: 'adventure.completed'; payload: { winnerId?: string; reason: string } }
  | { type: 'state.updated'; payload: { previousState: unknown; newState: unknown } };

// Les aventures étendent ce type avec leurs propres événements préfixés.
// Exemple côté Casse Lune : `banque-lune.role-revealed`, `banque-lune.heist-started`.
export type GameEvent = CoreGameEvent;
```

Convention de nommage stricte (à respecter dans tout le code) :
- Format `domaine.action` lowercase
- Verbe au passé (`turn.started`, pas `turn.start`)
- Events spécifiques aux aventures préfixés par l'id de l'aventure

#### 3. EventBus typé
Fichier : `src/core/engine/EventBus.ts`

L'API doit garantir le typage à la compilation :

```typescript
import type { GameEvent } from '../types/events';

type EventType = GameEvent['type'];
type PayloadFor<T extends EventType> = Extract<GameEvent, { type: T }>['payload'];
type Handler<T extends EventType> = (payload: PayloadFor<T>) => void;

export class EventBus {
  private handlers = new Map<EventType, Set<Handler<EventType>>>();

  emit<E extends GameEvent>(event: E): void { /* ... */ }
  on<T extends EventType>(type: T, handler: Handler<T>): () => void {
    /* retourne une fonction de désabonnement */
  }
  off<T extends EventType>(type: T, handler: Handler<T>): void { /* ... */ }
}
```

Tests obligatoires (dans `src/core/engine/EventBus.test.ts`) :
- Émission et réception d'un event typé
- Désabonnement via la fonction retournée par `on`
- Plusieurs handlers pour un même event
- Test de typage négatif (avec `// @ts-expect-error`) qu'un payload mal formé est rejeté à la compilation

#### 4. Store et state (D7)
Fichier : `src/core/state/GameState.ts`

```typescript
export type TurnPhase = 'idle' | 'action' | 'resolution';
export type GameStatus = 'setup' | 'playing' | 'ended';

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface GameState {
  players: Record<string, PlayerState>;
  currentTurn: {
    playerId: string | null;
    phase: TurnPhase;
    turnNumber: number;
  };
  adventureState: unknown; // chaque aventure caste vers son type
  status: GameStatus;
}

export const createInitialState = (): GameState => ({
  players: {},
  currentTurn: { playerId: null, phase: 'idle', turnNumber: 0 },
  adventureState: null,
  status: 'setup',
});
```

Fichier : `src/core/state/Store.ts`

```typescript
export type Action =
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerState } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'TURN_STARTED'; payload: { playerId: string } }
  | { type: 'TURN_ENDED'; payload: Record<string, never> }
  | { type: 'ADVENTURE_STATE_UPDATED'; payload: { newState: unknown } }
  | { type: 'STATUS_CHANGED'; payload: { status: GameStatus } };

export class Store {
  constructor(private state: GameState, private bus: EventBus) {}

  getState(): Readonly<GameState> { /* clone profond ou Object.freeze */ }
  dispatch(action: Action): void {
    /* applique l'action, met à jour state, émet 'state.updated' sur le bus */
  }
  subscribe(listener: (state: GameState) => void): () => void { /* ... */ }
}
```

Tests obligatoires :
- `dispatch(PLAYER_JOINED)` ajoute le joueur dans state.players
- `dispatch(TURN_STARTED)` met à jour currentTurn.playerId
- Chaque dispatch émet `state.updated` sur le bus
- `getState()` retourne un état non-modifiable (mutation extérieure rejetée ou ignorée)

#### 5. Manifest du Casse Lune mis à jour
Fichier : `src/adventures/banque-lune/manifest.ts`

```typescript
import type { AdventureManifest } from '../../core/types/adventure';

export const banqueLuneManifest: AdventureManifest = {
  id: 'banque-lune',
  version: '0.1.0',
  title: 'Le Casse de la Banque Lune',
  shortDescription: 'Cyberpunk 2099. Cinq voleurs, un casse, beaucoup de trahisons.',
  longDescription: '...', // 3-4 phrases, peut être un placeholder pour M1
  thumbnail: 'src/adventures/banque-lune/assets/thumbnail.png', // placeholder pour M1
  banner: 'src/adventures/banque-lune/assets/banner.png', // placeholder pour M1
  tone: 'malicieux',
  tags: ['cyberpunk', 'bluff', 'roles-asymetriques'],
  minPlayers: 3,
  maxPlayers: 5,
  estimatedDurationMin: 35,
  difficulty: 'medium',
  contentRating: '12+',
  languages: ['fr'],
  pricing: { bundled: true },
};
```

Pour les images thumbnail/banner, créer des placeholders 256×256 et 1024×384 (fond uni avec le titre, suffisant pour M1).

#### 6. Documentation `ADVENTURES_GUIDE.md` réécrite
Fichier : `docs/ADVENTURES_GUIDE.md`

Structure attendue :

1. **Présentation** : qu'est-ce qu'une aventure dans Pixel Quests
2. **Anatomie d'une aventure** : structure de dossier (`adventures/<id>/`), fichiers obligatoires
3. **Le contrat `Adventure`** : interface complète commentée
4. **Cycle de vie** : diagramme texte
   ```
   [App start]
        ↓
   [HomeScreen liste les aventures]
        ↓
   [Joueur sélectionne]
        ↓
   [adventure.init(engine)]    ← chargement assets, enregistrement animations
        ↓
   [SetupScreen : choix joueurs]
        ↓
   [adventure.start(initialState)]  ← démarrage effectif
        ↓
   [boucle de tours via TurnSystem]
        ↓
   [event 'adventure.completed' émis]
        ↓
   [adventure.destroy()]      ← cleanup
   ```
5. **Services du moteur disponibles** :
   - `EventBus` (D2) — émettre/écouter des événements
   - `Store` (D7) — lire l'état, dispatcher des actions
   - `PlayerManager` — accès typé aux joueurs
   - `TurnSystem` — gestion du tour par tour
   - `AudioManager` — musiques et SFX
   - `AnimationManager` (D6) — enregistrer et jouer les animations
   - `SaveManager` — persistance locale

   Pour chacun : signature, exemple d'usage, événements émis/écoutés.

6. **Événements core** : tableau complet des événements émis par le moteur, leur payload, leur signification.

7. **Tutoriel : créer une aventure de test en 30 minutes** :
   - Étape 1 : créer le dossier `src/adventures/test-adventure/`
   - Étape 2 : écrire le `manifest.ts`
   - Étape 3 : écrire le `index.ts` qui implémente `Adventure`
   - Étape 4 : créer une scène Phaser de placeholder
   - Étape 5 : enregistrer l'aventure dans le registre
   - Étape 6 : tester dans l'écran d'accueil
   - Étape 7 : checklist de validation

8. **Checklist avant merge d'une nouvelle aventure** :
   - [ ] Manifest complet et valide
   - [ ] `init()`, `start()`, `destroy()` implémentés et testés
   - [ ] Assets dans `assets/` selon convention
   - [ ] Animations déclarées dans `animations.ts` (D6)
   - [ ] État spécifique typé dans `state.ts`
   - [ ] Événements préfixés par l'id de l'aventure (D2)
   - [ ] Charte visuelle respectée
   - [ ] `ART.md` rempli
   - [ ] Couverture de tests > 50%

Le tutoriel doit être **testable** : tu (le développeur) dois pouvoir le suivre les yeux fermés et obtenir une aventure de test fonctionnelle. Si à un moment tu galères, tu corriges le doc. C'est le critère de validation final de cette issue.

#### 7. Test de la doc
Critère d'acceptance final : créer une fausse aventure `test-adventure` en suivant **uniquement** le guide. Si tu y arrives sans relire le code du moteur, le guide est validé. Tu peux supprimer la fausse aventure après (ou la garder en tests d'intégration, à voir).

### Critères d'acceptance globaux
- [ ] Les fichiers listés sont créés/modifiés
- [ ] `pnpm run lint` passe
- [ ] `pnpm run typecheck` passe
- [ ] `pnpm run test` passe avec tous les nouveaux tests
- [ ] Le test de la doc (création d'une fausse aventure) est concluant
- [ ] PR ouverte avec lien vers cette issue
- [ ] CI verte avant merge
- [ ] `DECISIONS.md` référencé dans les commits qui appliquent D2, D7, D8

### Estimation
**~2-3 jours de travail pour un dev seul à temps plein.** L'essentiel du temps est dans la rédaction du guide et le test de la doc.

---

## SPEC P0-2 — CI GitHub Actions complète (issue 5)

### Pourquoi cette issue est en deuxième
Avant de produire des features (M2), tu dois avoir un filet de sécurité. Sinon les régressions s'accumulent silencieusement et tu les découvres deux semaines plus tard.

### Livrables attendus
1. Workflow `.github/workflows/ci.yml` complet
2. Branch protection rules sur `main` et `develop` (à configurer manuellement dans GitHub UI, mais à documenter)
3. Badge CI dans le README
4. Test de bout en bout : un PR cassé → bloqué → fix → mergé

### Spécifications détaillées

#### 1. Workflow CI
Fichier : `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Typecheck
        run: pnpm run typecheck

      - name: Test (with coverage)
        run: pnpm run test:coverage

      - name: Build
        run: pnpm run build

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

**Notes :**
- Vérifier les versions des actions au moment de l'implémentation et prendre les plus récentes stables.
- Le job s'appelle `validate` (et pas `test`) parce qu'il fait plus que des tests.
- Coverage : ajouter le script `test:coverage` dans `package.json` (`vitest run --coverage`).
- Le timeout de 10 min est large, viser sous 3 min en pratique.

#### 2. Seuils de couverture (D3)
Dans `vitest.config.ts`, configurer les seuils :

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        // Seuils différenciés (D3)
        'src/core/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        'src/adventures/**': {
          lines: 50,
          functions: 50,
          branches: 40,
          statements: 50,
        },
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/app/**'],
    },
  },
});
```

Si la syntaxe exacte n'est pas supportée par la version de Vitest, adapter — mais l'esprit doit être respecté : seuils par chemin, échec si non atteint.

#### 3. Branch protection
À configurer dans GitHub UI (Settings → Branches → Add rule) pour `main` et `develop` :

- Require a pull request before merging
- Require status checks to pass : ✓ `validate`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings (même les admins)
- Restrict who can push to matching branches (vide pour le moment, à durcir si équipe)

Documenter les paramètres exacts dans `CONTRIBUTING.md` pour qu'on puisse les recréer.

#### 4. Badge CI dans README
Ajouter en haut du `README.md` :

```markdown
[![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<user>/<repo>/actions/workflows/ci.yml)
```

#### 5. Test de bout en bout
Procédure de validation :

1. Créer une branche `chore/test-ci-protection`
2. Modifier un test pour qu'il échoue (ex: `expect(true).toBe(false)`)
3. Push, ouvrir une PR vers `develop`
4. Vérifier que la PR est bloquée au merge (bouton merge grisé, message d'erreur sur la CI)
5. Fix le test
6. Vérifier que la PR redevient mergeable

Capturer les screenshots aux étapes 4 et 6, les ajouter à `docs/screenshots/m1_ci_blocked.png` et `m1_ci_passed.png`.

### Critères d'acceptance
- [ ] `.github/workflows/ci.yml` créé et valide
- [ ] Tous les jobs passent sur `develop` actuel
- [ ] Branch protection active sur `main` et `develop`
- [ ] Badge CI dans le README
- [ ] Test de bout en bout exécuté avec screenshots
- [ ] Pipeline tourne en moins de 3 minutes (vérifier après quelques runs)
- [ ] `CONTRIBUTING.md` documente les règles de protection

### Estimation
**~0,5 à 1 jour.** L'essentiel est trivial, le test de bout en bout prend un peu de temps.

---

## SPEC P0-3 — Charte visuelle plateforme (issue 1)

### Nature de l'issue
C'est une issue de **direction artistique**, pas de code. Si tu n'es pas pixel artist, cette issue se délègue ou se sous-traite. Si tu es à l'aise avec l'aspect visuel, tu peux la faire toi-même mais prévois 1 à 2 jours de travail concentré.

### Livrables attendus
1. Document `docs/art/CHARTE_VISUELLE_PLATEFORME.md`
2. Mockup de l'écran d'accueil au format PNG ou figma
3. Palette de couleurs documentée (hex codes)
4. 2-3 références externes documentées (jeux, artistes)

### Spécifications du document

Le `CHARTE_VISUELLE_PLATEFORME.md` doit contenir :

#### Identité visuelle de la plateforme
- **Nom de la plateforme** : Pixel Quests (provisoire, à valider)
- **Tagline visuelle** : *Le jeu de société du futur, en 32 bits*
- **Mood** : pixel art rétro **moderne** (16/32 bits, pas 8 bits pur), couleurs profondes, ambiances soignées

#### Décisions techniques
- **Résolution de référence** : à choisir et justifier (recommandation : 32×32 par tile, sprites de personnages 32×48 ou 48×64). Le choix de cette résolution conditionne tous les futurs assets.
- **Échelle d'affichage** : pixel art rendu net (no smoothing). Phaser : `Phaser.Scale.NEAREST`.
- **Aspect ratio cible** : 16:9 (tablette paysage). Définir une zone de jeu safe (logo, UI critique) qui rentre aussi en 4:3 pour iPad.

#### Palette plateforme
3 sections :
- Couleurs neutres (fonds, textes, UI : 5-7 teintes du noir au blanc)
- Couleurs d'accent plateforme (logos, CTA, boutons : 2-3 teintes)
- Couleurs sémantiques (succès vert, erreur rouge, warning orange : 3 teintes)

Format : grille avec hex code + nom + usage prévu.

#### Polices
- 1 police d'affichage (titres, écran d'accueil) — pixel art
- 1 police de lecture (textes longs, dialogues) — pixel art lisible aux petites tailles

Vérifier les licences (idéalement OFL ou CC0). Suggestions à explorer : *Press Start 2P* (titres), *m5x7* ou *m6x11* de Daniel Linssen (lecture).

#### Composants UI partagés
- Bouton primaire / secondaire / désactivé
- Modale (titre + contenu + CTA)
- Indicateur de tour actif (qui joue)
- Jauge / barre de progression
- Notification (toast)

Pour chaque : un mockup pixel art, et indication des dimensions en pixels (ex: bouton 96×24 pixels).

#### Références
3-5 références externes avec capture d'écran et 1-2 lignes de justification :
- Ce qu'on garde de la référence (palette, énergie, lisibilité…)
- Ce qu'on ne reprend pas

Pistes à explorer : *Dead Cells*, *Hyper Light Drifter*, *Chained Echoes*, *Eastward*, *The Last Faith*.

#### Mockup de l'écran d'accueil
Image PNG dans `docs/art/mockups/m1_home.png`, montrant :
- Titre "Pixel Quests"
- Liste des aventures (avec une seule pour l'instant : Casse Lune)
- Composants UI appliquant la charte

### Critères d'acceptance
- [ ] `CHARTE_VISUELLE_PLATEFORME.md` complet
- [ ] Palette documentée avec hex
- [ ] Polices choisies, licences vérifiées et notées
- [ ] Mockup de l'écran d'accueil livré
- [ ] Au moins 3 références externes documentées
- [ ] Validation par l'équipe (toi seul si solo) avant merge

### Estimation
**1-2 jours** si tu fais toi-même. **~500-1000€** si tu sous-traites à un freelance pixel artist (3-5 jours homme côté freelance avec aller-retour).

---

## SPEC P0-4 — Charte visuelle Casse Lune (issue 2)

### Dépendance
Cette issue **commence après** que la charte plateforme (P0-3) soit validée. Sinon tu risques de partir dans des choix incompatibles.

### Livrables attendus
1. Document `src/adventures/banque-lune/ART.md`
2. Mood board avec 5-10 références (dans `src/adventures/banque-lune/art/moodboard/`)
3. Concepts des 5 rôles (silhouettes ou rough)
4. Concept du décor principal (intérieur banque)

### Spécifications du document

Le `ART.md` du Casse de la Banque Lune doit contenir :

#### Identité de l'aventure
- **Univers** : cyberpunk 2099, néons, pluie, écrans holographiques, tech décrépite
- **Ambiance** : malicieuse, tendue, urbaine
- **Influences** : *Blade Runner*, *Cyberpunk 2077*, *VA-11 Hall-A*, *The Red Strings Club*

#### Palette spécifique
Compléter la palette plateforme avec :
- Néons : magenta, cyan, violet électrique, rose
- Nuit urbaine : bleus profonds, gris-bleus
- Accents dorés / butin : doré, ambre (pour le moment de gloire du casse)
- Alertes : rouge laser pour les systèmes de sécurité

Indiquer pour chaque couleur quand l'utiliser dans le jeu (UI ? environnement ? éclairage ?).

#### Mood board
5-10 captures dans `src/adventures/banque-lune/art/moodboard/` avec un fichier `references.md` qui annote :
- Source
- Ce qu'on en retient

#### Les 5 rôles
Pour chaque rôle (Hacker, Infiltré·e, Conducteur·rice, Faussaire, Négociateur·rice) :
- Silhouette / pose iconique (rough en pixel art ou esquisse)
- Palette individuelle (3-4 couleurs dominantes)
- Élément distinctif visuel (visière, masque, kit de matos…)
- Personnalité visuelle en 1 ligne

#### Décor principal
Concept de l'intérieur de la Banque Lune : entrée, salle des coffres, salle de contrôle. Esquisse rough, pas final.

### Critères d'acceptance
- [ ] `ART.md` complet
- [ ] Mood board livré avec annotations
- [ ] Concepts des 5 rôles
- [ ] Concept du décor principal
- [ ] Validation que la charte respecte la charte plateforme

### Estimation
**1-2 jours** si tu fais toi-même. **~500-1000€** sous-traité.

---

## Récapitulatif des estimations

| Spec  | Issue                              | Estimation solo full-time | Sous-traité          |
|-------|------------------------------------|---------------------------|----------------------|
| P0-1  | Contrat Adventure + guide          | 2-3 jours                 | non sous-traitable   |
| P0-2  | CI complète                        | 0,5 - 1 jour              | non sous-traitable   |
| P0-3  | Charte plateforme                  | 1-2 jours                 | ~500-1000€           |
| P0-4  | Charte Casse Lune                  | 1-2 jours                 | ~500-1000€           |
| **Total P0** |                             | **5-8 jours**             | + ~1000-2000€ DA     |

**Plus les P1** (ESLint, tests, conventions) : ~2-3 jours additionnels.

Fenêtre réaliste pour boucler M1 : **3 à 4 semaines** en solo à temps plein, avec marge pour les imprévus. Plus si tu travailles à temps partiel sur le projet.

---

## Workflow recommandé pour traiter ces specs

1. Pour chaque spec, ouvrir une PR depuis `develop` vers une branche `feat/m1-<slug>`.
2. Coller la spec correspondante (le contenu de "SPEC P0-X") dans Claude Code.
3. Laisser Claude Code exécuter, vérifier le résultat sur ta machine.
4. Compléter manuellement si Claude Code a sauté des choses (notamment les chartes visuelles).
5. Pousser, ouvrir la PR, attendre la CI verte, merger.
6. Fermer l'issue GitHub correspondante avec lien vers le PR.

Ne pas traiter plusieurs specs en parallèle dans la même branche — une spec = une PR. C'est la base d'un historique propre et reviewable.

---

## Mapping vers les issues GitHub actuelles

| Spec | Numéro d'issue | Lien |
|---|---|---|
| P0-1 (Contrat Adventure + guide) | #16 | https://github.com/leonardtwelve/MultiLines/issues/16 |
| P0-2 (CI complète) | #13 | https://github.com/leonardtwelve/MultiLines/issues/13 |
| P0-3 (Charte plateforme) | #11 | https://github.com/leonardtwelve/MultiLines/issues/11 |
| P0-4 (Charte Casse Lune) | #12 | https://github.com/leonardtwelve/MultiLines/issues/12 |

> Les numéros 1/2/5/8 cités dans les titres de specs correspondent à l'ordre logique du plan M1 et **non** aux numéros d'issues GitHub. Voir le tableau ci-dessus pour la correspondance.
