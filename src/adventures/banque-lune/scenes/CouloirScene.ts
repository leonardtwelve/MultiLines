import { RoomScene } from './RoomScene';
import { SCENE_KEYS } from '../state';

export class CouloirScene extends RoomScene {
  constructor() {
    super({
      key: SCENE_KEYS.couloir,
      roomId: 'couloir',
      title: 'Couloir — Niveau -3',
      flavor:
        "Capteurs au sol et grilles laser. Un signal sonore monte par à-coups : quelqu'un est à l'écoute.",
      bgColor: 0x1a1224,
      next: SCENE_KEYS.coffre,
    });
  }
}
