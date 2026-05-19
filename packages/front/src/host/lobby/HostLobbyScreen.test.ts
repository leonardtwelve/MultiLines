import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HostLobbyScreen } from './HostLobbyScreen';
import { SocketClientStub } from '../../network/SocketClient.stub';
import type { SocketClient } from '../../network/SocketClient';

describe('HostLobbyScreen', () => {
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

  it('connecte le client, crée une room et affiche code + URL de join', async () => {
    stub.queueCreateRoom({
      roomId: 'r1',
      roomCode: 'BLUE-CAT',
      qrUrl: 'http://ignored',
    });

    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {},
    });
    await screen.render();

    expect(root.querySelector('[data-testid="room-code"]')?.textContent).toBe('BLUE-CAT');
    const url = root.querySelector<HTMLAnchorElement>('[data-testid="join-url"]');
    expect(url?.textContent).toContain('code=BLUE-CAT');
    expect(url?.href).toContain('code=BLUE-CAT');
  });

  it("met à jour le statut quand le client change d'état", async () => {
    stub.queueCreateRoom({ roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: '' });
    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {},
    });
    await screen.render();

    expect(root.querySelector('[data-testid="status"]')?.getAttribute('data-status')).toBe(
      'connected',
    );
    stub.setStatus('disconnected');
    expect(root.querySelector('[data-testid="status"]')?.getAttribute('data-status')).toBe(
      'disconnected',
    );
  });

  it('ajoute un joueur dans la liste quand player.joined arrive', async () => {
    stub.queueCreateRoom({ roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: '' });
    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {},
    });
    await screen.render();

    stub.fireServerEvent('player.joined', {
      playerId: 'p1',
      playerName: 'Léa',
      roomId: 'r1',
    });

    const items = root.querySelectorAll('[data-testid="players-list"] .lobby__player');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe('Léa');
    expect(root.querySelector('[data-testid="players-count"]')?.textContent).toBe('1');
    expect(root.querySelector<HTMLButtonElement>('[data-testid="start"]')?.disabled).toBe(false);
  });

  it('retire un joueur quand player.left arrive', async () => {
    stub.queueCreateRoom({ roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: '' });
    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {},
    });
    await screen.render();

    stub.fireServerEvent('player.joined', {
      playerId: 'p1',
      playerName: 'Léa',
      roomId: 'r1',
    });
    stub.fireServerEvent('player.joined', {
      playerId: 'p2',
      playerName: 'Sami',
      roomId: 'r1',
    });
    stub.fireServerEvent('player.left', { playerId: 'p1', roomId: 'r1' });

    const items = root.querySelectorAll('[data-testid="players-list"] .lobby__player');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe('Sami');
  });

  it('affiche une erreur si createRoom rejette', async () => {
    stub.queueCreateRoom(new Error('serveur indisponible'));
    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {},
    });
    await screen.render();
    const err = root.querySelector<HTMLElement>('[data-testid="error"]');
    expect(err?.hidden).toBe(false);
    expect(err?.textContent).toContain('serveur indisponible');
  });

  it('le bouton "back" appelle onCancel et destroy le client', async () => {
    stub.queueCreateRoom({ roomId: 'r1', roomCode: 'BLUE-CAT', qrUrl: '' });
    let cancelled = false;
    const screen = new HostLobbyScreen({
      root,
      client: stub as unknown as SocketClient,
      adventureId: 'banque-lune',
      joinBaseUrl: 'http://localhost:5173/player/index.html',
      onCancel: () => {
        cancelled = true;
      },
    });
    await screen.render();
    expect(stub.status).toBe('connected');
    root.querySelector<HTMLButtonElement>('.lobby__back')?.click();
    expect(cancelled).toBe(true);
    expect(stub.status).toBe('idle');
  });
});
