/**
 * Barrel public du module state-machine.
 *
 * Les handlers socket.io (slice 3c-3) importent `RoomStateMachine` et
 * `Sender` depuis ici. Les tests directs des reducers passent par les
 * sous-chemins (`./reducers/lobby`, etc.).
 */

export { RoomStateMachine, type RoomStateMachineOptions } from './RoomStateMachine';
export type { Reaction, Emit, EmitTarget, Sender } from './types';
export { accept, reject } from './types';
export type {
  AdventureHooks,
  ActionResult,
  FinalScore,
  RoleDistribution,
} from './hooks';
export { createNoOpAdventureHooks } from './NoOpAdventureHooks';
export type { NoOpAdventureHooksOptions } from './NoOpAdventureHooks';
export { validateMessage } from './validators';
