# @pixel-quests/server

Serveur Node + WebSocket de Pixel Quests.

## Statut
🚧 **Placeholder — à implémenter dans le Prompt Claude Code 2.**

Spécifications à venir :
- [#60](https://github.com/leonardtwelve/MultiLines/issues/60) — Protocole WebSocket + JSON
- [#61](https://github.com/leonardtwelve/MultiLines/issues/61) — Machine à états du serveur de partie
- [#63](https://github.com/leonardtwelve/MultiLines/issues/63) — Store projection côté client (interface avec ce serveur)
- [#67](https://github.com/leonardtwelve/MultiLines/issues/67) — Chantier monorepo (cette PR fait partie de la **phase B**)

## Architecture cible (F11, F17, F20)
- WebSocket + JSON
- Source de vérité du store de partie
- Validation autoritative des actions joueur
- Diffusion d'événements typés aux clients (Host + Players)

## Hébergement (F18)
Fly.io (à provisionner dans le Prompt 2).
