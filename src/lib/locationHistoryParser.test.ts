import { describe, expect, it } from "vitest";
import {
  parseGeoPoint,
  parseGoogleLocationHistory,
  parseLocationHistoryEntry,
  summarizeLocationPoints
} from "./locationHistoryParser";

describe("location history parser", () => {
  it("parses Google geo points", () => {
    expect(parseGeoPoint("geo:37.774900,-122.419400")).toEqual({
      latitude: 37.7749,
      longitude: -122.4194
    });
  });

  it("rejects invalid geo points", () => {
    expect(parseGeoPoint("37.774900,-122.419400")).toBeNull();
    expect(parseGeoPoint("geo:100,-122.419400")).toBeNull();
  });

  it("extracts visit points", () => {
    expect(
      parseLocationHistoryEntry({
        startTime: "2020-01-01T10:00:00.000Z",
        endTime: "2020-01-01T11:00:00.000Z",
        visit: {
          topCandidate: {
            placeID: "place-1",
            placeLocation: "geo:37.774900,-122.419400"
          }
        }
      })
    ).toEqual([
      {
        timestamp: "2020-01-01T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        source: "visit",
        placeId: "place-1"
      }
    ]);
  });

  it("extracts activity start and end points", () => {
    expect(
      parseLocationHistoryEntry({
        startTime: "2020-01-01T10:00:00.000Z",
        endTime: "2020-01-01T11:00:00.000Z",
        activity: {
          start: "geo:37.774900,-122.419400",
          end: "geo:34.052200,-118.243700"
        }
      })
    ).toEqual([
      {
        timestamp: "2020-01-01T10:00:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        source: "activity-start"
      },
      {
        timestamp: "2020-01-01T11:00:00.000Z",
        latitude: 34.0522,
        longitude: -118.2437,
        source: "activity-end"
      }
    ]);
  });

  it("extracts timeline path points using offsets from start time", () => {
    expect(
      parseLocationHistoryEntry({
        startTime: "2020-01-01T10:00:00.000Z",
        endTime: "2020-01-01T12:00:00.000Z",
        timelinePath: [
          {
            point: "geo:37.774900,-122.419400",
            durationMinutesOffsetFromStartTime: "15"
          }
        ]
      })
    ).toEqual([
      {
        timestamp: "2020-01-01T10:15:00.000Z",
        latitude: 37.7749,
        longitude: -122.4194,
        source: "timeline-path"
      }
    ]);
  });

  it("parses a top-level array and summarizes extracted points", () => {
    const points = parseGoogleLocationHistory([
      {
        startTime: "2020-01-01T10:00:00.000Z",
        visit: {
          topCandidate: {
            placeLocation: "geo:37.774900,-122.419400"
          }
        }
      },
      {
        startTime: "2020-01-02T10:00:00.000Z",
        visit: {
          topCandidate: {
            placeLocation: "geo:40.712800,-74.006000"
          }
        }
      }
    ]);

    expect(summarizeLocationPoints(points)).toEqual({
      pointCount: 2,
      firstTimestamp: "2020-01-01T10:00:00.000Z",
      lastTimestamp: "2020-01-02T10:00:00.000Z"
    });
  });
});
