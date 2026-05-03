import { useMemo, useRef, useState } from "react";
import { importTakeoutLocationHistory } from "../lib/historyImport";
import {
  clearHistorySummary,
  loadHistorySummary,
  parseHistorySummary,
  saveHistorySummary
} from "../lib/historyStorage";
import type {
  LocationHistoryPlaceSummary,
  VisitedPlaceSummary
} from "../lib/historySummaryTypes";
import type { CityVisitSummary } from "../lib/cityTypes";

type HistoryExplorerProps = {
  initialSummary?: LocationHistoryPlaceSummary | null;
};

export function HistoryExplorer({ initialSummary = null }: HistoryExplorerProps) {
  const [summary, setSummary] = useState<LocationHistoryPlaceSummary | null>(
    () => initialSummary ?? loadHistorySummary()
  );
  const [selectedPlace, setSelectedPlace] = useState<VisitedPlaceSummary | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityVisitSummary | null>(null);
  const [message, setMessage] = useState(
    summary
      ? "Loaded your stored location-history summary from this browser."
      : "Import your Google Takeout Location History JSON to generate a stored summary."
  );
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const summaryInputRef = useRef<HTMLInputElement>(null);

  const groupedPlaces = useMemo(() => {
    const places = summary?.places ?? [];

    return {
      countries: places.filter((place) => place.scope === "country"),
      usStates: places.filter((place) => place.scope === "us-state"),
      indiaStates: places.filter((place) => place.scope === "india-state"),
      cities: summary?.cities ?? []
    };
  }, [summary]);

  async function importTakeoutJson(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage("Processing Takeout JSON locally. This can take a bit for large exports.");

    try {
      const nextSummary = await importTakeoutLocationHistory(file);
      saveHistorySummary(nextSummary);
      setSummary(nextSummary);
      setSelectedPlace(nextSummary.places[0] ?? null);
      setSelectedCity(null);
      setMessage(
        `Imported and stored ${nextSummary.places.length} places and ${nextSummary.cities?.length ?? 0} cities.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that Takeout JSON file.");
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  async function importSummaryJson(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const nextSummary = parseHistorySummary(await file.text());
      saveHistorySummary(nextSummary);
      setSummary(nextSummary);
      setSelectedPlace(nextSummary.places[0] ?? null);
      setSelectedCity(null);
      setMessage(
        `Imported and stored ${nextSummary.places.length} places and ${nextSummary.cities?.length ?? 0} cities.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that summary JSON file.");
    } finally {
      if (summaryInputRef.current) {
        summaryInputRef.current.value = "";
      }
    }
  }

  function resetHistory() {
    clearHistorySummary();
    setSummary(null);
    setSelectedPlace(null);
    setSelectedCity(null);
    setMessage("Cleared stored location-history summary from this browser.");
  }

  return (
    <section className="history-page">
      <div className="history-header">
        <div>
          <p className="eyebrow">Location history</p>
          <h2>History Explorer</h2>
          <p className="lede">
            Import your Google Takeout Location History JSON. The browser derives and stores a place
            summary locally; it does not store the raw Takeout file.
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => importInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? "Importing..." : "Import Takeout JSON"}
          </button>
          <button type="button" className="secondary" onClick={() => summaryInputRef.current?.click()}>
            Import Summary
          </button>
          <button type="button" className="secondary" onClick={resetHistory}>
            Clear Stored
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(event) => void importTakeoutJson(event.target.files?.[0])}
          />
          <input
            ref={summaryInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(event) => void importSummaryJson(event.target.files?.[0])}
          />
        </div>
      </div>

      {summary ? (
        <div className="history-grid">
          <div className="history-summary-card">
            <span className="stats-value">{summary.places.length + (summary.cities?.length ?? 0)}</span>
            <span className="stats-label">places summarized</span>
            <p>{summary.sourcePointCount.toLocaleString()} private points processed locally.</p>
          </div>
          <PlaceGroup title="Countries" places={groupedPlaces.countries} onSelect={selectPlace} />
          <PlaceGroup title="US States" places={groupedPlaces.usStates} onSelect={selectPlace} />
          <PlaceGroup title="India States" places={groupedPlaces.indiaStates} onSelect={selectPlace} />
          <CityGroup
            title="Cities 500k+"
            cities={groupedPlaces.cities}
            onSelect={(city) => {
              setSelectedCity(city);
              setSelectedPlace(null);
            }}
          />
          <DetailsPanel place={selectedPlace} city={selectedCity} />
        </div>
      ) : (
        <div className="empty-state">
          <p>{message}</p>
          <code>location-history.json</code>
        </div>
      )}

      {summary ? (
        <p className="status-message" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );

  function selectPlace(place: VisitedPlaceSummary) {
    setSelectedPlace(place);
    setSelectedCity(null);
  }
}

type PlaceGroupProps = {
  title: string;
  places: VisitedPlaceSummary[];
  onSelect: (place: VisitedPlaceSummary) => void;
};

function PlaceGroup({ title, places, onSelect }: PlaceGroupProps) {
  return (
    <section className="place-group">
      <h3>
        {title} <span>{places.length}</span>
      </h3>
      <div className="place-list">
        {places.slice(0, 24).map((place) => (
          <button
            className="place-row"
            type="button"
            key={place.key}
            onClick={() => onSelect(place)}
          >
            <span>{place.name}</span>
            <strong>{place.dayCount} days</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

type CityGroupProps = {
  title: string;
  cities: CityVisitSummary[];
  onSelect: (city: CityVisitSummary) => void;
};

function CityGroup({ title, cities, onSelect }: CityGroupProps) {
  return (
    <section className="place-group">
      <h3>
        {title} <span>{cities.length}</span>
      </h3>
      <div className="place-list">
        {cities.slice(0, 24).map((city) => (
          <button
            className="place-row"
            type="button"
            key={city.key}
            onClick={() => onSelect(city)}
          >
            <span>{city.name}</span>
            <strong>{city.dayCount} days</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function DetailsPanel({
  place,
  city
}: {
  place: VisitedPlaceSummary | null;
  city: CityVisitSummary | null;
}) {
  const item = city ?? place;

  if (!item) {
    return (
      <section className="place-details">
        <h3>Select a place</h3>
        <p>Choose a country, state, or city to see visit date spans.</p>
      </section>
    );
  }

  return (
    <section className="place-details">
      <h3>{item.name}</h3>
      <p>
        {item.dayCount} unique days from {item.firstDate} to {item.lastDate}.
        {city ? ` Population ${city.population.toLocaleString()}.` : ""}
      </p>
      <div className="span-list">
        {item.dateSpans.slice(0, 40).map((span) => (
          <div className="span-row" key={`${item.key}-${span.startDate}-${span.endDate}`}>
            <span>
              {span.startDate}
              {span.endDate !== span.startDate ? ` → ${span.endDate}` : ""}
            </span>
            <strong>{span.dayCount} days</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
