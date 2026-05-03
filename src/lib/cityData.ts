import type { Feature, FeatureCollection, Point } from "geojson";
import type { CityRecord } from "./cityTypes";

export const cityPopulationThreshold = 500_000;

type NaturalEarthCityProperties = Record<string, string | number | null | undefined>;
type NaturalEarthCityFeature = Feature<Point, NaturalEarthCityProperties>;
type NaturalEarthCityCollection = FeatureCollection<Point, NaturalEarthCityProperties>;

export function naturalEarthPopulatedPlacesSourceUrl(): string {
  return "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/";
}

export function parseNaturalEarthCities(
  data: unknown,
  minPopulation = cityPopulationThreshold
): CityRecord[] {
  if (!isNaturalEarthCityCollection(data)) {
    throw new Error("Unsupported city data format");
  }

  return data.features
    .map((feature, index) => cityRecordFromFeature(feature, index))
    .filter((city): city is CityRecord => city !== null && city.population >= minPopulation)
    .sort((left, right) => {
      if (right.population !== left.population) {
        return right.population - left.population;
      }

      return left.name.localeCompare(right.name);
    });
}

function cityRecordFromFeature(feature: NaturalEarthCityFeature, index: number): CityRecord | null {
  const [longitude, latitude] = feature.geometry.coordinates;
  const name = stringProperty(feature.properties, ["NAME", "name", "NAMEASCII", "nameascii"]);
  const population = numberProperty(feature.properties, ["POP_MAX", "pop_max", "POPULATION", "population"]);

  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || population === null) {
    return null;
  }

  const rawId = stringProperty(feature.properties, ["NE_ID", "ne_id", "GEONAMEID", "geonameid"]) ?? feature.id;
  const id = rawId ? String(rawId) : `${name}:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${index}`;
  const key = `city:${id}`;

  return {
    id,
    key,
    name,
    countryCode: stringProperty(feature.properties, ["ISO_A2", "iso_a2", "ADM0_A3", "adm0_a3"]),
    countryName: stringProperty(feature.properties, ["ADM0NAME", "adm0name", "SOV0NAME", "sov0name"]),
    latitude,
    longitude,
    population
  };
}

function isNaturalEarthCityCollection(data: unknown): data is NaturalEarthCityCollection {
  return Boolean(
    data &&
      typeof data === "object" &&
      (data as { type?: unknown }).type === "FeatureCollection" &&
      Array.isArray((data as { features?: unknown }).features)
  );
}

function stringProperty(properties: NaturalEarthCityProperties, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = properties[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function numberProperty(properties: NaturalEarthCityProperties, keys: string[]): number | null {
  for (const key of keys) {
    const value = properties[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}
