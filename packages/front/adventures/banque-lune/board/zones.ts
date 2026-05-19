/**
 * Les 9 zones thématiques de la Banque Lune (F14).
 *
 * La couleur de sol est un placeholder en attendant le vrai tileset
 * pixel art (#11/#12). Choisies pour différencier visuellement les
 * étages :
 * - **Rez-de-chaussée** : tons chauds (entrée publique, parking)
 * - **Étage 1 (bureaux)** : tons neutres / bureautiques
 * - **Étage 2 (sécurisé)** : tons froids / techno (coffres, data)
 */

import type { Zone } from '../../../src/core/board';

export const BANQUE_LUNE_ZONES: ReadonlyArray<Zone> = [
  // Rez-de-chaussée
  { id: 'reception', label: 'Réception', floorColor: 0x4a3a2a },
  { id: 'parking', label: 'Parking', floorColor: 0x2a2a30 },
  { id: 'hall', label: 'Hall central', floorColor: 0x5a4a3a },

  // Étage 1
  { id: 'bureaux', label: 'Bureaux', floorColor: 0x3a3a4a },
  { id: 'salle-controle', label: 'Salle de contrôle', floorColor: 0x4a3a4a },
  { id: 'escalier', label: 'Escalier', floorColor: 0x383238 },

  // Étage 2 (sécurisé)
  { id: 'coffres', label: 'Coffres-forts', floorColor: 0x2a3a4a },
  { id: 'data-center', label: 'Data Center', floorColor: 0x2a4a3a },
  { id: 'salle-serveurs', label: 'Salle serveurs', floorColor: 0x2a3a3a },
] as const;
