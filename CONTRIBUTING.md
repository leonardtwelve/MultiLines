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
- Prettier formate, ESLint vérifie. Lance `pnpm run lint:fix` et `pnpm run format` avant de commit.
- **camelCase** pour fonctions/variables, **PascalCase** pour classes/composants/types, **kebab-case** pour fichiers d'aventure et IDs (`banque-lune`).
- Commenter le **pourquoi**, pas le **quoi**.
- UI/UX en français, code (identifiants, types, commits) en français ou anglais — rester cohérent dans un même module.

## Architecture — règle d'or
**Aucun import depuis `core/` vers `adventures/`.** Les aventures dépendent du moteur, jamais l'inverse.
Voir `docs/ARCHITECTURE.md`.
