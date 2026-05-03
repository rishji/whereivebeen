import { mapSources } from "./mapSources";
import { toPlaceMapFeatures, type PlaceMapFeature } from "./mapData";
import { summarizeVisitedPlaces } from "./historySummarizer";
import { parseGoogleLocationHistory } from "./locationHistoryParser";
import { parseNaturalEarthCities } from "./cityData";
import { summarizeVisitedCities } from "./citySummarizer";
import type { LocationHistoryPlaceSummary } from "./historySummaryTypes";
import type { PlaceScope } from "./placeState";

export async function importTakeoutLocationHistory(file: File): Promise<LocationHistoryPlaceSummary> {
  const points = parseGoogleLocationHistory(JSON.parse(await file.text()));
  const [features, cities] = await Promise.all([loadHistoryPlaceFeatures(), loadMajorCities()]);
  const places = summarizeVisitedPlaces(points, features);
  const citySummaries = summarizeVisitedCities(points, cities);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourcePointCount: points.length,
    places,
    cities: citySummaries
  };
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

export async function loadMajorCities() {
  const response = await fetch(mapSources.populatedPlaces);

  if (!response.ok) {
    throw new Error("Could not load major city data");
  }

  return parseNaturalEarthCities(await response.json());
}
