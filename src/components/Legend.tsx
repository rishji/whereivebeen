import { placeStatusColors, placeStatusLabels, type PlaceStatus } from "../lib/placeState";

const statuses: PlaceStatus[] = ["visited", "lived", "wantToVisit"];

export function Legend() {
  return (
    <div className="legend" aria-label="Map status legend">
      <div className="legend-item">
        <span className="legend-swatch blank" />
        <span className="legend-label">Blank</span>
      </div>
      {statuses.map((status) => (
        <div className="legend-item" key={status}>
          <span className="legend-swatch" style={{ backgroundColor: placeStatusColors[status] }} />
          <span className="legend-label">{placeStatusLabels[status]}</span>
        </div>
      ))}
    </div>
  );
}
