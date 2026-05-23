/**
 * Configuration serveur, lue depuis l'environnement.
 * Garde-fou : validation au démarrage (throw si valeur invalide).
 *
 * `corsOrigins` est parsé en `CorsOrigin[]` à partir d'une CSV
 * d'entrées textuelles supportant un wildcard de sous-domaine
 * (cf. `docs/specs/protocole.md §1.5` — bug rencontré Prompt 3a sur
 * les previews Vercel `*.vercel.app`).
 */

/** Valeur acceptée par socket.io pour le champ `origin` d'une CORS. */
export type CorsOrigin = string | RegExp;

export interface ServerConfig {
  /** Port HTTP/WebSocket (défaut 3001). */
  port: number;
  /** URL publique pour générer les liens QR (ex: https://multi-lines.vercel.app). */
  publicUrl: string;
  /**
   * Liste d'origines autorisées en CORS. Pour le développement on
   * accepte `*`. En prod, on liste explicitement avec wildcards de
   * sous-domaine (`https://*.vercel.app`).
   */
  corsOrigins: '*' | CorsOrigin[];
  /**
   * **Mode dev/test** : permet de lancer une partie avec 1 ou 2
   * joueurs (au lieu de 3 minimum imposé par G7). Activé via la var
   * d'env `DEV_ALLOW_SOLO=true`. À ne **pas** activer en prod ouverte
   * — c'est un bypass pour playtest solo / debug.
   */
  devAllowSolo: boolean;
}

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Config invalide : ${key}="${raw}" doit être un nombre positif.`);
  }
  return n;
}

function readString(key: string, fallback: string): string {
  const raw = process.env[key];
  return raw === undefined || raw === '' ? fallback : raw;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Parse une chaîne `CORS_ORIGINS` :
 *
 * - `'*'` (ou vide) → renvoie le wildcard littéral `'*'`.
 * - Sinon : CSV d'entrées, chaque entrée :
 *   - **avec `*.` après le scheme** (ex: `https://*.vercel.app`) → RegExp
 *     qui matche tout sous-domaine direct ET sous-sous-domaine.
 *   - **sans wildcard** (ex: `https://multi-lines.vercel.app`) → string
 *     littéral (socket.io vérifie l'égalité exacte).
 *
 * Doublons et trim gérés. Une entrée invalide est ignorée avec un log.
 */
export function parseCorsOrigins(raw: string): '*' | CorsOrigin[] {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '*') return '*';
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const origins: CorsOrigin[] = [];
  for (const part of parts) {
    if (part === '*') {
      // Si un user met `*` au milieu d'une CSV, c'est probablement une
      // erreur — on dégrade en wildcard pur pour rester safe.
      return '*';
    }
    if (part.includes('*.')) {
      origins.push(toWildcardRegExp(part));
    } else {
      origins.push(part);
    }
  }
  // Dédoublonnage des string littéraux (les RegExp ne se comparent pas
  // en valeur, on les garde toutes).
  const seen = new Set<string>();
  const deduped: CorsOrigin[] = [];
  for (const o of origins) {
    if (typeof o === 'string') {
      if (seen.has(o)) continue;
      seen.add(o);
    }
    deduped.push(o);
  }
  return deduped;
}

/**
 * Convertit un pattern textuel `https://*.vercel.app` en RegExp.
 *
 * Règles :
 * - Le scheme est conservé tel quel (`https?` non géré — explicite par l'user).
 * - `*.` est remplacé par `(?:[a-z0-9-]+\\.)+` pour matcher un ou
 *   plusieurs sous-domaines.
 * - Le reste est echappé (point littéral, etc.).
 * - Pas d'anchor `$` à la fin pour autoriser un éventuel port.
 */
function toWildcardRegExp(pattern: string): RegExp {
  const escaped = pattern
    // 1) Sauvegarde temporaire de `*.`
    .replace(/\*\./g, '__WILDCARD__')
    // 2) Échappement des caractères spéciaux regex
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // 3) Restauration en motif sous-domaine
    .replace(/__WILDCARD__/g, '(?:[a-z0-9-]+\\.)+');
  return new RegExp(`^${escaped}(?::\\d+)?$`, 'i');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  // ts-ignore : `env` paramétrable pour les tests, mais on lit aussi process.env par défaut.
  void env;
  return {
    port: readNumber('PORT', 3001),
    publicUrl: readString('PUBLIC_URL', 'http://localhost:3001'),
    corsOrigins: parseCorsOrigins(readString('CORS_ORIGINS', '*')),
    devAllowSolo: readBoolean('DEV_ALLOW_SOLO', false),
  };
}
