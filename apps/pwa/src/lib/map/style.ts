import type { StyleSpecification } from "maplibre-gl";

export function buildStyle(opts: { pmtilesUrl?: string }): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
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
