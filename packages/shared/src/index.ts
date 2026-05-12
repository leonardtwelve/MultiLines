// Public API of @pixel-quests/shared.
//
// Sous-modules accessibles via les exports secondaires (cf. package.json) :
//   import { EventBus } from '@pixel-quests/shared/events'
//   import type { HostRequest } from '@pixel-quests/shared/protocol'
//
// L'export principal re-exporte tout pour les consumers qui veulent un import unique.

export * from './events';
export * from './protocol';
export * from './types/common';
