// ⚠️ POST-PIVOT JACKBOX — refonte prévue Prompt 3.
// Le flux actuel (Home → Setup → Reveal → Plateau → Result, tout sur tablette)
// devient :
//   - Host tablette : Home → Lobby (QR/code) → Plateau (map continue) → Bilan
//   - Player smartphone : scan QR → choix rôle → réception objectif privé
//     → propositions d'action / vote → bilan
// Les actions/intents transitent par le serveur WebSocket (F11, F17, F20).
// `engine.initStore` et `engine.store.getState()` ont été retirés du
// `GameEngine` post-archivage du Store client (D7 amendée).

import { GameEngine } from '../core/engine/GameEngine';
import { SaveManager } from '../core/persistence/SaveManager';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
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

function showHome(): void {
  if (currentAdventure) {
    currentAdventure.destroy();
    currentAdventure = null;
  }
  if (currentEngine) {
    currentEngine.stop();
    currentEngine = null;
  }
  root!.innerHTML = '';
  new HomeScreen({
    root: root!,
    adventures,
    onSelect: (adventure) => showSetup(adventure),
  }).render();
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

  // Compatibilité legacy : on conserve PlayerManager le temps de la migration.
  // TODO Prompt 3 : le serveur sera la source de vérité (F17), PlayerManager
  // deviendra une projection.
  for (const p of players) engine.players.add(p);

  // Hook propre à banque-lune (configure onFinish avant init).
  if ('configure' in adventure && typeof adventure.configure === 'function') {
    (adventure as typeof banqueLuneAdventure).configure({
      onFinish: () => showHome(),
    });
  }

  await adventure.init(engine);

  const loading = root!.querySelector('.loading');
  if (loading) loading.remove();

  engine.start();

  // TODO Prompt 3 : initialState viendra de la projection serveur via une
  // sync au démarrage. Pour l'instant, on construit un état initial minimal
  // côté client (uniquement les joueurs et un statut neutre) pour matcher
  // le contrat Adventure.start(initialState).
  const initial: GameState = createInitialState();
  for (const p of players) {
    initial.players[p.id] = { id: p.id, name: p.name, color: p.color, isActive: false };
  }
  adventure.start(initial);
}

showHome();
