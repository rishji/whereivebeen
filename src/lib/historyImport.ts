import { mapSources } from "./mapSources";
import { toPlaceMapFeatures, type PlaceMapFeature } from "./mapData";
import { summarizeVisitedPlaces, timestampToDate } from "./historySummarizer";
import { parseGoogleLocationHistory } from "./locationHistoryParser";
import { parseNaturalEarthCities } from "./cityData";
import type { CityRecord } from "./cityTypes";
import { summarizeVisitedCities } from "./citySummarizer";
import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";
import type { LocationPoint } from "./locationHistoryTypes";
import type { PlaceScope } from "./placeState";

type HistoryAssets = {
  features: PlaceMapFeature[];
  cities: CityRecord[];
};

// Module-level cache so repeated imports don't re-fetch boundary GeoJSON
let assetsPromise: Promise<HistoryAssets> | null = null;

export async function loadHistoryAssets(): Promise<HistoryAssets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadHistoryPlaceFeatures(), loadMajorCities()]).then(
      ([features, cities]) => ({ features, cities })
    );
  }
  return assetsPromise;
}

export async function mergeAndSummarize({
  mapsPoints,
  photosPoints
}: {
  mapsPoints: LocationPoint[];
  photosPoints: LocationPoint[];
}): Promise<LocationHistoryPlaceSummary> {
  const assets = await loadHistoryAssets();

  // Per-day merge: use Maps points for a date if any exist, else Photos
  const mapsDates = new Set(mapsPoints.map((p) => timestampToDate(p.timestamp)));
  const merged = [
    ...mapsPoints,
    ...photosPoints.filter((p) => !mapsDates.has(timestampToDate(p.timestamp)))
  ];

  const places = summarizeVisitedPlaces(merged, assets.features);
  const cities = summarizeVisitedCities(merged, assets.cities);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourcePointCount: merged.length,
    sourcePointCounts: { maps: mapsPoints.length, photos: photosPoints.length },
    places,
    cities
  };
}

export async function importTakeoutLocationHistory(file: File): Promise<LocationHistoryPlaceSummary> {
  const mapsPoints = parseGoogleLocationHistory(JSON.parse(await file.text()));
  return mergeAndSummarize({ mapsPoints, photosPoints: [] });
}

export async function loadHistoryPlaceFeatures(): Promise<PlaceMapFeature[]> {
  const layers: Array<[string, PlaceScope]> = [
    [mapSources.world, "country"],
    [mapSources.usStates, "us-state"],
    [mapSources.indiaStates, "india-state"]
  ];

  const features = await Promise.all(
    layers.map(async ([source, scope]) => {
      const response = await fetch(source);

      if (!response.ok) {
        throw new Error(`Could not load ${scope} boundaries`);
      }

      return toPlaceMapFeatures(await response.json(), scope);
    })
  );

  return features.flat();
}

export async function loadMajorCities(): Promise<CityRecord[]> {
  const response = await fetch(mapSources.populatedPlaces);

  if (!response.ok) {
    throw new Error("Could not load major city data");
  }

  return parseNaturalEarthCities(await response.json());
}
