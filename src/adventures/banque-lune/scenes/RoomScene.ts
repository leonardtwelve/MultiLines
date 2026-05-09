import Phaser from 'phaser';
import type { PrivateChoice } from '../../../core/ui/PrivateView';
import type { RoomId } from '../roles/types';
import { getBanqueLuneContext } from '../state';

export interface RoomSceneConfig {
  key: string;
  roomId: RoomId;
  title: string;
  flavor: string;
  bgColor: number;
  next: string;
}

/**
 * Boucle commune des trois pièces : titre + description, un bouton "C'est mon tour"
 * par joueur, ouverture d'un PrivateView pour choisir l'action en privé, transition
 * vers la pièce suivante quand tout le monde a joué.
 */
export abstract class RoomScene extends Phaser.Scene {
  private remaining: string[] = [];
  private buttons: Phaser.GameObjects.Text[] = [];
  private statusText: Phaser.GameObjects.Text | null = null;

  protected constructor(private readonly cfg: RoomSceneConfig) {
    super(cfg.key);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.cfg.bgColor);
    const { width } = this.scale;

    this.add
      .text(width / 2, 60, this.cfg.title, {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffcc66',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 120, this.cfg.flavor, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e6e8eb',
        wordWrap: { width: width - 120 },
        align: 'center',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, 180, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#5fcde4',
      })
      .setOrigin(0.5);

    const ctx = getBanqueLuneContext();
    this.remaining = ctx.state.players.map((p) => p.id);
    this.refreshButtons();
  }

  private refreshButtons(): void {
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];

    const ctx = getBanqueLuneContext();
    const { width } = this.scale;
    const startY = 260;
    const stepY = 56;

    if (this.statusText) {
      this.statusText.setText(
        this.remaining.length > 0
          ? `${ctx.state.players.length - this.remaining.length} / ${ctx.state.players.length} joueur(s) ont joué`
          : 'Tout le monde a joué — résolution...',
      );
    }

    this.remaining.forEach((playerId, index) => {
      const player = ctx.state.players.find((p) => p.id === playerId);
      if (!player) return;
      const y = startY + index * stepY;
      const btn = this.add
        .text(width / 2, y, `▶  C'est à toi, ${player.name}`, {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: player.color,
          backgroundColor: '#161a1f',
          padding: { x: 20, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        void this.runPlayerTurn(playerId);
      });
      this.buttons.push(btn);
    });

    if (this.remaining.length === 0) {
      // Léger délai pour laisser le statut afficher avant la transition.
      this.time.delayedCall(600, () => this.scene.start(this.cfg.next));
    }
  }

  private async runPlayerTurn(playerId: string): Promise<void> {
    const ctx = getBanqueLuneContext();
    const player = ctx.state.players.find((p) => p.id === playerId);
    const role = ctx.state.playerRoles.get(playerId);
    if (!player || !role) return;

    const actions = role.actionsByRoom[this.cfg.roomId];
    const choices: PrivateChoice[] = actions.map((a) => ({
      id: a.id,
      label: a.label,
      danger: a.sabotage === true,
    }));

    const chosenId = await ctx.view.pickAction(
      player.name,
      {
        title: role.name,
        body: `${this.cfg.title}\n${role.description}`,
        accentColor: role.color,
      },
      choices,
    );

    const action = actions.find((a) => a.id === chosenId);
    if (!action) return;

    let perRoom = ctx.state.actionsTaken.get(this.cfg.roomId);
    if (!perRoom) {
      perRoom = new Map();
      ctx.state.actionsTaken.set(this.cfg.roomId, perRoom);
    }
    perRoom.set(playerId, action);
    if (action.sabotage) ctx.state.alarmTriggered = true;

    this.remaining = this.remaining.filter((id) => id !== playerId);
    this.refreshButtons();
  }
}
