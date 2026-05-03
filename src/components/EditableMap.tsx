import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { mapSources } from "../lib/mapSources";
import { toPlaceMapFeatures, type PlaceMapFeature } from "../lib/mapData";
import {
  normalizePlaceKey,
  placeStatusColors,
  type PlaceScope,
  type PlaceStatuses
} from "../lib/placeState";

type EditableMapProps = {
  statuses: PlaceStatuses;
  onTogglePlace: (placeKey: string) => void;
};

const defaultFill = "#eadfc8";
const hoverFill = "#dbeafe";
const strokeColor = "#64748b";
const mapWidth = 1200;
const mapHeight = 650;

export function EditableMap({ statuses, onTogglePlace }: EditableMapProps) {
  const [features, setFeatures] = useState<PlaceMapFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([mapWidth, mapHeight], { type: "Sphere" }),
    []
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const layers = await Promise.all([
          fetchMapLayer(mapSources.world, "country"),
          fetchMapLayer(mapSources.usStates, "us-state"),
          fetchMapLayer(mapSources.indiaStates, "india-state")
        ]);

        if (isMounted) {
          setFeatures(layers.flat());
        }
      } catch {
        if (isMounted) {
          setError("Could not load map data. Check your connection and reload.");
        }
      }
    }

    void loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return <div className="map-shell map-fallback">{error}</div>;
  }

  return (
    <div className="map-shell">
      <svg
        className="map"
        role="img"
        aria-label="Editable travel map"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      >
        <rect className="ocean" width={mapWidth} height={mapHeight} rx="20" />
        {features.map((mapFeature) => {
          const placeKey = normalizePlaceKey(mapFeature.scope, mapFeature.id);
          const status = statuses[placeKey];
          const pathData = pathGenerator(mapFeature.feature);

          if (!pathData) {
            return null;
          }

          return (
            <path
              key={mapFeature.key}
              d={pathData}
              className="map-region"
              role="button"
              tabIndex={0}
              aria-label={`${mapFeature.name}: ${status ?? "blank"}`}
              fill={status ? placeStatusColors[status] : defaultFill}
              stroke={strokeColor}
              strokeWidth={mapFeature.scope === "country" ? 0.35 : 0.2}
              onClick={() => onTogglePlace(placeKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTogglePlace(placeKey);
                }
              }}
            >
              <title>{mapFeature.name}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}

async function fetchMapLayer(source: string, scope: PlaceScope): Promise<PlaceMapFeature[]> {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`Could not load ${scope} map data`);
  }

  return toPlaceMapFeatures(await response.json(), scope);
}
