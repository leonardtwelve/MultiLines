import type { Player } from '../../core/players/Player';
import type { PrivateView } from '../../core/ui/PrivateView';
import type { Role, RoleAction, RoomId } from './roles/types';

export interface BanqueLuneRunState {
  players: Player[];
  playerRoles: Map<string, Role>;
  actionsTaken: Map<RoomId, Map<string, RoleAction>>;
  alarmTriggered: boolean;
}

export interface BanqueLuneContext {
  state: BanqueLuneRunState;
  view: PrivateView;
  /** Callback à appeler après l'écran de résultat. */
  onFinish: () => void;
}

let currentContext: BanqueLuneContext | null = null;

export function setBanqueLuneContext(ctx: BanqueLuneContext): void {
  currentContext = ctx;
}

export function getBanqueLuneContext(): BanqueLuneContext {
  if (!currentContext) {
    throw new Error('Banque Lune : contexte non initialisé. Appelle setBanqueLuneContext avant de démarrer une scène.');
  }
  return currentContext;
}

export function clearBanqueLuneContext(): void {
  currentContext = null;
}

export function createRunState(players: Player[], playerRoles: Map<string, Role>): BanqueLuneRunState {
  return {
    players: [...players],
    playerRoles,
    actionsTaken: new Map(),
    alarmTriggered: false,
  };
}

export const SCENE_KEYS = {
  entree: 'banque-lune:entree',
  couloir: 'banque-lune:couloir',
  coffre: 'banque-lune:coffre',
  result: 'banque-lune:result',
} as const;
