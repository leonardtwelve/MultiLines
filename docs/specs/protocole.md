# Spec — Protocole réseau WebSocket + JSON

> Réf : F11 (cloud-only), F17 (serveur source de vérité), F20 (WebSocket + JSON), F21 (socket.io), D2 (events typés), D7 amendée (server-side store).
> Issue : [#60](https://github.com/leonardtwelve/MultiLines/issues/60).
> Statut : v1 — 20 mai 2026. Acté à valider en PR avec #61 (state machine) et #63 (projection).

Cette spec fige le **contrat de messages** entre les clients (Host tablette + Players smartphones) et le serveur Node + socket.io de Pixel Quests. Elle étend l'existant `packages/shared/src/protocol/messages.ts` (livré Prompt 2a) avec les **messages gameplay** nécessaires au pilotage d'une partie par le serveur.

---

## 1. Principes

### 1.1. Transport et sérialisation
- **socket.io v4** (F21) — handshake HTTP polling → upgrade WebSocket, reconnexion + heartbeat natifs, rooms natives mappées 1:1 sur nos `Room`.
- **JSON** pour les payloads (F20). Pas de gRPC ni de Protobuf — taille de payload acceptable, debuggabilité prime.
- **socket.io émet un event par message** (pas d'enveloppe `{ type, payload }` au-dessus). Le `type` du message **est** le nom du socket.io event. Cohérent avec l'usage existant : `socket.emit('room.created', payload)`.

> **Décision** : pas d'enveloppe générique `Message<T>`. La discrimination passe par le nom de l'event socket.io. Cela élimine une couche de plomberie et reste cohérent avec la lib transport. Si on migre un jour vers `ws` brut, on ajoutera l'enveloppe à ce moment.

### 1.2. Trois axes de communication
| Axe | Préfixe d'origine | Nommage |
|---|---|---|
| **Host → serveur** | `HostRequest` | `domaine.action` (infinitif présent) ex: `room.create`, `game.start` |
| **Player → serveur** | `PlayerRequest` | idem : `room.join`, `action.propose` |
| **Serveur → clients** | `ServerEvent` | `domaine.action.passé` ex: `room.created`, `player.joined`, `state.updated` |

Tous typés en union discriminée sur `type`. Helper `PayloadOf<M, T>` pour extraire un payload par event name (livré Prompt 2a, conservé).

### 1.3. Diffusion
- Une **room socket.io** = une **partie**. Le serveur émet vers une room pour broadcaster, ou vers un socket précis pour un message dirigé.
- Les **events publics** (visibles par tous) → broadcast room.
- Les **events privés Player** (rôle, objectif, dossiers) → emit dirigé sur le socket du joueur concerné (cf. §5).

### 1.4. Versioning
- Champ optionnel `serverVersion: string` (semver) émis par le serveur dans `connection.established`.
- Le client compare au sien (`import.meta.env.VITE_APP_VERSION` injecté au build).
- Si majeur ≠ → le client affiche un bandeau « rafraîchir la page » et bloque les nouvelles actions.
- **Pas de négociation** — on assume rolling deploy avec rétro-compatibilité minime pendant le MVP. Si breaking change protocol, on bumpe majeur + on documente.

---

## 2. Catalogue des messages (extension Prompt 3c)

### 2.1. Existant (Prompt 2a, conservé)

Voir `packages/shared/src/protocol/messages.ts` :

- `HostRequest` : `room.create` · `game.start` · `ping`
- `PlayerRequest` : `room.join` · `room.leave` · `ping`
- `ServerEvent` : `room.created` · `player.joined` · `player.left` · `room.full` · `room.not-found` · `pong` · `connection.established`

### 2.2. Nouveau — gameplay (à ajouter)

#### Host → serveur (commandes globales)

| Type | Payload | Sémantique |
|---|---|---|
| `game.pause` | `{ roomId }` | Met la partie en pause (acte transitionnel). Optionnel M2, utile playtest. |
| `game.resume` | `{ roomId }` | Sortie de pause. |
| `game.cancel` | `{ roomId }` | Termine la partie sans bilan (host quitte volontairement). |

> Pas de `game.next-turn` — c'est le serveur qui décide quand avancer (cf. #61 state machine).

#### Player → serveur (actions de jeu)

| Type | Payload | Sémantique |
|---|---|---|
| `action.propose` | `{ actionId, params }` | Propose une action de rôle (ex: `infiltrate`, `negotiate`). Le serveur valide l'autorisation + résout. |
| `action.cancel` | `{ proposalId }` | Annule une proposition pas encore validée (utile si confirmation requise). |
| `pacte.propose` | `{ targetPlayerId, terms }` | Propose un Pacte secret à un autre joueur. |
| `pacte.respond` | `{ pacteId, accept }` | Réponse à un Pacte reçu. |
| `vote.cast` | `{ ballotId, choice }` | Vote secret (acte 3). |
| `move.tile` | `{ x, y }` | Demande un déplacement vers une tile (F12, validation portée côté serveur). |

> Toutes les actions Player sont **propositions** soumises au serveur. Le client n'arbitre rien (F17). Le serveur valide → applique → diffuse.

#### Serveur → clients

##### Broadcast room (publics)

| Type | Payload | Sémantique |
|---|---|---|
| `game.started` | `{ initialState, roleDistribution }` | Démarrage effectif de la partie après `game.start` du Host. **N'expose pas les rôles privés** — voir §5. |
| `game.paused` | `{ at }` | La partie est en pause. |
| `game.resumed` | `{ at }` | La partie reprend. |
| `game.ended` | `{ finalState, summary }` | Fin de partie + bilan. |
| `turn.started` | `{ turnNumber, activePlayerId, deadline? }` | Nouveau tour. `deadline` (ms epoch) si timer côté serveur. |
| `turn.ended` | `{ turnNumber, events: TurnEvent[] }` | Fin du tour, liste des événements résolus. |
| `action.resolved` | `{ proposalId, result, deltas }` | Action validée + effet sur le state. |
| `action.rejected` | `{ proposalId, reason: ErrorCode }` | Action refusée (validation côté serveur). |
| `state.patch` | `{ patches, version }` | Patch incrémental du store public (cf. #63 spec projection). |
| `player.position-changed` | `{ playerId, x, y }` | Mouvement sur le plateau (cf. F12). |
| `door.unlocked` | `{ doorId, by }` | Cadenas levé (F15). |
| `alert.changed` | `{ level }` | Jauge d'alerte mise à jour (Banque Lune spec #24). |

##### Dirigés (privés à un Player)

Émis avec `io.to(socketId).emit(...)` ; jamais broadcast.

| Type | Payload | Sémantique |
|---|---|---|
| `private.role-revealed` | `{ roleId, capabilities }` | Distribution du rôle au début de partie (G5). |
| `private.objective` | `{ objectiveId, description, hidden }` | Objectif privé du joueur. |
| `private.dossiers` | `{ items }` | Dossiers en main (info privée banque-lune). |
| `private.pacte-proposed` | `{ pacteId, fromPlayerId, terms }` | Réception d'un Pacte. |
| `private.action-options` | `{ proposalId, availableActions }` | Précalculé pour la UI smartphone (Prompt 3c+). |
| `private.error` | `{ code, message }` | Erreur sur une action proposée (cf. §4). |

### 2.3. Types partagés (à ajouter dans `@pixel-quests/shared`)

- `TurnEvent` : union des événements de tour (alerte, action, déplacement, etc.)
- `ActionId` : enum string (à enrichir par aventure)
- `ProposalId` : `string` (nanoid serveur)
- `PacteId` : `string`
- `BallotId` : `string`
- `ErrorCode` : enum (cf. §4)
- `StatePatch` : `{ path: string[]; value: unknown } | { path: string[]; remove: true }` (cf. #63)

---

## 3. Acquittements et flow happy path

### 3.1. Sans `ack` explicite
Pas d'ack au sens RPC strict — chaque requête déclenche un `*.resolved` ou `*.rejected` côté serveur que le client utilise pour clore la promesse (déjà implémenté dans `SocketClient.createRoom`/`joinRoom`).

### 3.2. Flow type — action joueur réussie

```
Player smartphone                            Serveur                              Tous clients
       |                                        |                                      |
       |--- action.propose                      |                                      |
       |    { actionId, params } -------------->|                                      |
       |                                        |  1. valide (room, état, joueur)      |
       |                                        |  2. résout (dé, modifs)              |
       |                                        |  3. update state                     |
       |                                        |  4. diffuse                          |
       |<-- action.resolved (privé)             |---broadcast state.patch ------------>|
       |    { proposalId, result, deltas }      |---broadcast action.resolved -------->|
       |                                        |                                      |
```

Note : `action.resolved` est à la fois dirigé (pour fermer la promesse de l'auteur avec le détail) ET broadcast (pour info publique aux autres : "Léa a réussi son infiltration"). Le payload broadcast peut être plus pauvre que le privé.

### 3.3. Flow type — action joueur rejetée

```
Player smartphone                            Serveur
       |                                        |
       |--- action.propose                      |
       |    { actionId, params } -------------->|
       |                                        |  validation échoue
       |<-- action.rejected (privé)             |
       |    { proposalId, reason: 'NOT_YOUR_TURN' }
```

Pas de broadcast — seul l'auteur sait que son action a foiré (utile pour la UI mobile).

---

## 4. Gestion d'erreurs

### 4.1. Codes d'erreur (`ErrorCode`)

| Code | Sens |
|---|---|
| `NOT_YOUR_TURN` | L'auteur n'est pas le joueur actif. |
| `NOT_IN_ROOM` | Auteur pas membre de la room ciblée. |
| `ROOM_NOT_FOUND` | Room inexistante. |
| `ROOM_FULL` | Room pleine (5 max). |
| `ROOM_STATE_INVALID` | Action incompatible avec l'état courant (ex: `vote.cast` hors acte 3). |
| `ACTION_UNKNOWN` | `actionId` inconnu. |
| `ACTION_NOT_ALLOWED` | Action existante mais pas autorisée pour ce rôle. |
| `INSUFFICIENT_RESOURCE` | Manque de Crédits / Tension / autre coût. |
| `TARGET_INVALID` | Cible d'action invalide (tile non walkable, joueur absent…). |
| `PACTE_EXPIRED` | Pacte plus en attente de réponse (timeout). |
| `RATE_LIMITED` | Throttling serveur (anti-spam de propositions). |
| `INTERNAL` | Erreur serveur inattendue — log + remonte un message générique. |

### 4.2. Format

```ts
type ErrorPayload = {
  code: ErrorCode;
  message: string;     // français, prêt à afficher côté client
  proposalId?: string; // pour rattacher à une action en cours côté client
  details?: unknown;   // debug, jamais affiché à l'utilisateur
};
```

Émis via `private.error` (ciblé) OU `action.rejected` (rattaché à un proposalId précis).

### 4.3. Comportement client
- Loggue toujours côté console.
- Affiche `message` (déjà localisé FR) dans le HUD smartphone ou un toast Host.
- Si `INTERNAL` → afficher « erreur technique, action perdue, réessaie » + ne pas bloquer la UI.

---

## 5. Anti-triche et filtrage par destinataire

### 5.1. Le serveur valide systématiquement
Pour chaque message Player reçu, le serveur vérifie dans l'ordre :

1. **Socket → joueur** : le `socket.id` est-il bien un joueur connu (présent dans une `Room`) ? Sinon `NOT_IN_ROOM`.
2. **Room → état** : la room est-elle dans un état qui accepte ce message ? (cf. #61 state machine)
3. **Joueur → tour** : si le message exige le joueur actif, est-ce bien lui ? (`NOT_YOUR_TURN`)
4. **Action → rôle** : l'`actionId` est-il dans les capabilities du rôle distribué à ce joueur ? (`ACTION_NOT_ALLOWED`)
5. **Ressources** : assez de Crédits / Tension / etc. ? (`INSUFFICIENT_RESOURCE`)
6. **Cible** : `params` valides (tile walkable, joueur cible existe…) ? (`TARGET_INVALID`)

### 5.2. Filtrage des messages privés
Le serveur connaît la **table des rôles privés** par room. Les messages contenant de l'info privée sont émis avec :

```ts
io.to(player.socketId).emit('private.role-revealed', payload);
```

**Jamais** dans une room socket.io. Les autres joueurs n'ont aucun moyen de voir ces messages (rien à faire côté client — c'est garanti par le transport).

### 5.3. Champ `audience` interdit
Pas de champ `audience: 'private'` sur des messages broadcastés que le client filtrerait. Si l'info est privée, elle ne quitte jamais le serveur vers un destinataire qui n'y a pas droit. **Sécurité par construction.**

---

## 6. Reconnexion

### 6.1. Côté transport (gratuit)
socket.io gère :
- Reconnexion automatique avec backoff exponentiel.
- Heartbeat (ping/pong de la lib, distinct de notre `ping` applicatif).
- Persistance du `socketId` côté serveur sur la durée du reconnect immédiat (`< 2 s`).

### 6.2. Côté serveur
À la **reconnexion d'un Player connu** (identifié par un cookie ou un token retransmis dans le handshake — cf. §6.4), le serveur :

1. Re-join le socket à la room socket.io de la partie.
2. Émet sur le nouveau socket : `state.snapshot` (cf. #63) avec le state public **complet** + la part privée du joueur.
3. Le client reconstruit sa projection (cf. #63) et reprend.

### 6.3. Si la déconnexion dure > N secondes
- **Player** : reste membre logique de la room pendant **2 min** (configurable). Au-delà, le serveur émet `player.left` + retire de la room. Le joueur peut re-rejoindre via le code mais commencera comme nouveau (perd son rôle / ses objectifs).
- **Host** : si Host quitte > **30 s**, la partie passe en `paused`. Au-delà de **5 min**, la partie est annulée (`game.cancel` côté serveur + `game.ended` avec `reason: 'host-timeout'`).

> Constantes M2 : `PLAYER_RECONNECT_GRACE_MS = 120_000` et `HOST_TIMEOUT_MS = 300_000`. Mises dans la config serveur, ajustables par playtest.

### 6.4. Identification de session
Pour qu'une reconnexion sache qui je suis :
- Au premier `room.join`, le serveur génère un `sessionToken` (nanoid) et l'envoie dans `player.joined` (dirigé) + cookie HTTP-only.
- Au reconnect, le client renvoie le cookie automatiquement (handshake socket.io). Le serveur retrouve le joueur via la table `sessionToken → playerId`.
- En l'absence de cookie (browser privé, autre device), c'est une nouvelle session — le joueur doit retaper le code.

> **Décision MVP** : on stocke `sessionToken → playerId` en RAM côté serveur (single-instance, F17). Migration Redis si on passe en multi-instance. Le cookie expire à la fin de la partie (`game.ended`).

---

## 7. Snapshot vs replay (lien avec #63)

Décision tranchée ici, détaillée dans `store-projection.md` :

- **Snapshot complet** à la (re)connexion. Le client jette son state local précédent et adopte le snapshot.
- **Patches incrémentaux** ensuite, via `state.patch` (sous-ensemble JSON Patch RFC 6902 — `add` / `replace` / `remove`).
- Pas de replay d'events arbitraires pour reconstruire — trop fragile face aux désynchros.

> **Raison** : robustesse > efficacité bande passante. Un MVP playtest 30-45 min avec ~5 joueurs ne génère pas assez de trafic pour que ça compte. On reverra si besoin.

---

## 8. Limites de débit (anti-spam)

| Message | Limite |
|---|---|
| `ping` | 1/s par socket (déjà géré par socket.io heartbeat naturellement) |
| `action.propose` | 5/s par joueur (au-delà → `RATE_LIMITED`) |
| `pacte.propose` | 1/s par joueur (Pactes coûteux côté UX) |
| `move.tile` | 10/s par joueur (cas du tap rapide) |
| Autres | pas de limite explicite, le serveur reste seul juge |

Implémentation : `RateLimiter` simple par `(socketId, type)` (token bucket en RAM).

---

## 9. Plan d'implémentation côté code

1. **`packages/shared/src/protocol/`** :
   - Étendre `messages.ts` avec les nouveaux types listés en §2.2 et §2.3.
   - Ajouter `errors.ts` : type `ErrorCode` + `ErrorPayload`.
   - Ajouter `patches.ts` : type `StatePatch`.

2. **`packages/server/src/`** :
   - `handlers/GameHandlers.ts` : nouveaux handlers `game.start` / `game.pause` etc.
   - `handlers/ActionHandlers.ts` : `action.propose` / `action.cancel` / `pacte.*` / `vote.*` / `move.tile`.
   - `core/StateMachine.ts` : pilote l'état d'une room (cf. #61).
   - `core/RateLimiter.ts`.
   - `core/SessionStore.ts` : `sessionToken → playerId` (RAM).

3. **`packages/front/src/network/`** :
   - Étendre `SocketClient.ts` avec les nouveaux helpers (`proposeAction`, `castVote`, etc.) — toujours promise-based avec timeout.
   - Listener sur `private.error` pour afficher les toasts.

4. **Tests** :
   - Schémas Zod ou type guards pour valider les payloads entrants côté serveur (refus des messages mal formés → renforce §5).
   - Tests d'intégration handlers + state machine ensemble.

---

## 10. Hors scope de cette spec
- Le **détail des actions par aventure** (15 actions Banque Lune) — couvert par #41 (gameplay).
- Le **format précis du state public/privé** — couvert par #63 (store projection).
- Les **transitions exactes** entre actes (briefing → casse → vote) — couvert par #61 (state machine).
- Le **versioning protocol majeur** post-MVP — reverra quand stable.

---

## Annexe — Décisions clés

| # | Décision | Pourquoi |
|---|---|---|
| P1 | Pas d'enveloppe `Message<T>` | socket.io event name fait office de discriminant |
| P2 | Snapshot complet à la (re)connexion | Robustesse > économie bande passante (MVP) |
| P3 | Filtrage privé par destinataire serveur | Sécurité par construction, pas par convention client |
| P4 | Codes d'erreur enum stables | Localisation FR au serveur (`message` prêt à afficher) |
| P5 | Reconnexion par cookie session-token | Simple, marche sans login |
| P6 | RAM single-instance pour le MVP | Pas de Redis avant le besoin |
