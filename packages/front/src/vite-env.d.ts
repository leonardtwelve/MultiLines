/// <reference types="vite/client" />

/**
 * Variables d'environnement injectées à la build par Vite.
 *
 * Toutes les vars exposées au navigateur doivent commencer par `VITE_`
 * (sinon Vite les filtre). Source de vérité : Vercel / .env.local.
 */
interface ImportMetaEnv {
  /**
   * URL HTTP(S) du serveur WebSocket Pixel Quests.
   * - Prod : `https://pixel-quests-server.fly.dev`
   * - Dev local : `http://localhost:3001` (cf. DEFAULT_LOCAL_SERVER_URL).
   */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
