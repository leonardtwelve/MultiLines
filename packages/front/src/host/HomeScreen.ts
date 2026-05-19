import type { Adventure } from '../core/types/adventure';

export interface HomeScreenProps {
  root: HTMLElement;
  adventures: readonly Adventure[];
  onSelect: (adventure: Adventure) => void;
  /**
   * Mode multijoueur en ligne (pivot Jackbox, post-Prompt 3a). Optionnel
   * pour rester rétro-compatible avec le PoC mono-device tant que la
   * refonte n'est pas terminée (Prompt 3b/c).
   */
  onStartMultiplayer?: (adventure: Adventure) => void;
}

/**
 * Écran d'accueil DOM (hors Phaser) : titre + liste des aventures cliquables.
 * Phaser n'est instancié qu'au lancement effectif d'une aventure (économise les
 * ressources tant que l'utilisateur n'a pas choisi).
 */
export class HomeScreen {
  constructor(private readonly props: HomeScreenProps) {}

  render(): void {
    const { root, adventures, onSelect, onStartMultiplayer } = this.props;
    root.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'home';

    const title = document.createElement('h1');
    title.className = 'home__title';
    title.textContent = 'Pixel Quests';
    wrapper.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'home__subtitle';
    subtitle.textContent = "Plateforme de jeux d'aventure multijoueurs en pixel art.";
    wrapper.appendChild(subtitle);

    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'home__section';
    sectionTitle.textContent = 'Choisis une aventure';
    wrapper.appendChild(sectionTitle);

    const list = document.createElement('ul');
    list.className = 'adventures';

    for (const adventure of adventures) {
      list.appendChild(this.buildCard(adventure, onSelect, onStartMultiplayer));
    }

    wrapper.appendChild(list);
    root.appendChild(wrapper);
  }

  private buildCard(
    adventure: Adventure,
    onSelect: (a: Adventure) => void,
    onStartMultiplayer?: (a: Adventure) => void,
  ): HTMLLIElement {
    const m = adventure.manifest;
    const card = document.createElement('li');
    card.className = 'adventure-card';

    const heading = document.createElement('h3');
    heading.textContent = m.title;
    card.appendChild(heading);

    const desc = document.createElement('p');
    desc.textContent = m.shortDescription;
    card.appendChild(desc);

    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${m.minPlayers}-${m.maxPlayers} joueurs · ~${m.estimatedDurationMin} min · ton ${m.tone}`;
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'adventure-card__actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'adventure-card__primary';
    button.textContent = 'Lancer (mono-device)';
    button.addEventListener('click', () => onSelect(adventure));
    actions.appendChild(button);

    if (onStartMultiplayer) {
      const mp = document.createElement('button');
      mp.type = 'button';
      mp.className = 'adventure-card__multiplayer';
      mp.dataset.testid = 'start-multiplayer';
      mp.textContent = '📱 Lancer en multijoueur';
      mp.addEventListener('click', () => onStartMultiplayer(adventure));
      actions.appendChild(mp);
    }

    card.appendChild(actions);

    return card;
  }
}
