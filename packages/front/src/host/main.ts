import { GameEngine } from '../core/engine/GameEngine';
import { SaveManager } from '../core/persistence/SaveManager';
import { createInitialState } from '../core/state/GameState';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
import { banqueLuneAdventure } from '../../adventures/banque-lune';
import type { Adventure } from '../core/types/adventure';
import type { Player } from '../core/players/Player';

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
  root!.innerHTML = '<div class="loading">Distribution des rôles…</div>';
  const container = document.createElement('div');
  container.id = 'game';
  root!.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  currentEngine = engine;
  currentAdventure = adventure;

  // Initialise le store avec les joueurs configurés (D7).
  const initial = createInitialState();
  for (const p of players) {
    initial.players[p.id] = { id: p.id, name: p.name, color: p.color, isActive: false };
  }
  engine.initStore(initial);

  // Compatibilité legacy : PlayerManager continue d'exister tant que les
  // services moteur (TurnSystem, etc.) ne sont pas migrés vers le store.
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
  adventure.start(engine.store.getState());
}

showHome();
