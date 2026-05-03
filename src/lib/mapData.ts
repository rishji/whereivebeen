import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { PlaceScope } from "./placeState";

export type PlaceFeature = Feature<Geometry, Record<string, string | number | undefined>> & {
  id?: string | number;
};

export type PlaceMapFeature = {
  feature: PlaceFeature;
  id: string | number;
  key: string;
  name: string;
  scope: PlaceScope;
};

type FeatureCollectionInput = FeatureCollection<Geometry, Record<string, string | number | undefined>>;

export function toPlaceMapFeatures(data: unknown, scope: PlaceScope): PlaceMapFeature[] {
  return extractFeatureCollection(data).features.map((placeFeature, index) => {
    const id = getPlaceId(scope, placeFeature, index);
    const name = getPlaceName(placeFeature);

    return {
      feature: placeFeature,
      id,
      key: `${scope}:${String(id)}`,
      name,
      scope
    };
  });
}

export function getPlaceId(scope: PlaceScope, featureInput: PlaceFeature, index = 0): string | number {
  if (featureInput.id) {
    return featureInput.id;
  }

  if (scope === "us-state") {
    return featureInput.properties.postal ?? featureInput.properties.name ?? index;
  }

  return (
    featureInput.properties.ST_NM ??
    featureInput.properties.name ??
    featureInput.properties.NAME ??
    featureInput.properties.NAME_1 ??
    index
  );
}

export function getPlaceName(featureInput: PlaceFeature): string {
  return String(
    featureInput.properties.name ??
      featureInput.properties.NAME ??
      featureInput.properties.ST_NM ??
      featureInput.properties.NAME_1 ??
      featureInput.id ??
      "Place"
  );
}

function extractFeatureCollection(data: unknown): FeatureCollectionInput {
  if (isFeatureCollection(data)) {
    return data;
  }

  if (isTopology(data)) {
    const objectKey = Object.keys(data.objects)[0];
    const converted = feature(data, data.objects[objectKey]) as FeatureCollectionInput;
    return converted;
  }

  throw new Error("Unsupported map data format");
}

function isFeatureCollection(data: unknown): data is FeatureCollectionInput {
  return Boolean(
    data &&
      typeof data === "object" &&
      (data as { type?: unknown }).type === "FeatureCollection" &&
      Array.isArray((data as { features?: unknown }).features)
  );
}

function isTopology(data: unknown): data is Topology<{ [name: string]: GeometryCollection }> {
  return Boolean(
    data &&
      typeof data === "object" &&
      (data as { type?: unknown }).type === "Topology" &&
      (data as { objects?: unknown }).objects &&
      typeof (data as { objects?: unknown }).objects === "object"
  );
}
