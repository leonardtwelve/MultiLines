import Phaser from 'phaser';
import { getBanqueLuneContext, SCENE_KEYS } from '../state';
import type { RoomId } from '../roles/types';

const ROOM_LABELS: Record<RoomId, string> = {
  entree: 'Entrée',
  couloir: 'Couloir',
  coffre: 'Coffre',
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.result);
  }

  create(): void {
    const ctx = getBanqueLuneContext();
    const { width } = this.scale;
    const success = !ctx.state.alarmTriggered;

    this.cameras.main.setBackgroundColor(success ? 0x1a3a1a : 0x3a1a1a);

    this.add
      .text(width / 2, 50, success ? 'CASSE RÉUSSI' : 'CASSE COMPROMIS', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: success ? '#a3e635' : '#dc2363',
      })
      .setOrigin(0.5);

    const subtitle = success
      ? 'Aucune alarme — vous repartez avec le butin.'
      : 'Une alarme a été déclenchée. La police orbitale est en route.';
    this.add
      .text(width / 2, 100, subtitle, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e6e8eb',
      })
      .setOrigin(0.5);

    let y = 150;
    for (const roomId of ['entree', 'couloir', 'coffre'] as RoomId[]) {
      this.add
        .text(60, y, ROOM_LABELS[roomId], {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffcc66',
        })
        .setOrigin(0, 0.5);
      y += 30;

      const perRoom = ctx.state.actionsTaken.get(roomId);
      if (perRoom) {
        for (const [playerId, action] of perRoom) {
          const player = ctx.state.players.find((p) => p.id === playerId);
          if (!player) continue;
          const line = `  • ${player.name} → ${action.outcome}`;
          this.add
            .text(60, y, line, {
              fontFamily: 'monospace',
              fontSize: '15px',
              color: action.sabotage ? '#dc2363' : player.color,
            })
            .setOrigin(0, 0.5);
          y += 22;
        }
      }
      y += 12;
    }

    // Reveal infiltré
    let infiltreName = '???';
    for (const [pid, role] of ctx.state.playerRoles) {
      if (role.isInfiltre) {
        const p = ctx.state.players.find((x) => x.id === pid);
        infiltreName = p?.name ?? pid;
        break;
      }
    }
    y += 10;
    this.add
      .text(width / 2, y, `L'infiltré·e était : ${infiltreName}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#dc2363',
      })
      .setOrigin(0.5);
    y += 60;

    const back = this.add
      .text(width / 2, y, "▶  Retour à l'accueil", {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#0b0d10',
        backgroundColor: '#ffcc66',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => ctx.onFinish());
  }
}
