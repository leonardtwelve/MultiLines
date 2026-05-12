# Architecture

> ⚠️ **Document partiellement obsolète — pivot Jackbox du 12 mai 2026.**
>
> Le schéma ci-dessous décrit l'architecture **pré-pivot** (single-package, single-device). Suite au pivot :
> - Le repo est devenu un **monorepo** (F16) avec `packages/front/` (clients web) + `packages/server/` (serveur Node — placeholder M1, à implémenter dans le Prompt 2).
> - La **source de vérité passe côté serveur** (D7 amendée, F17). Les clients sont des projecteurs.
> - Le modèle est **hybride Jackbox** : Host tablette + smartphone Player + serveur WebSocket cloud (F9-F11).
> - Les "Points d'extension futurs" en bas du doc (Multi-écrans, Mode online) **sont devenus présents** post-pivot — ce ne sont plus des bouts à venir mais l'architecture cible.
>
> La séparation `core/adventures` reste valide à l'intérieur de `packages/front/`. Refonte complète du présent document prévue dans le **Prompt 3** (refonte front post-serveur). Voir aussi [`docs/FRONTEND.md`](./FRONTEND.md) qui détaille la spec front post-pivot.

## Principe directeur
**Le moteur ne sait rien des aventures. Les aventures connaissent et utilisent le moteur.**

Cette règle, simple à formuler, est ce qui rend le projet pérenne. Si on respecte ça, ajouter une aventure = créer un dossier, sans rien casser. Si on triche (un `if (adventure === 'banque-lune')` quelque part dans `core/`), on a perdu.

## Schéma textuel

```
+-----------------------------------------------------+
|              src/app/  (entrée + accueil)           |
|   main.ts → HomeScreen → choix d'une Adventure      |
+----------------------+------------------------------+
                       |
                       v
+-----------------------------------------------------+
|                src/core/  (MOTEUR)                  |
|                                                     |
|  engine/    GameEngine  SceneManager  EventBus      |
|  players/   Player  PlayerManager  TurnSystem       |
|  ui/        SharedScreen  PrivateView  (contrats)   |
|  persistence/  SaveManager                          |
|  audio/     AudioManager                            |
|  types/     Adventure (CONTRAT)                     |
|                                                     |
|  ➜ ne sait rien d'aucune aventure                   |
+----------------------^------------------------------+
                       |  implémente le contrat
                       |
+-----------------------------------------------------+
|             src/adventures/  (CONTENU)              |
|                                                     |
|  banque-lune/                                       |
|    manifest.ts   index.ts   scenes/   roles/        |
|    assets/                                          |
|                                                     |
|  <future-adventure>/                                |
|    ... (même structure)                             |
+-----------------------------------------------------+
```

## Flux d'exécution

1. `main.ts` charge la liste des aventures disponibles (import statique des modules `adventures/*/index.ts`).
2. `HomeScreen` affiche le menu DOM (Phaser pas encore instancié — on économise les ressources).
3. L'utilisateur clique sur une aventure → `launchAdventure(adventure)` :
   1. Instancie un `GameEngine`.
   2. Appelle `adventure.init(engine)` qui enregistre les scènes Phaser propres à l'aventure via `engine.scenes.add(...)`.
   3. Appelle `engine.start()` → Phaser démarre avec les scènes enregistrées.
   4. Appelle `adventure.start()` pour les hooks post-démarrage (intro animée, etc.).
4. L'aventure communique avec le moteur uniquement via `engine.events` (EventBus typé) et les services partagés (`engine.players`, `engine.turns`, `engine.save`, `engine.audio`).

## Pourquoi cette séparation ?

- **Réutilisabilité** : la 2e aventure réutilise tout `core/` sans copier-coller.
- **Testabilité** : `core/` se teste sans dépendance à un univers narratif.
- **Lisibilité** : un nouveau contributeur sait où aller : moteur cassé → `core/`, contenu d'une aventure → son dossier.
- **Faible couplage** : l'EventBus typé permet d'ajouter des événements de gameplay sans modifier la signature des services moteur.

## Règle d'or — interdictions

- ❌ Aucun fichier sous `src/core/` ne doit `import` depuis `src/adventures/`.
- ❌ Pas de `switch (adventureId)` ni de `if (adventureId === 'banque-lune')` dans `core/`.
- ❌ Pas d'asset propre à une aventure dans `public/` à la racine — tout sous `src/adventures/<id>/assets/`.

À terme, un test de lint custom (`no-restricted-imports`) bloquera ces imports.

## Points d'extension futurs

> ⚠️ **Les deux premiers points ci-dessous sont devenus présents post-pivot Jackbox** :
> - "Multi-écrans" et "Mode online" → actés par F9-F11. Voir `docs/FRONTEND.md` et issues #60-#67.
>
> Les autres restent des perspectives.

- ~~**Multi-écrans** (téléphones individuels + tablette partagée pour la vue commune)~~ → **acté** F9, F10. En cours d'implémentation (chantier #67).
- ~~**Mode online** (parties à distance)~~ → **acté** F11 (serveur WebSocket cloud-only). En cours d'implémentation.
- **Profils joueurs persistants** (statistiques cross-aventures) — `SaveManager` est déjà découplé du contenu.
- **Localisation** (i18n) — ajouter une couche de strings dans `core/` et un dictionnaire par aventure.
- **Marketplace d'aventures** — chaque aventure étant un dossier autonome conforme au contrat, on peut imaginer un format de package téléchargeable.
- **Outil de création d'aventure** (éditeur de scénario) — bénéficierait du contrat `Adventure` strict.
