import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "./supabase";
import type { PlaceStatuses } from "./placeState";
import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";
import {
  defaultUserProfile,
  normalizeDisplayName,
  parsePublicGalleryEntries,
  type PublicGalleryEntry,
  type UserProfile
} from "./publicGallery";

const mapStatusesTable = "map_statuses";
const historySummariesTable = "history_summaries";
const userProfilesTable = "user_profiles";

type SupabasePayload = {
  payload: unknown;
};

export async function loadRemotePlaceStatuses(session: Session): Promise<PlaceStatuses | null> {
  if (!supabaseClient) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from(mapStatusesTable)
    .select("payload")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data as SupabasePayload | null | undefined)?.payload;
  return isPlaceStatuses(payload) ? payload : null;
}

export async function saveRemotePlaceStatuses(session: Session, statuses: PlaceStatuses): Promise<void> {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from(mapStatusesTable).upsert({
    user_id: session.user.id,
    payload: statuses
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearRemotePlaceStatuses(session: Session): Promise<void> {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from(mapStatusesTable).delete().eq("user_id", session.user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadRemoteHistorySummary(
  session: Session
): Promise<LocationHistoryPlaceSummary | null> {
  if (!supabaseClient) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from(historySummariesTable)
    .select("payload")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data as SupabasePayload | null | undefined)?.payload;
  return isHistorySummary(payload) ? payload : null;
}

export async function saveRemoteHistorySummary(
  session: Session,
  summary: LocationHistoryPlaceSummary
): Promise<void> {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from(historySummariesTable).upsert({
    user_id: session.user.id,
    payload: summary
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearRemoteHistorySummary(session: Session): Promise<void> {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from(historySummariesTable).delete().eq("user_id", session.user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadRemoteUserProfile(session: Session): Promise<UserProfile> {
  if (!supabaseClient) {
    return defaultUserProfile;
  }

  const { data, error } = await supabaseClient
    .from(userProfilesTable)
    .select("display_name,is_public")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseUserProfile(data);
}

export async function saveRemoteUserProfile(session: Session, profile: UserProfile): Promise<void> {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from(userProfilesTable).upsert({
    user_id: session.user.id,
    display_name: normalizeDisplayName(profile.displayName),
    is_public: profile.isPublic
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadPublicGalleryEntries(): Promise<PublicGalleryEntry[]> {
  if (!supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient.rpc("list_public_gallery");

  if (error) {
    throw new Error(error.message);
  }

  return parsePublicGalleryEntries(data);
}

function isPlaceStatuses(value: unknown): value is PlaceStatuses {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.values(value).every((status) => typeof status === "string")
  );
}

function isHistorySummary(value: unknown): value is LocationHistoryPlaceSummary {
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
  return Array.isArray(value) && value.every(isDailyVisitSummary);
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
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.date) &&
    isStringArray(candidate.placeKeys) &&
    isStringArray(candidate.cityKeys) &&
    isDailySourceCounts(candidate.sourceCounts)
  );
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDailySourceCounts(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { maps?: unknown; photos?: unknown };
  return typeof candidate.maps === "number" && typeof candidate.photos === "number";
}

function parseUserProfile(value: unknown): UserProfile {
  if (!value || typeof value !== "object") {
    return defaultUserProfile;
  }

  const candidate = value as {
    display_name?: unknown;
    is_public?: unknown;
  };

  return {
    displayName:
      typeof candidate.display_name === "string"
        ? normalizeDisplayName(candidate.display_name)
        : defaultUserProfile.displayName,
    isPublic: candidate.is_public === true
  };
}

export type { PublicGalleryEntry, UserProfile };
