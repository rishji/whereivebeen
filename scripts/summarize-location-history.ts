import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mapSources } from "../src/lib/mapSources";
import { toPlaceMapFeatures, type PlaceMapFeature } from "../src/lib/mapData";
import { summarizeVisitedPlaces } from "../src/lib/historySummarizer";
import { parseNaturalEarthCities } from "../src/lib/cityData";
import { summarizeVisitedCities } from "../src/lib/citySummarizer";
import { airportRecords } from "../src/lib/airportData";
import { summarizeVisitedAirports } from "../src/lib/airportSummarizer";
import type { LocationHistoryPlaceSummary } from "../src/lib/historySummaryTypes";
import type { PrivateLocationHistoryExport } from "../src/lib/locationHistoryTypes";
import type { PlaceScope } from "../src/lib/placeState";

const inputPath = resolve(process.argv[2] ?? "data/private/location-history-points.json");
const outputPath = resolve(process.argv[3] ?? "data/private/location-history-summary.json");

async function main() {
  const privateExport = JSON.parse(await readFile(inputPath, "utf8")) as PrivateLocationHistoryExport;
  const [features, cities] = await Promise.all([loadPlaceFeatures(), loadMajorCities()]);
  const places = summarizeVisitedPlaces(privateExport.points, features);
  const citySummaries = summarizeVisitedCities(privateExport.points, cities);
  const airportSummaries = summarizeVisitedAirports(privateExport.points, airportRecords);
  const summary: LocationHistoryPlaceSummary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourcePointCount: privateExport.points.length,
    places,
    cities: citySummaries,
    airports: airportSummaries
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        outputPath,
        sourcePointCount: summary.sourcePointCount,
        placeCount: summary.places.length,
        countries: summary.places.filter((place) => place.scope === "country").length,
        usStates: summary.places.filter((place) => place.scope === "us-state").length,
        indiaStates: summary.places.filter((place) => place.scope === "india-state").length,
        cities: summary.cities?.length ?? 0,
        airports: summary.airports?.length ?? 0
      },
      null,
      2
    )
  );
}

async function loadPlaceFeatures(): Promise<PlaceMapFeature[]> {
  const layers: Array<[string, PlaceScope]> = [
    [mapSources.world, "country"],
    [mapSources.usStates, "us-state"],
    [mapSources.indiaStates, "india-state"]
  ];

  const results = await Promise.all(
    layers.map(async ([source, scope]) => {
      const response = await fetch(source);

      if (!response.ok) {
        throw new Error(`Could not load ${scope} map data`);
      }

      return toPlaceMapFeatures(await response.json(), scope);
    })
  );

  return results.flat();
}

async function loadMajorCities() {
  const response = await fetch(mapSources.populatedPlaces);

  if (!response.ok) {
    throw new Error("Could not load major city data");
  }

  return parseNaturalEarthCities(await response.json());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
