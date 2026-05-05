# Daily History Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a derived daily history summary and a bottom History Explorer calendar that shows data coverage and date/range results.

**Architecture:** Add pure helper modules for daily visit indexing/querying and `mm-dd-yyyy` date input parsing. Wire `dailyVisits` into the existing `LocationHistoryPlaceSummary` JSONB/localStorage payload without storing raw points. Render the calendar UI in `HistoryExplorer` using the derived daily index and existing place/city summary records.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, jsdom, existing CSS in `src/styles.css`.

---

## File Structure

- Create `src/lib/dailyVisitSummary.ts`: builds `DailyVisitSummary[]` from place/city `dateSpans`, expands date spans, indexes by date, and queries single dates/ranges.
- Create `src/lib/dailyVisitSummary.test.ts`: Vitest coverage for building/querying daily visits and range coverage counts.
- Create `src/lib/dateInput.ts`: parses, formats, assists, and validates `mm-dd-yyyy` date input.
- Create `src/lib/dateInput.test.ts`: Vitest coverage for valid dates, invalid dates, auto-dash assistance, and date ordering.
- Modify `src/lib/historySummaryTypes.ts`: add `DailyVisitSummary` and range result types if not local to the helper.
- Modify `src/lib/historyImport.ts`: compute `dailyVisits` during `mergeAndSummarize`.
- Modify `src/lib/historyStorage.ts`, `src/lib/supabaseStore.ts`, `src/lib/publicGallery.ts`: validate optional `dailyVisits` enough to reject malformed payloads while preserving backward compatibility.
- Modify `src/components/HistoryExplorer.tsx`: render the bottom calendar lookup section and use helper queries.
- Modify `src/styles.css`: add calendar layout, coverage colors, selected/range states, validation and result-list styling.

## Task 1: Daily Visit Summary Helpers

**Files:**
- Create: `src/lib/dailyVisitSummary.ts`
- Create: `src/lib/dailyVisitSummary.test.ts`
- Modify: `src/lib/historySummaryTypes.ts`

- [ ] **Step 1: Write failing tests for building daily visits**

Create `src/lib/dailyVisitSummary.test.ts` with:

```ts
import { describe, expect, test } from "vitest";
import {
  buildDailyVisits,
  queryDailyVisits,
  queryDailyVisitRange
} from "./dailyVisitSummary";
import type { CityVisitSummary } from "./cityTypes";
import type { VisitedPlaceSummary } from "./historySummaryTypes";

const places: VisitedPlaceSummary[] = [
  {
    key: "country:840",
    scope: "country",
    id: 840,
    name: "United States",
    dayCount: 3,
    firstDate: "2024-05-12",
    lastDate: "2024-05-14",
    dateSpans: [{ startDate: "2024-05-12", endDate: "2024-05-14", dayCount: 3 }]
  },
  {
    key: "us-state:CA",
    scope: "us-state",
    id: "CA",
    name: "California",
    dayCount: 1,
    firstDate: "2024-05-12",
    lastDate: "2024-05-12",
    dateSpans: [{ startDate: "2024-05-12", endDate: "2024-05-12", dayCount: 1 }]
  }
];

const cities: CityVisitSummary[] = [
  {
    key: "city:san-francisco-us",
    id: "san-francisco-us",
    name: "San Francisco",
    countryCode: "US",
    countryName: "United States",
    population: 808437,
    pointCount: 8,
    dayCount: 2,
    firstDate: "2024-05-12",
    lastDate: "2024-05-13",
    dateSpans: [{ startDate: "2024-05-12", endDate: "2024-05-13", dayCount: 2 }]
  }
];

describe("buildDailyVisits", () => {
  test("builds one compact record per date from place and city spans", () => {
    const dailyVisits = buildDailyVisits({
      places,
      cities,
      sourceCountsByDate: new Map([
        ["2024-05-12", { maps: 10, photos: 0 }],
        ["2024-05-13", { maps: 0, photos: 4 }]
      ])
    });

    expect(dailyVisits).toEqual([
      {
        date: "2024-05-12",
        placeKeys: ["country:840", "us-state:CA"],
        cityKeys: ["city:san-francisco-us"],
        sourceCounts: { maps: 10, photos: 0 }
      },
      {
        date: "2024-05-13",
        placeKeys: ["country:840"],
        cityKeys: ["city:san-francisco-us"],
        sourceCounts: { maps: 0, photos: 4 }
      },
      {
        date: "2024-05-14",
        placeKeys: ["country:840"],
        cityKeys: [],
        sourceCounts: { maps: 0, photos: 0 }
      }
    ]);
  });
});

describe("daily visit queries", () => {
  const dailyVisits = buildDailyVisits({
    places,
    cities,
    sourceCountsByDate: new Map([
      ["2024-05-12", { maps: 10, photos: 0 }],
      ["2024-05-13", { maps: 0, photos: 4 }]
    ])
  });

  test("returns a single date result", () => {
    expect(queryDailyVisits(dailyVisits, "2024-05-12")).toEqual({
      date: "2024-05-12",
      placeKeys: ["country:840", "us-state:CA"],
      cityKeys: ["city:san-francisco-us"],
      sourceCounts: { maps: 10, photos: 0 }
    });
  });

  test("returns null for a missing date", () => {
    expect(queryDailyVisits(dailyVisits, "2024-05-15")).toBeNull();
  });

  test("rolls up a date range with matched-day counts and coverage", () => {
    expect(queryDailyVisitRange(dailyVisits, "2024-05-12", "2024-05-15")).toEqual({
      startDate: "2024-05-12",
      endDate: "2024-05-15",
      totalDays: 4,
      daysWithData: 3,
      missingDays: 1,
      sourceCounts: { maps: 10, photos: 4 },
      places: [
        { key: "country:840", dayCount: 3 },
        { key: "us-state:CA", dayCount: 1 }
      ],
      cities: [{ key: "city:san-francisco-us", dayCount: 2 }]
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dailyVisitSummary.test.ts`

