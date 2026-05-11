/**
 * ⚠️ POST-PIVOT JACKBOX (12 mai 2026)
 *
 * Ce fichier orchestre **uniquement le Host** (tablette). Le Player smartphone
 * aura son propre point d'entrée dans `packages/front/src/player/` (Prompt 3).
 *
 * TODO Prompt 3 :
 * - Connexion WebSocket au serveur (F11, F20) au lieu du flux mono-device actuel
 * - Affichage du QR (F10) en attente des Players
 * - Réception de la projection serveur (D7 amendée, F17) pour piloter l'UI
 * - Plus de `engine.store` ni `engine.privateView` (refondus / supprimés)
 */
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
  root!.innerHTML = '<div class="loading">Chargement de l\'aventure…</div>';
  const container = document.createElement('div');
  container.id = 'game';
  root!.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  currentEngine = engine;
  currentAdventure = adventure;

  // TODO Prompt 3 : la source de vérité passera côté serveur (D7 amendée, F17).
  // Pour l'instant, on construit un GameState local minimal pour satisfaire le
  // contrat `Adventure.start(initialState)` ; le serveur prendra le relais.
  const initial = createInitialState();
  for (const p of players) {
    initial.players[p.id] = { id: p.id, name: p.name, color: p.color, isActive: false };
  }

  // Legacy : PlayerManager reste utilisé tant que la projection serveur n'est
  // pas câblée. Voir #63 (spec/store-projection).
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
  adventure.start(initial);
}

showHome();
