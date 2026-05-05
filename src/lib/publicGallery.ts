import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";
import type { PlaceStatuses } from "./placeState";
import { isHistorySummary } from "./historyStorage";

export type UserProfile = {
  displayName: string;
  isPublic: boolean;
};

export type PublicGalleryEntry = {
  userId: string;
  displayName: string;
  mapStatuses: PlaceStatuses;
  historySummary: LocationHistoryPlaceSummary | null;
  updatedAt: string;
};

export const defaultUserProfile: UserProfile = {
  displayName: "Anonymous traveler",
  isPublic: false
};

export function normalizeDisplayName(displayName: string): string {
  return displayName.trim() || defaultUserProfile.displayName;
}

export function parsePublicGalleryEntries(value: unknown): PublicGalleryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((row) => {
    const entry = parsePublicGalleryEntry(row);
    return entry ? [entry] : [];
  });
}

function parsePublicGalleryEntry(value: unknown): PublicGalleryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as {
    user_id?: unknown;
    display_name?: unknown;
    map_payload?: unknown;
    history_payload?: unknown;
    updated_at?: unknown;
  };

  if (
    typeof row.user_id !== "string" ||
    typeof row.display_name !== "string" ||
    typeof row.updated_at !== "string" ||
    !isPlaceStatuses(row.map_payload)
  ) {
    return null;
  }

  if (row.history_payload !== null && !isHistorySummary(row.history_payload)) {
    return null;
  }

  return {
    userId: row.user_id,
    displayName: normalizeDisplayName(row.display_name),
    mapStatuses: row.map_payload,
    historySummary: row.history_payload,
    updatedAt: row.updated_at
  };
}

function isPlaceStatuses(value: unknown): value is PlaceStatuses {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.values(value).every(
        (status) => status === "visited" || status === "lived" || status === "wantToVisit"
      )
  );
}
