/**
 * Entrée Player smartphone.
 *
 * Bundle séparé de host/main.ts via Vite multi-page (cf. vite.config.ts).
 * URL : `/player/index.html` (en prod : https://multi-lines.vercel.app/player/index.html ;
 * Vercel le sert aussi sur `/player` sans extension).
 *
 * Pas de Phaser ici — le Player smartphone reste léger.
 *
 * Flow (slices 3a → 3e-3) :
 *   JoinScreen (formulaire code + pseudo)
 *     → onJoined : on attend le state.snapshot
 *   store.private apparaît → BriefingScreen (rôle + objectif + Prêt)
 *     → onReady : émet briefing.ready, on attend les autres
 *   store.public.status passe à 'casse' → CassePlayScreen
 *     → boutons d'action, jauge alerte, résultats inline
 *   (slice 3f : transitions vote/reveal/ended)
 */

import { SocketClient } from '../network/SocketClient';
import { getServerUrl } from '../network/env';
import { ClientStore, wireStore } from '../store';
import { JoinScreen } from './JoinScreen';
import { BriefingScreen } from './BriefingScreen';
import { CassePlayScreen } from './CassePlayScreen';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Element #app introuvable dans player/index.html');
}

const params = new URLSearchParams(window.location.search);
const initialCode = params.get('code') ?? undefined;

const client = new SocketClient({ url: getServerUrl() });
const store = new ClientStore();
wireStore(client, store);

type Screen = 'join' | 'briefing' | 'casse';

let currentScreen: Screen = 'join';
let currentInstance: { destroy(): void } | null = null;

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
currentInstance = joinScreen;
joinScreen.render();

// Subscribe global qui drive les transitions d'écran. Reste branché
// pour la durée de la session (n'est pas désabonné — au reload de
// page le subscribe disparaît avec le module).
store.subscribe((state) => {
  // join → briefing : dès que state.private apparaît (game.start côté Host).
  if (currentScreen === 'join' && state.private) {
    currentScreen = 'briefing';
    currentInstance?.destroy();
    const briefing = new BriefingScreen({ root, client, store });
    currentInstance = briefing;
    briefing.render();
    return;
  }
  // briefing → casse : dès que status passe à 'casse'.
  if (currentScreen === 'briefing' && state.public.status === 'casse') {
    currentScreen = 'casse';
    currentInstance?.destroy();
    const casse = new CassePlayScreen({ root, client, store });
    currentInstance = casse;
    casse.render();
    return;
  }
});