Expected: FAIL because `src/lib/dailyVisitSummary.ts` does not exist.

- [ ] **Step 3: Add daily summary types**

Modify `src/lib/historySummaryTypes.ts`:

```ts
export type DailyVisitSummary = {
  date: string;
  placeKeys: string[];
  cityKeys: string[];
  sourceCounts: { maps: number; photos: number };
};

export type LocationHistoryPlaceSummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourcePointCount: number;
  sourcePointCounts?: { maps: number; photos: number };
  places: VisitedPlaceSummary[];
  cities?: CityVisitSummary[];
  dailyVisits?: DailyVisitSummary[];
};
```

- [ ] **Step 4: Implement daily visit helpers**

Create `src/lib/dailyVisitSummary.ts`:

```ts
import type { CityVisitSummary } from "./cityTypes";
import type { DailyVisitSummary, DateSpan, VisitedPlaceSummary } from "./historySummaryTypes";

export type DailySourceCounts = { maps: number; photos: number };

export type DailyVisitRangeResult = {
  startDate: string;
  endDate: string;
  totalDays: number;
  daysWithData: number;
  missingDays: number;
  sourceCounts: DailySourceCounts;
  places: Array<{ key: string; dayCount: number }>;
  cities: Array<{ key: string; dayCount: number }>;
};

export function buildDailyVisits({
  places,
  cities,
  sourceCountsByDate = new Map()
}: {
  places: VisitedPlaceSummary[];
  cities: CityVisitSummary[];
  sourceCountsByDate?: Map<string, DailySourceCounts>;
}): DailyVisitSummary[] {
  const byDate = new Map<string, { placeKeys: Set<string>; cityKeys: Set<string> }>();

  for (const place of places) {
    for (const date of expandDateSpans(place.dateSpans)) {
      getOrCreateDay(byDate, date).placeKeys.add(place.key);
    }
  }

  for (const city of cities) {
    for (const date of expandDateSpans(city.dateSpans)) {
      getOrCreateDay(byDate, date).cityKeys.add(city.key);
    }
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      placeKeys: Array.from(value.placeKeys).sort(),
      cityKeys: Array.from(value.cityKeys).sort(),
      sourceCounts: sourceCountsByDate.get(date) ?? { maps: 0, photos: 0 }
    }));
}

export function queryDailyVisits(
  dailyVisits: DailyVisitSummary[],
  date: string
): DailyVisitSummary | null {
  return dailyVisits.find((visit) => visit.date === date) ?? null;
}

export function queryDailyVisitRange(
  dailyVisits: DailyVisitSummary[],
  startDate: string,
  endDate: string
): DailyVisitRangeResult {
  const placeCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const sourceCounts = { maps: 0, photos: 0 };
  let daysWithData = 0;

  const byDate = new Map(dailyVisits.map((visit) => [visit.date, visit]));
  const dates = expandDateRange(startDate, endDate);

  for (const date of dates) {
    const visit = byDate.get(date);
    if (!visit) {
      continue;
    }

    daysWithData += 1;
    sourceCounts.maps += visit.sourceCounts.maps;
    sourceCounts.photos += visit.sourceCounts.photos;

    for (const key of visit.placeKeys) {
      placeCounts.set(key, (placeCounts.get(key) ?? 0) + 1);
    }

    for (const key of visit.cityKeys) {
      cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    startDate,
    endDate,
    totalDays: dates.length,
    daysWithData,
    missingDays: dates.length - daysWithData,
    sourceCounts,
    places: sortCountEntries(placeCounts),
    cities: sortCountEntries(cityCounts)
  };
}

export function expandDateSpans(spans: DateSpan[]): string[] {
  return spans.flatMap((span) => expandDateRange(span.startDate, span.endDate));
}

export function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function getOrCreateDay(
  byDate: Map<string, { placeKeys: Set<string>; cityKeys: Set<string> }>,
  date: string
) {
  const existing = byDate.get(date);
  if (existing) {
    return existing;
  }

  const next = { placeKeys: new Set<string>(), cityKeys: new Set<string>() };
  byDate.set(date, next);
  return next;
}

function sortCountEntries(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([key, dayCount]) => ({ key, dayCount }))
    .sort((left, right) => right.dayCount - left.dayCount || left.key.localeCompare(right.key));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/dailyVisitSummary.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```sh
