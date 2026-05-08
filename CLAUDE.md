# MultiLines

## Vision
Jeu de plateau interactif multi-joueurs en temps réel. L'objectif est de proposer une expérience ludique en ligne où plusieurs joueurs s'affrontent ou coopèrent autour d'un plateau partagé.

## Stack technique
**À décider** — voir l'issue #1 (choix de stack).

Options envisagées :
- Next.js 15 + TypeScript + Tailwind + Socket.io/Pusher (cohérent avec Vivier)
- Next.js 15 + Supabase Realtime (auth + DB + channels temps réel intégrés)
- Node.js + Socket.io + Canvas HTML5 (plus léger)

## Décisions d'architecture
<!-- À compléter au fil du projet. -->

## Environnement
<!-- À compléter une fois la stack choisie : URLs dev/prod, variables d'env, etc. Jamais de secrets ici. -->

## Workflow de session
1. Lire ce fichier CLAUDE.md pour reprendre le contexte
2. Consulter les GitHub Issues ouvertes : `gh issue list --state open`
3. Valider le plan d'action avant de coder
4. Développer
5. Mettre à jour l'issue (fermeture via `Closes #N` dans le commit)
6. Mettre à jour ce fichier si changement d'architecture

## Conventions
- Commits : `feat:`, `fix:`, `refactor:`, `docs:`, `test:` + référence issue
- Co-author IA : `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
- UI/UX en français, code en anglais
- Conventions de nommage à confirmer avec la stack choisie (par défaut : camelCase fonctions/variables, PascalCase composants/classes, kebab-case fichiers)
