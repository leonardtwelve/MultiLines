# Contribuer à Pixel Quests

## Reporter un bug
Ouvrir une issue avec le template **Rapport de bug** : https://github.com/leonardtwelve/MultiLines/issues/new?template=bug_report.yml

## Proposer une fonctionnalité
Ouvrir une issue avec le template **Demande de fonctionnalité** : https://github.com/leonardtwelve/MultiLines/issues/new?template=feature_request.yml

## Donner un feedback
Ouvrir une issue avec le template **Retour d'expérience** : https://github.com/leonardtwelve/MultiLines/issues/new?template=feedback.yml

## Workflow Git
- Branches issues de `develop`. `main` reflète la dernière version stable.
- Une PR par issue, base = `develop`.
- CI (lint + typecheck + test + build) doit passer avant merge.

## Workflow de triage
1. Toute nouvelle issue arrive avec `status:triage`.
2. Après qualification (priorité, sizing, critères d'acceptation) → `status:accepted`.
3. Au démarrage du dev → `status:in-progress`.
4. Fermeture automatique via `Closes #N` dans le commit qui résout l'issue.

## Labels
- **Type** : `bug`, `enhancement`, `feedback`, `tech-debt`, `docs`
- **Priorité** : `P0` (bloquant), `P1`, `P2`, `P3` (nice to have)
- **Statut** : `status:triage`, `status:accepted`, `status:in-progress`
- **Catégorie** : `cat:gameplay`, `cat:ui-ux`, `cat:multiplayer`
- **Jalon** : `m1`, `m2`
- **Périmètre** : `core`, `adventure:banque-lune`
- **Nature** : `dev` (issue de code exécutable), `spec/game-design` (spec gameplay), `spec/tech` (spec architecture), `chantier` (epic / meta-issue)

## Conventions de commit (Conventional Commits)
Format : `<type>(<scope>): <description courte>`

Types : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`, `ci`, `build`.

Référencer l'issue : `Closes #N` ou `Refs #N`.

Co-author IA quand pertinent :
```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## Conventions de code
- TypeScript **strict**, aucun `any` toléré (lint le rejette).
- Prettier formate, ESLint vérifie. Lance `pnpm --filter front lint:fix` et `pnpm run format` avant de commit.
- **camelCase** pour fonctions/variables, **PascalCase** pour classes/composants/types, **kebab-case** pour fichiers d'aventure et IDs (`banque-lune`).
- Commenter le **pourquoi**, pas le **quoi**.
- UI/UX en français, code (identifiants, types, commits) en français ou anglais — rester cohérent dans un même module.

## Monorepo (post-pivot Jackbox — F16)

Structure :
```
pixel-quests/
├── packages/
│   ├── front/      # Clients web : Host (tablette) + Player (smartphone)
│   └── server/     # Serveur Node + WebSocket (placeholder M1, impl Prompt 2)
├── docs/
└── scripts/
```

Conventions :
- **Naming** des packages : `front`, `server` (interne au workspace). Le namespace `@pixel-quests/` n'est pas utilisé pour l'instant (privé).
- **Commandes** : préfixer par `pnpm --filter <package> <script>`. Ex : `pnpm --filter front dev`, `pnpm --filter server test`.
- **Code partagé** Host/Player : `packages/front/src/shared/`.
- **Code partagé front/server** (types d'événements, protocole, logique pure) : à terme dans un dossier `shared/` racine ou `packages/shared/` — modalités à trancher dans le **Prompt 2** (cf. issue #64 spec/monorepo-setup).
- **Tests** : co-localisés dans `src/` (D1) ; `tests/` racine du package pour l'intégration.
- **CI** : `.github/workflows/ci.yml` orchestre via `pnpm --filter` — un job `validate` qui lint/typecheck/test/build chaque package qui a quelque chose à valider.
- **Vercel** (F18) : déploie `packages/front/` via `vercel.json` au niveau racine.
- **Fly.io** (F18) : à provisionner pour `packages/server/` (Prompt 2).

## Architecture — règles d'or
- **Aucun import depuis `core/` vers `adventures/`.** Les aventures dépendent du moteur, jamais l'inverse.
- **Source de vérité côté serveur** (D7 amendée, F17). Les clients sont des **projecteurs** — pas de mutation locale du store.
- **Info privée = smartphone** (G5 amendée). Jamais sur la tablette.

Voir `docs/ARCHITECTURE.md` et `docs/DECISIONS.md`.
