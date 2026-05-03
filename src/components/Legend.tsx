import { placeStatusColors, placeStatusLabels, type PlaceStatus } from "../lib/placeState";

const statuses: PlaceStatus[] = ["visited", "lived", "wantToVisit"];

export function Legend() {
  return (
    <div className="legend" aria-label="Map status legend">
      <span className="legend-item">
        <span className="legend-swatch blank" />
        Blank
      </span>
      {statuses.map((status) => (
        <span className="legend-item" key={status}>
          <span className="legend-swatch" style={{ backgroundColor: placeStatusColors[status] }} />
          {placeStatusLabels[status]}
        </span>
      ))}
    </div>
  );
}
