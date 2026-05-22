/**
 * Helper pour câbler un `ClientStore` sur un `SocketClient`.
 *
 * Branche les listeners adéquats côté socket et délègue les mises à jour
 * au store. En cas de désynchronisation (gap de version, erreur de
 * patch), déclenche automatiquement un `state.resync.request`.
 *
 * Renvoie un désabonnement (utile aux écrans qui veulent détruire le
 * câblage en sortie). N'affecte pas la connexion socket — uniquement
 * les listeners ajoutés ici.
 *
 * Conformément à la spec store-projection §6.4, la fonction est pensée
 * pour être appelée **après** `client.connect()` (sinon `client.on` lève).
 */

import type { SocketClient } from '../network/SocketClient';
import type { ClientStore } from './ClientStore';

export interface WireStoreOptions {
  /**
   * Callback optionnel quand le store détecte une désynchronisation et
   * que `requestResync` a été émis. Utile pour les tests + un éventuel
   * affichage UI « réinitialisation en cours… ».
   */
  onResyncRequested?: () => void;
}

export function wireStore(
  client: SocketClient,
  store: ClientStore,
  opts: WireStoreOptions = {},
): () => void {
  const offSnapshot = client.on('state.snapshot', (snapshot) => {
    const r = store.hydrate(snapshot);
    if (r.needsResync) {
      requestResync(client, opts);
    }
  });

  const offPatch = client.on('state.patch', (batch) => {
    const r = store.applyPatchBatch(batch);
    if (r.needsResync) {
      requestResync(client, opts);
    }
  });

  return () => {
    offSnapshot();
    offPatch();
  };
}

function requestResync(client: SocketClient, opts: WireStoreOptions): void {
  try {
    client.requestResync();
    opts.onResyncRequested?.();
  } catch (err) {
    // Le socket n'est plus dispo (déconnexion) — la reconnexion
    // suivante émettra de toute façon un snapshot complet. On loggue
    // toutefois pour ne pas swallow silencieusement l'erreur (review
    // 3c-4 #6 — debug en prod sinon impossible).
    // eslint-disable-next-line no-console
    console.warn('[wireStore] requestResync failed:', err);
  }
}
