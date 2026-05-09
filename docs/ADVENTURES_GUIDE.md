# Créer une nouvelle aventure

Ce guide est le mode d'emploi pour ajouter une aventure sans rien casser. Si une étape t'oblige à modifier `src/core/`, **tu te trompes** — soit le contrat `Adventure` doit évoluer (PR séparée, discussion préalable), soit ton besoin se résout côté aventure.

## Le contrat `Adventure`

Toute aventure est un module qui exporte un objet conforme à l'interface `Adventure` définie dans `src/core/types/adventure.ts` :

```typescript
export interface AdventureManifest {
  id: string;                       // kebab-case, ex: "banque-lune"
  title: string;
  shortDescription: string;
  tone: 'leger' | 'tendu' | 'malicieux';
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMin: number;
  thumbnail: string;
}

export interface Adventure {
  readonly manifest: AdventureManifest;
  init(engine: GameEngine): Promise<void>;
  start(): void;
  destroy(): void;
}
```

## Étapes

### 1. Créer le dossier
```
src/adventures/<id>/
├── index.ts        # export de l'objet Adventure
├── manifest.ts     # métadonnées
├── scenes/         # scènes Phaser
├── roles/          # définitions des rôles
├── assets/         # sprites, sons, dialogues
└── README.md       # doc spécifique
```

### 2. Définir le manifest (`manifest.ts`)
Métadonnées seulement. Pas de logique.

### 3. Implémenter le contrat (`index.ts`)
- `init(engine)` : enregistre les scènes Phaser via `engine.scenes.add(...)`. Init des données métier.
- `start()` : hook post-démarrage de Phaser (intro, switch de scène).
- `destroy()` : nettoyage spécifique. Le moteur appelle `Phaser.Game.destroy()` lui-même.

### 4. Référencer l'aventure dans la liste
`src/app/main.ts` : ajouter l'import et l'objet dans le tableau `adventures`.

> 🛈 À terme, ce sera automatisé (auto-discovery via Vite glob imports). Pour l'instant : import explicite.

### 5. Documenter
`README.md` du dossier : pitch, rôles, statut, structure.

## Conventions de nommage

| Élément              | Convention      | Exemple                       |
| -------------------- | --------------- | ----------------------------- |
| ID d'aventure        | kebab-case      | `banque-lune`                 |
| Dossier              | = ID            | `src/adventures/banque-lune/` |
| Classes / scènes     | PascalCase      | `class HeistRoomScene`        |
| Clés Phaser (scenes) | kebab-case      | `'banque-lune-room'`          |
| Assets               | kebab-case      | `hacker-idle.png`             |
| Rôles (clés)         | kebab-case      | `'infiltre'`                  |
| Événements EventBus  | `domaine:verbe` | `'role:revealed'`             |

## Checklist avant merge

- [ ] Le manifest est complet et cohérent (joueurs min ≤ max, durée > 0).
- [ ] L'aventure est référencée dans `src/app/main.ts`.
- [ ] Aucun import depuis une autre aventure (`adventures/x/` → `adventures/y/` interdit).
- [ ] Aucune modification de `src/core/` dans la PR (sauf justification documentée et validation préalable).
- [ ] Au moins un test unitaire qui valide la logique métier non-Phaser de l'aventure.
- [ ] Le `README.md` du dossier est à jour.
- [ ] `pnpm run lint` + `typecheck` + `test` + `build` passent.
- [ ] Captures d'écran ou GIF dans la description de PR si UI visible.
