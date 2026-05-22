// ⚠️ POST-PIVOT JACKBOX — flow multijoueur câblé en slice 3d.
// État actuel :
//   - Mono-device : Home → Setup → MapScene (inchangé, pour le PoC offline).
//   - Multijoueur : Home → HostLobby → (à game.start serveur) → MapScene
//     pilotée par le ClientStore alimenté par state.snapshot + state.patch.

import { GameEngine } from '../core/engine/GameEngine';
import { SaveManager } from '../core/persistence/SaveManager';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
import { HostLobbyScreen } from './lobby/HostLobbyScreen';
import { SocketClient } from '../network/SocketClient';
import { getServerUrl } from '../network/env';
import { ClientStore, wireStore } from '../store';
import { banqueLuneAdventure } from '../../adventures/banque-lune';
import type { Adventure } from '../core/types/adventure';
import type { Player } from '../core/players/Player';
import type { GameState } from '../core/state/GameState';
import { createInitialState } from '../core/state/GameState';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans index.html');
}

const adventures: readonly Adventure[] = [banqueLuneAdventure];
const save = new SaveManager();

let currentEngine: GameEngine | null = null;
let currentAdventure: Adventure | null = null;
let currentLobby: HostLobbyScreen | null = null;
let currentClient: SocketClient | null = null;
let currentStoreUnwire: (() => void) | null = null;

function cleanupActive(): void {
  if (currentAdventure) {
    currentAdventure.destroy();
    currentAdventure = null;
  }
  if (currentEngine) {
    currentEngine.stop();
    currentEngine = null;
  }
  if (currentLobby) {
    currentLobby.destroy();
    currentLobby = null;
  }
  if (currentStoreUnwire) {
    currentStoreUnwire();
    currentStoreUnwire = null;
  }
  if (currentClient) {
    currentClient.disconnect();
    currentClient = null;
  }
}

function showHome(): void {
  cleanupActive();
  root!.innerHTML = '';
  new HomeScreen({
    root: root!,
    adventures,
    onSelect: (adventure) => showSetup(adventure),
    onStartMultiplayer: (adventure) => showLobby(adventure),
  }).render();
}

function showLobby(adventure: Adventure): void {
  cleanupActive();
  root!.innerHTML = '';

  // Un seul SocketClient + ClientStore partagés entre HostLobby et la suite
  // (MapScene une fois game.started reçu).
  const client = new SocketClient({ url: getServerUrl() });
  const store = new ClientStore();
  currentClient = client;
  currentStoreUnwire = wireStore(client, store);

  const lobby = new HostLobbyScreen({
    root: root!,
    client,
    adventureId: adventure.manifest.id,
    joinBaseUrl: new URL('player/index.html', window.location.origin).toString(),
    onCancel: () => showHome(),
    onStartGame: ({ roomId, players }) => {
      // eslint-disable-next-line no-console
      console.log('[host] game.start sent', { roomId, players });
      client.startGame(roomId);
      // La transition vers MapScene se déclenche sur l'événement
      // `game.started` reçu du serveur (cf. listener ci-dessous).
    },
  });
  currentLobby = lobby;

  // Listener qui transitionne le Host vers la MapScene au démarrage
  // effectif (broadcast serveur). Le store est déjà branché en parallèle.
  client.on('game.started', (payload) => {
    transitionToMap(adventure, store, payload.initialState);
  });

  void lobby.render();
}

/**
 * Transition du lobby Host vers la MapScene Phaser une fois que le
 * serveur a confirmé `game.started`. Le store est déjà alimenté par
 * `state.snapshot` reçu juste avant — la MapScene pourra s'y abonner
 * pour la suite (positions, alerte, etc.) une fois 3e câblé.
 */
function transitionToMap(
  adventure: Adventure,
  _store: ClientStore,
  initialState: {
    players: Readonly<Record<string, { id: string; name: string; color: string }>>;
  },
): void {
  // Nettoie le lobby DOM mais GARDE le client + store (utilisés par la
  // MapScene à venir).
  if (currentLobby) {
    currentLobby.destroy();
    currentLobby = null;
  }
  root!.innerHTML = '';
  const container = document.createElement('div');
  container.id = 'game';
  root!.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  currentEngine = engine;
  currentAdventure = adventure;

  // Aligne PlayerManager côté Host avec les vrais joueurs envoyés par
  // le serveur (legacy — sera projeté depuis le store en slice 3e).
  for (const p of Object.values(initialState.players)) {
    engine.players.add({ id: p.id, name: p.name, color: p.color });
  }

  if ('configure' in adventure && typeof adventure.configure === 'function') {
    (adventure as typeof banqueLuneAdventure).configure({ onFinish: () => showHome() });
  }

  void adventure.init(engine).then(() => {
    engine.start();
    // TODO 3e : remplacer par une projection complète depuis le store.
    const initial: GameState = createInitialState();
    for (const p of Object.values(initialState.players)) {
      initial.players[p.id] = { id: p.id, name: p.name, color: p.color, isActive: false };
    }
    adventure.start(initial);
  });
}

function showSetup(adventure: Adventure): void {
  new SetupScreen({
    root: root!,
    adventure,
    save,
    onCancel: () => showHome(),
    onSubmit: (players) => void launchAdventure(adventure, players),
  }).render();
}

async function launchAdventure(adventure: Adventure, players: Player[]): Promise<void> {
  root!.innerHTML = '<div class="loading">Chargement…</div>';
  const container = document.createElement('div');
  container.id = 'game';
  root!.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  currentEngine = engine;
  currentAdventure = adventure;

  for (const p of players) engine.players.add(p);

  if ('configure' in adventure && typeof adventure.configure === 'function') {
    (adventure as typeof banqueLuneAdventure).configure({ onFinish: () => showHome() });
  }

  await adventure.init(engine);
  const loading = root!.querySelector('.loading');
  if (loading) loading.remove();
  engine.start();

  const initial: GameState = createInitialState();
  for (const p of players) {
    initial.players[p.id] = { id: p.id, name: p.name, color: p.color, isActive: false };
  }
  adventure.start(initial);
}

showHome();
