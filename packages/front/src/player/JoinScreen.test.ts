import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JoinScreen } from './JoinScreen';
import { SocketClientStub } from '../network/SocketClient.stub';
import type { SocketClient } from '../network/SocketClient';

describe('JoinScreen', () => {
  let root: HTMLElement;
  let stub: SocketClientStub;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    stub = new SocketClientStub();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function submit(): void {
    const form = root.querySelector<HTMLFormElement>('[data-testid="form"]');
    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  function setInput(testid: string, value: string): void {
    const input = root.querySelector<HTMLInputElement>(`[data-testid="${testid}"]`);
    if (!input) throw new Error(`input ${testid} introuvable`);
    input.value = value;
  }

  it('pré-remplit le code depuis initialCode', () => {
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      initialCode: 'BLUE-CAT',
      onJoined: () => {},
    });
    screen.render();
    expect(root.querySelector<HTMLInputElement>('[data-testid="code"]')?.value).toBe('BLUE-CAT');
  });

  it('demande un code ET un pseudo (validation côté UI)', async () => {
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      onJoined: () => {},
    });
    screen.render();
    setInput('code', '');
    setInput('name', 'Léa');
    submit();
    // Laisse le micro-task tourner.
    await Promise.resolve();
    expect(root.querySelector<HTMLElement>('[data-testid="feedback"]')?.textContent).toMatch(
      /code|pseudo/i,
    );
  });

  it("rejoint une room avec succès et appelle onJoined", async () => {
    stub.queueJoinRoom({
      ok: true,
      roomId: 'r1',
      playerId: 'p1',
      playerName: 'Léa',
    });
    let joined: { roomId: string; playerId: string; playerName: string } | null = null;
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      initialCode: 'BLUE-CAT',
      onJoined: (info) => {
        joined = info;
      },
    });
    screen.render();
    setInput('name', 'Léa');
    submit();

    // Attente : connect (async) + joinRoom (async). Quelques ticks suffisent.
    await new Promise((r) => setTimeout(r, 10));

    expect(joined).toEqual({ roomId: 'r1', playerId: 'p1', playerName: 'Léa' });
    expect(root.querySelector('[data-testid="joined"]')).toBeTruthy();
    expect(screen.currentState).toBe('joined');
  });

  it('affiche un feedback lisible si room introuvable', async () => {
    stub.queueJoinRoom({ ok: false, reason: 'room-not-found' });
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      initialCode: 'GHOST-CAT',
      onJoined: () => {},
    });
    screen.render();
    setInput('name', 'Léa');
    submit();
    await new Promise((r) => setTimeout(r, 10));

    const fb = root.querySelector<HTMLElement>('[data-testid="feedback"]');
    expect(fb?.textContent).toMatch(/aucune partie/i);
    expect(fb?.dataset.kind).toBe('error');
    expect(screen.currentState).toBe('form');
  });

  it('affiche un feedback si la room est pleine', async () => {
    stub.queueJoinRoom({ ok: false, reason: 'room-full' });
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      initialCode: 'BLUE-CAT',
      onJoined: () => {},
    });
    screen.render();
    setInput('name', 'Léa');
    submit();
    await new Promise((r) => setTimeout(r, 10));
    expect(
      root.querySelector<HTMLElement>('[data-testid="feedback"]')?.textContent,
    ).toMatch(/complète/i);
  });

  it("affiche un feedback si la connexion échoue", async () => {
    stub.connectShouldFail = true;
    const screen = new JoinScreen({
      root,
      client: stub as unknown as SocketClient,
      initialCode: 'BLUE-CAT',
      onJoined: () => {},
    });
    screen.render();
    setInput('name', 'Léa');
    submit();
    await new Promise((r) => setTimeout(r, 10));
    expect(
      root.querySelector<HTMLElement>('[data-testid="feedback"]')?.textContent,
    ).toMatch(/connexion impossible/i);
  });
});
