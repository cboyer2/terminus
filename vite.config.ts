import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Served from a GitHub Pages project site at /terminus/ — base here must
// match the manifest's start_url/scope below, or the service worker fails
// to register and the installed PWA silently refuses to work.
const BASE = "/terminus/";

export default defineConfig({
  base: BASE,
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      // No runtime caching entries: the service worker caches the app shell
      // only — there is no network and nothing to cache a response from.
      manifest: {
        name: "Terminus",
        short_name: "Terminus",
        description: "A 5/3/1 strength training planner.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        background_color: "#15181f",
        theme_color: "#15181f",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    include: ["src/generator/__tests__/**/*.test.ts", "src/storage/__tests__/**/*.test.ts"],
  },
});
