import Phaser from 'phaser';
import { CONNECTIONS, ZONES } from '../board/layout';
import type { ZoneId } from '../board/types';
import { getBanqueLuneContext, SCENE_KEYS } from '../state';

/**
 * Scène principale de l'acte 2 (FRONTEND.md §2).
 *
 * Statut M1 : rend les **9 zones** statiques avec connexions, fog partiel,
 * cadenas, et interactions tactiles de **sélection** uniquement.
 *
 * Le mouvement d'avatars, les actions et la résolution viendront avec #41.
 * Bouton debug "Fin partie" pour passer manuellement à ResultScene en attendant.
 */
export class BoardScene extends Phaser.Scene {
  private selectedZone: ZoneId | null = null;
  private zoneRects = new Map<ZoneId, Phaser.GameObjects.Rectangle>();
  private infoTitle: Phaser.GameObjects.Text | null = null;
  private infoBody: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENE_KEYS.board);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0e1a');

    // Titre
    this.add
      .text(640, 28, 'Banque Lune — Plan tactique', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffcc66',
      })
      .setOrigin(0.5);

    // Connexions (sous les zones)
    this.drawConnections();

    // Zones
    for (const id of Object.keys(ZONES) as ZoneId[]) {
      this.drawZone(id);
    }

    // Panneau d'info en bas
    this.infoTitle = this.add
      .text(640, 680, 'Tape une zone pour voir les détails', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7a85a5',
      })
      .setOrigin(0.5);
    this.infoBody = this.add
      .text(640, 700, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7a85a5',
        align: 'center',
        wordWrap: { width: 1000 },
      })
      .setOrigin(0.5);

    // Bouton debug : sauter à la fin de partie
    this.makeDebugEndButton();

    // Statut M1 : signaler clairement à l'utilisateur ce qui marche/pas
    this.add
      .text(640, 60, '⚠ Visualisation seule (M1) — actions, mouvement et événements à venir', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#dc2363',
      })
      .setOrigin(0.5);
  }

  // --- Rendu ------------------------------------------------------------

  private drawConnections(): void {
    for (const c of CONNECTIONS) {
      const a = ZONES[c.from].position;
      const b = ZONES[c.to].position;
      const color = c.kind === 'door' ? 0x3a4565 : 0x7a4565; // narrative = teinte plus magenta
      const line = this.add.line(0, 0, a.x, a.y, b.x, b.y, color, 0.8);
      line.setLineWidth(c.kind === 'door' ? 3 : 2);
      line.setDepth(-1);
    }
  }

  private drawZone(id: ZoneId): void {
    const zone = ZONES[id];

    // Boîte de fond
    const rect = this.add.rectangle(
      zone.position.x,
      zone.position.y,
      zone.width,
      zone.height,
      zone.themeColor,
      0.95,
    );
    rect.setStrokeStyle(2, 0x3a4565);
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', () => this.selectZone(id));
    this.zoneRects.set(id, rect);

    // Label (en bas à gauche, m5x7-style — ici monospace en attendant)
    this.add
      .text(
        zone.position.x - zone.width / 2 + 8,
        zone.position.y + zone.height / 2 - 16,
        `${zone.id} ${zone.name}`,
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#e6e8eb',
        },
      )
      .setOrigin(0, 0);

    // Cadenas si verrouillée (en haut à droite)
    if (zone.initiallyLocked) {
      this.add
        .text(zone.position.x + zone.width / 2 - 12, zone.position.y - zone.height / 2 + 4, '🔒', {
          fontSize: '14px',
        })
        .setOrigin(0.5, 0);
    }

    // Étoile si zone-cœur (en haut à gauche)
    if (zone.type === 'coeur') {
      this.add
        .text(zone.position.x - zone.width / 2 + 8, zone.position.y - zone.height / 2 + 4, '⭐', {
          fontSize: '14px',
        })
        .setOrigin(0, 0);
    }

    // Fog partiel si non révélée
    if (!zone.initiallyRevealed) {
      const fog = this.add.rectangle(
        zone.position.x,
        zone.position.y,
        zone.width,
        zone.height,
        0x000000,
        0.55,
      );
      fog.setStrokeStyle(0);
      // Le fog laisse passer les pointer events vers la zone en dessous (Phaser fait ça
      // par défaut quand le rect n'est pas interactif).
    }
  }

  private makeDebugEndButton(): void {
    const ctx = getBanqueLuneContext();
    const btn = this.add
      .text(1180, 30, '⊘ Fin partie (debug)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#dc2363',
        backgroundColor: '#161a1f',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      // Pas d'action enregistrée → recap vide, mais l'infiltré·e est révélé·e.
      ctx.state.alarmTriggered = false; // succès narratif
      this.scene.start(SCENE_KEYS.result);
    });
  }

  // --- Interactions -----------------------------------------------------

  private selectZone(id: ZoneId): void {
    // Reset focus précédent
    if (this.selectedZone) {
      this.zoneRects.get(this.selectedZone)?.setStrokeStyle(2, 0x3a4565);
    }
    this.selectedZone = id;
    this.zoneRects.get(id)?.setStrokeStyle(3, 0xffcc66);

    // Mise à jour panneau d'info
    const zone = ZONES[id];
    const lockSuffix = zone.initiallyLocked ? ` 🔒 ${zone.unlockHint}` : '';
    this.infoTitle?.setText(`${zone.id} — ${zone.name} (${zone.type})`).setColor('#ffcc66');
    this.infoBody?.setText(`${zone.description}${lockSuffix}`).setColor('#e6e8eb');
  }
}
