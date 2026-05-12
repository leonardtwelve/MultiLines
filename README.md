# Pixel Quests

[![CI](https://github.com/leonardtwelve/MultiLines/actions/workflows/ci.yml/badge.svg)](https://github.com/leonardtwelve/MultiLines/actions/workflows/ci.yml) — [https://multi-lines.vercel.app](https://multi-lines.vercel.app)

Plateforme web de jeux d'aventure multijoueurs en pixel art, **modèle hybride Jackbox** (tablette centrale + smartphone perso par joueur, serveur central WebSocket).

Aventure de lancement : **Le Casse de la Banque Lune** — cyberpunk, 3 à 5 joueurs, ~35 min, rôles asymétriques avec bluff.

> ⚠️ **Pivot Jackbox — 12 mai 2026.**
> Le projet est passé d'un modèle "écran partagé pur" (PoC M1) à un modèle hybride : tablette Host + smartphone Player + serveur autoritaire. Voir [`docs/DECISIONS.md`](./docs/DECISIONS.md) (D7 amendée, G5 amendée, **F9-F20** nouvelles).

## Stack
- **TypeScript strict** (pas de `any`)
- **Monorepo pnpm workspaces** : `packages/front/` (Host tablette + Player smartphone) + `packages/server/` (serveur Node + WebSocket — placeholder, à implémenter)
- Front : **Phaser 3** (Host) + framework léger pour le Player (à trancher)
- Serveur : **Node + ws** (WebSocket) — voir issues #60, #61
- Build front : **Vite** · tests : **Vitest** + jsdom · **ESLint + Prettier**
- Hébergement : **Vercel** (front statique) + **Fly.io** (serveur Node)
- pnpm — Node 20 LTS minimum

## Démarrer (post-monorepo, PR #68)
```bash
pnpm install                       # workspace racine
pnpm --filter front dev            # http://localhost:5173 (Host pour l'instant)
pnpm --filter front test           # vitest run
pnpm --filter front typecheck
pnpm --filter front lint
pnpm --filter front build          # output dans packages/front/dist
```

> Pré-monorepo (M1 / develop avant merge de PR #68), les commandes restent `pnpm run dev`, `pnpm run test`, etc. à la racine du repo.

## Architecture
Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) et la spec front [`docs/FRONTEND.md`](./docs/FRONTEND.md) pour le détail.

En une ligne :
- **`packages/front/src/core/`** = moteur générique réutilisable (séparation stricte avec aventures)
- **`packages/front/adventures/<id>/`** = contenu spécifique d'une aventure
- **`packages/server/`** = source de vérité (D7 amendée) — placeholder, à implémenter dans le Prompt 2

## Créer une nouvelle aventure
Voir [`docs/ADVENTURES_GUIDE.md`](./docs/ADVENTURES_GUIDE.md) (⚠️ document à mettre à jour post-pivot Jackbox).

## Roadmap
Voir [`docs/ROADMAP.md`](./docs/ROADMAP.md). Jalon en cours : **M2** — chantier #67 (migration monorepo + serveur + Player smartphone).

## Statut
🚧 En développement — version `0.0.0`. PoC M1 jouable bout-en-bout mergé. Migration monorepo en review (PR #68). Serveur à implémenter (Prompt 2).

## Contribuer
Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md).
