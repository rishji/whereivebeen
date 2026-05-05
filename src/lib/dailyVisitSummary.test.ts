import { describe, expect, it } from "vitest";
import {
  buildDailyVisits,
  expandDateRange,
  expandDateSpans,
  queryDailyVisitRange,
  queryDailyVisits
} from "./dailyVisitSummary";
import type { CityVisitSummary } from "./cityTypes";
import type { VisitedPlaceSummary } from "./historySummaryTypes";

const squareland: VisitedPlaceSummary = {
  key: "country:squareland",
  scope: "country",
  id: "squareland",
  name: "Squareland",
  dayCount: 3,
  firstDate: "2020-01-01",
  lastDate: "2020-01-04",
  dateSpans: [
    { startDate: "2020-01-03", endDate: "2020-01-04", dayCount: 2 },
    { startDate: "2020-01-01", endDate: "2020-01-01", dayCount: 1 }
  ]
};

const circleland: VisitedPlaceSummary = {
  key: "country:circleland",
  scope: "country",
  id: "circleland",
  name: "Circleland",
  dayCount: 1,
  firstDate: "2020-01-03",
  lastDate: "2020-01-03",
  dateSpans: [{ startDate: "2020-01-03", endDate: "2020-01-03", dayCount: 1 }]
};

const metroCity: CityVisitSummary = {
  key: "city:metro",
  id: "metro",
  name: "Metro City",
  countryCode: "MC",
  countryName: "Metro Country",
  population: 1_000_000,
  dayCount: 2,
  pointCount: 4,
  firstDate: "2020-01-02",
  lastDate: "2020-01-03",
  dateSpans: [{ startDate: "2020-01-02", endDate: "2020-01-03", dayCount: 2 }]
};

const alphaCity: CityVisitSummary = {
  key: "city:alpha",
  id: "alpha",
  name: "Alpha City",
  population: 500_000,
  dayCount: 1,
  pointCount: 1,
  firstDate: "2020-01-03",
  lastDate: "2020-01-03",
  dateSpans: [{ startDate: "2020-01-03", endDate: "2020-01-03", dayCount: 1 }]
};

describe("daily visit summary", () => {
  it("expands date spans and inclusive date ranges", () => {
    expect(
      expandDateSpans([
        { startDate: "2020-01-01", endDate: "2020-01-02", dayCount: 2 },
        { startDate: "2020-01-04", endDate: "2020-01-04", dayCount: 1 }
      ])
    ).toEqual(["2020-01-01", "2020-01-02", "2020-01-04"]);

    expect(expandDateRange("2020-01-02", "2020-01-04")).toEqual([
      "2020-01-02",
      "2020-01-03",
      "2020-01-04"
    ]);
  });

  it("builds sorted compact daily records from place and city spans", () => {
    expect(
      buildDailyVisits({
        places: [squareland, circleland],
        cities: [metroCity, alphaCity],
        sourceCountsByDate: {
          "2020-01-01": { maps: 2, photos: 1 },
          "2020-01-03": { maps: 5, photos: 3 }
        }
      })
    ).toEqual([
      {
        date: "2020-01-01",
        sourceCounts: { maps: 2, photos: 1 },
        placeKeys: ["country:squareland"],
        cityKeys: []
      },
      {
        date: "2020-01-02",
        sourceCounts: { maps: 0, photos: 0 },
        placeKeys: [],
        cityKeys: ["city:metro"]
      },
      {
        date: "2020-01-03",
        sourceCounts: { maps: 5, photos: 3 },
        placeKeys: ["country:circleland", "country:squareland"],
        cityKeys: ["city:alpha", "city:metro"]
      },
      {
        date: "2020-01-04",
        sourceCounts: { maps: 0, photos: 0 },
        placeKeys: ["country:squareland"],
        cityKeys: []
      }
    ]);
  });

  it("includes source-count-only dates as empty daily records", () => {
    expect(
      buildDailyVisits({
        places: [],
        cities: [],
        sourceCountsByDate: {
          "2020-01-06": { maps: 4, photos: 2 }
        }
      })
    ).toEqual([
      {
        date: "2020-01-06",
        sourceCounts: { maps: 4, photos: 2 },
        placeKeys: [],
        cityKeys: []
      }
    ]);
  });

  it("queries a single date or returns null when a daily record is missing", () => {
    const dailyVisits = buildDailyVisits({
      places: [squareland],
      cities: [metroCity]
    });

    expect(queryDailyVisits(dailyVisits, "2020-01-03")).toEqual({
      date: "2020-01-03",
      sourceCounts: { maps: 0, photos: 0 },
      placeKeys: ["country:squareland"],
      cityKeys: ["city:metro"]
    });
    expect(queryDailyVisits(dailyVisits, "2020-01-05")).toBeNull();
  });

  it("rolls up an inclusive date range by matched days", () => {
    const dailyVisits = buildDailyVisits({
      places: [squareland, circleland],
      cities: [metroCity, alphaCity],
      sourceCountsByDate: {
        "2020-01-01": { maps: 2, photos: 1 },
        "2020-01-03": { maps: 5, photos: 3 },
        "2020-01-04": { maps: 1, photos: 0 }
      }
    });

    expect(queryDailyVisitRange(dailyVisits, "2020-01-01", "2020-01-05")).toEqual({
      startDate: "2020-01-01",
      endDate: "2020-01-05",
      totalDays: 5,
      daysWithData: 4,
      missingDays: 1,
      sourceCounts: { maps: 8, photos: 4 },
      places: [
        { key: "country:squareland", dayCount: 3 },
        { key: "country:circleland", dayCount: 1 }
      ],
      cities: [
        { key: "city:metro", dayCount: 2 },
        { key: "city:alpha", dayCount: 1 }
      ]
    });
  });
});