git add src/lib/historySummaryTypes.ts src/lib/dailyVisitSummary.ts src/lib/dailyVisitSummary.test.ts
git commit -m "Add daily visit summary helpers"
```

## Task 2: Import and Validation Integration

**Files:**
- Modify: `src/lib/historyImport.ts`
- Modify: `src/lib/historyStorage.ts`
- Modify: `src/lib/supabaseStore.ts`
- Modify: `src/lib/publicGallery.ts`
- Modify: `src/lib/historyStorage.test.ts`

- [ ] **Step 1: Write failing storage validation test**

Add this case to `src/lib/historyStorage.test.ts`:

```ts
test("parses summaries with optional daily visits", () => {
  const parsed = parseHistorySummary(JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2024-05-20T00:00:00.000Z",
    sourcePointCount: 10,
    places: [],
    cities: [],
    dailyVisits: [
      {
        date: "2024-05-12",
        placeKeys: ["country:840"],
        cityKeys: ["city:san-francisco-us"],
        sourceCounts: { maps: 8, photos: 2 }
      }
    ]
  }));

  expect(parsed.dailyVisits).toEqual([
    {
      date: "2024-05-12",
      placeKeys: ["country:840"],
      cityKeys: ["city:san-francisco-us"],
      sourceCounts: { maps: 8, photos: 2 }
    }
  ]);
});

test("rejects malformed daily visits", () => {
  expect(() => parseHistorySummary(JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2024-05-20T00:00:00.000Z",
    sourcePointCount: 10,
    places: [],
    dailyVisits: [{ date: "05-12-2024", placeKeys: "country:840", cityKeys: [], sourceCounts: {} }]
  }))).toThrow("Invalid history summary JSON");
});
```

- [ ] **Step 2: Run storage tests to verify failure**

Run: `npx vitest run src/lib/historyStorage.test.ts`

Expected: FAIL because malformed `dailyVisits` is currently accepted.

- [ ] **Step 3: Wire daily visit generation into import**

Modify `src/lib/historyImport.ts`:

```ts
import { buildDailyVisits, type DailySourceCounts } from "./dailyVisitSummary";
```

Inside `mergeAndSummarize`, after `cities` is computed:

```ts
  const sourceCountsByDate = buildSourceCountsByDate(mapsPoints, photosPoints, mapsDates);
  const dailyVisits = buildDailyVisits({ places, cities, sourceCountsByDate });
