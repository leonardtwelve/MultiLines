/**
 * API publique du store côté client.
 *
 * Les écrans (HostLobbyScreen, JoinScreen, MapScene future) consomment
 * `ClientStore.getState()` + `subscribe()`. Le câblage réseau (snapshot,
 * patches, resync) passe par `wireStore(client, store)`.
 */

export { ClientStore, MAX_QUEUED_PATCHES } from './ClientStore';
export type { ClientStoreState, ClientStoreListener, ApplyResult } from './ClientStore';
export { applyPatches, PatchError } from './patch';
export { wireStore } from './wireStore';
