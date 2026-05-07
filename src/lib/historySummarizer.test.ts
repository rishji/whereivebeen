import { describe, expect, it } from "vitest";
import {
  compressDateSpans,
  summarizeVisitedPlaces,
  timestampToDate
} from "./historySummarizer";
import type { PlaceMapFeature } from "./mapData";
import type { LocationPoint } from "./locationHistoryTypes";

const squareFeature: PlaceMapFeature = {
  id: "square",
  key: "country:square",
  name: "Squareland",
  scope: "country",
  feature: {
    type: "Feature",
    id: "square",
    properties: { name: "Squareland" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0]
        ]
      ]
    }
  }
};

describe("history summarizer", () => {
  it("keeps local ISO date prefixes instead of shifting offsets to UTC", () => {
    expect(timestampToDate("2011-09-12T06:31:54.212-04:00")).toBe("2011-09-12");
  });

  it("uses GPS location to determine local date for UTC timestamps (west of UTC)", () => {
    // San Francisco (UTC-8 in January / PST): 2020-01-02T04:00Z = Jan 1 at 8 PM local
    expect(timestampToDate("2020-01-02T04:00:00.000Z", 37.7749, -122.4194)).toBe("2020-01-01");
  });

  it("uses GPS location to determine local date for UTC timestamps (east of UTC)", () => {
    // Tokyo (UTC+9): 2020-01-01T16:00Z = Jan 2 at 1 AM local
    expect(timestampToDate("2020-01-01T16:00:00.000Z", 35.6762, 139.6503)).toBe("2020-01-02");
  });

  it("compresses consecutive dates into spans", () => {
    expect(compressDateSpans(["2020-01-01", "2020-01-02", "2020-01-04"])).toEqual([
      {
        startDate: "2020-01-01",
        endDate: "2020-01-02",
        dayCount: 2
      },
      {
        startDate: "2020-01-04",
        endDate: "2020-01-04",
        dayCount: 1
      }
    ]);
  });

  it("summarizes unique visited days for matching places", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-01-01T10:00:00.000Z",
        latitude: 5,
        longitude: 5,
        source: "visit"
      },
      {
        timestamp: "2020-01-01T11:00:00.000Z",
        latitude: 5,
        longitude: 5,
        source: "timeline-path"
      },
      {
        timestamp: "2020-01-03T10:00:00.000Z",
        latitude: 5,
        longitude: 5,
        source: "visit"
      },
      {
        timestamp: "2020-01-04T10:00:00.000Z",
        latitude: 20,
        longitude: 20,
        source: "visit"
      }
    ];

    expect(summarizeVisitedPlaces(points, [squareFeature])).toEqual([
      {
        key: "country:square",
        scope: "country",
        id: "square",
        name: "Squareland",
        dayCount: 2,
        firstDate: "2020-01-01",
        lastDate: "2020-01-03",
        dateSpans: [
          {
            startDate: "2020-01-01",
            endDate: "2020-01-01",
            dayCount: 1
          },
          {
            startDate: "2020-01-03",
            endDate: "2020-01-03",
            dayCount: 1
          }
        ]
      }
    ]);
  });

  it("ignores timeline path points when summarizing visited places", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-01-01T10:00:00.000Z",
        latitude: 5,
        longitude: 5,
        source: "timeline-path"
      },
      {
        timestamp: "2020-01-03T10:00:00.000Z",
        latitude: 5,
        longitude: 5,
        source: "visit"
      }
    ];

    expect(summarizeVisitedPlaces(points, [squareFeature])).toEqual([
      {
        key: "country:square",
        scope: "country",
        id: "square",
        name: "Squareland",
        dayCount: 1,
        firstDate: "2020-01-03",
        lastDate: "2020-01-03",
        dateSpans: [
          {
            startDate: "2020-01-03",
            endDate: "2020-01-03",
            dayCount: 1
          }
        ]
      }
    ]);
  });
});
