import type { Player } from '../core/players/Player';
import type { Adventure } from '../core/types/adventure';
import type { SaveManager } from '../core/persistence/SaveManager';

const PALETTE: ReadonlyArray<{ hex: string; name: string }> = [
  { hex: '#5fcde4', name: 'cyan' },
  { hex: '#ffcc66', name: 'or' },
  { hex: '#a3e635', name: 'lime' },
  { hex: '#c084fc', name: 'lilas' },
  { hex: '#dc2363', name: 'magenta' },
  { hex: '#fb923c', name: 'orange' },
];

const SAVE_KEY = 'pixel-quests:last-roster';

interface PersistedRoster {
  adventureId: string;
  players: Player[];
}

export interface SetupScreenProps {
  root: HTMLElement;
  adventure: Adventure;
  save: SaveManager;
  onCancel: () => void;
  onSubmit: (players: Player[]) => void;
}

/**
 * Écran DOM de configuration d'une partie : 3 à 5 joueurs (selon manifest),
 * nom + couleur unique. Persiste le roster pour pré-remplir au prochain lancement.
 */
export class SetupScreen {
  private players: Player[] = [];

  constructor(private readonly props: SetupScreenProps) {
    this.players = this.loadOrDefault();
  }

  render(): void {
    const { root, adventure } = this.props;
    root.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'setup';

    const title = document.createElement('h1');
    title.className = 'setup__title';
    title.textContent = adventure.manifest.title;
    wrapper.appendChild(title);

    const sub = document.createElement('p');
    sub.className = 'setup__subtitle';
    sub.textContent = `${adventure.manifest.minPlayers}-${adventure.manifest.maxPlayers} joueurs · ~${adventure.manifest.estimatedDurationMin} min`;
    wrapper.appendChild(sub);

    const list = document.createElement('div');
    list.className = 'setup__players';
    this.players.forEach((player, index) => {
      list.appendChild(this.renderRow(player, index));
    });
    wrapper.appendChild(list);

    const controls = document.createElement('div');
    controls.className = 'setup__controls';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'setup__add';
    addBtn.textContent = '+ Ajouter un joueur';
    addBtn.disabled = this.players.length >= adventure.manifest.maxPlayers;
    addBtn.addEventListener('click', () => {
      this.players.push(this.makeDefaultPlayer());
      this.render();
    });
    controls.appendChild(addBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'setup__secondary';
    cancelBtn.textContent = '← Retour';
    cancelBtn.addEventListener('click', () => this.props.onCancel());
    controls.appendChild(cancelBtn);

    wrapper.appendChild(controls);

    const validation = this.validate();
    if (validation.message) {
      const warn = document.createElement('p');
      warn.className = 'setup__warning';
      warn.textContent = validation.message;
      wrapper.appendChild(warn);
    }

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'setup__start';
    start.textContent = 'Commencer la partie';
    start.disabled = !validation.ok;
    start.addEventListener('click', () => this.submit());
    wrapper.appendChild(start);

    root.appendChild(wrapper);
  }

  private renderRow(player: Player, index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'setup__row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'setup__name';
    nameInput.value = player.name;
    nameInput.maxLength = 20;
    nameInput.placeholder = `Joueur ${index + 1}`;
    nameInput.addEventListener('input', () => {
      const next = [...this.players];
      next[index] = { ...player, name: nameInput.value.trim() };
      this.players = next;
      // Pas de re-render complet pour ne pas perdre le focus du champ.
    });
    row.appendChild(nameInput);

    const colors = document.createElement('div');
    colors.className = 'setup__colors';
    for (const color of PALETTE) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = `setup__swatch${player.color === color.hex ? ' setup__swatch--active' : ''}`;
      swatch.style.backgroundColor = color.hex;
      swatch.setAttribute('aria-label', color.name);
      swatch.title = color.name;
      swatch.addEventListener('click', () => {
        const next = [...this.players];
        next[index] = { ...this.players[index]!, color: color.hex };
        this.players = next;
        this.render();
      });
      colors.appendChild(swatch);
    }
    row.appendChild(colors);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'setup__remove';
    remove.textContent = '✕';
    remove.title = 'Retirer';
    remove.disabled = this.players.length <= this.props.adventure.manifest.minPlayers;
    remove.addEventListener('click', () => {
      this.players = this.players.filter((_, i) => i !== index);
      this.render();
    });
    row.appendChild(remove);

    return row;
  }

  private validate(): { ok: boolean; message: string | null } {
    const m = this.props.adventure.manifest;
    if (this.players.length < m.minPlayers) {
      return { ok: false, message: `Il faut au moins ${m.minPlayers} joueurs.` };
    }
    if (this.players.length > m.maxPlayers) {
      return { ok: false, message: `Maximum ${m.maxPlayers} joueurs.` };
    }
    if (this.players.some((p) => p.name.trim().length === 0)) {
      return { ok: false, message: 'Chaque joueur doit avoir un nom.' };
    }
    const colors = new Set(this.players.map((p) => p.color));
    if (colors.size !== this.players.length) {
      return { ok: false, message: 'Chaque joueur doit avoir une couleur différente.' };
    }
    return { ok: true, message: null };
  }

  private submit(): void {
    const cleaned: Player[] = this.players.map((p, i) => ({
      ...p,
      id: p.id || `player-${i + 1}`,
      name: p.name.trim(),
    }));
    const persisted: PersistedRoster = {
      adventureId: this.props.adventure.manifest.id,
      players: cleaned,
    };
    this.props.save.save(SAVE_KEY, persisted);
    this.props.onSubmit(cleaned);
  }

  private loadOrDefault(): Player[] {
    const persisted = this.props.save.load<PersistedRoster>(SAVE_KEY);
    if (persisted && persisted.adventureId === this.props.adventure.manifest.id) {
      return persisted.players;
    }
    const min = this.props.adventure.manifest.minPlayers;
    return Array.from({ length: min }, (_, i) => this.makeDefaultPlayer(i));
  }

  private makeDefaultPlayer(indexOverride?: number): Player {
    const usedColors = new Set(this.players.map((p) => p.color));
    const available = PALETTE.find((c) => !usedColors.has(c.hex)) ?? PALETTE[0]!;
    const index = indexOverride ?? this.players.length;
    return {
      id: `player-${Date.now()}-${index}`,
      name: '',
      color: available.hex,
    };
  }
}
