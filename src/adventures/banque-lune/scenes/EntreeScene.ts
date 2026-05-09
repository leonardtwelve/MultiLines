import { RoomScene } from './RoomScene';
import { SCENE_KEYS } from '../state';

export class EntreeScene extends RoomScene {
  constructor() {
    super({
      key: SCENE_KEYS.entree,
      roomId: 'entree',
      title: 'Entrée — Tour Banque Lune',
      flavor:
        "Caméras tout autour. Le système d'accès brille au mur. Vous avez quelques secondes avant la prochaine ronde.",
      bgColor: 0x141828,
      next: SCENE_KEYS.couloir,
    });
  }
}
