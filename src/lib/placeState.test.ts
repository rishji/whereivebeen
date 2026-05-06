import { describe, expect, it } from "vitest";
import {
  cyclePlaceStatus,
  exportPlaceStatuses,
  importPlaceStatuses,
  loadPlaceStatuses,
  normalizePlaceKey,
  placeStatusColors,
  placeStatusLabels,
  savePlaceStatuses,
  type PlaceStatuses
} from "./placeState";

describe("place state model", () => {
  it("cycles blank through visited, lived, want-to-visit, then blank", () => {
    expect(cyclePlaceStatus(undefined)).toBe("visited");
    expect(cyclePlaceStatus("visited")).toBe("lived");
    expect(cyclePlaceStatus("lived")).toBe("wantToVisit");
    expect(cyclePlaceStatus("wantToVisit")).toBeUndefined();
  });

  it("normalizes keys by geography scope and stable id", () => {
    expect(normalizePlaceKey("country", "356")).toBe("country:356");
    expect(normalizePlaceKey("us-state", "CA")).toBe("us-state:CA");
    expect(normalizePlaceKey("india-state", "MH")).toBe("india-state:MH");
  });

  it("exports statuses with a schema version", () => {
    const statuses: PlaceStatuses = {
      "country:356": "visited",
      "us-state:CA": "lived"
    };

    expect(JSON.parse(exportPlaceStatuses(statuses))).toEqual({
      schemaVersion: 1,
      statuses
    });
  });

  it("imports valid status JSON", () => {
    const input = JSON.stringify({
      schemaVersion: 1,
      statuses: {
        "country:356": "visited",
        "india-state:MH": "wantToVisit"
      }
    });

    expect(importPlaceStatuses(input)).toEqual({
      "country:356": "visited",
      "india-state:MH": "wantToVisit"
    });
  });

  it("rejects invalid status JSON", () => {
    expect(() =>
      importPlaceStatuses(JSON.stringify({ schemaVersion: 1, statuses: { x: "maybe" } }))
    ).toThrow("Invalid place status");
  });

  it("keeps human labels centralized", () => {
    expect(placeStatusLabels).toEqual({
      visited: "Visited",
      lived: "Lived there",
      wantToVisit: "Want to visit"
    });
  });

  it("keeps status colors centralized", () => {
    expect(placeStatusColors).toEqual({
      visited: "#1f4d3a",
      lived: "#c8431b",
      wantToVisit: "#d68a14"
    });
  });

  it("round-trips place statuses through storage", () => {
    const storage = createStorage();
    const statuses: PlaceStatuses = {
      "country:356": "visited",
      "us-state:CA": "lived"
    };

    savePlaceStatuses(statuses, storage);
    expect(loadPlaceStatuses(storage)).toEqual(statuses);
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
