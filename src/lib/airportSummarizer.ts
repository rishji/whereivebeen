import { compressDateSpans, timestampToDate } from "./historySummarizer";
import type { AirportRecord, AirportVisitSummary } from "./airportTypes";
import type { LocationPoint } from "./locationHistoryTypes";

export const defaultAirportMatchRadiusKm = 1.5;

type AirportAccumulator = {
  airport: AirportRecord;
  dates: Set<string>;
  pointCount: number;
  visitPointCount: number;
};

export function summarizeVisitedAirports(
  points: LocationPoint[],
  airports: AirportRecord[],
  matchRadiusKm = defaultAirportMatchRadiusKm
): AirportVisitSummary[] {
  const accumulators = new Map<string, AirportAccumulator>();

  for (const point of points) {
    if (!isAirportPresencePoint(point)) {
      continue;
    }

    const airport = findNearestAirport(point, airports, matchRadiusKm);
    if (!airport) {
      continue;
    }

    const accumulator = accumulators.get(airport.iata) ?? {
      airport,
      dates: new Set<string>(),
      pointCount: 0,
      visitPointCount: 0
    };

    accumulator.pointCount += 1;

    if (point.source === "visit") {
      accumulator.visitPointCount += 1;
      accumulator.dates.add(timestampToDate(point.timestamp, point.latitude, point.longitude));
    }

    accumulators.set(airport.iata, accumulator);
  }

  return Array.from(accumulators.values())
    .filter(({ dates }) => dates.size > 0)
    .map(({ airport, dates, pointCount, visitPointCount }) => {
      const sortedDates = Array.from(dates).sort();

      return {
        key: `airport:${airport.iata}`,
        iata: airport.iata,
        name: airport.name,
        municipality: airport.municipality,
        countryCode: airport.countryCode,
        dayCount: sortedDates.length,
        pointCount,
        visitPointCount,
        firstDate: sortedDates[0],
        lastDate: sortedDates[sortedDates.length - 1],
        dateSpans: compressDateSpans(sortedDates)
      };
    })
    .sort((left, right) => {
      if (right.dayCount !== left.dayCount) {
        return right.dayCount - left.dayCount;
      }

      if (right.visitPointCount !== left.visitPointCount) {
        return right.visitPointCount - left.visitPointCount;
      }

      return left.name.localeCompare(right.name);
    });
}

function isAirportPresencePoint(point: LocationPoint): boolean {
  return point.source === "visit" || point.source === "activity-start" || point.source === "activity-end";
}

function findNearestAirport(
  point: LocationPoint,
  airports: AirportRecord[],
  matchRadiusKm: number
): AirportRecord | null {
  let nearestAirport: AirportRecord | null = null;
  let nearestDistanceKm = matchRadiusKm;

  for (const airport of airports) {
    const distanceKm = distanceBetweenCoordinatesKm(
      point.latitude,
      point.longitude,
      airport.latitude,
      airport.longitude
    );

    if (distanceKm <= nearestDistanceKm) {
      nearestAirport = airport;
      nearestDistanceKm = distanceKm;
    }
  }

  return nearestAirport;
}

function distanceBetweenCoordinatesKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const earthRadiusKm = 6371;
  const deltaLatitude = degreesToRadians(latitudeB - latitudeA);
  const deltaLongitude = degreesToRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(degreesToRadians(latitudeA)) *
      Math.cos(degreesToRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
