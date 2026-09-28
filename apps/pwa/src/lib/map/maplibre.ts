// Single entry point for maplibre-gl. Every consumer imports the engine from
// here, never from "maplibre-gl" directly, so the one-time worker setup below
// always runs before a Map is constructed.
//
// maplibre-gl v6 is ESM-only: there is no default export any more, hence the
// namespace import. Under a bundler it also cannot locate its own worker from
// `import.meta.url`, so the worker URL must be set explicitly. `?worker&url`
// (not plain `?url`) makes Vite emit a self-contained worker chunk — the dist
// worker imports a sibling `maplibre-gl-shared.mjs` that `?url` would not ship.
// See maplibre's v5→v6 migration guide, "setWorkerUrl() is bundler-only".
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(workerUrl);

export default maplibregl;
