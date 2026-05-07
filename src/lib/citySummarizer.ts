import { compressDateSpans, timestampToDate } from "./historySummarizer";
import type { CityRecord, CityVisitSummary } from "./cityTypes";
import type { LocationPoint } from "./locationHistoryTypes";

export const defaultCityMatchRadiusKm = 50;
const airportOverrideRadiusKm = 3;

type AirportCityOverride = {
  latitude: number;
  longitude: number;
  cityName: string;
  countryCode: string;
};

const airportCityOverrides: AirportCityOverride[] = [
  {
    latitude: 37.621313,
    longitude: -122.378955,
    cityName: "San Francisco",
    countryCode: "US"
  },
  {
    latitude: 19.4363,
    longitude: -99.0721,
    cityName: "Mexico City",
    countryCode: "MX"
  },
  {
    latitude: 40.6895,
    longitude: -74.1745,
    cityName: "New York",
    countryCode: "US"
  }
];

type CityAccumulator = {
  city: CityRecord;
  dates: Set<string>;
  pointCount: number;
};

type SummarizeVisitedCitiesOptions = {
  matchRadiusKm?: number;
};

export function summarizeVisitedCities(
  points: LocationPoint[],
  cities: CityRecord[],
  options: SummarizeVisitedCitiesOptions = {}
): CityVisitSummary[] {
  const matchRadiusKm = options.matchRadiusKm ?? defaultCityMatchRadiusKm;
  const accumulators = new Map<string, CityAccumulator>();

  for (const point of points) {
    if (!isPresencePoint(point)) {
      continue;
    }

    const city = findNearestCity(point, cities, matchRadiusKm);

    if (!city) {
      continue;
    }

    const accumulator = accumulators.get(city.key) ?? {
      city,
      dates: new Set<string>(),
      pointCount: 0
    };

    accumulator.dates.add(timestampToDate(point.timestamp, point.latitude, point.longitude));
    accumulator.pointCount += 1;
    accumulators.set(city.key, accumulator);
  }

  return Array.from(accumulators.values())
    .map(({ city, dates, pointCount }) => {
      const sortedDates = Array.from(dates).sort();

      return {
        key: city.key,
        id: city.id,
        name: city.name,
        countryCode: city.countryCode,
        countryName: city.countryName,
        population: city.population,
        dayCount: sortedDates.length,
        pointCount,
        firstDate: sortedDates[0],
        lastDate: sortedDates[sortedDates.length - 1],
        dateSpans: compressDateSpans(sortedDates)
      };
    })
    .sort((left, right) => {
      if (right.dayCount !== left.dayCount) {
        return right.dayCount - left.dayCount;
      }

      if (right.pointCount !== left.pointCount) {
        return right.pointCount - left.pointCount;
      }

      return left.name.localeCompare(right.name);
    });
}

function findNearestCity(
  point: LocationPoint,
  cities: CityRecord[],
  matchRadiusKm: number
): CityRecord | null {
  const overrideCity = findAirportOverrideCity(point, cities);
  if (overrideCity) {
    return overrideCity;
  }

  let nearestCity: CityRecord | null = null;
  let nearestDistanceKm = matchRadiusKm;

  for (const city of cities) {
    if (!isPointInCandidateBounds(point, city, matchRadiusKm)) {
      continue;
    }

    const distanceKm = distanceBetweenCoordinatesKm(
      point.latitude,
      point.longitude,
      city.latitude,
      city.longitude
    );

    if (distanceKm <= nearestDistanceKm) {
      nearestCity = city;
      nearestDistanceKm = distanceKm;
    }
  }

  return nearestCity;
}

function isPresencePoint(point: LocationPoint): boolean {
  return point.source !== "timeline-path";
}

function findAirportOverrideCity(point: LocationPoint, cities: CityRecord[]): CityRecord | null {
  for (const override of airportCityOverrides) {
    const distanceKm = distanceBetweenCoordinatesKm(
      point.latitude,
      point.longitude,
      override.latitude,
      override.longitude
    );

    if (distanceKm > airportOverrideRadiusKm) {
      continue;
    }

    return cities.find((city) => city.name === override.cityName && city.countryCode === override.countryCode) ?? null;
  }

  return null;
}

function isPointInCandidateBounds(point: LocationPoint, city: CityRecord, matchRadiusKm: number): boolean {
  const latitudeDelta = matchRadiusKm / 111;
  const longitudeDelta = matchRadiusKm / Math.max(1, 111 * Math.cos(degreesToRadians(city.latitude)));

  return (
    point.latitude >= city.latitude - latitudeDelta &&
    point.latitude <= city.latitude + latitudeDelta &&
    point.longitude >= city.longitude - longitudeDelta &&
    point.longitude <= city.longitude + longitudeDelta
  );
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