```

Return:

```ts
    places,
    cities,
    dailyVisits
```

Add helper:

```ts
function buildSourceCountsByDate(
  mapsPoints: LocationPoint[],
  photosPoints: LocationPoint[],
  mapsDates: Set<string>
): Map<string, DailySourceCounts> {
  const counts = new Map<string, DailySourceCounts>();

  for (const point of mapsPoints) {
    incrementSourceCount(counts, timestampToDate(point.timestamp), "maps");
  }

  for (const point of photosPoints) {
    const date = timestampToDate(point.timestamp);
    if (!mapsDates.has(date)) {
      incrementSourceCount(counts, date, "photos");
    }
  }

  return counts;
}

function incrementSourceCount(
  counts: Map<string, DailySourceCounts>,
  date: string,
  source: keyof DailySourceCounts
) {
  const existing = counts.get(date) ?? { maps: 0, photos: 0 };
  existing[source] += 1;
  counts.set(date, existing);
}
```

- [ ] **Step 4: Strengthen summary validators**

In `src/lib/historyStorage.ts`, `src/lib/supabaseStore.ts`, and `src/lib/publicGallery.ts`, update `isHistorySummary` to require valid optional `dailyVisits`:

```ts
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.places) &&
    (candidate.dailyVisits === undefined || isDailyVisits(candidate.dailyVisits))
  );
```

Add near each validator:

```ts
function isDailyVisits(value: unknown): boolean {
  return Array.isArray(value) && value.every((visit) => {
    if (!visit || typeof visit !== "object") {
      return false;
    }

    const candidate = visit as {
      date?: unknown;
      placeKeys?: unknown;
      cityKeys?: unknown;
      sourceCounts?: { maps?: unknown; photos?: unknown };
    };

    return (
      typeof candidate.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(candidate.date) &&
      Array.isArray(candidate.placeKeys) &&
      candidate.placeKeys.every((key) => typeof key === "string") &&
      Array.isArray(candidate.cityKeys) &&
      candidate.cityKeys.every((key) => typeof key === "string") &&
      Boolean(candidate.sourceCounts) &&
      typeof candidate.sourceCounts.maps === "number" &&
      typeof candidate.sourceCounts.photos === "number"
    );
  });
}
```

- [ ] **Step 5: Run validation tests**

Run: `npx vitest run src/lib/historyStorage.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```sh
git add src/lib/historyImport.ts src/lib/historyStorage.ts src/lib/supabaseStore.ts src/lib/publicGallery.ts src/lib/historyStorage.test.ts
git commit -m "Store derived daily visits in history summaries"
```

## Task 3: Date Input Helpers

**Files:**
- Create: `src/lib/dateInput.ts`
- Create: `src/lib/dateInput.test.ts`

- [ ] **Step 1: Write failing date input tests**

Create `src/lib/dateInput.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  assistDateInput,
  formatIsoDateForInput,
  isDateRangeValid,
  parseDateInput
} from "./dateInput";

describe("date input helpers", () => {
  test("assists mm-dd-yyyy typing", () => {
    expect(assistDateInput("05122024")).toBe("05-12-2024");
    expect(assistDateInput("05/12/2024")).toBe("05-12-2024");
    expect(assistDateInput("0512")).toBe("05-12");
  });

  test("parses valid mm-dd-yyyy input to yyyy-mm-dd", () => {
    expect(parseDateInput("05-12-2024")).toEqual({ isoDate: "2024-05-12" });
  });

  test("rejects impossible dates", () => {
    expect(parseDateInput("02-31-2024")).toEqual({ error: "Enter a real date in mm-dd-yyyy format." });
  });

  test("formats ISO dates for display in inputs", () => {
    expect(formatIsoDateForInput("2024-05-12")).toBe("05-12-2024");
  });

  test("validates start and end date ordering", () => {
    expect(isDateRangeValid("2024-05-12", "2024-05-14")).toBe(true);
    expect(isDateRangeValid("2024-05-14", "2024-05-12")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/lib/dateInput.test.ts`

