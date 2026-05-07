import { geoContains } from "d3-geo";
import type { Geometry } from "geojson";
import tzlookup from "tz-lookup";
import type { PlaceMapFeature } from "./mapData";
import type { LocationPoint } from "./locationHistoryTypes";
import type { DateSpan, VisitedPlaceSummary } from "./historySummaryTypes";

type PlaceAccumulator = {
  feature: PlaceMapFeature;
  dates: Set<string>;
};

type FeatureWithBounds = {
  feature: PlaceMapFeature;
  bounds: Bounds;
};

type Bounds = {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
};

export function summarizeVisitedPlaces(
  points: LocationPoint[],
  features: PlaceMapFeature[]
): VisitedPlaceSummary[] {
  const accumulators = new Map<string, PlaceAccumulator>();
  const boundedFeatures = features.map((feature) => ({
    feature,
    bounds: getFeatureBounds(feature)
  }));

  for (const point of points) {
    if (!isPresencePoint(point)) {
      continue;
    }

    const date = timestampToDate(point.timestamp, point.latitude, point.longitude);

    for (const { feature, bounds } of boundedFeatures) {
      if (!isPointInBounds(point, bounds)) {
        continue;
      }

      if (!geoContains(feature.feature, [point.longitude, point.latitude])) {
        continue;
      }

      const accumulator = accumulators.get(feature.key) ?? {
        feature,
        dates: new Set<string>()
      };

      accumulator.dates.add(date);
      accumulators.set(feature.key, accumulator);
    }
  }

  return Array.from(accumulators.values())
    .map(({ feature, dates }) => {
      const sortedDates = Array.from(dates).sort();
      const dateSpans = compressDateSpans(sortedDates);

      return {
        key: feature.key,
        scope: feature.scope,
        id: feature.id,
        name: feature.name,
        dayCount: sortedDates.length,
        firstDate: sortedDates[0],
        lastDate: sortedDates[sortedDates.length - 1],
        dateSpans
      };
    })
    .sort((left, right) => {
      if (right.dayCount !== left.dayCount) {
        return right.dayCount - left.dayCount;
      }

      return left.name.localeCompare(right.name);
    });
}

function isPresencePoint(point: LocationPoint): boolean {
  return point.source !== "timeline-path";
}

export function compressDateSpans(sortedDates: string[]): DateSpan[] {
  const spans: DateSpan[] = [];

  for (const date of sortedDates) {
    const previousSpan = spans[spans.length - 1];

    if (previousSpan && nextDate(previousSpan.endDate) === date) {
      previousSpan.endDate = date;
      previousSpan.dayCount += 1;
      continue;
    }

    spans.push({
      startDate: date,
      endDate: date,
      dayCount: 1
    });
  }

  return spans;
}

export function timestampToDate(timestamp: string, latitude?: number, longitude?: number): string {
  // Plain date — already done
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return timestamp;
  }

  // ISO with explicit UTC offset — local date is in the first 10 chars
  if (/^\d{4}-\d{2}-\d{2}T.+[+-]\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp.slice(0, 10);
  }

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  // For UTC timestamps, derive local date from the event's GPS location when available;
  // otherwise fall back to the browser's local timezone.
  const timeZone =
    latitude != null && longitude != null ? tzlookup(latitude, longitude) : undefined;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function getFeatureBounds(feature: PlaceMapFeature): Bounds {
  const coordinates = collectGeometryCoordinatePairs(feature.feature.geometry);
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);

  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes)
  };
}

function collectGeometryCoordinatePairs(geometry: Geometry): Array<[number, number]> {
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((childGeometry) => collectGeometryCoordinatePairs(childGeometry));
  }

  return collectCoordinatePairs(geometry.coordinates);
}

function collectCoordinatePairs(value: unknown): Array<[number, number]> {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [[value[0], value[1]]];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => collectCoordinatePairs(item));
}

function isPointInBounds(point: LocationPoint, bounds: Bounds): boolean {
  return (
    point.longitude >= bounds.minLongitude &&
    point.longitude <= bounds.maxLongitude &&
    point.latitude >= bounds.minLatitude &&
    point.latitude <= bounds.maxLatitude
  );
}
