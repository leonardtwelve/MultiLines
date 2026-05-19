# syntax=docker/dockerfile:1.7
#
# Image de prod pour @pixel-quests/server.
#
# Build multi-stage :
#   1. `builder` — installe toutes les deps du workspace, build shared + server,
#      puis utilise `pnpm deploy --prod` pour produire une arborescence
#      autonome dans /prod/server (sans deps de dev, sans workspace, avec
#      shared inliné dans node_modules).
#   2. `runtime` — image minimale Node 20 alpine qui exécute le bundle.
#
# Construit depuis la racine du repo :
#   docker build -f packages/server/Dockerfile -t pixel-quests-server .

ARG NODE_VERSION=20

# ──────────────────────────────────────────────────────────────────────────────
# Base : corepack actif pour piloter pnpm via le champ `packageManager`.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ──────────────────────────────────────────────────────────────────────────────
# Étape 1 : builder
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Manifestes workspace d'abord (cache layer install si rien ne bouge).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/front/package.json ./packages/front/

# Install borné au sous-graphe de @pixel-quests/server (inclut shared via workspace:*).
# Pas de front, pas de jsdom, pas de Vite — install rapide et image plus légère.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@pixel-quests/server..."

# Sources nécessaires au build.
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# shared d'abord (server l'importe via @pixel-quests/shared).
RUN pnpm --filter @pixel-quests/shared build
RUN pnpm --filter @pixel-quests/server build

# Arborescence prod autonome : node_modules sans deps de dev, shared inliné.
RUN pnpm --filter @pixel-quests/server deploy --prod /prod/server

# ──────────────────────────────────────────────────────────────────────────────
# Étape 2 : runtime
# ──────────────────────────────────────────────────────────────────────────────
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Fly route le trafic interne sur 8080 (cf. fly.toml).
ENV PORT=8080

# Bundle + deps prod uniquement.
COPY --from=builder --chown=node:node /prod/server/dist ./dist
COPY --from=builder --chown=node:node /prod/server/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod/server/package.json ./package.json

EXPOSE 8080
USER node

CMD ["node", "dist/index.js"]
