import Phaser from 'phaser';
import { getBanqueLuneContext, SCENE_KEYS } from '../state';
import type { RoomId } from '../roles/types';

const ROOM_LABELS: Record<RoomId, string> = {
  entree: 'Entrée',
  couloir: 'Couloir',
  coffre: 'Coffre',
};

/**
 * Bilan de fin de partie. Affiche le verdict (alarme ou non), récapitule les
 * actions enregistrées dans le contexte, révèle l'infiltré·e.
 *
 * Statut M1 : la grille d'actions est vide (le flux 3-pièces du PoC a été
 * remplacé par BoardScene). Le bilan reste informatif (verdict + infiltré).
 * En M2, le récap intégrera Crédits, Dossiers, Pactes, votes acte 3.
 */
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

    let y = 160;
    const hasActions = [...ctx.state.actionsTaken.values()].some((m) => m.size > 0);
    if (hasActions) {
      for (const roomId of ['entree', 'couloir', 'coffre'] as RoomId[]) {
        const perRoom = ctx.state.actionsTaken.get(roomId);
        if (!perRoom || perRoom.size === 0) continue;
        this.add
          .text(60, y, ROOM_LABELS[roomId], {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffcc66',
          })
          .setOrigin(0, 0.5);
        y += 30;
        for (const [playerId, action] of perRoom) {
          const player = ctx.state.players.find((p) => p.id === playerId);
          if (!player) continue;
          this.add
            .text(60, y, `  • ${player.name} → ${action.outcome}`, {
              fontFamily: 'monospace',
              fontSize: '15px',
              color: action.sabotage ? '#dc2363' : player.color,
            })
            .setOrigin(0, 0.5);
          y += 22;
        }
        y += 12;
      }
    } else {
      this.add
        .text(
          width / 2,
          y,
          '⚠ M1 — visualisation seule.\nActions, événements et calcul du butin viendront en M2.',
          {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#7a85a5',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      y += 60;
    }

    // Reveal infiltré·e
    let infiltreName = '???';
    for (const [pid, role] of ctx.state.playerRoles) {
      if (role.isInfiltre) {
        const p = ctx.state.players.find((x) => x.id === pid);
        infiltreName = p?.name ?? pid;
        break;
      }
    }
    y += 20;
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
