# Pixel Quests

## Vision
Plateforme web de jeux d'aventure multijoueurs en pixel art, jouables autour d'un écran partagé (tablette posée au centre de la table). Aventure de lancement : **Le Casse de la Banque Lune** — cyberpunk, 3-5 joueurs, ~35 min, rôles asymétriques avec bluff.

## Stack technique
- TypeScript **strict** (pas de `any`)
- Phaser 3 (rendu jeu) — instancié uniquement au lancement d'une aventure
- Vite (dev server + build)
- Vitest + jsdom (tests unitaires)
- ESLint + Prettier
- pnpm — Node 20 LTS minimum

## Décisions d'architecture
- **Séparation stricte moteur / aventure** (non négociable) :
  - `src/core/` = moteur générique réutilisable (events, scènes, joueurs, tour, save, audio, contrats UI).
  - `src/adventures/<id>/` = contenu spécifique. Ajouter une aventure = créer un dossier, **sans toucher à `core/`**.
  - Les aventures dépendent de `core/`. **L'inverse est interdit** (l'ESLint pourra le rejeter à terme).
- **HomeScreen est DOM** (hors Phaser). Phaser n'est instancié qu'au lancement d'une aventure pour économiser les ressources.
- **EventBus typé** = seul canal aventure ↔ moteur sans couplage direct.
- **MIT** par défaut.
- Voir `docs/ARCHITECTURE.md` pour le détail.

## Environnement
- Repo : https://github.com/leonardtwelve/MultiLines (renommage en `PixelQuests` à effectuer manuellement — voir rapport de bootstrap)
- Branches : `main` (stable), `develop` (intégration). Les features partent de `develop`.
- CI : `.github/workflows/ci.yml` — install + lint + typecheck + test + build.

## Workflow de session
1. Lire ce fichier CLAUDE.md pour reprendre le contexte
2. Consulter les GitHub Issues ouvertes : `gh issue list --state open`
3. Valider le plan d'action avant de coder
4. Développer (commits Conventional, branche issue de `develop`)
5. Mettre à jour l'issue (fermeture via `Closes #N` dans le commit)
6. Mettre à jour ce fichier si changement d'architecture

## Conventions
- Commits : Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- Co-author IA : `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- **camelCase** fonctions/variables, **PascalCase** classes/types/composants, **kebab-case** fichiers d'aventures et IDs
- Tests : un fichier `*.test.ts` par module testé sous `tests/`
- UI en français, identifiants en anglais ou français selon cohérence du module
