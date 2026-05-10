import type {
  AdventureDifficulty,
  AdventureManifest,
  AdventureTone,
  ContentRating,
} from './adventure';

const TONES: AdventureTone[] = ['leger', 'tendu', 'malicieux'];
const DIFFICULTIES: AdventureDifficulty[] = ['easy', 'medium', 'hard'];
const RATINGS: ContentRating[] = ['all', '12+', '16+'];

/**
 * Garde-fou runtime : refuse un manifest mal formé. Si invalide, l'aventure
 * doit être ignorée par l'écran d'accueil (et un warning loggé).
 *
 * Type predicate — au prix d'un cast en cas de succès, le code appelant peut
 * raisonner sur un `AdventureManifest` après check.
 */
export function validateManifest(manifest: unknown): manifest is AdventureManifest {
  if (manifest === null || typeof manifest !== 'object') return false;
  const m = manifest as Partial<AdventureManifest> & Record<string, unknown>;

  const stringField = (v: unknown) => typeof v === 'string' && v.length > 0;
  const positiveInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0;

  if (!stringField(m.id)) return false;
  if (!stringField(m.version)) return false;
  if (!stringField(m.title)) return false;
  if (!stringField(m.shortDescription)) return false;
  if (typeof m.longDescription !== 'string') return false; // peut être vide en M1
  if (!stringField(m.thumbnail)) return false;
  if (!stringField(m.banner)) return false;
  if (!TONES.includes(m.tone as AdventureTone)) return false;
  if (!Array.isArray(m.tags)) return false;
  if (!m.tags.every((t) => typeof t === 'string')) return false;

  if (!positiveInt(m.minPlayers)) return false;
  if (!positiveInt(m.maxPlayers)) return false;
  if ((m.minPlayers as number) > (m.maxPlayers as number)) return false;
  if (!positiveInt(m.estimatedDurationMin)) return false;
  if (!DIFFICULTIES.includes(m.difficulty as AdventureDifficulty)) return false;

  if (!RATINGS.includes(m.contentRating as ContentRating)) return false;
  if (!Array.isArray(m.languages) || m.languages.length === 0) return false;
  if (!m.languages.every((l) => typeof l === 'string')) return false;

  if (m.pricing !== undefined) {
    if (typeof m.pricing !== 'object' || m.pricing === null) return false;
    const p = m.pricing as { bundled?: unknown; standalonePriceEur?: unknown };
    if (typeof p.bundled !== 'boolean') return false;
    if (p.standalonePriceEur !== undefined && typeof p.standalonePriceEur !== 'number') return false;
  }

  return true;
}
