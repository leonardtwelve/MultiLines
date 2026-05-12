import type { RoomCode } from '@pixel-quests/shared';

/**
 * Génère un code mémorisable au format `MOT-MOT` (ex: `BLUE-CAT`, `RED-FOX`).
 *
 * Couleurs et animaux courts en majuscules. Si `isUnique` est fourni, on
 * regénère tant que le code existe déjà.
 */

const COLORS = [
  'RED', 'BLUE', 'GREEN', 'GOLD', 'PINK',
  'CYAN', 'NEON', 'AMBER', 'LIME', 'VIOLET',
  'BLACK', 'WHITE', 'TEAL', 'JADE', 'CORAL',
];

const ANIMALS = [
  'CAT', 'FOX', 'OWL', 'BAT', 'DOG',
  'RAT', 'PIG', 'BEE', 'ANT', 'COW',
  'EEL', 'CRAB', 'WOLF', 'LION', 'BEAR',
];

function randomPick<T>(arr: ReadonlyArray<T>, rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

/**
 * Génère un code aléatoire (peut éventuellement collisionner — appeler avec
 * `isUnique` pour garantir l'unicité dans un registry).
 */
export function generateRoomCode(rng: () => number = Math.random): RoomCode {
  return `${randomPick(COLORS, rng)}-${randomPick(ANIMALS, rng)}`;
}

/**
 * Génère un code unique selon une fonction de vérification (cf. RoomRegistry).
 * Tente jusqu'à `maxAttempts` (par défaut 50) avant de lever.
 */
export function generateUniqueRoomCode(
  isUnique: (code: RoomCode) => boolean,
  rng: () => number = Math.random,
  maxAttempts = 50,
): RoomCode {
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateRoomCode(rng);
    if (isUnique(code)) return code;
  }
  throw new Error(
    `generateUniqueRoomCode: aucun code unique trouvé après ${maxAttempts} essais. ` +
      `Élargir le dictionnaire (${COLORS.length}×${ANIMALS.length} combinaisons actuellement).`,
  );
}
