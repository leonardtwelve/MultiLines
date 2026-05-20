# `docs/specs/`

Specs techniques détaillées — un cran plus précis que `docs/DECISIONS.md` (qui acte des choix structurants), un cran plus haut que le code lui-même.

Ces specs sont lues **avant** d'écrire le code correspondant. Elles servent de contrat de référence pour les PRs d'implémentation.

## Index

| Fichier | Issue | Sujet | Statut |
|---|---|---|---|
| [`protocole.md`](./protocole.md) | [#60](https://github.com/leonardtwelve/MultiLines/issues/60) | Protocole réseau WebSocket + JSON | v1 (20 mai 2026) |
| [`server-state-machine.md`](./server-state-machine.md) | [#61](https://github.com/leonardtwelve/MultiLines/issues/61) | Machine à états du serveur de partie | v1 (20 mai 2026) |
| [`store-projection.md`](./store-projection.md) | [#63](https://github.com/leonardtwelve/MultiLines/issues/63) | Store projection côté client | v1 (20 mai 2026) |

## Conventions

- Une spec = un fichier markdown avec une numérotation interne stable des sections.
- Les décisions clés sont récapitulées dans une **annexe à la fin** (table « # / décision / pourquoi »).
- Les **questions encore ouvertes** sont marquées explicitement (« hors scope » ou « à valider en playtest »).
- Quand une décision change, on amende la spec **dans le même fichier** (avec un encart « amendement du JJ/MM/AAAA ») — pas de spec v2.
