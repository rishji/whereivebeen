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

export function isHistorySummary(value: unknown): value is LocationHistoryPlaceSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LocationHistoryPlaceSummary>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.places) &&
    (candidate.dailyVisits === undefined || isDailyVisitSummaries(candidate.dailyVisits))
  );
}

function isDailyVisitSummaries(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every(isDailyVisitSummary)) {
    return false;
  }

  return hasUniqueValues(value.map((dailyVisit) => dailyVisit.date));
}

function isDailyVisitSummary(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    date?: unknown;
    placeKeys?: unknown;
    cityKeys?: unknown;
    sourceCounts?: unknown;
  };

  return (
    typeof candidate.date === "string" &&
    isCalendarDate(candidate.date) &&
    isStringArray(candidate.placeKeys) &&
    hasUniqueValues(candidate.placeKeys) &&
    isStringArray(candidate.cityKeys) &&
    hasUniqueValues(candidate.cityKeys) &&
    isDailySourceCounts(candidate.sourceCounts)
  );
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasUniqueValues(values: unknown[]): boolean {
  return new Set(values).size === values.length;
}

function isDailySourceCounts(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { maps?: unknown; photos?: unknown };
  return isNonNegativeInteger(candidate.maps) && isNonNegativeInteger(candidate.photos);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}
