import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { mergeAndSummarize } from "../lib/historyImport";
import { parseGoogleLocationHistory } from "../lib/locationHistoryParser";
import { parsePreExtractedPhotoPoints } from "../lib/photosTakeoutParser";
import {
  clearHistorySummary,
  loadHistorySummary,
  saveHistorySummary
} from "../lib/historyStorage";
import {
  clearRemoteHistorySummary,
  loadRemoteHistorySummary,
  saveRemoteHistorySummary
} from "../lib/supabaseStore";
import { queryDailyVisitRange, queryDailyVisits } from "../lib/dailyVisitSummary";
import type { DailyVisitRangeResult } from "../lib/dailyVisitSummary";
import {
  assistDateInput,
  formatIsoDateForInput,
  isDateRangeValid,
  parseDateInput
} from "../lib/dateInput";
import type {
  LocationHistoryPlaceSummary,
  VisitedPlaceSummary
} from "../lib/historySummaryTypes";
import type { LocationPoint } from "../lib/locationHistoryTypes";
import type { CityVisitSummary } from "../lib/cityTypes";

const maxCalendarRangeDays = 7305;

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
  const photoPointsInputRef = useRef<HTMLInputElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

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
              onClick={() => photoPointsInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImportingPhotos ? "Importing..." : "Import photo-locations.json"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void resetHistory()}
              disabled={isImporting}
            >
              Clear Stored
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => instructionsRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Instructions
            </button>
            <input
              ref={mapsInputRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(event) => void importMapsJson(event.target.files?.[0])}
            />
            <input
              ref={photoPointsInputRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(event) => void importPhotoPointsFile(event.target.files?.[0])}
            />
          </div>
        )}
      </div>


      {summary ? (
        <>
          <section className="history-overview">
            <div className="overview-stat">
              <span className="stats-value">{summarizedPlaceCount}</span>
              <span className="stats-label">places summarized</span>
            </div>
            <div className="overview-copy">
              {summary.sourcePointCounts ? (
                <p>
                  <strong className="overview-number">{summary.sourcePointCounts.maps.toLocaleString()}</strong> Maps points
                  {summary.sourcePointCounts.photos > 0 && (
                    <> and <strong className="overview-number">{summary.sourcePointCounts.photos.toLocaleString()}</strong> Photos points</>
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

          <DailyHistoryCalendar summary={summary} readOnly={readOnly} />
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

      {readOnly ? null : (
        <div className="instruction-cards" ref={instructionsRef}>
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
            <ol>
              <li>
                Go to <a href="https://takeout.google.com/" target="_blank" rel="noreferrer">takeout.google.com</a>, select only <strong>Google Photos</strong>, and download the zip file(s) to your <strong>Downloads</strong> folder
              </li>
              <li>
                Download <a href={`${import.meta.env.BASE_URL}extract-photo-locations.py`} download>extract-photo-locations.py</a> and save it to your <strong>Downloads</strong> folder
              </li>
              <li>
                Open <strong>Terminal</strong> and run once per zip (re-running merges automatically — safe if disk space is limited):
                <pre className="instruction-code">python3 ~/Downloads/extract-photo-locations.py ~/Downloads/takeout-001.zip</pre>
              </li>
              <li>This produces <code>photo-locations.json</code> in your Downloads folder — no images extracted. Each run adds new points without clobbering previous ones</li>
              <li>After processing all zips, click <strong>Import photo-locations.json</strong> above and select the file from your Downloads folder</li>
            </ol>
          </div>
        </div>
      )}
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
        {places.slice(0, 50).map((place) => (
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
        {cities.slice(0, 50).map((city) => (
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

function DailyHistoryCalendar({
  summary,
  readOnly
}: {
  summary: LocationHistoryPlaceSummary;
  readOnly: boolean;
}) {
  const dailyVisits = summary.dailyVisits;

  if (!dailyVisits) {
    return (
      <section className="history-calendar-panel history-calendar-unavailable">
        <div>
          <p className="eyebrow">Daily calendar</p>
          <h3>Calendar unavailable</h3>
        </div>
        <p>
          {readOnly
            ? "This published summary does not include day-by-day visit data."
            : "Re-import your location history to add day-by-day visit data to this summary."}
        </p>
      </section>
    );
  }

  return <DailyHistoryCalendarContent summary={summary} dailyVisits={dailyVisits} />;
}

function DailyHistoryCalendarContent({
  summary,
  dailyVisits
}: {
  summary: LocationHistoryPlaceSummary;
  dailyVisits: NonNullable<LocationHistoryPlaceSummary["dailyVisits"]>;
}) {
  const sortedDates = useMemo(
    () => dailyVisits.map((dailyVisit) => dailyVisit.date).sort((left, right) => left.localeCompare(right)),
    [dailyVisits]
  );
  const defaultDate = sortedDates[sortedDates.length - 1] ?? "";
  const [startInput, setStartInput] = useState(defaultDate ? formatIsoDateForInput(defaultDate) : "");
  const [endInput, setEndInput] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(defaultDate || getTodayIsoDate()));

  useEffect(() => {
    setStartInput(defaultDate ? formatIsoDateForInput(defaultDate) : "");
    setEndInput("");
    setVisibleMonth(getMonthStart(defaultDate || getTodayIsoDate()));
  }, [defaultDate]);

  const parsedStart = startInput ? parseDateInput(startInput) : null;
  const parsedEnd = endInput ? parseDateInput(endInput) : null;
  const startIso = parsedStart && "isoDate" in parsedStart ? parsedStart.isoDate : null;
  const endIso = endInput
    ? parsedEnd && "isoDate" in parsedEnd
      ? parsedEnd.isoDate
      : null
    : startIso;
  const validationMessage = getDateValidationMessage(startInput, parsedStart, endInput, parsedEnd, startIso, endIso);
  const selectedRange = !validationMessage && startIso && endIso ? { startIso, endIso } : null;
  const rangeResult = selectedRange
    ? queryDailyVisitRange(dailyVisits, selectedRange.startIso, selectedRange.endIso)
    : null;
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth, dailyVisits, selectedRange),
    [dailyVisits, selectedRange, visibleMonth]
  );

  function updateStartInput(value: string) {
    const assistedValue = assistDateInput(value);
    setStartInput(assistedValue);
    const parsedDate = parseDateInput(assistedValue);
    if ("isoDate" in parsedDate) {
      setVisibleMonth(getMonthStart(parsedDate.isoDate));
    }
  }

  function updateEndInput(value: string) {
    const assistedValue = assistDateInput(value);
    setEndInput(assistedValue);
    const parsedDate = parseDateInput(assistedValue);
    if ("isoDate" in parsedDate) {
      setVisibleMonth(getMonthStart(parsedDate.isoDate));
    }
  }

  function selectCalendarDay(isoDate: string) {
    const formatted = formatIsoDateForInput(isoDate);
    if (!startInput || endInput) {
      // No start set yet, or range is complete — start fresh
      updateStartInput(formatted);
      setEndInput("");
    } else if (!startIso || isoDate < startIso) {
      // Clicked before current start — make it the new start
      updateStartInput(formatted);
    } else {
      // Same or later than start — set as end
      updateEndInput(formatted);
    }
  }

  return (
    <section className="history-calendar-panel">
      <div className="history-calendar-header">
        <div>
          <p className="eyebrow">Daily calendar</p>
          <h3>Explore by date</h3>
        </div>
        <div className="history-calendar-inputs">
          <label className="field-label">
            Start date
            <input
              type="text"
              inputMode="numeric"
              placeholder="mm-dd-yyyy"
              value={startInput}
              onChange={(event) => updateStartInput(event.target.value)}
            />
          </label>
          <label className="field-label">
            End date
            <input
              type="text"
              inputMode="numeric"
              placeholder="mm-dd-yyyy"
              value={endInput}
              onChange={(event) => updateEndInput(event.target.value)}
            />
          </label>
        </div>
      </div>

      {validationMessage ? (
        <p className="calendar-validation" role="alert">
          {validationMessage}
        </p>
      ) : null}

      <div className="history-calendar-layout">
        <div className="calendar-shell">
          <div className="calendar-toolbar">
            <button
              type="button"
              className="secondary calendar-nav"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              aria-label="Previous month"
            >
              Previous
            </button>
            <strong>{formatMonthLabel(visibleMonth)}</strong>
            <button
              type="button"
              className="secondary calendar-nav"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              aria-label="Next month"
            >
              Next
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => (
              <button
                key={day.isoDate}
                type="button"
                className={getCalendarDayClassName(day)}
                onClick={() => selectCalendarDay(day.isoDate)}
                aria-label={getCalendarDayLabel(day, visibleMonth)}
                aria-pressed={day.isSelected}
              >
                <span>{day.dayNumber}</span>
              </button>
            ))}
          </div>
        </div>

        <CalendarResults summary={summary} rangeResult={rangeResult} />
      </div>
    </section>
  );
}

function CalendarResults({
  summary,
  rangeResult
}: {
  summary: LocationHistoryPlaceSummary;
  rangeResult: DailyVisitRangeResult | null;
}) {
  const placeByKey = useMemo(
    () => new Map(summary.places.map((place) => [place.key, place])),
    [summary.places]
  );
  const cityByKey = useMemo(
    () => new Map((summary.cities ?? []).map((city) => [city.key, city])),
    [summary.cities]
  );

  if (!rangeResult) {
    return (
      <div className="calendar-results">
        <h3>No date selected</h3>
        <p className="calendar-empty">Enter a valid date or choose a day on the calendar.</p>
      </div>
    );
  }

  const matchedPlaces = rangeResult.places.flatMap(({ key, dayCount }) => {
    const place = placeByKey.get(key);
    return place ? [{ item: place, dayCount }] : [];
  });
  const matchedCities = rangeResult.cities.flatMap(({ key, dayCount }) => {
    const city = cityByKey.get(key);
    return city ? [{ item: city, dayCount }] : [];
  });
  const countries = matchedPlaces.filter(({ item }) => item.scope === "country");
  const usStates = matchedPlaces.filter(({ item }) => item.scope === "us-state");
  const indiaStates = matchedPlaces.filter(({ item }) => item.scope === "india-state");
  const hasMatches = matchedPlaces.length > 0 || matchedCities.length > 0;
  const title = rangeResult.startDate === rangeResult.endDate
    ? formatIsoDateForInput(rangeResult.startDate)
    : `${formatIsoDateForInput(rangeResult.startDate)} to ${formatIsoDateForInput(rangeResult.endDate)}`;

  return (
    <div className="calendar-results">
      <div className="calendar-results-header">
        <h3>{title}</h3>
        <span>
          {rangeResult.sourceCounts.maps.toLocaleString()} Maps
          {rangeResult.sourceCounts.photos > 0
            ? ` / ${rangeResult.sourceCounts.photos.toLocaleString()} Photos`
            : ""}
        </span>
      </div>
      <div className="calendar-coverage" aria-label="Daily coverage counts">
        <div>
          <strong>{rangeResult.totalDays}</strong>
          <span>total days</span>
        </div>
        <div>
          <strong>{rangeResult.daysWithData}</strong>
          <span>with data</span>
        </div>
        <div>
          <strong>{rangeResult.missingDays}</strong>
          <span>missing</span>
        </div>
        <div>
          <strong>{rangeResult.mapsOnlyDays}</strong>
          <span>maps only</span>
        </div>
        <div>
          <strong>{rangeResult.photosOnlyDays}</strong>
          <span>photos only</span>
        </div>
        <div>
          <strong>{rangeResult.bothDays}</strong>
          <span>maps + photos</span>
        </div>
      </div>
      {rangeResult.daysWithData === 0 ? (
        <p className="calendar-empty">No daily data was found for this selection.</p>
      ) : null}
      {hasMatches ? (
        <div className="calendar-result-groups">
          <CalendarResultGroup title="Countries" entries={countries} />
          <CalendarResultGroup title="US States" entries={usStates} />
          <CalendarResultGroup title="India States" entries={indiaStates} />
          <CalendarResultGroup title="Cities" entries={matchedCities} />
        </div>
      ) : rangeResult.daysWithData > 0 ? (
        <p className="calendar-empty">Daily data exists for this selection, but no places or cities matched.</p>
      ) : null}
    </div>
  );
}

function CalendarResultGroup<T extends { key: string; name: string }>({
  title,
  entries
}: {
  title: string;
  entries: Array<{ item: T; dayCount: number }>;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="calendar-result-group">
      <h4>
        {title} <span>{entries.length}</span>
      </h4>
      <div className="calendar-result-list">
        {entries.slice(0, 50).map(({ item, dayCount }) => (
          <div className="calendar-result-row" key={item.key}>
            <span>{item.name}</span>
            <strong>{dayCount} {dayCount === 1 ? "day" : "days"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

type CalendarDay = {
  isoDate: string;
  dayNumber: number;
  isOutsideMonth: boolean;
  hasData: boolean;
  isSelected: boolean;
  isInRange: boolean;
};

function buildCalendarDays(
  visibleMonth: string,
  dailyVisits: NonNullable<LocationHistoryPlaceSummary["dailyVisits"]>,
  selectedRange: { startIso: string; endIso: string } | null
): CalendarDay[] {
  const firstDate = parseIsoDate(visibleMonth);
  const gridStart = addDays(firstDate, -firstDate.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const isoDate = formatIsoDate(date);
    const isSelected = Boolean(
      selectedRange &&
      (isoDate === selectedRange.startIso || isoDate === selectedRange.endIso)
    );
    const isInRange = Boolean(
      selectedRange &&
      selectedRange.startIso < isoDate &&
      isoDate < selectedRange.endIso
    );
    return {
      isoDate,
      dayNumber: date.getUTCDate(),
      isOutsideMonth: getMonthStart(isoDate) !== visibleMonth,
      hasData: queryDailyVisits(dailyVisits, isoDate) !== null,
      isSelected,
      isInRange
    };
  });
}

function getDateValidationMessage(
  startInput: string,
  parsedStart: ReturnType<typeof parseDateInput> | null,
  endInput: string,
  parsedEnd: ReturnType<typeof parseDateInput> | null,
  startIso: string | null,
  endIso: string | null
): string | null {
  if (startInput && parsedStart && "error" in parsedStart) {
    return parsedStart.error;
  }

  if (endInput && !startInput) {
    return "Start date is required.";
  }

  if (endInput && parsedEnd && "error" in parsedEnd) {
    return parsedEnd.error;
  }

  if (startIso && endIso && !isDateRangeValid(startIso, endIso)) {
    return "End date must be on or after start date.";
  }

  if (startIso && endIso && getInclusiveDayCount(startIso, endIso) > maxCalendarRangeDays) {
    return "Select 7,305 days or fewer.";
  }

  return null;
}

function getCalendarDayClassName(day: CalendarDay): string {
  return [
    "calendar-day",
    day.hasData ? "has-data" : "missing-data",
    day.isOutsideMonth ? "outside-month" : "",
    day.isSelected ? "selected" : "",
    day.isInRange ? "in-range" : ""
  ].filter(Boolean).join(" ");
}

function getCalendarDayLabel(day: CalendarDay, visibleMonth: string): string {
  return [
    formatFullDateLabel(day.isoDate),
    day.hasData ? "has data" : "missing data",
    day.isSelected ? "selected" : "",
    day.isOutsideMonth ? `outside ${formatMonthLabel(visibleMonth)}` : ""
  ].filter(Boolean).join(", ");
}

function getInclusiveDayCount(startIso: string, endIso: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((parseIsoDate(endIso).getTime() - parseIsoDate(startIso).getTime()) / millisecondsPerDay) + 1;
}

function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

function getMonthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addMonths(monthStart: string, amount: number): string {
  const date = parseIsoDate(monthStart);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return formatIsoDate(date).slice(0, 7) + "-01";
}

function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return nextDate;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthLabel(monthStart: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(parseIsoDate(monthStart));
}

function formatFullDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric"
  }).format(parseIsoDate(isoDate));
}
