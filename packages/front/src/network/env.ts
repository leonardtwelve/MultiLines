/**
 * Résolution de l'URL du serveur WebSocket de Pixel Quests (F18, F21).
 *
 * Source de vérité :
 *   - Build prod (Vercel) : `VITE_SERVER_URL` injecté à la build via les
 *     env vars Vercel (cf. README projet).
 *   - Dev local : par défaut `http://localhost:3001` (cohérent avec
 *     `packages/server/src/config/env.ts`).
 *
 * `import.meta.env` est fourni par Vite. On évite tout couplage à
 * `process.env` côté navigateur.
 */

export const DEFAULT_LOCAL_SERVER_URL = 'http://localhost:3001';

/**
 * Renvoie l'URL HTTP(S) du serveur. socket.io-client s'occupe ensuite de
 * l'upgrade en WebSocket — on n'a pas besoin de manipuler `ws://`/`wss://`.
 */
export function getServerUrl(env: ImportMetaEnv = import.meta.env): string {
  const raw = env.VITE_SERVER_URL;
  if (typeof raw === 'string' && raw.trim() !== '') {
    return stripTrailingSlash(raw.trim());
  }
  return DEFAULT_LOCAL_SERVER_URL;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
