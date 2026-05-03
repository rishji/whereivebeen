export type PlaceScope = "country" | "us-state" | "india-state";

export type PlaceStatus = "visited" | "lived" | "wantToVisit";

export type PlaceStatuses = Record<string, PlaceStatus>;

export const placeStatusLabels: Record<PlaceStatus, string> = {
  visited: "Visited",
  lived: "Lived there",
  wantToVisit: "Want to visit"
};

export const placeStatusColors: Record<PlaceStatus, string> = {
  visited: "#2563eb",
  lived: "#dc2626",
  wantToVisit: "#16a34a"
};

export const storageKey = "where-ive-been.place-statuses.v1";

const placeStatusCycle: PlaceStatus[] = ["visited", "lived", "wantToVisit"];

export function cyclePlaceStatus(currentStatus: PlaceStatus | undefined): PlaceStatus | undefined {
  if (!currentStatus) {
    return placeStatusCycle[0];
  }

  const currentIndex = placeStatusCycle.indexOf(currentStatus);
  return placeStatusCycle[currentIndex + 1];
}

export function normalizePlaceKey(scope: PlaceScope, id: string | number): string {
  return `${scope}:${String(id)}`;
}

export function exportPlaceStatuses(statuses: PlaceStatuses): string {
  return JSON.stringify({ schemaVersion: 1, statuses }, null, 2);
}

export function importPlaceStatuses(serializedStatuses: string): PlaceStatuses {
  const parsed = JSON.parse(serializedStatuses) as unknown;

  if (!isImportPayload(parsed)) {
    throw new Error("Invalid place status export");
  }

  return parsed.statuses;
}

export function loadPlaceStatuses(storage: Storage = window.localStorage): PlaceStatuses {
  const storedValue = storage.getItem(storageKey);

  if (!storedValue) {
    return {};
  }

  try {
    return importPlaceStatuses(storedValue);
  } catch {
    return {};
  }
}

export function savePlaceStatuses(statuses: PlaceStatuses, storage: Storage = window.localStorage): void {
  storage.setItem(storageKey, exportPlaceStatuses(statuses));
}

function isImportPayload(value: unknown): value is { schemaVersion: 1; statuses: PlaceStatuses } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { schemaVersion?: unknown; statuses?: unknown };

  if (candidate.schemaVersion !== 1 || !candidate.statuses || typeof candidate.statuses !== "object") {
    return false;
  }

  for (const status of Object.values(candidate.statuses)) {
    if (status !== "visited" && status !== "lived" && status !== "wantToVisit") {
      throw new Error("Invalid place status");
    }
  }

  return true;
}
