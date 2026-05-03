import { useEffect, useRef, useState } from "react";
import { EditableMap } from "./components/EditableMap";
import { HistoryExplorer } from "./components/HistoryExplorer";
import { Legend } from "./components/Legend";
import {
  cyclePlaceStatus,
  exportPlaceStatuses,
  importPlaceStatuses,
  loadPlaceStatuses,
  savePlaceStatuses,
  type PlaceStatuses
} from "./lib/placeState";

export function App() {
  const [activePage, setActivePage] = useState<"map" | "history">("map");
  const [statuses, setStatuses] = useState<PlaceStatuses>(() => loadPlaceStatuses());
  const [message, setMessage] = useState<string>("Click a place to cycle through statuses.");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    savePlaceStatuses(statuses);
  }, [statuses]);

  function togglePlace(placeKey: string) {
    setStatuses((currentStatuses) => {
      const nextStatus = cyclePlaceStatus(currentStatuses[placeKey]);
      const nextStatuses = { ...currentStatuses };

      if (nextStatus) {
        nextStatuses[placeKey] = nextStatus;
      } else {
        delete nextStatuses[placeKey];
      }

      return nextStatuses;
    });
  }

  function exportJson() {
    const blob = new Blob([exportPlaceStatuses(statuses)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "where-ive-been-statuses.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Exported your map statuses as JSON.");
  }

  async function importJson(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      setStatuses(importPlaceStatuses(await file.text()));
      setMessage("Imported map statuses.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that JSON file.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function resetMap() {
    setStatuses({});
    setMessage("Reset all map statuses.");
  }

  const markedPlacesCount = Object.keys(statuses).length;

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Personal travel atlas</p>
          <h1>Where I've Been</h1>
          <p className="lede">
            Mark countries, US states, and India states directly on the map. Click any place to cycle
            through visited, lived there, want to visit, and blank.
          </p>
        </div>
        <div className="stats-card">
          <span className="stats-value">{markedPlacesCount}</span>
          <span className="stats-label">marked places</span>
        </div>
      </section>

      <nav className="page-tabs" aria-label="Where I've Been sections">
        <button
          type="button"
          className={activePage === "map" ? "active" : "secondary"}
          onClick={() => setActivePage("map")}
        >
          Editable Map
        </button>
        <button
          type="button"
          className={activePage === "history" ? "active" : "secondary"}
          onClick={() => setActivePage("history")}
        >
          History
        </button>
      </nav>

      {activePage === "map" ? (
        <>
          <section className="toolbar" aria-label="Map controls">
            <Legend />
            <div className="actions">
              <button type="button" onClick={exportJson}>
                Export JSON
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()}>
                Import JSON
              </button>
              <button type="button" className="secondary" onClick={resetMap}>
                Reset
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="visually-hidden"
                onChange={(event) => void importJson(event.target.files?.[0])}
              />
            </div>
          </section>

          <EditableMap statuses={statuses} onTogglePlace={togglePlace} />

          <p className="status-message" role="status">
            {message}
          </p>
        </>
      ) : (
        <HistoryExplorer />
      )}
    </main>
  );
}
