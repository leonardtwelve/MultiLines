/**
 * Entrée Player smartphone (Prompt 3a).
 *
 * Bundle séparé de host/main.ts via Vite multi-page (cf. vite.config.ts).
 * URL : `/player/index.html` (en prod : https://multi-lines.vercel.app/player/index.html ;
 * Vercel le sert aussi sur `/player` sans extension).
 *
 * Pas de Phaser ici — le Player smartphone reste léger.
 */

import { SocketClient } from '../network/SocketClient';
import { getServerUrl } from '../network/env';
import { JoinScreen } from './JoinScreen';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans player/index.html');
}

const params = new URLSearchParams(window.location.search);
const initialCode = params.get('code') ?? undefined;

const client = new SocketClient({ url: getServerUrl() });

const screen = new JoinScreen({
  root,
  client,
  initialCode,
  onJoined: (info) => {
    // eslint-disable-next-line no-console
    console.log('[player] joined room', info);
    // TODO Prompt 3b/c : enchaîner vers l'écran d'attente / sélection de rôle.
  },
});

screen.render();
