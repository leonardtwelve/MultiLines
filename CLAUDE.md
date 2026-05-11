# Pixel Quests

> ⚠️ **Pivot Jackbox — 12 mai 2026.**
> Le projet est passé d'un modèle "écran partagé pur" à un modèle **hybride Jackbox** :
> tablette centrale (Host) + **smartphone perso par joueur** (Player) + serveur central WebSocket.
> Voir `docs/DECISIONS.md` (D7 amendée, G5 amendée, F1/F3/F5 amendées, F4 abrogée, **F9-F20** nouvelles).

## Vision
Plateforme web de jeux d'aventure multijoueurs en pixel art. **Modèle hybride Jackbox** (F9) :
- **Tablette centrale** : plateau, ambiance, tableau de bord public.
- **Smartphone perso** par joueur (F10) : manette personnelle, info privée, choix d'action, vote secret.
- **Serveur WebSocket** cloud-only (F11) : source de vérité (F17), arbitre les actions.

Aventure de lancement : **Le Casse de la Banque Lune** — cyberpunk, 3-5 joueurs, ~35 min, rôles asymétriques avec bluff.

## Stack technique
- **TypeScript strict** (pas de `any`)
- **Monorepo pnpm workspaces** (F16) : `packages/front/` (clients web) + `packages/server/` (serveur Node)
- Front : Phaser 3 (Host) + framework léger pour Player (F19, à trancher au démarrage Player)
- Serveur : Node + WebSocket (F11, F20)
- Build front : Vite ; tests : Vitest + jsdom ; ESLint + Prettier
- pnpm — Node 20 LTS minimum
- Hébergement (F18) : **Vercel** (front statique) + **Fly.io** (serveur Node)

## Décisions d'architecture (post-pivot)
- **Séparation stricte moteur / aventure** (non négociable, héritée de M1) :
  - `packages/front/src/core/` = moteur générique réutilisable.
  - `packages/front/adventures/<id>/` = contenu spécifique. Ajouter une aventure = créer un dossier, **sans toucher à `core/`**.
  - Les aventures dépendent de `core/`. **L'inverse est interdit** (ESLint le bloque).
- **Source de vérité côté serveur** (D7 amendée, F17). Les clients sont des **projecteurs** sur l'état.
- **Information privée = smartphone** (G5 amendée). La tablette n'affiche jamais d'info privée.
- **Map continue tile-based 32×32** (F12, F13). Plateau 40×20 sans scroll (F8). Portes physiques + cadenas (F15).
- **EventBus typé** + protocole WebSocket + JSON (D2, F20).
- **MIT** par défaut.
- Voir `docs/DECISIONS.md` pour le détail complet (38 ADR : D1-D8 + G1-G10 + F1-F20).

## Environnement
- Repo : https://github.com/leonardtwelve/MultiLines (renommage en `PixelQuests` à effectuer manuellement — voir rapport de bootstrap)
- Branches : `main` (stable, prod Vercel), `develop` (intégration). Les features partent de `develop`.
- CI : `.github/workflows/ci.yml` — install + lint + typecheck + test + build sur `packages/front/`. Étend à `packages/server/` quand celui-ci sera implémenté (Prompt 2).
- URL prod : https://multi-lines.vercel.app

## Workflow de session
1. Lire ce fichier CLAUDE.md pour reprendre le contexte
2. Lire `docs/DECISIONS.md` pour les décisions structurantes
3. Consulter les GitHub Issues ouvertes : `gh issue list --state open`
4. Valider le plan d'action avant de coder
5. Développer (commits Conventional, branche issue de `develop`)
6. Mettre à jour l'issue (fermeture via `Closes #N` dans le commit)
7. Mettre à jour ce fichier si changement d'architecture

## Conventions
- Commits : Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- Co-author IA : `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- **camelCase** fonctions/variables, **PascalCase** classes/types/composants, **kebab-case** fichiers d'aventures et IDs
- Tests : co-localisés dans `src/` (D1) + `tests/` racine pour l'intégration cross-package
- UI en français, identifiants en anglais ou français selon cohérence du module
- Commandes monorepo : `pnpm --filter front dev`, `pnpm --filter server dev` (placeholder M1)
