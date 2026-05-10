import { describe, it, expect, beforeEach } from 'vitest';
import { DomPrivateView } from '../../src/core/ui/DomPrivateView';

describe('DomPrivateView', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('démarre en idle', () => {
    const view = new DomPrivateView(host);
    expect(view.state()).toBe('idle');
  });

  it('reveal : passe en inviting → revealed → idle et résout', async () => {
    const view = new DomPrivateView(host);
    const done = view.reveal('Léa', { title: 'Hacker', body: 'Tu casses les serrures.' });
    expect(view.state()).toBe('inviting');

    host.querySelector<HTMLButtonElement>('.private-view__primary')!.click();
    expect(view.state()).toBe('revealed');

    host.querySelector<HTMLButtonElement>('.private-view__primary')!.click();
    expect(view.state()).toBe('idle');

    await done;
  });

  it('pickAction : retourne l\'id de l\'option choisie', async () => {
    const view = new DomPrivateView(host);
    const promise = view.pickAction(
      'Sami',
      { title: 'Entrée', body: 'Choisis ton action' },
      [
        { id: 'aide', label: 'Aider' },
        { id: 'sabote', label: 'Saboter', danger: true },
      ],
    );

    host.querySelector<HTMLButtonElement>('.private-view__primary')!.click();
    expect(view.state()).toBe('picking');

    const danger = host.querySelector<HTMLButtonElement>('.private-view__choice--danger');
    danger!.click();

    await expect(promise).resolves.toBe('sabote');
    expect(view.state()).toBe('idle');
  });

  it('refuse une seconde interaction tant qu\'une est en cours', () => {
    const view = new DomPrivateView(host);
    void view.reveal('Léa', { title: 'X', body: 'y' });
    expect(() => view.reveal('Sami', { title: 'Z', body: 'w' })).toThrow(/déjà en cours/);
  });

  it('pickAction exige au moins une option', () => {
    const view = new DomPrivateView(host);
    expect(() => view.pickAction('Léa', { title: 'X', body: 'y' }, [])).toThrow();
  });
});
