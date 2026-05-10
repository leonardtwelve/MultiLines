# Guide des aventures — Pixel Quests

Mode d'emploi opérationnel pour créer et maintenir une aventure.
Cible : un développeur qui n'a **jamais lu le code du moteur**. Si à un endroit ce guide t'oblige à plonger dans `src/core/`, c'est que le guide a un trou — corrige-le.

> Décisions de référence appliquées ici : voir [`DECISIONS.md`](./DECISIONS.md).

---

## 1. Présentation

Une **aventure** est un module autonome sous `src/adventures/<id>/` qui :
- expose des **métadonnées** (manifest) au moteur,
- enregistre ses **scènes Phaser**, ses sons, ses animations au démarrage,
- consomme les **services partagés** du moteur (EventBus, Store, PlayerManager, PrivateView, etc.),
- ne dépend **d'aucune autre aventure** (règle d'or — ESLint le bloque).

Le moteur ne sait rien des aventures. Il les charge, les démarre, leur fournit des services. Ajouter une aventure = créer un dossier conforme au contrat. **Ne jamais modifier `src/core/` pour ajouter une aventure.** Si une aventure semble réclamer une modification du moteur, c'est probablement le contrat qui doit évoluer (autre PR, autre discussion).

---

## 2. Anatomie d'une aventure

```
src/adventures/<id>/
├── manifest.ts          # métadonnées statiques (constante TS)
├── index.ts             # export d'un objet conforme à `Adventure`
├── scenes/              # scènes Phaser propres à cette aventure
├── roles/               # définitions et logiques de rôles (si pertinent)
├── assets/              # sprites, sons, dialogues — voir D5
├── state.ts             # (optionnel) état métier interne
├── ART.md               # direction artistique de l'aventure
└── README.md            # doc spécifique
```

Fichiers **obligatoires** : `manifest.ts`, `index.ts`. Le reste est convention pour rester maintenable.

---

## 3. Le contrat `Adventure`

Source : [`src/core/types/adventure.ts`](../src/core/types/adventure.ts)

```typescript
export interface Adventure {
  readonly manifest: AdventureManifest;

  /** Initialisation : enregistrer scènes, animations, sons. NE PAS démarrer le jeu ici. */
  init(engine: GameEngine): Promise<void>;

  /** Démarrage effectif après init() et la phase de setup. */
  start(initialState: Readonly<GameState>): void;

  /** Nettoyage : libérer ressources, retirer listeners. */
  destroy(): void;
}
```

### Le manifest (D8)

Métadonnées statiques. Validé runtime par `validateManifest()` ([`src/core/types/manifest-validation.ts`](../src/core/types/manifest-validation.ts)) — un manifest invalide fait disparaître l'aventure de l'écran d'accueil.

Champs requis :
- `id` (kebab-case unique), `version` (semver)
- `title`, `shortDescription`, `longDescription`, `thumbnail` (256×256), `banner` (1024×384), `tone`, `tags[]`
- `minPlayers`, `maxPlayers`, `estimatedDurationMin`, `difficulty`
- `contentRating`, `languages[]`

Optionnel :
- `pricing?: { bundled, standalonePriceEur? }` — pour M5+.

---

## 4. Cycle de vie

```
[App start]
     ↓
[HomeScreen liste les aventures (manifest validé)]
     ↓
[Joueur sélectionne une aventure]
     ↓
[SetupScreen : choix du roster (3-5 joueurs nom + couleur)]
     ↓
[main.ts : engine.initStore(initialStateAvecJoueurs)]
     ↓
[adventure.init(engine)]    ← chargement assets, enregistrement scènes/animations
     ↓
[engine.start()]            ← Phaser démarre, joue la 1ʳᵉ scène enregistrée
     ↓
[adventure.start(initialState)]  ← hooks post-démarrage (intro, etc.)
     ↓
[boucle de tours via TurnSystem / scènes Phaser / EventBus]
     ↓
[event 'adventure.completed' émis]
     ↓
[adventure.destroy()]       ← cleanup
     ↓
[retour à HomeScreen]
```

**Règle clé** : `init()` enregistre, `start()` démarre. La séparation existe pour qu'on puisse interposer des étapes (setup, assets pre-loading) entre les deux sans coupler l'aventure à ces étapes.

---

## 5. Services du moteur disponibles

Tous accessibles via l'instance `GameEngine` passée à `init()`.

### `engine.events: EventBus` (voir D2)

Pub/sub typé sur l'union discriminée `GameEvent`. Émettre :
```typescript
engine.events.emit({ type: 'turn.started', payload: { playerId: 'p1', turnNumber: 1 } });
```

S'abonner (retourne une fonction de désabonnement) :
```typescript
const unsubscribe = engine.events.on('state.updated', ({ newState }) => {
  console.log('nouvel état', newState);
});
// plus tard…
unsubscribe();
```

**Étendre les events depuis une aventure** (déclaration merging TS) :
```typescript
// src/adventures/banque-lune/events.ts
declare module '../../core/types/events' {
  interface GameEventRegistry {
    'banque-lune.role-revealed': { playerId: string; roleId: string };
  }
}
```
Conventions : `<adventure-id>.<verb-passé>` lowercase. Voir D2.

