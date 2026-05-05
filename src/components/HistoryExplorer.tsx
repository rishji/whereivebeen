import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { importTakeoutLocationHistory } from "../lib/historyImport";
import {
  clearHistorySummary,
  loadHistorySummary,
  parseHistorySummary,
  saveHistorySummary
} from "../lib/historyStorage";
import {
  clearRemoteHistorySummary,
  loadRemoteHistorySummary,
  saveRemoteHistorySummary
} from "../lib/supabaseStore";
import type {
  LocationHistoryPlaceSummary,
  VisitedPlaceSummary
} from "../lib/historySummaryTypes";
import type { CityVisitSummary } from "../lib/cityTypes";

type HistoryExplorerProps = {
  initialSummary?: LocationHistoryPlaceSummary | null;
  session: Session | null;
  readOnly?: boolean;
};

export function HistoryExplorer({ initialSummary = null, session, readOnly = false }: HistoryExplorerProps) {
  const [summary, setSummary] = useState<LocationHistoryPlaceSummary | null>(
    () => initialSummary ?? (readOnly ? null : loadHistorySummary())
  );
  const [selectedPlace, setSelectedPlace] = useState<VisitedPlaceSummary | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityVisitSummary | null>(null);
  const [message, setMessage] = useState(
    summary
      ? "Loaded your stored location-history summary from this browser."
      : "Import your Google Takeout Location History JSON to generate a stored summary."
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isRemoteReady, setIsRemoteReady] = useState(!session);
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
  const summarizedPlaceCount = summary
    ? summary.places.length + (summary.cities?.length ?? 0)
    : 0;
  const storageCopy = readOnly
    ? "This is a published read-only summary. The owner opted in to showing it in the public gallery."
    : session
      ? "This derived summary is saved locally in this browser and synced privately to your account. It is public only if you turn on the gallery toggle."
      : "This derived summary is saved only in this browser. Sign in to sync it privately or publish it to the gallery.";

  useEffect(() => {
    if (readOnly) {
      setSummary(initialSummary);
      setSelectedPlace(initialSummary?.places[0] ?? null);
      setSelectedCity(null);
    }
  }, [initialSummary, readOnly]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    if (!session) {
      setIsRemoteReady(true);
      return;
    }

    let isCancelled = false;
    setIsRemoteReady(false);
    setMessage(`Loading your saved history for ${session.user.email ?? "your account"}...`);

    void (async () => {
      try {
        const remoteSummary = await loadRemoteHistorySummary(session);

        if (isCancelled) {
          return;
        }

        if (remoteSummary) {
          setSummary(remoteSummary);
          saveHistorySummary(remoteSummary);
          setSelectedPlace(remoteSummary.places[0] ?? null);
          setSelectedCity(null);
          setMessage(
            `Loaded your saved history for ${session.user.email ?? "your account"}.`
          );
        } else if (summary) {
          await saveRemoteHistorySummary(session, summary);
          setMessage(`Created a cloud copy for ${session.user.email ?? "your account"}.`);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load account history.");
        }
      } finally {
        if (!isCancelled) {
          setIsRemoteReady(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [readOnly, session?.user.id]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    if (summary) {
      saveHistorySummary(summary);

      if (session && isRemoteReady) {
        void saveRemoteHistorySummary(session, summary).catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Could not sync history to your account.");
        });
      }
    }
  }, [isRemoteReady, readOnly, session, summary]);

  async function importTakeoutJson(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage("Processing Takeout JSON locally. This can take a bit for large exports.");

    try {
      const nextSummary = await importTakeoutLocationHistory(file);
      saveHistorySummary(nextSummary);
      if (session && isRemoteReady) {
        await saveRemoteHistorySummary(session, nextSummary);
      }
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
      if (session && isRemoteReady) {
        await saveRemoteHistorySummary(session, nextSummary);
      }
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

  async function resetHistory() {
    clearHistorySummary();
    setSummary(null);
    setSelectedPlace(null);
    setSelectedCity(null);
    setMessage("Cleared stored location-history summary from this browser.");

    if (session) {
      try {
        await clearRemoteHistorySummary(session);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not clear account history.");
      }
    }
  }

  return (
    <section className="history-page">
      <div className="history-header">
        <div>
          <p className="eyebrow">Location history</p>
          <h2>{readOnly ? "Published History" : "History Explorer"}</h2>
          <p className="lede">
            {readOnly
              ? "This read-only summary was published to the public gallery by its owner."
              : "Import your Google Takeout Location History JSON. The browser derives and stores a place summary locally, and saves it to your account when you are signed in."}
          </p>
        </div>
        {readOnly ? null : (
          <div className="actions">
            <button type="button" onClick={() => importInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Takeout JSON"}
            </button>
            <button type="button" className="secondary" onClick={() => summaryInputRef.current?.click()}>
              Import Summary
            </button>
            <button type="button" className="secondary" onClick={() => void resetHistory()}>
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
        )}
      </div>

      {readOnly ? null : (
        <div className="instruction-card">
          <h3>How to export your history</h3>
          <ol>
            <li>
              Open <a href="https://takeout.google.com/" target="_blank" rel="noreferrer">Google Takeout</a>
            </li>
            <li>Select only <strong>Location History</strong> or <strong>Timeline</strong></li>
            <li>Export as JSON and download the file named <code>location-history.json</code></li>
            <li>Import that file here; the browser stores only the derived summary</li>
          </ol>
        </div>
      )}

      {summary ? (
        <>
          <section className="history-overview">
            <div>
              <span className="stats-value">{summarizedPlaceCount}</span>
              <span className="stats-label">places summarized</span>
            </div>
            <div className="overview-copy">
              <p>
                {summary.sourcePointCount.toLocaleString()} private location points were processed in
                the browser to produce this country, state, and city summary.
              </p>
              <p>{storageCopy}</p>
            </div>
          </section>

          <div className="history-grid">
            <div className="history-list-intro">
              <h3>Explore the summary</h3>
              <p>
                Select any country, state, or city below to show the visit spans in the detail panel.
                Lists show the top entries by days summarized.
              </p>
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
        </>
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
        <p>
          Choose a country, state, or city from the summary lists. The selected item will show
          unique days visited and the date spans that contributed to the total.
        </p>
      </section>
    );
  }

  return (
    <section className="place-details">
      <h3>{item.name}</h3>
      <p>
        This selection includes {item.dayCount} unique days from {item.firstDate} to {item.lastDate}.
        {city ? ` Population ${city.population.toLocaleString()}.` : ""}
      </p>
      <p>
        Date spans are grouped consecutive visit days, sorted newest first. Select another row in
        the lists to replace this detail view.
      </p>
      <div className="span-list">
        {[...item.dateSpans]
          .sort((left, right) => right.startDate.localeCompare(left.startDate))
          .slice(0, 80)
          .map((span) => (
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
