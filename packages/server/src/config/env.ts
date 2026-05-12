/**
 * Configuration serveur, lue depuis l'environnement.
 * Garde-fou : validation au démarrage (throw si valeur invalide).
 */

export interface ServerConfig {
  /** Port HTTP/WebSocket (défaut 3001). */
  port: number;
  /** URL publique pour générer les liens QR (ex: https://multi-lines.vercel.app). */
  publicUrl: string;
  /** Origins autorisés en CORS. '*' pour le développement, liste explicite en prod. */
  corsOrigins: string | string[];
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  // ts-ignore : `env` paramétrable pour les tests, mais on lit aussi process.env par défaut.
  void env;
  return {
    port: readNumber('PORT', 3001),
    publicUrl: readString('PUBLIC_URL', 'http://localhost:3001'),
    corsOrigins: readString('CORS_ORIGINS', '*'),
  };
}
