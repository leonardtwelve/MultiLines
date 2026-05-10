import { describe, it, expect } from 'vitest';
import { validateManifest } from './manifest-validation';
import type { AdventureManifest } from './adventure';

const valid: AdventureManifest = {
  id: 'demo',
  version: '0.1.0',
  title: 'Demo',
  shortDescription: 'Une démo.',
  longDescription: '',
  thumbnail: '/thumb.svg',
  banner: '/banner.svg',
  tone: 'leger',
  tags: ['demo'],
  minPlayers: 2,
  maxPlayers: 4,
  estimatedDurationMin: 30,
  difficulty: 'easy',
  contentRating: 'all',
  languages: ['fr'],
};

describe('validateManifest', () => {
  it('accepte un manifest valide', () => {
    expect(validateManifest(valid)).toBe(true);
  });

  it('rejette null et primitives', () => {
    expect(validateManifest(null)).toBe(false);
    expect(validateManifest(undefined)).toBe(false);
    expect(validateManifest('string')).toBe(false);
    expect(validateManifest(42)).toBe(false);
  });

  it('rejette si un champ requis manque', () => {
    const { id: _omit, ...rest } = valid;
    expect(validateManifest(rest)).toBe(false);
  });

  it('rejette minPlayers > maxPlayers', () => {
    expect(validateManifest({ ...valid, minPlayers: 10, maxPlayers: 5 })).toBe(false);
  });

  it('rejette un tone inconnu', () => {
    expect(validateManifest({ ...valid, tone: 'epique' })).toBe(false);
  });

  it('rejette une duration négative', () => {
    expect(validateManifest({ ...valid, estimatedDurationMin: -5 })).toBe(false);
  });

  it('accepte un manifest sans pricing optionnel', () => {
    expect(validateManifest(valid)).toBe(true);
  });

  it('accepte un manifest avec pricing bundled', () => {
    expect(validateManifest({ ...valid, pricing: { bundled: true } })).toBe(true);
  });

  it('rejette un pricing mal formé', () => {
    expect(validateManifest({ ...valid, pricing: { bundled: 'oui' } })).toBe(false);
  });
});
