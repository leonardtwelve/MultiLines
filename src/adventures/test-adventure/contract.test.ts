import { describe, it, expect } from 'vitest';
import { testAdventureManifest } from './manifest';
import { validateManifest } from '../../core/types/manifest-validation';

/**
 * Garde-fou de conformité au contrat `Adventure` :
 * - Le manifest valide (runtime).
 * - L'objet `testAdventure` satisfait l'interface `Adventure` — vérifié à la
 *   compilation par le typage de `export const testAdventure: Adventure = ...`
 *   dans `index.ts`. Si le contrat évolue de manière incompatible, la
 *   compilation échoue (pas besoin de runtime check).
 *
 * On n'importe **pas** `testAdventure` ici : son module charge Phaser, qui
 * touche `canvas` à l'import et crashe en jsdom. Le typage statique suffit.
 */
describe('test-adventure manifest', () => {
  it('valide selon le contrat AdventureManifest', () => {
    expect(validateManifest(testAdventureManifest)).toBe(true);
  });

  it('respecte les bornes joueurs (min ≤ max)', () => {
    expect(testAdventureManifest.minPlayers).toBeLessThanOrEqual(testAdventureManifest.maxPlayers);
  });

  it('a une durée estimée positive', () => {
    expect(testAdventureManifest.estimatedDurationMin).toBeGreaterThan(0);
  });
});
