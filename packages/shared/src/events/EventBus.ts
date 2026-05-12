import type { GameEvent } from './core-events';

type EventType = GameEvent['type'];
type PayloadFor<T extends EventType> = Extract<GameEvent, { type: T }>['payload'];
type Handler<T extends EventType> = (payload: PayloadFor<T>) => void;

/**
 * Pub/sub typé sur l'union discriminée `GameEvent` (voir D2).
 * Seul canal de communication autorisé entre une aventure et le moteur :
 * pas de référence directe, pas de couplage rigide.
 */
export class EventBus {
  private readonly handlers = new Map<EventType, Set<(payload: unknown) => void>>();

  emit<E extends GameEvent>(event: E): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    for (const handler of set) {
      handler(event.payload);
    }
  }

  on<T extends EventType>(type: T, handler: Handler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as (payload: unknown) => void);
    return () => this.off(type, handler);
  }

  off<T extends EventType>(type: T, handler: Handler<T>): void {
    this.handlers.get(type)?.delete(handler as (payload: unknown) => void);
  }

  clear(): void {
    this.handlers.clear();
  }
}
