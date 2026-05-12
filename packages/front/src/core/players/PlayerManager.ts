import type { Player } from './Player';

export class PlayerManager {
  private readonly players = new Map<string, Player>();

  add(player: Player): void {
    if (this.players.has(player.id)) {
      throw new Error(`Player "${player.id}" déjà enregistré`);
    }
    this.players.set(player.id, player);
  }

  remove(id: string): void {
    this.players.delete(id);
  }

  get(id: string): Player | undefined {
    return this.players.get(id);
  }

  list(): Player[] {
    return [...this.players.values()];
  }

  count(): number {
    return this.players.size;
  }

  clear(): void {
    this.players.clear();
  }
}
