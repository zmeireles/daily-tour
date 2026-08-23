import type { StyleSpecification } from "maplibre-gl";

export function buildStyle(opts: { pmtilesUrl?: string }): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        // openstreetmap.org serves tiles up to z19 and 404s above it. Without
        // this cap MapLibre's default (22) makes it request z20+ as soon as the
        // user zooms in — every one 404s and the map goes FLAT, while the
        // marker (a DOM overlay) keeps drawing, so it reads as "the map broke"
        // rather than "no tiles at this zoom". With the cap MapLibre overzooms
        // the z19 tile instead: blurrier, but always there.
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
      },
    ],
  };

  if (opts.pmtilesUrl) {
    (style.sources as Record<string, unknown>)["pmtiles-vector"] = {
      type: "vector",
      url: `pmtiles://${opts.pmtilesUrl}`,
    };
  }

  return style;
}
