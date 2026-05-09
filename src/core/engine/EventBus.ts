type Handler<T> = (payload: T) => void;

/**
 * Pub/sub typé. Seul canal de communication autorisé entre une aventure et le moteur :
 * pas de référence directe, pas de couplage rigide. Voir docs/ARCHITECTURE.md.
 */
export class EventBus<EventMap extends Record<string, unknown> = Record<string, unknown>> {
  private readonly listeners = new Map<keyof EventMap, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as Handler<EventMap[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
