import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // react-router v8 splits the DOM RouterProvider into the `react-router/dom`
    // entry, which re-imports RouterProvider from the bare `react-router`
    // specifier. Left to vitest's defaults one entry is externalized to Node
    // (→ dist/production) while the other is inlined through vite
    // (→ dist/development), producing two module instances with two distinct
    // React contexts — <Link> then reads a null NavigationContext. Inlining
    // both makes vite the single resolver. Test-env only: a real vite build
    // already resolves both through one resolver.
    server: {
      deps: {
        inline: ["react-router", "react-router/dom"],
      },
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
