import type { AdventureManifest } from '../../core/types/adventure';

/**
 * Aventure factice qui sert d'exemple pédagogique pour `docs/ADVENTURES_GUIDE.md`
 * et de garde-fou de conformité au contrat `Adventure`. Non listée dans l'app.
 */
export const testAdventureManifest: AdventureManifest = {
  id: 'test-adventure',
  version: '0.0.1',
  title: 'Test Adventure',
  shortDescription: 'Aventure factice de validation du contrat.',
  longDescription:
    "Cette aventure ne sert qu'à valider que le contrat Adventure est implémentable depuis la doc seule. Elle ne contient aucun gameplay réel.",
  thumbnail: '/adventures/banque-lune/thumbnail.svg',
  banner: '/adventures/banque-lune/banner.svg',
  tone: 'leger',
  tags: ['test', 'demo'],
  minPlayers: 1,
  maxPlayers: 4,
  estimatedDurationMin: 5,
  difficulty: 'easy',
  contentRating: 'all',
  languages: ['fr'],
};
