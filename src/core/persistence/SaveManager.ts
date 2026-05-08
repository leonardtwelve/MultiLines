/**
 * Sauvegarde locale sérialisée en JSON. LocalStorage par défaut ; injection possible
 * pour les tests ou un futur backend IndexedDB.
 */
export class SaveManager {
  private readonly storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage ?? window.localStorage;
  }

  save<T>(key: string, value: T): void {
    this.storage.setItem(key, JSON.stringify(value));
  }

  load<T>(key: string): T | null {
    const raw = this.storage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}
