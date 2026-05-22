/**
 * Entrée Player smartphone.
 *
 * Bundle séparé de host/main.ts via Vite multi-page (cf. vite.config.ts).
 * URL : `/player/index.html` (en prod : https://multi-lines.vercel.app/player/index.html ;
 * Vercel le sert aussi sur `/player` sans extension).
 *
 * Pas de Phaser ici — le Player smartphone reste léger.
 *
 * Flow (slice 3d) :
 *   JoinScreen (formulaire code + pseudo)
 *     → onJoined : on garde JoinScreen affiché en mode "rejoint" jusqu'à
 *       ce que le serveur émette state.snapshot
 *     → store.subscribe attrape l'arrivée du state.private (rôle distribué)
 *     → on transitionne vers BriefingScreen
 *   BriefingScreen (rôle + objectif + bouton "Prêt")
 *     → onReady : émet briefing.ready
 *     → reste affichée en "attente des autres" jusqu'à la suite (slice 3e)
 */

import { SocketClient } from '../network/SocketClient';
import { getServerUrl } from '../network/env';
import { ClientStore, wireStore } from '../store';
import { JoinScreen } from './JoinScreen';
import { BriefingScreen } from './BriefingScreen';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans player/index.html');
}

const params = new URLSearchParams(window.location.search);
const initialCode = params.get('code') ?? undefined;

const client = new SocketClient({ url: getServerUrl() });
const store = new ClientStore();
wireStore(client, store);

let currentScreen: 'join' | 'briefing' = 'join';

const joinScreen = new JoinScreen({
  root,
  client,
  initialCode,
  onJoined: (info) => {
    // eslint-disable-next-line no-console
    console.log('[player] joined room', info);
    // On reste sur JoinScreen (en mode "rejoint") jusqu'à ce que le
    // serveur lance la partie et nous distribue notre rôle privé via
    // state.snapshot. La transition est gérée par le subscribe ci-dessous.
  },
});
joinScreen.render();

// Quand le state.snapshot privé arrive (Host a cliqué "Lancer"), on
// transitionne vers BriefingScreen.
const off = store.subscribe((state) => {
  if (currentScreen === 'briefing') return;
  if (!state.private) return;
  // Première fois qu'on a un private dans le store → transition.
  currentScreen = 'briefing';
  off();
  joinScreen.destroy();
  const briefing = new BriefingScreen({ root, client, store });
  briefing.render();
});