### `engine.store: Store` (voir D7)

Source unique de vérité de la partie. Lire :
```typescript
const state = engine.store.getState();
console.log(state.players, state.currentTurn);
```

Modifier (uniquement via actions) :
```typescript
engine.store.dispatch({ type: 'TURN_STARTED', payload: { playerId: 'p1' } });
engine.store.dispatch({ type: 'ADVENTURE_STATE_UPDATED', payload: { newState: { /* ... */ } } });
```

S'abonner aux changements :
```typescript
const unsubscribe = engine.store.subscribe((state) => { /* ... */ });
```

**État spécifique à l'aventure** : stocker dans `state.adventureState: unknown`. Caster dans ton code :
```typescript
type BanqueLuneAdventureState = { roles: Map<string, Role>; alarm: boolean };
const adv = engine.store.getState().adventureState as BanqueLuneAdventureState;
```

### `engine.players: PlayerManager`

Liste les joueurs configurés. Façade simple — on peut migrer vers une lecture du store en M2.

```typescript
engine.players.list();          // Player[]
engine.players.get('p1');       // Player | undefined
engine.players.count();         // number
```

### `engine.turns: TurnSystem`

Tour par tour minimal. Démarrer une partie :
```typescript
engine.turns.begin();                    // ordre = ordre des joueurs
engine.turns.begin(['p2', 'p1', 'p3']);  // ordre custom

engine.turns.currentPlayerId();          // string | null
engine.turns.next();                     // avance, retourne le nouveau playerId
engine.turns.round();                    // numéro de manche
```

### `engine.privateView: PrivateView`

"Tour son écran" — info ou choix privé. Voir [`src/core/ui/PrivateView.ts`](../src/core/ui/PrivateView.ts).

```typescript
// Révélation simple
await engine.privateView.reveal('Léa', {
  title: 'Tu es le Hacker',
  body: 'Tu casses les serrures électroniques.',
  accentColor: '#3affc7',
});

// Choix privé (retourne l'id de l'option choisie)
const choiceId = await engine.privateView.pickAction('Sami', {
  title: 'Pièce : Entrée',
  body: 'Choisis ton action.',
}, [
  { id: 'aide', label: 'Aider' },
  { id: 'sabote', label: 'Saboter', danger: true },
]);
```

### `engine.save: SaveManager`

Persistance locale (LocalStorage par défaut, injectable pour les tests).

```typescript
engine.save.save('banque-lune:roster', { players: [...] });
const roster = engine.save.load<{ players: Player[] }>('banque-lune:roster');
engine.save.remove('banque-lune:roster');
```

### `engine.audio: AudioManager`

État audio (volumes, mute). La diffusion réelle (musique/SFX) reste à la charge des scènes Phaser via `Phaser.Sound`, qui consultent ce manager.

```typescript
engine.audio.setMusicVolume(0.5);
engine.audio.setMuted(true);
const { musicVolume, sfxVolume, muted } = engine.audio.snapshot();
```

### `engine.scenes: SceneManager`

Registre des scènes Phaser. Appelé depuis `init()` :
```typescript
engine.scenes.add(MyOpeningScene);
engine.scenes.add(MyMainScene);
```
La 1ʳᵉ scène ajoutée démarre automatiquement quand `engine.start()` est appelé.

---

## 6. Événements core

| Type                  | Payload                                                         | Émis par                                |
|-----------------------|-----------------------------------------------------------------|-----------------------------------------|
| `player.joined`       | `{ playerId, name }`                                            | (à câbler M2 — Store dispatch)          |
| `player.left`         | `{ playerId }`                                                  | (à câbler M2)                           |
| `turn.started`        | `{ playerId, turnNumber }`                                      | (à câbler M2 — TurnSystem)              |
| `turn.ended`          | `{ playerId }`                                                  | (à câbler M2)                           |
| `adventure.started`   | `{ adventureId }`                                               | (à câbler M2 — main.ts)                 |
| `adventure.completed` | `{ winnerId?, reason }`                                         | aventure (banque-lune ResultScene M2)   |
| `state.updated`       | `{ previousState, newState }`                                   | `Store.dispatch` (automatique)          |

> Statut M1 : seul `state.updated` est émis automatiquement (par le Store). Les autres sont **typés** mais pas encore câblés à des émetteurs côté moteur — c'est un objectif M2 (issue dédiée à ouvrir).

---

## 7. Tutoriel — créer une aventure de test en 30 minutes

Objectif : une aventure cliquable depuis l'écran d'accueil qui affiche une scène placeholder. À la fin, tu sauras où poser quoi.

### Étape 1 — créer le dossier
```
mkdir src/adventures/test-aventure/
mkdir src/adventures/test-aventure/scenes
```

