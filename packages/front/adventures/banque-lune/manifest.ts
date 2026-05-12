import type { AdventureManifest } from '../../src/core/types/adventure';

export const banqueLuneManifest: AdventureManifest = {
  id: 'banque-lune',
  version: '0.1.0',
  title: 'Le Casse de la Banque Lune',
  shortDescription: 'Cyberpunk 2099. Cinq voleurs, un casse, beaucoup de trahisons.',
  longDescription:
    "2099. La Banque Lune — citadelle financière du secteur 07 — abrite les coffres-forts privés de la haute société terrienne. Une équipe de spécialistes a une nuit pour s'y introduire. Un d'entre eux est un infiltré : aider l'équipe ou tout faire échouer ?",
  thumbnail: '/adventures/banque-lune/thumbnail.svg',
  banner: '/adventures/banque-lune/banner.svg',
  tone: 'malicieux',
  tags: ['cyberpunk', 'bluff', 'roles-asymetriques'],
  minPlayers: 3,
  maxPlayers: 5,
  estimatedDurationMin: 35,
  difficulty: 'medium',
  contentRating: '12+',
  languages: ['fr'],
  pricing: { bundled: true },
};
