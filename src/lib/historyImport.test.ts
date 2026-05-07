import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeAndSummarize } from "./historyImport";
import type { LocationPoint } from "./locationHistoryTypes";

const placeFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "test-country",
      properties: { name: "Test Country" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1]
          ]
        ]
      }
    }
  ]
};

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: []
};

const cityFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "test-city",
      properties: {
        NAME: "Test City",
        ISO_A2: "TC",
        ADM0NAME: "Test Country",
        POP_MAX: 500_000
      },
      geometry: {
        type: "Point",
        coordinates: [0, 0]
      }
    }
  ]
};

describe("history import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits daily visits with maps-over-photos per-day source counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url.includes("populated_places")) {
            return cityFeatureCollection;
          }

          if (url.includes("countries")) {
            return placeFeatureCollection;
          }

          return emptyFeatureCollection;
        }
      }))
    );

    const mapsPoints: LocationPoint[] = [
      {
        timestamp: "2020-01-01T08:00:00.000Z",
        latitude: 0,
        longitude: 0,
        source: "visit"
      },
      {
        timestamp: "2020-01-01T12:00:00.000Z",
        latitude: 0,
        longitude: 0,
        source: "timeline-path"
      },
      {
        timestamp: "2020-01-03T10:00:00.000Z",
        latitude: 37.621313,
        longitude: -122.378955,
        source: "visit"
      }
    ];
    const photosPoints: LocationPoint[] = [
      {
        timestamp: "2020-01-01T14:00:00.000Z",
        latitude: 0,
        longitude: 0,
        source: "photo"
      },
      {
        timestamp: "2020-01-02T09:00:00.000Z",
        latitude: 0,
        longitude: 0,
        source: "photo"
      }
    ];

    const summary = await mergeAndSummarize({ mapsPoints, photosPoints });

    expect(summary.sourcePointCount).toBe(4);
    expect(summary.airports?.map((airport) => airport.iata)).toContain("SFO");
    expect(summary.dailyVisits).toEqual([
      {
        date: "2020-01-01",
        placeKeys: ["country:test-country"],
        cityKeys: ["city:test-city"],
        sourceCounts: { maps: 2, photos: 0 }
      },
      {
        date: "2020-01-02",
        placeKeys: ["country:test-country"],
        cityKeys: ["city:test-city"],
        sourceCounts: { maps: 0, photos: 1 }
      },
      {
        date: "2020-01-03",
        placeKeys: [],
        cityKeys: [],
        sourceCounts: { maps: 1, photos: 0 }
      }
    ]);
  });
});
