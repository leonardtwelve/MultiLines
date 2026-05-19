# @pixel-quests/server

Serveur Node + socket.io de Pixel Quests. Source de vérité de l'état des
parties (F17), hébergé sur Fly.io (F18), protocole socket.io v4 (F21).

## Statut
✅ Foundation livrée (PR #77).
✅ Déploiement Fly.io câblé (PR à venir, Prompt 2b).
🚧 Machine à états de partie : à venir (issue #61).

## Architecture (rappel)
- **socket.io v4** côté serveur (F21), `socket.io-client` côté front (Prompt 3)
- **Rooms en RAM** via `RoomRegistry` — single-instance, pas de Redis adapter pour le MVP
- **Endpoint `/health`** GET → `{status, rooms}` consommé par le healthcheck Fly
- **Types partagés** via `@pixel-quests/shared/protocol`

## Développement local

```bash
# Depuis la racine du repo
pnpm install
pnpm --filter @pixel-quests/shared build   # shared d'abord (peer du server)
pnpm --filter @pixel-quests/server dev     # tsx watch sur src/index.ts
```

Le serveur écoute sur `http://localhost:3001` (cf. `src/config/env.ts`).

```bash
curl http://localhost:3001/health
# → {"status":"ok","rooms":0}
```

### Tests

```bash
pnpm --filter @pixel-quests/server test
```

24 tests d'intégration (Room, RoomRegistry, room-code, handlers socket.io
sur `127.0.0.1`).

### Variables d'environnement

| Variable | Défaut local | Description |
|---|---|---|
| `PORT` | `3001` | Port HTTP/WebSocket. Fly force à `8080`. |
| `PUBLIC_URL` | `http://localhost:3001` | URL publique utilisée pour générer les liens QR de connexion. |
| `CORS_ORIGINS` | `*` | Origins autorisés. En prod : URL du front Vercel. |

Validation au démarrage : le serveur throw si `PORT` n'est pas un nombre
positif.

---

## Déploiement Fly.io

### Provisionnement initial (une seule fois, en local par un humain)

```bash
# 1. Authentification
flyctl auth login

# 2. Création de l'app (lit le nom dans packages/server/fly.toml)
flyctl apps create pixel-quests-server --org personal

# 3. Secrets de prod
flyctl secrets set \
  CORS_ORIGINS="https://multi-lines.vercel.app" \
  PUBLIC_URL="https://pixel-quests-server.fly.dev" \
  --app pixel-quests-server

# 4. Premier deploy manuel (vérification)
flyctl deploy \
  --config packages/server/fly.toml \
  --dockerfile packages/server/Dockerfile \
  --app pixel-quests-server
```

### Côté GitHub Actions

1. Récupérer un token API Fly :
   ```bash
   flyctl tokens create deploy -x 999999h
   ```
2. L'ajouter dans GitHub : **Settings → Secrets and variables → Actions →
   `FLY_API_TOKEN`**.
3. Désormais, chaque push de `develop` ou `main` qui touche `packages/server/`,
   `packages/shared/`, ou la config workspace déclenche
   `.github/workflows/deploy-server.yml` :
   - install + build shared
   - tests serveur
   - build serveur
   - `flyctl deploy --remote-only`
   - smoke test sur `/health`

### Build Docker en local (debug)

Construit depuis la racine du repo, pas depuis `packages/server/` :

```bash
docker build \
  -f packages/server/Dockerfile \
  -t pixel-quests-server:local \
  .

docker run --rm -p 8080:8080 \
  -e CORS_ORIGINS="*" \
  -e PUBLIC_URL="http://localhost:8080" \
  pixel-quests-server:local

curl http://localhost:8080/health
```

### Vérifier la prod après deploy

```bash
flyctl status --app pixel-quests-server
flyctl logs --app pixel-quests-server
curl https://pixel-quests-server.fly.dev/health
```

### Rollback

```bash
flyctl releases --app pixel-quests-server   # lister les versions
flyctl deploy --image <image-ref>           # ou via l'UI Fly
```

---

## Liens

- [F17 — Source de vérité](../../docs/DECISIONS.md#f17--source-de-vérité)
- [F18 — Hébergement](../../docs/DECISIONS.md#f18--hébergement)
- [F20 — Protocole réseau](../../docs/DECISIONS.md#f20--protocole-réseau)
- [F21 — Bibliothèque WebSocket](../../docs/DECISIONS.md#f21--bibliothèque-websocket)
- [Issue #69](https://github.com/leonardtwelve/MultiLines/issues/69) — Squelette serveur + déploiement Fly.io
- [Chantier #67](https://github.com/leonardtwelve/MultiLines/issues/67) — Migration monorepo + serveur + Player smartphone
