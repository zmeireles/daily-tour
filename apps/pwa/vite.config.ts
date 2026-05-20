import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      pwaAssets: { preset: "minimal-2023", image: "public/logo.svg" },
      manifest: {
        name: "Daily Tour",
        short_name: "Daily Tour",
        description: "São Miguel guesthouse companion — discover, plan, message.",
        lang: "en",
        start_url: "/",
        display: "standalone",
        background_color: "#F7F4EC",
        theme_color: "#2F5D43",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // maplibre-gl + embla push the main chunk over the default 2 MiB limit.
        // Raised to 4 MiB; code-splitting is a Phase 2 concern.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy bff calls so the PWA stays same-origin in dev — no CORS, cookies
    // (dt_refresh) flow naturally, and the frontend code reaches /r + /v1
    // exactly as it does behind Traefik in prod. The bff container publishes
    // its host port via DT_HOST_PORT_BFF in compose (default 28080).
    proxy: {
      // /r/:token is BOTH a SPA route (handled by react-router → RTokenRoute,
      // which does the actual /r/:token fetch) AND a bff API path. The bypass
      // lets the browser's initial navigation (Accept: text/html) fall through
      // to Vite's SPA index.html, while the SPA's subsequent fetch (no
      // text/html in Accept) gets proxied to bff. Without the bypass, the
      // browser sees bff's raw JSON exchange response instead of the SPA.
      "/r": {
        target: `http://127.0.0.1:${process.env.DT_HOST_PORT_BFF ?? "28080"}`,
        changeOrigin: false,
        bypass: (req) => {
          // Return "/index.html" (NOT req.url) so Vite serves the SPA shell
          // — its internal middleware can resolve /index.html as a real file,
          // whereas /r/<token> isn't a static asset and produces a 404.
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
          return undefined;
        },
      },
      "/v1": {
        target: `http://127.0.0.1:${process.env.DT_HOST_PORT_BFF ?? "28080"}`,
        changeOrigin: false,
        ws: true,
      },
    },
  },
  preview: {
    port: 5174,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      plugins: [
        visualizer({
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
        }),
      ],
    },
  },
});
