import { GameEngine } from '../core/engine/GameEngine';
import { SaveManager } from '../core/persistence/SaveManager';
import { HomeScreen } from './HomeScreen';
import { SetupScreen } from './SetupScreen';
import { banqueLuneAdventure } from '../adventures/banque-lune';
import type { Adventure } from '../core/types/adventure';
import type { Player } from '../core/players/Player';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans index.html');
}

const adventures: readonly Adventure[] = [banqueLuneAdventure];
const save = new SaveManager();

let currentEngine: GameEngine | null = null;

function showHome(): void {
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
  // Préparer le conteneur Phaser. Le DOM PrivateView se monte sur document.body, donc OK.
  root!.innerHTML = '<div class="loading">Distribution des rôles…</div>';
  const container = document.createElement('div');
  container.id = 'game';
  root!.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  currentEngine = engine;

  for (const p of players) {
    engine.players.add(p);
  }

  // L'aventure Banque Lune nécessite un onFinish — typage local pour ne pas exposer
  // la dépendance dans le contrat Adventure générique.
  if ('configure' in adventure && typeof adventure.configure === 'function') {
    (adventure as typeof banqueLuneAdventure).configure({
      onFinish: () => showHome(),
    });
  }

  await adventure.init(engine);

  // Une fois la révélation des rôles terminée, on enlève le message de chargement.
  const loading = root!.querySelector('.loading');
  if (loading) loading.remove();

  engine.start();
  adventure.start();
}

showHome();
