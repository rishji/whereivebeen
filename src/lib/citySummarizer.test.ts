import { describe, expect, it } from "vitest";
import { parseNaturalEarthCities } from "./cityData";
import { summarizeVisitedCities } from "./citySummarizer";
import type { CityRecord } from "./cityTypes";
import type { LocationPoint } from "./locationHistoryTypes";

const metroCity: CityRecord = {
  id: "metro",
  key: "city:metro",
  name: "Metro City",
  countryCode: "MC",
  countryName: "Metro Country",
  latitude: 40,
  longitude: -75,
  population: 1_200_000
};

const nearbyCity: CityRecord = {
  id: "nearby",
  key: "city:nearby",
  name: "Nearby City",
  countryCode: "NC",
  countryName: "Nearby Country",
  latitude: 40.1,
  longitude: -75.1,
  population: 800_000
};

const sanFrancisco: CityRecord = {
  id: "sf",
  key: "city:sf",
  name: "San Francisco",
  countryCode: "US",
  countryName: "United States of America",
  latitude: 37.76919562968743,
  longitude: -122.41716877355225,
  population: 3_450_000
};

const sanMateo: CityRecord = {
  id: "san-mateo",
  key: "city:san-mateo",
  name: "San Mateo",
  countryCode: "US",
  countryName: "United States of America",
  latitude: 37.55691815088289,
  longitude: -122.31306156603148,
  population: 626_406
};

const mexicoCity: CityRecord = {
  id: "mexico-city",
  key: "city:mexico-city",
  name: "Mexico City",
  countryCode: "MX",
  countryName: "Mexico",
  latitude: 19.433231053215555,
  longitude: -99.13323710986924,
  population: 20_996_000
};

const nezahualcoyotl: CityRecord = {
  id: "nezahualcoyotl",
  key: "city:nezahualcoyotl",
  name: "Nezahualcoyotl",
  countryCode: "MX",
  countryName: "Mexico",
  latitude: 19.410015,
  longitude: -99.030616,
  population: 1_232_000
};

const newYork: CityRecord = {
  id: "new-york",
  key: "city:new-york",
  name: "New York",
  countryCode: "US",
  countryName: "United States of America",
  latitude: 40.6943,
  longitude: -73.9249,
  population: 18_713_220
};

const newark: CityRecord = {
  id: "newark",
  key: "city:newark",
  name: "Newark",
  countryCode: "US",
  countryName: "United States of America",
  latitude: 40.7245,
  longitude: -74.1725,
  population: 305_344
};

describe("city data", () => {
  it("filters Natural Earth populated places to cities above the metro population threshold", () => {
    const data = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "large",
          properties: {
            NAME: "Large Metro",
            ISO_A2: "LM",
            ADM0NAME: "Large Country",
            POP_MAX: 500_000
          },
          geometry: {
            type: "Point",
            coordinates: [10, 20]
          }
        },
        {
          type: "Feature",
          id: "small",
          properties: {
            NAME: "Small Town",
            ISO_A2: "ST",
            ADM0NAME: "Small Country",
            POP_MAX: 499_999
          },
          geometry: {
            type: "Point",
            coordinates: [30, 40]
          }
        }
      ]
    };

    expect(parseNaturalEarthCities(data)).toEqual([
      {
        id: "large",
        key: "city:large",
        name: "Large Metro",
        countryCode: "LM",
        countryName: "Large Country",
        latitude: 20,
        longitude: 10,
        population: 500_000
      }
    ]);
  });
});

describe("city summarizer", () => {
  it("summarizes matching city days without retaining raw location points", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-01-01T08:00:00.000-05:00",
        latitude: 40.01,
        longitude: -75.01,
        source: "visit"
      },
      {
        timestamp: "2020-01-01T12:00:00.000-05:00",
        latitude: 40.02,
        longitude: -75.02,
        source: "timeline-path"
      },
      {
        timestamp: "2020-01-03T08:00:00.000-05:00",
        latitude: 40.01,
        longitude: -75.01,
        source: "visit"
      }
    ];

    expect(summarizeVisitedCities(points, [metroCity], { matchRadiusKm: 10 })).toEqual([
      {
        key: "city:metro",
        id: "metro",
        name: "Metro City",
        countryCode: "MC",
        countryName: "Metro Country",
        population: 1_200_000,
        dayCount: 2,
        pointCount: 2,
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

  it("chooses the nearest city when multiple cities are in range", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-02-01T08:00:00.000Z",
        latitude: 40.09,
        longitude: -75.09,
        source: "visit"
      }
    ];

    expect(summarizeVisitedCities(points, [metroCity, nearbyCity], { matchRadiusKm: 25 })).toEqual([
      {
        key: "city:nearby",
        id: "nearby",
        name: "Nearby City",
        countryCode: "NC",
        countryName: "Nearby Country",
        population: 800_000,
        dayCount: 1,
        pointCount: 1,
        firstDate: "2020-02-01",
        lastDate: "2020-02-01",
        dateSpans: [
          {
            startDate: "2020-02-01",
            endDate: "2020-02-01",
            dayCount: 1
          }
        ]
      }
    ]);
  });

  it("excludes points outside the bounded match radius", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-03-01T08:00:00.000Z",
        latitude: 41,
        longitude: -76,
        source: "visit"
      }
    ];

    expect(summarizeVisitedCities(points, [metroCity], { matchRadiusKm: 10 })).toEqual([]);
  });

  it("ignores timeline path points when summarizing visited cities", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-01-01T08:00:00.000Z",
        latitude: 40.01,
        longitude: -75.01,
        source: "timeline-path"
      },
      {
        timestamp: "2020-01-03T08:00:00.000Z",
        latitude: 40.01,
        longitude: -75.01,
        source: "visit"
      }
    ];

    expect(summarizeVisitedCities(points, [metroCity], { matchRadiusKm: 10 })).toEqual([
      {
        key: "city:metro",
        id: "metro",
        name: "Metro City",
        countryCode: "MC",
        countryName: "Metro Country",
        population: 1_200_000,
        dayCount: 1,
        pointCount: 1,
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

  it("maps SFO airport points to San Francisco instead of San Mateo", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2023-12-31T16:30:49.380-08:00",
        latitude: 37.619167,
        longitude: -122.381611,
        source: "visit"
      }
    ];

    const [summary] = summarizeVisitedCities(points, [sanFrancisco, sanMateo]);
    expect(summary.key).toBe("city:sf");
    expect(summary.name).toBe("San Francisco");
  });

  it("maps MEX airport points to Mexico City instead of Nezahualcoyotl", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2021-04-03T19:41:54.940-06:00",
        latitude: 19.436076,
        longitude: -99.071908,
        source: "visit"
      }
    ];

    const [summary] = summarizeVisitedCities(points, [mexicoCity, nezahualcoyotl]);
    expect(summary.key).toBe("city:mexico-city");
    expect(summary.name).toBe("Mexico City");
  });

  it("maps EWR airport points to New York instead of Newark", () => {
    const points: LocationPoint[] = [
      {
        timestamp: "2020-01-01T10:00:00.000-05:00",
        latitude: 40.6895,
        longitude: -74.1745,
        source: "visit"
      }
    ];

    const [summary] = summarizeVisitedCities(points, [newYork, newark]);
    expect(summary.key).toBe("city:new-york");
    expect(summary.name).toBe("New York");
  });
});
