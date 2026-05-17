import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

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
  },
  preview: {
    port: 5174,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