### Étape 2 — écrire le `manifest.ts`
```typescript
// src/adventures/test-aventure/manifest.ts
import type { AdventureManifest } from '../../core/types/adventure';

export const testAventureManifest: AdventureManifest = {
  id: 'test-aventure',
  version: '0.1.0',
  title: 'Test Aventure',
  shortDescription: "Aventure de validation du contrat.",
  longDescription: "Aucun gameplay ; juste un placeholder cliquable.",
  thumbnail: '/adventures/test-aventure/thumbnail.svg',
  banner: '/adventures/test-aventure/banner.svg',
  tone: 'leger',
  tags: ['test'],
  minPlayers: 1,
  maxPlayers: 4,
  estimatedDurationMin: 5,
  difficulty: 'easy',
  contentRating: 'all',
  languages: ['fr'],
};
```

> Astuce : place les deux SVG attendus dans `public/adventures/test-aventure/`. Un fond + un titre suffit en placeholder.

### Étape 3 — écrire `index.ts`
```typescript
// src/adventures/test-aventure/index.ts
import Phaser from 'phaser';
import type { Adventure } from '../../core/types/adventure';
import type { GameEngine } from '../../core/engine/GameEngine';
import type { GameState } from '../../core/state/GameState';
import { testAventureManifest } from './manifest';
import { OpeningScene } from './scenes/OpeningScene';

export const testAventure: Adventure = {
  manifest: testAventureManifest,

  async init(engine: GameEngine): Promise<void> {
    engine.scenes.add(OpeningScene);
  },

  start(_initialState: Readonly<GameState>): void {
    // rien à faire : la scène initiale démarre seule
  },

  destroy(): void {
    // rien à nettoyer dans cette version minimale
  },
};
```

### Étape 4 — créer une scène Phaser de placeholder
```typescript
// src/adventures/test-aventure/scenes/OpeningScene.ts
import Phaser from 'phaser';

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super('test-aventure:opening');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Test Aventure\nplacée avec succès', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffcc66',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
```

### Étape 5 — enregistrer l'aventure dans le registre
Dans `src/app/main.ts`, ajouter à la liste `adventures` :
```typescript
import { testAventure } from '../adventures/test-aventure';

const adventures: readonly Adventure[] = [banqueLuneAdventure, testAventure];
```

### Étape 6 — tester dans l'écran d'accueil
```bash
pnpm run dev
```
Ouvre `http://localhost:5173`. Tu vois deux cartes. Clique sur "Test Aventure", choisis 1-4 joueurs, valide. Le placeholder Phaser s'affiche.

### Étape 7 — checklist de validation
- [ ] L'aventure apparaît bien dans la home (sinon : `validateManifest()` a refusé — vérifier la console).
- [ ] La PR ne touche **aucun** fichier sous `src/core/`.
- [ ] Tests `pnpm run lint`, `typecheck`, `test`, `build` verts.
- [ ] Pas d'import depuis une autre aventure (ESLint le bloque, mais double-vérifier).
- [ ] Le `README.md` du dossier explique le pitch et le statut.

---

## 8. Checklist avant merge d'une nouvelle aventure

- [ ] **Manifest** complet et valide (`validateManifest` retourne `true`).
- [ ] `init()`, `start()`, `destroy()` implémentés.
- [ ] Tests unitaires sur la logique métier non-Phaser (≥ 50% couverture, voir D3).
- [ ] **Aucun** import depuis `src/core/` vers `src/adventures/` (ESLint).
- [ ] **Aucun** import croisé entre aventures (à durcir via ESLint en suite de #4).
- [ ] Assets propres rangés sous `src/adventures/<id>/assets/` selon D5.
- [ ] Animations déclarées via le futur `AnimationManager` (D6) — quand il sera disponible.
- [ ] Événements préfixés par l'id de l'aventure (D2).
- [ ] `ART.md` rempli, charte respectée.
- [ ] `README.md` du dossier présente pitch, rôles, statut.
- [ ] CI verte avant merge.
- [ ] Captures ou GIF dans la description de PR si UI visible.

---

## 9. Référence — le squelette de Banque Lune

Pour comprendre le contrat en pratique, lire dans cet ordre :
1. [`src/adventures/banque-lune/manifest.ts`](../src/adventures/banque-lune/manifest.ts) — manifest complet exemplaire.
2. [`src/adventures/banque-lune/index.ts`](../src/adventures/banque-lune/index.ts) — implémentation du contrat (init / start / destroy).
3. [`src/adventures/banque-lune/state.ts`](../src/adventures/banque-lune/state.ts) — pattern singleton de contexte de partie (à migrer vers le Store en M2).
4. [`src/adventures/banque-lune/scenes/RoomScene.ts`](../src/adventures/banque-lune/scenes/RoomScene.ts) — scène de gameplay réelle.
5. [`src/adventures/banque-lune/ART.md`](../src/adventures/banque-lune/ART.md) — DA bible.

Et l'exemple **minimal** : [`src/adventures/test-adventure/`](../src/adventures/test-adventure/) — implémentation la plus courte possible (manifest + index + scène vide), utilisée comme garde-fou de conformité au contrat (test : `contract.test.ts`).
