import type { Adventure } from '../core/types/adventure';

export interface HomeScreenProps {
  root: HTMLElement;
  adventures: readonly Adventure[];
  onSelect: (adventure: Adventure) => void;
}

/**
 * Écran d'accueil DOM (hors Phaser) : titre + liste des aventures cliquables.
 * Phaser n'est instancié qu'au lancement effectif d'une aventure (économise les
 * ressources tant que l'utilisateur n'a pas choisi).
 */
export class HomeScreen {
  constructor(private readonly props: HomeScreenProps) {}

  render(): void {
    const { root, adventures, onSelect } = this.props;
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
      list.appendChild(this.buildCard(adventure, onSelect));
    }

    wrapper.appendChild(list);
    root.appendChild(wrapper);
  }

  private buildCard(adventure: Adventure, onSelect: (a: Adventure) => void): HTMLLIElement {
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

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Lancer';
    button.addEventListener('click', () => onSelect(adventure));
    card.appendChild(button);

    return card;
  }
}
