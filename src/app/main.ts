import { GameEngine } from '../core/engine/GameEngine';
import { HomeScreen } from './HomeScreen';
import { banqueLuneAdventure } from '../adventures/banque-lune';
import type { Adventure } from '../core/types/adventure';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans index.html');
}

const adventures: readonly Adventure[] = [banqueLuneAdventure];

const home = new HomeScreen({
  root,
  adventures,
  onSelect: (adventure) => {
    void launchAdventure(root, adventure);
  },
});

home.render();

async function launchAdventure(host: HTMLElement, adventure: Adventure): Promise<void> {
  host.innerHTML = '';
  const container = document.createElement('div');
  container.id = 'game';
  host.appendChild(container);

  const engine = new GameEngine({ parent: container, width: 1280, height: 720 });
  await adventure.init(engine);
  engine.start();
  adventure.start();
}
