import type { GeoPointValue, LocationHistoryEntry, LocationPoint } from "./locationHistoryTypes";

// iPhone format: "geo:lat,lng"
const geoUriPattern = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
// Android format: "lat°, lng°"
const degreePattern = /^(-?\d+(?:\.\d+)?)°,\s*(-?\d+(?:\.\d+)?)°$/;

export function parseGoogleLocationHistory(input: unknown): LocationPoint[] {
  let entries: unknown[];
  if (Array.isArray(input)) {
    entries = input;
  } else if (
    input !== null &&
    typeof input === "object" &&
    "semanticSegments" in input &&
    Array.isArray((input as Record<string, unknown>).semanticSegments)
  ) {
    // Android export: top-level object with semanticSegments array
    entries = (input as Record<string, unknown>).semanticSegments as unknown[];
  } else {
    throw new Error("Expected Google Location History export to be a top-level array");
  }

  return entries.flatMap((entry) => parseLocationHistoryEntry(entry as LocationHistoryEntry));
}

export function parseLocationHistoryEntry(entry: LocationHistoryEntry): LocationPoint[] {
  const points: LocationPoint[] = [];

  if (entry.visit?.topCandidate?.placeLocation && entry.startTime) {
    const point = parseGeoPoint(entry.visit.topCandidate.placeLocation);
    if (point) {
      points.push({
        timestamp: entry.startTime,
        latitude: point.latitude,
        longitude: point.longitude,
        source: "visit",
        placeId: entry.visit.topCandidate.placeID ?? entry.visit.topCandidate.placeId
      });
    }
  }

  if (entry.activity?.start && entry.startTime) {
    const point = parseGeoPoint(entry.activity.start);
    if (point) {
      points.push({
        timestamp: entry.startTime,
        latitude: point.latitude,
        longitude: point.longitude,
        source: "activity-start"
      });
    }
  }

  if (entry.activity?.end && entry.endTime) {
    const point = parseGeoPoint(entry.activity.end);
    if (point) {
      points.push({
        timestamp: entry.endTime,
        latitude: point.latitude,
        longitude: point.longitude,
        source: "activity-end"
      });
    }
  }

  if (entry.timelinePath && entry.startTime) {
    for (const pathPoint of entry.timelinePath) {
      if (!pathPoint.point) {
        continue;
      }

      const point = parseGeoPoint(pathPoint.point);
      if (!point) {
        continue;
      }

      let timestamp: string;
      if (pathPoint.time) {
        // Android: absolute timestamp per path point
        timestamp = pathPoint.time;
      } else {
        // iPhone: offset in minutes from segment start
        timestamp = addMinutes(entry.startTime, Number(pathPoint.durationMinutesOffsetFromStartTime ?? 0));
      }

      points.push({
        timestamp,
        latitude: point.latitude,
        longitude: point.longitude,
        source: "timeline-path"
      });
    }
  }

  return points.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function parseGeoPoint(value: GeoPointValue): { latitude: number; longitude: number } | null {
  const raw = typeof value === "string" ? value : value.latLng;
  const match = geoUriPattern.exec(raw) ?? degreePattern.exec(raw);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

export function summarizeLocationPoints(points: LocationPoint[]) {
  const timestamps = points.map((point) => point.timestamp).sort();

  return {
    pointCount: points.length,
    firstTimestamp: timestamps[0] ?? null,
    lastTimestamp: timestamps[timestamps.length - 1] ?? null
  };
}

function addMinutes(timestamp: string, minutes: number): string {
  const date = new Date(timestamp);

  if (!Number.isFinite(date.getTime())) {
    return timestamp;
  }

  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}
