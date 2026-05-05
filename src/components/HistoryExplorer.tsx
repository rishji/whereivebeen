import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { mergeAndSummarize } from "../lib/historyImport";
import { parseGoogleLocationHistory } from "../lib/locationHistoryParser";
import { parsePhotosSidecars, parsePreExtractedPhotoPoints } from "../lib/photosTakeoutParser";
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
import type { LocationPoint } from "../lib/locationHistoryTypes";
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
      : "Import your Maps Timeline to generate a stored summary."
  );
  const [isImportingMaps, setIsImportingMaps] = useState(false);
  const [isImportingPhotos, setIsImportingPhotos] = useState(false);
  const [isRemoteReady, setIsRemoteReady] = useState(!session);

  // In-memory only — not persisted. Raw points are merged once and only the
  // derived summary is saved, matching the same pattern as the existing Maps-only flow.
  const [mapsPoints, setMapsPoints] = useState<LocationPoint[]>([]);
  const [photosPoints, setPhotosPoints] = useState<LocationPoint[]>([]);

  const mapsInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const photoPointsInputRef = useRef<HTMLInputElement>(null);
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
          setMessage(`Loaded your saved history for ${session.user.email ?? "your account"}.`);
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

  async function applyMergeAndSave(maps: LocationPoint[], photos: LocationPoint[]) {
    const nextSummary = await mergeAndSummarize({ mapsPoints: maps, photosPoints: photos });
    saveHistorySummary(nextSummary);
    if (session && isRemoteReady) {
      await saveRemoteHistorySummary(session, nextSummary);
    }
    setSummary(nextSummary);
    setSelectedPlace(nextSummary.places[0] ?? null);
    setSelectedCity(null);
    return nextSummary;
  }

  async function importMapsJson(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImportingMaps(true);
    setMessage("Reading your Maps Timeline — this may take a moment for large files...");

    try {
      const points = parseGoogleLocationHistory(JSON.parse(await file.text()));
      setMapsPoints(points);
      setMessage(`Mapping ${points.length.toLocaleString()} location points to places...`);
      const nextSummary = await applyMergeAndSave(points, photosPoints);
      const counts = nextSummary.sourcePointCounts;
      const countNote = counts && counts.photos > 0
        ? ` Maps: ${counts.maps.toLocaleString()} · Photos: ${counts.photos.toLocaleString()} points.`
        : "";
      setMessage(
        `Summarized ${nextSummary.places.length} places and ${nextSummary.cities?.length ?? 0} cities.${countNote}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that file.");
    } finally {
      setIsImportingMaps(false);
      if (mapsInputRef.current) {
        mapsInputRef.current.value = "";
      }
    }
  }

  async function importPhotosFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsImportingPhotos(true);
    const fileArray = Array.from(files);
    const jsonCount = fileArray.filter((f) => f.name.endsWith(".json")).length;
    setMessage(`Scanning ${jsonCount.toLocaleString()} metadata files from your Photos export...`);

    try {
      const newPoints = await parsePhotosSidecars(fileArray, (done, total) => {
        setMessage(`Reading photo metadata: ${done.toLocaleString()} / ${total.toLocaleString()} files...`);
      });

      // Accumulate across multiple folder picks (for split Takeout archives)
      const accumulated = [...photosPoints, ...newPoints];
      setPhotosPoints(accumulated);

      if (accumulated.length === 0) {
        setMessage("No location data found in those files. Make sure you selected a Google Photos Takeout folder.");
        return;
      }

      setMessage(`Found ${accumulated.length.toLocaleString()} photo location points. Mapping to places...`);
      const nextSummary = await applyMergeAndSave(mapsPoints, accumulated);
      const counts = nextSummary.sourcePointCounts;
      const countNote = counts && counts.maps > 0
        ? ` Maps: ${counts.maps.toLocaleString()} · Photos: ${counts.photos.toLocaleString()} points.`
        : "";
      setMessage(
        `Summarized ${nextSummary.places.length} places and ${nextSummary.cities?.length ?? 0} cities.${countNote}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import Photos metadata.");
    } finally {
      setIsImportingPhotos(false);
      if (photosInputRef.current) {
        photosInputRef.current.value = "";
      }
    }
  }

  async function importPhotoPointsFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImportingPhotos(true);
    setMessage("Reading photo-locations.json...");

    try {
      const json = JSON.parse(await file.text()) as unknown;
      const newPoints = parsePreExtractedPhotoPoints(json);

      if (newPoints.length === 0) {
        setMessage("No location points found in that file. Make sure it was produced by the extract script.");
        return;
      }

      const accumulated = [...photosPoints, ...newPoints];
      setPhotosPoints(accumulated);
      setMessage(`Mapping ${accumulated.length.toLocaleString()} photo location points to places...`);
      const nextSummary = await applyMergeAndSave(mapsPoints, accumulated);
      const counts = nextSummary.sourcePointCounts;
      const countNote = counts && counts.maps > 0
        ? ` Maps: ${counts.maps.toLocaleString()} · Photos: ${counts.photos.toLocaleString()} points.`
        : "";
      setMessage(
        `Summarized ${nextSummary.places.length} places and ${nextSummary.cities?.length ?? 0} cities.${countNote}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read that file.");
    } finally {
      setIsImportingPhotos(false);
      if (photoPointsInputRef.current) {
        photoPointsInputRef.current.value = "";
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
    setMapsPoints([]);
    setPhotosPoints([]);
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

  const isImporting = isImportingMaps || isImportingPhotos;

  return (
    <section className="history-page">
      <div className="tab-header">
        <div>
          <p className="eyebrow">Location history</p>
          <h2>{readOnly ? "Published History" : "History Explorer"}</h2>
          <p className="lede">
            {readOnly
              ? "This read-only summary was published to the public gallery by its owner."
              : "Import your Google Maps Timeline to generate a private summary of countries, states, and cities visited. Optionally add Google Photos to fill in gaps."}
          </p>
        </div>
        {readOnly ? null : (
          <div className="actions">
            <button
              type="button"
              onClick={() => mapsInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImportingMaps ? "Importing..." : "Import Maps Timeline"}
            </button>
            <button
              type="button"
              onClick={() => photosInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImportingPhotos ? "Importing..." : "Add Photos Folder"}
            </button>
            <button
              type="button"
              onClick={() => photoPointsInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImportingPhotos ? "Importing..." : "Import photo-locations.json"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => summaryInputRef.current?.click()}
              disabled={isImporting}
            >
              Import Summary
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void resetHistory()}
              disabled={isImporting}
            >
              Clear Stored
            </button>
            <input
              ref={mapsInputRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(event) => void importMapsJson(event.target.files?.[0])}
            />
            <input
              ref={photosInputRef}
              type="file"
              // webkitdirectory lets users pick a folder on desktop; degrades to multi-file on iOS Safari
              {...{ webkitdirectory: "", multiple: true }}
              accept=".json"
              className="visually-hidden"
              onChange={(event) => void importPhotosFiles(event.target.files)}
            />
            <input
              ref={photoPointsInputRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(event) => void importPhotoPointsFile(event.target.files?.[0])}
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
        <div className="instruction-cards">
          <div className="instruction-card">
            <h3>Export your Maps Timeline</h3>
            <p className="instruction-note">
              Google now stores your full location history on your phone. Takeout only has the last 90 days.
            </p>
            <div className="instruction-tabs">
              <div className="instruction-section">
                <strong>iPhone</strong>
                <ol>
                  <li>Open the <strong>Google Maps</strong> app</li>
                  <li>Tap your profile photo → <strong>Timeline</strong></li>
                  <li>Tap the <strong>⋮</strong> menu → <strong>Location &amp; privacy settings</strong></li>
                  <li>Tap <strong>Export Timeline data</strong> and wait for it to finish</li>
                  <li>Tap <strong>Share</strong> → <strong>AirDrop</strong> → your Mac</li>
                  <li>Import the <code>location-history.json</code> file here</li>
                </ol>
              </div>
              <div className="instruction-section">
                <strong>Android</strong>
                <ol>
                  <li>Open the <strong>Google Maps</strong> app</li>
                  <li>Tap your profile photo → <strong>Timeline</strong></li>
                  <li>Tap the <strong>⋮</strong> menu → <strong>Export Timeline data</strong></li>
                  <li>Transfer the file to your computer via USB, email, or Google Drive</li>
                  <li>Import the <code>location-history.json</code> file here</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="instruction-card instruction-card-secondary">
            <h3>Add Google Photos (optional)</h3>
            <p className="instruction-note">
              Photos with location tags fill in days your Maps Timeline doesn't cover. Maps data always takes precedence.
            </p>
            <div className="instruction-tabs">
              <div className="instruction-section">
                <strong>Large libraries (recommended)</strong>
                <ol>
                  <li>
                    Go to <a href="https://takeout.google.com/" target="_blank" rel="noreferrer">takeout.google.com</a>, select only <strong>Google Photos</strong>, and download the zip file(s)
                  </li>
                  <li>Open <strong>Terminal</strong> on your Mac</li>
                  <li>
                    Run this command (adjust the path to your downloads):
                    <pre className="instruction-code">python3 scripts/extract-photo-locations.py ~/Downloads/takeout-*.zip</pre>
                  </li>
                  <li>This produces a small <code>photo-locations.json</code> file — no images extracted, no disk space used</li>
                  <li>Click <strong>Import photo-locations.json</strong> above and select that file</li>
                </ol>
              </div>
              <div className="instruction-section">
                <strong>Small libraries</strong>
                <ol>
                  <li>
                    Go to <a href="https://takeout.google.com/" target="_blank" rel="noreferrer">takeout.google.com</a>, select only <strong>Google Photos</strong>, and download the zip file(s)
                  </li>
                  <li>Extract each zip to a folder on your computer</li>
                  <li>Click <strong>Add Photos Folder</strong> above and select the extracted <strong>Google Photos</strong> folder</li>
                  <li>For multiple zips, repeat for each extracted folder — points accumulate</li>
                </ol>
              </div>
            </div>
          </div>
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
              {summary.sourcePointCounts ? (
                <p>
                  <strong>{summary.sourcePointCounts.maps.toLocaleString()}</strong> Maps points
                  {summary.sourcePointCounts.photos > 0 && (
                    <> and <strong>{summary.sourcePointCounts.photos.toLocaleString()}</strong> Photos points</>
                  )}{" "}
                  were processed in the browser to produce this summary.
                </p>
              ) : (
                <p>
                  {summary.sourcePointCount.toLocaleString()} private location points were processed in
                  the browser to produce this country, state, and city summary.
                </p>
              )}
              <p>{storageCopy}</p>
            </div>
          </section>

          <div className={readOnly ? "history-grid gallery-history-grid" : "history-grid owner-history-grid"}>
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
            <div className="history-list-intro">
              <h3>Explore the summary</h3>
              <p>
                Select any country, state, or city above to show its visit spans in the detail panel.
                Lists show the top entries by days summarized.
              </p>
            </div>
            <DetailsPanel place={selectedPlace} city={selectedCity} />
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>{message}</p>
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
