import { describe, it, expect } from 'vitest';
import { generateRoomCode, generateUniqueRoomCode } from './room-code';

describe('room-code', () => {
  it("génère un code au format 'MOT-MOT' en majuscules", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z]+-[A-Z]+$/);
  });

  it('produit du diversité sur plusieurs tirages', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) codes.add(generateRoomCode());
    // 50 tirages sur 15×15=225 combinaisons ; au moins 10 codes différents attendus
    expect(codes.size).toBeGreaterThan(10);
  });

  it('generateUniqueRoomCode retourne le code si toujours unique', () => {
    const code = generateUniqueRoomCode(() => true);
    expect(code).toMatch(/^[A-Z]+-[A-Z]+$/);
  });

  it("generateUniqueRoomCode lève après maxAttempts si tout est pris", () => {
    expect(() => generateUniqueRoomCode(() => false, Math.random, 5)).toThrow(
      /aucun code unique trouvé/,
    );
  });

  it('generateUniqueRoomCode utilise le rng injecté (déterminisme tests)', () => {
    let i = 0;
    const seq = [0, 0]; // tire le 1er color + 1er animal
    const rng = () => seq[i++ % seq.length] ?? 0;
    const code = generateUniqueRoomCode(() => true, rng);
    expect(code).toBe('RED-CAT');
  });
});
