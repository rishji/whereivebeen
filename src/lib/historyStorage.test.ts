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

describe("history storage", () => {
  it("parses valid history summaries", () => {
    expect(parseHistorySummary(JSON.stringify(summary))).toEqual(summary);
  });

  it("rejects invalid history summaries", () => {
    expect(() => parseHistorySummary(JSON.stringify({ schemaVersion: 2, places: [] }))).toThrow(
      "Invalid history summary JSON"
    );
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
