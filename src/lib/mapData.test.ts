import { describe, expect, it } from "vitest";
import { getPlaceId, getPlaceName, toPlaceMapFeatures } from "./mapData";
import type { PlaceFeature } from "./mapData";

describe("map data conversion", () => {
  it("converts GeoJSON features into place map features", () => {
    const data = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "356",
          properties: { name: "India" },
          geometry: { type: "Polygon", coordinates: [] }
        }
      ]
    };

    expect(toPlaceMapFeatures(data, "country")).toMatchObject([
      {
        id: "356",
        key: "country:356",
        name: "India",
        scope: "country"
      }
    ]);
  });

  it("uses postal abbreviations for US states when ids are absent", () => {
    const feature = {
      type: "Feature",
      properties: { postal: "CA", name: "California" },
      geometry: { type: "Polygon", coordinates: [] }
    } as PlaceFeature;

    expect(getPlaceId("us-state", feature)).toBe("CA");
    expect(getPlaceName(feature)).toBe("California");
  });

  it("uses Indian state names when ids are absent", () => {
    const feature = {
      type: "Feature",
      properties: { ST_NM: "Maharashtra" },
      geometry: { type: "Polygon", coordinates: [] }
    } as PlaceFeature;

    expect(getPlaceId("india-state", feature)).toBe("Maharashtra");
    expect(getPlaceName(feature)).toBe("Maharashtra");
  });
});