Expected: FAIL because `src/lib/dateInput.ts` does not exist.

- [ ] **Step 3: Implement date input helpers**

Create `src/lib/dateInput.ts`:

```ts
export type ParsedDateInput = { isoDate: string } | { error: string };

export function assistDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("-");
}

export function parseDateInput(value: string): ParsedDateInput {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return { error: "Enter a date in mm-dd-yyyy format." };
  }

  const [monthText, dayText, yearText] = value.split("-");
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Enter a real date in mm-dd-yyyy format." };
  }

  return { isoDate: date.toISOString().slice(0, 10) };
}

export function formatIsoDateForInput(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}-${day}-${year}`;
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  return startDate <= endDate;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/lib/dateInput.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```sh
git add src/lib/dateInput.ts src/lib/dateInput.test.ts
git commit -m "Add assisted date input helpers"
```

## Task 4: History Explorer Calendar UI

**Files:**
- Modify: `src/components/HistoryExplorer.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add UI state and derived maps**

In `HistoryExplorer`, add imports:

```ts
import {
  queryDailyVisitRange,
  queryDailyVisits,
  expandDateRange
} from "../lib/dailyVisitSummary";
import {
  assistDateInput,
  formatIsoDateForInput,
  isDateRangeValid,
  parseDateInput
} from "../lib/dateInput";
```

Add state near existing selected state:

```ts
  const initialCalendarDate = summary?.dailyVisits?.[0]?.date ?? new Date().toISOString().slice(0, 10);
  const [calendarMonth, setCalendarMonth] = useState(initialCalendarDate.slice(0, 7));
  const [startDateInput, setStartDateInput] = useState(formatIsoDateForInput(initialCalendarDate));
  const [endDateInput, setEndDateInput] = useState("");
```

Add memoized lookup data:

```ts
  const placesByKey = useMemo(
    () => new Map((summary?.places ?? []).map((place) => [place.key, place])),
    [summary]
  );
  const citiesByKey = useMemo(
    () => new Map((summary?.cities ?? []).map((city) => [city.key, city])),
    [summary]
  );
```

- [ ] **Step 2: Add the calendar section after `history-grid`**

Render below the existing `history-grid`:

```tsx
          <DailyHistoryCalendar
            dailyVisits={summary.dailyVisits}
            placesByKey={placesByKey}
            citiesByKey={citiesByKey}
            readOnly={readOnly}
            calendarMonth={calendarMonth}
            startDateInput={startDateInput}
            endDateInput={endDateInput}
            onCalendarMonthChange={setCalendarMonth}
            onStartDateInputChange={setStartDateInput}
            onEndDateInputChange={setEndDateInput}
          />
