import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";

export const historySummaryStorageKey = "where-ive-been.location-history-summary.v1";

export function loadHistorySummary(storage: Storage = window.localStorage): LocationHistoryPlaceSummary | null {
  const storedValue = storage.getItem(historySummaryStorageKey);

  if (!storedValue) {
    return null;
  }

  try {
    return parseHistorySummary(storedValue);
  } catch {
    return null;
  }
}

export function saveHistorySummary(
  summary: LocationHistoryPlaceSummary,
  storage: Storage = window.localStorage
): void {
  storage.setItem(historySummaryStorageKey, JSON.stringify(summary));
}

export function clearHistorySummary(storage: Storage = window.localStorage): void {
  storage.removeItem(historySummaryStorageKey);
}

export function parseHistorySummary(serializedSummary: string): LocationHistoryPlaceSummary {
  const parsed = JSON.parse(serializedSummary) as unknown;

  if (!isHistorySummary(parsed)) {
    throw new Error("Invalid history summary JSON");
  }

  return parsed;
}

function isHistorySummary(value: unknown): value is LocationHistoryPlaceSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LocationHistoryPlaceSummary>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.places);
}
