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
});
