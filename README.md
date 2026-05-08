# Pixel Quests

Plateforme web de jeux d'aventure multijoueurs en pixel art, jouables autour d'un écran partagé (tablette).
Aventure de lancement : **Le Casse de la Banque Lune** — cyberpunk, 3 à 5 joueurs, ~35 min, rôles asymétriques avec bluff.
Architecture pensée pour qu'ajouter une nouvelle aventure ne touche jamais au moteur.

## Stack
- **TypeScript** strict
- **Phaser 3** (rendu jeu)
- **Vite** (dev server + build)
- **Vitest** (tests)
- **ESLint + Prettier** (lint + format)
- **pnpm** (package manager) — Node 20 LTS minimum

## Démarrer
```bash
pnpm install
pnpm run dev          # http://localhost:5173
pnpm run test         # tests Vitest
pnpm run typecheck    # vérification TS
pnpm run lint         # ESLint
pnpm run build        # production build dans dist/
```

## Architecture
Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) pour le détail. En une ligne :
`src/core/` est le moteur générique réutilisable, `src/adventures/<id>/` contient le contenu propre à chaque aventure.

## Créer une nouvelle aventure
Voir [`docs/ADVENTURES_GUIDE.md`](./docs/ADVENTURES_GUIDE.md).

## Roadmap
Voir [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Statut
🚧 En développement — version `0.0.0`. Le squelette technique est posé ; le gameplay du Casse de la Banque Lune sera implémenté progressivement.

## Contribuer
Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md).