```

- [ ] **Step 3: Add helper component in `HistoryExplorer.tsx`**

Add below `DetailsPanel`:

```tsx
function DailyHistoryCalendar({
  dailyVisits,
  placesByKey,
  citiesByKey,
  readOnly,
  calendarMonth,
  startDateInput,
  endDateInput,
  onCalendarMonthChange,
  onStartDateInputChange,
  onEndDateInputChange
}: {
  dailyVisits: LocationHistoryPlaceSummary["dailyVisits"];
  placesByKey: Map<string, VisitedPlaceSummary>;
  citiesByKey: Map<string, CityVisitSummary>;
  readOnly: boolean;
  calendarMonth: string;
  startDateInput: string;
  endDateInput: string;
  onCalendarMonthChange: (value: string) => void;
  onStartDateInputChange: (value: string) => void;
  onEndDateInputChange: (value: string) => void;
}) {
  if (!dailyVisits) {
    return (
      <section className="daily-history-panel">
        <div>
          <p className="eyebrow">Daily lookup</p>
          <h3>Calendar unavailable</h3>
          <p>
            {readOnly
              ? "This published summary was created before daily lookup was available."
              : "Re-import your history to build the daily calendar lookup."}
          </p>
        </div>
      </section>
    );
  }

  const startParsed = parseDateInput(startDateInput);
  const endParsed = endDateInput ? parseDateInput(endDateInput) : null;
  const startDate = "isoDate" in startParsed ? startParsed.isoDate : null;
  const endDate = endParsed && "isoDate" in endParsed ? endParsed.isoDate : startDate;
  const rangeIsValid = Boolean(startDate && endDate && isDateRangeValid(startDate, endDate));
  const dataDates = new Set(dailyVisits.map((visit) => visit.date));
  const selectedDates = rangeIsValid ? new Set(expandDateRange(startDate, endDate)) : new Set<string>();
  const result = startDate && endDate && rangeIsValid
    ? queryDailyVisitRange(dailyVisits, startDate, endDate)
    : null;

  const startError = "error" in startParsed ? startParsed.error : "";
  const endError = endParsed && "error" in endParsed ? endParsed.error : "";
  const rangeError = startDate && endDate && !rangeIsValid ? "End date must be on or after start date." : "";

  return (
    <section className="daily-history-panel">
      <div className="daily-history-controls">
        <div>
          <p className="eyebrow">Daily lookup</p>
          <h3>Where was I?</h3>
        </div>
        <div className="daily-date-fields">
          <label>
            Start
            <input
              value={startDateInput}
              inputMode="numeric"
              placeholder="mm-dd-yyyy"
              onChange={(event) => onStartDateInputChange(assistDateInput(event.target.value))}
            />
          </label>
          <label>
            End
            <input
              value={endDateInput}
              inputMode="numeric"
              placeholder="mm-dd-yyyy"
              onChange={(event) => onEndDateInputChange(assistDateInput(event.target.value))}
            />
          </label>
        </div>
        {[startError, endError, rangeError].filter(Boolean).map((error) => (
          <p className="date-error" key={error}>{error}</p>
        ))}
        <CalendarMonth
          month={calendarMonth}
          dataDates={dataDates}
          selectedDates={selectedDates}
          onMonthChange={onCalendarMonthChange}
          onSelectDate={(date) => {
            onStartDateInputChange(formatIsoDateForInput(date));
            onEndDateInputChange("");
          }}
        />
      </div>
      <DailyHistoryResults
        result={result}
        placesByKey={placesByKey}
        citiesByKey={citiesByKey}
      />
    </section>
  );
}
```

- [ ] **Step 4: Add calendar and result subcomponents**

Add `CalendarMonth`, `DailyHistoryResults`, and date helpers in the same file:

```tsx
function CalendarMonth({
  month,
  dataDates,
  selectedDates,
  onMonthChange,
  onSelectDate
}: {
  month: string;
  dataDates: Set<string>;
  selectedDates: Set<string>;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const days = getCalendarDays(month);
  return (
    <div className="calendar-shell">
      <div className="calendar-header">
        <button type="button" className="secondary" onClick={() => onMonthChange(shiftMonth(month, -1))}>‹</button>
        <strong>{formatCalendarMonth(month)}</strong>
        <button type="button" className="secondary" onClick={() => onMonthChange(shiftMonth(month, 1))}>›</button>
      </div>
      <div className="calendar-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-days">
        {days.map((day) => (
          <button
            type="button"
            key={day.date}
            className={[
              "calendar-day",
              day.inMonth ? "" : "outside-month",
              dataDates.has(day.date) ? "has-data" : "missing-data",
              selectedDates.has(day.date) ? "selected" : ""
            ].filter(Boolean).join(" ")}
            onClick={() => onSelectDate(day.date)}
          >
            {day.label}
          </button>
        ))}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-dot has-data" /> Has data</span>
        <span><i className="legend-dot missing-data" /> Missing</span>
        <span><i className="legend-dot selected" /> Selected</span>
      </div>
    </div>
  );
}

function DailyHistoryResults({
  result,
  placesByKey,
  citiesByKey
}: {
  result: ReturnType<typeof queryDailyVisitRange> | null;
  placesByKey: Map<string, VisitedPlaceSummary>;
  citiesByKey: Map<string, CityVisitSummary>;
}) {
  if (!result) {
    return <div className="daily-history-results"><h3>Select a valid date</h3><p>Use the fields or calendar to choose a day or range.</p></div>;
  }

  const placeResults = result.places.map((item) => ({ ...item, summary: placesByKey.get(item.key) })).filter((item) => item.summary);
  const cityResults = result.cities.map((item) => ({ ...item, summary: citiesByKey.get(item.key) })).filter((item) => item.summary);

  return (
    <div className="daily-history-results">
      <h3>{result.startDate === result.endDate ? result.startDate : `${result.startDate} to ${result.endDate}`}</h3>
      <p>{result.daysWithData} of {result.totalDays} days have summarized data. {result.missingDays} days are missing.</p>
      <div className="daily-result-grid">
        <DailyResultList title="Countries / States" items={placeResults} />
        <DailyResultList title="Cities" items={cityResults} />
      </div>
    </div>
  );
}

function DailyResultList({
  title,
  items
}: {
  title: string;
  items: Array<{ dayCount: number; summary?: { name: string } }>;
}) {
  return (
    <section className="daily-result-list">
      <h4>{title}</h4>
      {items.length === 0 ? <p>No summarized matches.</p> : items.map((item) => (
        <div className="span-row" key={`${title}-${item.summary?.name}`}>
          <span>{item.summary?.name}</span>
          <strong>{item.dayCount} days</strong>
        </div>
      ))}
    </section>
  );
}
```

Add pure local helpers:

```ts
function getCalendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    return {
      date: isoDate,
      label: String(date.getUTCDate()),
      inMonth: isoDate.startsWith(month)
    };
  });
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function formatCalendarMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
```

- [ ] **Step 5: Add CSS**

Append to `src/styles.css` near History styles:

```css
.daily-history-panel {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.55);
  border-radius: 1.5rem;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  padding: 1rem;
}

