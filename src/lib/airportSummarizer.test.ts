import { describe, expect, it } from "vitest";
import { summarizeVisitedAirports } from "./airportSummarizer";
import type { AirportRecord } from "./airportTypes";
import type { LocationPoint } from "./locationHistoryTypes";

const airport: AirportRecord = {
  iata: "TST",
  name: "Test International Airport",
  municipality: "Testville",
  countryCode: "TS",
  latitude: 10,
  longitude: 10
};

describe("airport summarizer", () => {
  it("counts only visit days within 1.5 km while retaining supporting point counts", () => {
    const points: LocationPoint[] = [
      { timestamp: "2020-01-01T10:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-start" },
      { timestamp: "2020-01-01T11:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "visit" },
      { timestamp: "2020-01-01T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-end" },
      { timestamp: "2020-01-02T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-end" },
      { timestamp: "2020-01-03T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "timeline-path" }
    ];

    expect(summarizeVisitedAirports(points, [airport])).toEqual([
      {
        key: "airport:TST",
        iata: "TST",
        name: "Test International Airport",
        municipality: "Testville",
        countryCode: "TS",
        dayCount: 1,
        pointCount: 4,
        visitPointCount: 1,
        firstDate: "2020-01-01",
        lastDate: "2020-01-01",
        dateSpans: [{ startDate: "2020-01-01", endDate: "2020-01-01", dayCount: 1 }]
      }
    ]);
  });

  it("does not count visits outside the airport radius", () => {
    const points: LocationPoint[] = [
      { timestamp: "2020-01-01T10:00:00.000Z", latitude: 10.03, longitude: 10.03, source: "visit" }
    ];

    expect(summarizeVisitedAirports(points, [airport])).toEqual([]);
  });

  it("does not count photo points as airport presence evidence", () => {
    const points: LocationPoint[] = [
      { timestamp: "2020-01-01T10:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "visit" },
      { timestamp: "2020-01-01T11:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "photo" }
    ];

    expect(summarizeVisitedAirports(points, [airport])[0].pointCount).toBe(1);
  });
});
