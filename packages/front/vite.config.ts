import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname n'existe pas en ESM — on le reconstruit.
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vite multi-page : deux entrées HTML distinctes pour deux clients
 * (cf. F16 / pivot Jackbox) :
 *
 * - `src/index.html`         → Host (tablette / écran central)
 * - `src/player/index.html`  → Player smartphone
 *
 * Chaque page produit son bundle séparé. Le Player ne charge donc pas
 * Phaser (perf cruciale en mobile).
 */
export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        host: resolve(__dirname, 'src/index.html'),
        player: resolve(__dirname, 'src/player/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