.daily-history-controls,
.daily-history-results {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.daily-date-fields {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: 1fr 1fr;
}

.daily-date-fields label {
  color: #334155;
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  font-weight: 800;
  gap: 0.35rem;
}

.daily-date-fields input {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  font: inherit;
  padding: 0.65rem 0.85rem;
}

.date-error {
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 800;
  margin: 0;
}

.calendar-shell {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 0.85rem;
}

.calendar-header,
.calendar-legend {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.calendar-header button {
  padding: 0.4rem 0.7rem;
}

.calendar-weekdays,
.calendar-days {
  display: grid;
  gap: 0.35rem;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-top: 0.65rem;
}

.calendar-weekdays span {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 900;
  text-align: center;
}

.calendar-day {
  aspect-ratio: 1;
  border-radius: 0.7rem;
  font-size: 0.85rem;
  padding: 0;
}

.calendar-day.has-data {
  background: #dbeafe;
  color: #1e3a8a;
}

.calendar-day.missing-data {
  background: #ece8df;
  color: #8a7658;
}

.calendar-day.outside-month {
  opacity: 0.35;
}

.calendar-day.selected {
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 0 0 3px #93c5fd;
}

.calendar-legend {
  color: #475569;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 0.65rem;
  justify-content: flex-start;
  margin-top: 0.75rem;
}

.legend-dot {
  border-radius: 999px;
  display: inline-block;
  height: 0.75rem;
  margin-right: 0.25rem;
  vertical-align: -0.1rem;
  width: 0.75rem;
}

.legend-dot.has-data {
  background: #dbeafe;
  border: 1px solid #93c5fd;
}

.legend-dot.missing-data {
  background: #ece8df;
  border: 1px solid #ded6c9;
}

.legend-dot.selected {
  background: #0f172a;
}

.daily-result-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.daily-result-list {
  background: #f8fafc;
  border-radius: 1rem;
  padding: 0.85rem;
}

.daily-result-list h4 {
  margin: 0 0 0.65rem;
}

@media (max-width: 760px) {
  .daily-history-panel,
  .daily-result-grid,
  .daily-date-fields {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run typecheck/build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```sh
git add src/components/HistoryExplorer.tsx src/styles.css
git commit -m "Add daily history calendar UI"
```

## Task 5: Final Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run focused tests**

Run:

```sh
npx vitest run src/lib/dailyVisitSummary.test.ts src/lib/dateInput.test.ts src/lib/historyStorage.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only intentional tracked changes are present, plus unrelated pre-existing untracked files such as `RESEARCH.md` or `.superpowers/` if still present.
