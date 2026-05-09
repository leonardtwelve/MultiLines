import type { PrivateChoice, PrivateContent, PrivateView } from './PrivateView';

type Phase = 'idle' | 'inviting' | 'revealed' | 'picking';

/**
 * Implémentation DOM du PrivateView. Pose un overlay plein écran au-dessus de l'app
 * (et donc au-dessus du canvas Phaser quand une scène tourne).
 */
export class DomPrivateView implements PrivateView {
  private host: HTMLElement | null = null;
  private phase: Phase = 'idle';
  private resolveReveal: (() => void) | null = null;
  private resolvePick: ((id: string) => void) | null = null;

  constructor(private readonly mount: HTMLElement = document.body) {}

  /** Visible pour les tests. */
  state(): Phase {
    return this.phase;
  }

  reveal(playerName: string, content: PrivateContent): Promise<void> {
    this.assertIdle();
    return new Promise<void>((resolve) => {
      this.resolveReveal = resolve;
      this.phase = 'inviting';
      this.renderInvitation(playerName, () => this.showReveal(playerName, content));
    });
  }

  pickAction(
    playerName: string,
    content: PrivateContent,
    options: ReadonlyArray<PrivateChoice>,
  ): Promise<string> {
    this.assertIdle();
    if (options.length === 0) {
      throw new Error('PrivateView.pickAction : au moins une option requise');
    }
    return new Promise<string>((resolve) => {
      this.resolvePick = resolve;
      this.phase = 'inviting';
      this.renderInvitation(playerName, () => this.showPicker(playerName, content, options));
    });
  }

  close(): void {
    this.removeHost();
    this.phase = 'idle';
    const r = this.resolveReveal;
    this.resolveReveal = null;
    this.resolvePick = null;
    if (r) r();
  }

  private assertIdle(): void {
    if (this.phase !== 'idle') {
      throw new Error('PrivateView : une interaction est déjà en cours');
    }
  }

  private renderInvitation(playerName: string, onReveal: () => void): void {
    this.removeHost();
    const host = this.makeHost();

    const title = document.createElement('h2');
    title.className = 'private-view__invite-title';
    title.textContent = `Passe la tablette à ${playerName}`;
    host.firstElementChild!.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'private-view__hint';
    hint.textContent = 'Les autres joueurs détournent le regard.';
    host.firstElementChild!.appendChild(hint);

    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'private-view__primary';
    reveal.textContent = `Je suis ${playerName}, ouvrir`;
    reveal.addEventListener('click', onReveal);
    host.firstElementChild!.appendChild(reveal);
  }

  private showReveal(playerName: string, content: PrivateContent): void {
    this.phase = 'revealed';
    this.removeHost();
    const host = this.makeHost(content.accentColor);
    this.renderContent(host, playerName, content);

    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'private-view__primary';
    done.textContent = "J'ai vu, masquer";
    done.addEventListener('click', () => {
      const resolve = this.resolveReveal;
      this.removeHost();
      this.resolveReveal = null;
      this.phase = 'idle';
      if (resolve) resolve();
    });
    host.firstElementChild!.appendChild(done);
  }

  private showPicker(
    playerName: string,
    content: PrivateContent,
    options: ReadonlyArray<PrivateChoice>,
  ): void {
    this.phase = 'picking';
    this.removeHost();
    const host = this.makeHost(content.accentColor);
    this.renderContent(host, playerName, content);

    const buttons = document.createElement('div');
    buttons.className = 'private-view__choices';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `private-view__choice${opt.danger ? ' private-view__choice--danger' : ''}`;
      btn.dataset['choiceId'] = opt.id;

      const label = document.createElement('span');
      label.className = 'private-view__choice-label';
      label.textContent = opt.label;
      btn.appendChild(label);

      if (opt.hint) {
        const hint = document.createElement('span');
        hint.className = 'private-view__choice-hint';
        hint.textContent = opt.hint;
        btn.appendChild(hint);
      }

      btn.addEventListener('click', () => {
        const resolve = this.resolvePick;
        this.removeHost();
        this.resolvePick = null;
        this.phase = 'idle';
        if (resolve) resolve(opt.id);
      });
      buttons.appendChild(btn);
    }
    host.firstElementChild!.appendChild(buttons);
  }

  private renderContent(host: HTMLElement, playerName: string, content: PrivateContent): void {
    const inner = host.firstElementChild as HTMLElement;
    const who = document.createElement('p');
    who.className = 'private-view__who';
    who.textContent = playerName;
    inner.appendChild(who);

    const title = document.createElement('h2');
    title.className = 'private-view__title';
    title.textContent = content.title;
    inner.appendChild(title);

    const body = document.createElement('p');
    body.className = 'private-view__body';
    body.textContent = content.body;
    inner.appendChild(body);
  }

  private makeHost(accentColor?: string): HTMLElement {
    const host = document.createElement('div');
    host.className = 'private-view';
    if (accentColor) host.style.setProperty('--accent', accentColor);
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');

    const inner = document.createElement('div');
    inner.className = 'private-view__inner';
    host.appendChild(inner);

    this.mount.appendChild(host);
    this.host = host;
    return host;
  }

  private removeHost(): void {
    if (this.host && this.host.parentElement) {
      this.host.parentElement.removeChild(this.host);
    }
    this.host = null;
  }
}
