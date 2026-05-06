import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
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
  readOnly?: boolean;
};

type Tooltip = { name: string; status: string | undefined; x: number; y: number } | null;

const landBlank = "#ead9b0";
const oceanFill = "#cfe0d4";
const strokeColor = "#a89668";
const mapWidth = 1100;
const mapHeight = 580;

export function EditableMap({ statuses, onTogglePlace, readOnly = false }: EditableMapProps) {
  const [features, setFeatures] = useState<PlaceMapFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [pulsingKey, setPulsingKey] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([mapWidth, mapHeight], { type: "Sphere" }),
    []
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const sphereD = useMemo(() => pathGen({ type: "Sphere" }) ?? "", [pathGen]);
  const graticuleD = useMemo(() => pathGen(geoGraticule10()) ?? "", [pathGen]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const layers = await Promise.all([
          fetchLayer(mapSources.world, "country"),
          fetchLayer(mapSources.usStates, "us-state"),
          fetchLayer(mapSources.indiaStates, "india-state"),
        ]);
        if (isMounted) setFeatures(layers.flat());
      } catch {
        if (isMounted) setError("Could not load map data. Check your connection and reload.");
      }
    }
    void load();
    return () => { isMounted = false; };
  }, []);

  function handleClick(key: string) {
    if (readOnly) return;
    onTogglePlace(key);
    setPulsingKey(key);
    setTimeout(() => setPulsingKey(null), 400);
  }

  function handleMouseMove(e: React.MouseEvent, name: string, key: string, status: string | undefined) {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setTooltip({ name, status, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  if (error) {
    return <div className="map-fallback">{error}</div>;
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <svg
        className="map"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        aria-label="Interactive travel map"
      >
        {/* Ocean */}
        <path d={sphereD} fill={oceanFill} stroke={strokeColor} strokeWidth="0.5" />

        {/* Topo graticule */}
        <path d={graticuleD} fill="none" stroke={strokeColor} strokeWidth="0.25" opacity="0.35" />

        {/* Countries */}
        {features
          .filter((f) => f.scope === "country")
          .map((f) => {
            const placeKey = normalizePlaceKey(f.scope, f.id);
            const status = statuses[placeKey];
            const d = pathGen(f.feature);
            if (!d) return null;
            const fill = status ? placeStatusColors[status] : landBlank;
            return (
              <path
                key={f.key}
                d={d}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={0.4}
                className={`map-region${pulsingKey === placeKey ? " pulsing" : ""}`}
                style={{ cursor: readOnly ? "default" : "pointer", transition: "fill 180ms ease", transformOrigin: "center", transformBox: "fill-box" }}
                onClick={() => handleClick(placeKey)}
                onMouseMove={(e) => handleMouseMove(e, f.name, placeKey, status)}
                onMouseLeave={() => setTooltip(null)}
                onMouseEnter={(e) => handleMouseMove(e, f.name, placeKey, status)}
                data-readonly={readOnly ? "" : undefined}
                tabIndex={readOnly ? -1 : 0}
                role={readOnly ? "img" : "button"}
                aria-label={`${f.name}: ${status ?? "blank"}`}
                onKeyDown={(e) => { if (!readOnly && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleClick(placeKey); } }}
              >
                <title>{f.name}</title>
              </path>
            );
          })}

        {/* US states overlay */}
        {features
          .filter((f) => f.scope === "us-state")
          .map((f) => {
            const placeKey = normalizePlaceKey(f.scope, f.id);
            const status = statuses[placeKey];
            const d = pathGen(f.feature);
            if (!d) return null;
            const fill = status ? placeStatusColors[status] : "transparent";
            return (
              <path
                key={f.key}
                d={d}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={0.22}
                className={`map-region${pulsingKey === placeKey ? " pulsing" : ""}`}
                style={{ cursor: readOnly ? "default" : "pointer", transition: "fill 180ms ease", transformOrigin: "center", transformBox: "fill-box", opacity: status ? 1 : 0 }}
                onClick={() => handleClick(placeKey)}
                onMouseMove={(e) => status ? handleMouseMove(e, `${f.name}, USA`, placeKey, status) : undefined}
                onMouseLeave={() => setTooltip(null)}
                data-readonly={readOnly ? "" : undefined}
                tabIndex={readOnly ? -1 : 0}
                role={readOnly ? "img" : "button"}
                aria-label={`${f.name}: ${status ?? "blank"}`}
                onKeyDown={(e) => { if (!readOnly && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleClick(placeKey); } }}
              >
                <title>{f.name}</title>
              </path>
            );
          })}

        {/* India states overlay */}
        {features
          .filter((f) => f.scope === "india-state")
          .map((f) => {
            const placeKey = normalizePlaceKey(f.scope, f.id);
            const status = statuses[placeKey];
            const d = pathGen(f.feature);
            if (!d) return null;
            const fill = status ? placeStatusColors[status] : "transparent";
            return (
              <path
                key={f.key}
                d={d}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={0.22}
                className={`map-region${pulsingKey === placeKey ? " pulsing" : ""}`}
                style={{ cursor: readOnly ? "default" : "pointer", transition: "fill 180ms ease", transformOrigin: "center", transformBox: "fill-box", opacity: status ? 1 : 0 }}
                onClick={() => handleClick(placeKey)}
                onMouseMove={(e) => status ? handleMouseMove(e, `${f.name}, India`, placeKey, status) : undefined}
                onMouseLeave={() => setTooltip(null)}
                data-readonly={readOnly ? "" : undefined}
                tabIndex={readOnly ? -1 : 0}
                role={readOnly ? "img" : "button"}
                aria-label={`${f.name}: ${status ?? "blank"}`}
                onKeyDown={(e) => { if (!readOnly && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleClick(placeKey); } }}
              >
                <title>{f.name}</title>
              </path>
            );
          })}

        {features.length === 0 && !error && (
          <text x={mapWidth / 2} y={mapHeight / 2} textAnchor="middle" dominantBaseline="middle"
            fill={strokeColor} fontSize="13" fontFamily="'JetBrains Mono', monospace" letterSpacing="0.2em">
            LOADING GEOMETRY…
          </text>
        )}
      </svg>

      {tooltip && (
        <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="map-tooltip-name">{tooltip.name}</div>
          <div className="map-tooltip-status">
            {tooltip.status === "visited" ? "✓ visited"
             : tooltip.status === "lived" ? "★ lived there"
             : tooltip.status === "wantToVisit" ? "○ want to visit"
             : readOnly ? "—" : "click to mark"}
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchLayer(source: string, scope: PlaceScope): Promise<PlaceMapFeature[]> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not load ${scope} map data`);
  return toPlaceMapFeatures(await response.json(), scope);
}
