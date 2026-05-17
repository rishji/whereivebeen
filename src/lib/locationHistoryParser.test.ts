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

  it("parses Android degree-format geo points", () => {
    // {latLng} object form (visit/activity fields)
    expect(parseGeoPoint({ latLng: "37.7749°, -122.4194°" })).toEqual({
      latitude: 37.7749,
      longitude: -122.4194
    });
    // plain string form (timelinePath.point field)
    expect(parseGeoPoint("37.7749°, -122.4194°")).toEqual({
      latitude: 37.7749,
      longitude: -122.4194
    });
  });

  it("parses Android semanticSegments format", () => {
    const points = parseGoogleLocationHistory({
      semanticSegments: [
        {
          startTime: "2020-01-01T10:00:00.000-07:00",
          endTime: "2020-01-01T11:00:00.000-07:00",
          visit: {
            topCandidate: {
              placeId: "place-android-1",
              placeLocation: { latLng: "37.7749°, -122.4194°" }
            }
          }
        },
        {
          startTime: "2020-01-02T10:00:00.000-07:00",
          endTime: "2020-01-02T11:00:00.000-07:00",
          activity: {
            start: { latLng: "37.7749°, -122.4194°" },
            end: { latLng: "34.0522°, -118.2437°" }
          }
        },
        {
          startTime: "2020-01-03T10:00:00.000-07:00",
          endTime: "2020-01-03T12:00:00.000-07:00",
          timelinePath: [
            { point: "37.7749°, -122.4194°", time: "2020-01-03T10:30:00.000-07:00" }
          ]
        }
      ],
      rawSignals: [],
      userLocationProfile: {}
    });

    expect(points).toHaveLength(4);
    expect(points[0]).toMatchObject({ source: "visit", placeId: "place-android-1" });
    expect(points[1]).toMatchObject({ source: "activity-start", latitude: 37.7749 });
    expect(points[2]).toMatchObject({ source: "activity-end", latitude: 34.0522 });
    expect(points[3]).toMatchObject({ source: "timeline-path", timestamp: "2020-01-03T10:30:00.000-07:00" });
  });

  it("excludes activity points from flight segments (type=flying or air speed)", () => {
    // Explicitly typed FLYING segment - iPhone format
    expect(
      parseLocationHistoryEntry({
        startTime: "2020-01-01T10:00:00.000Z",
        endTime: "2020-01-01T14:00:00.000Z",
        activity: {
          start: "geo:40.498332,-3.567598",
          end: "geo:22.308047,113.918480",
          topCandidate: { type: "flying" }
        }
      })
    ).toHaveLength(0);

    // Misclassified flight: RUNNING segment spanning 2,990 km in 2 hours (~1,500 km/h)
    expect(
      parseLocationHistoryEntry({
        startTime: "2019-05-29T17:11:40.000Z",
        endTime: "2019-05-29T19:12:16.000Z",
        activity: {
          start: { latLng: "4.249797°, 31.1868677°" },
          end: { latLng: "29.3427822°, 20.9782969°" },
          distanceMeters: 2990285,
          topCandidate: { type: "RUNNING" }
        }
      })
    ).toHaveLength(0);

    // Legitimate car trip (~90 km/h) — should be kept
    expect(
      parseLocationHistoryEntry({
        startTime: "2020-01-01T10:00:00.000Z",
        endTime: "2020-01-01T16:00:00.000Z",
        activity: {
          start: "geo:37.774900,-122.419400",
          end: "geo:34.052200,-118.243700",
          distanceMeters: 560000,
          topCandidate: { type: "IN_PASSENGER_VEHICLE" }
        }
      })
    ).toHaveLength(2);
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
