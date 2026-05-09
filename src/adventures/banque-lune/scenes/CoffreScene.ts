import { RoomScene } from './RoomScene';
import { SCENE_KEYS } from '../state';

export class CoffreScene extends RoomScene {
  constructor() {
    super({
      key: SCENE_KEYS.coffre,
      roomId: 'coffre',
      title: 'Salle des coffres — Niveau -7',
      flavor:
        "Lumière dorée. Le coffre principal trône au centre. C'est maintenant ou jamais : sortez avec le butin.",
      bgColor: 0x241a08,
      next: SCENE_KEYS.result,
    });
  }
}
