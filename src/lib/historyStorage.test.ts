import { describe, expect, it } from "vitest";
import {
  clearHistorySummary,
  historySummaryStorageKey,
  loadHistorySummary,
  parseHistorySummary,
  saveHistorySummary
} from "./historyStorage";
import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";

const summary: LocationHistoryPlaceSummary = {
  schemaVersion: 1,
  generatedAt: "2026-05-03T00:00:00.000Z",
  sourcePointCount: 2,
  places: []
};

const summaryWithDailyVisits: LocationHistoryPlaceSummary = {
  ...summary,
  dailyVisits: [
    {
      date: "2026-05-03",
      placeKeys: ["country:356"],
      cityKeys: ["city:delhi"],
      sourceCounts: { maps: 2, photos: 1 }
    }
  ]
};

describe("history storage", () => {
  it("parses valid history summaries", () => {
    expect(parseHistorySummary(JSON.stringify(summary))).toEqual(summary);
  });

  it("parses valid history summaries with daily visits", () => {
    expect(parseHistorySummary(JSON.stringify(summaryWithDailyVisits))).toEqual(summaryWithDailyVisits);
  });

  it("rejects invalid history summaries", () => {
    expect(() => parseHistorySummary(JSON.stringify({ schemaVersion: 2, places: [] }))).toThrow(
      "Invalid history summary JSON"
    );
  });

  it.each([
    [
      "date in mm-dd-yyyy format",
      { date: "05-03-2026", placeKeys: [], cityKeys: [], sourceCounts: { maps: 1, photos: 0 } }
    ],
    [
      "placeKeys not an array",
      { date: "2026-05-03", placeKeys: "country:356", cityKeys: [], sourceCounts: { maps: 1, photos: 0 } }
    ],
    ["missing sourceCounts", { date: "2026-05-03", placeKeys: [], cityKeys: [] }],
    [
      "invalid sourceCounts",
      { date: "2026-05-03", placeKeys: [], cityKeys: [], sourceCounts: { maps: "1", photos: 0 } }
    ]
  ])("rejects history summaries with malformed daily visits: %s", (_name, dailyVisit) => {
    expect(() =>
      parseHistorySummary(
        JSON.stringify({
          ...summary,
          dailyVisits: [dailyVisit]
        })
      )
    ).toThrow("Invalid history summary JSON");
  });

  it("saves, loads, and clears summaries", () => {
    const storage = createStorage();

    saveHistorySummary(summary, storage);
    expect(storage.getItem(historySummaryStorageKey)).toBeTruthy();
    expect(loadHistorySummary(storage)).toEqual(summary);

    clearHistorySummary(storage);
    expect(loadHistorySummary(storage)).toBeNull();
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}
