import type { PlayerManager } from './PlayerManager';

/**
 * Tour par tour minimal. L'ordre est figé au début par begin() puis avance via next().
 * Une aventure peut imposer son propre ordre (ex: rôles asymétriques) en passant un tableau.
 */
export class TurnSystem {
  private order: string[] = [];
  private currentIndex = 0;
  private roundNumber = 0;

  constructor(private readonly players: PlayerManager) {}

  begin(order?: string[]): void {
    this.order = order ?? this.players.list().map((p) => p.id);
    this.currentIndex = 0;
    this.roundNumber = this.order.length > 0 ? 1 : 0;
  }

  currentPlayerId(): string | null {
    return this.order[this.currentIndex] ?? null;
  }

  next(): string | null {
    if (this.order.length === 0) return null;
    this.currentIndex += 1;
    if (this.currentIndex >= this.order.length) {
      this.currentIndex = 0;
      this.roundNumber += 1;
    }
    return this.currentPlayerId();
  }

  round(): number {
    return this.roundNumber;
  }
}
