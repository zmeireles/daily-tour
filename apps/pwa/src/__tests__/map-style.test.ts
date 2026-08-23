import { describe, it, expect } from "vitest";
import { buildStyle } from "@/lib/map/style";

// The OSM raster source must declare the highest zoom the tile server actually
// serves. openstreetmap.org stops at z19; MapLibre's default source maxzoom is
// 22, so an uncapped source requests z20+ the moment someone zooms in to place
// a pin — every request 404s, the canvas paints nothing, and the DOM-overlay
// marker keeps rendering on top of a blank map.
describe("buildStyle — OSM raster source", () => {
  it("caps maxzoom at 19, the highest zoom openstreetmap.org serves", () => {
    const style = buildStyle({});
    const osm = style.sources.osm as { maxzoom?: number };
    expect(osm.maxzoom).toBe(19);
  });

  it("still points at the OSM tile template and keeps attribution", () => {
    const osm = buildStyle({}).sources.osm as {
      tiles?: string[];
      attribution?: string;
      tileSize?: number;
    };
    expect(osm.tiles).toEqual(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]);
    expect(osm.attribution).toContain("OpenStreetMap");
    expect(osm.tileSize).toBe(256);
  });

  it("adds a pmtiles vector source only when a url is supplied", () => {
    expect(buildStyle({}).sources["pmtiles-vector"]).toBeUndefined();
    const withPm = buildStyle({ pmtilesUrl: "https://example.test/a.pmtiles" });
    expect(withPm.sources["pmtiles-vector"]).toMatchObject({
      type: "vector",
      url: "pmtiles://https://example.test/a.pmtiles",
    });
    // capping the raster source must not disturb the vector one
    expect((withPm.sources.osm as { maxzoom?: number }).maxzoom).toBe(19);
  });
});
