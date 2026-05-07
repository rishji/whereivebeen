# Airports History View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Airports view to the History page using the refined airport-code detection rule, while preserving the current location-history accuracy fixes.

**Architecture:** The app already imports raw Google Maps/Photos points, summarizes them in-browser, and persists only derived summaries. Keep that pattern: derive airport summaries during import, store them in `LocationHistoryPlaceSummary`, and render them in `HistoryExplorer`. Airport detection should use a small curated airport dataset checked into the repo or generated into `src/lib/fixtures/`, not a runtime network dependency.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, existing localStorage/Supabase summary persistence, existing location-history summarizer modules.

---

## Current Session State

Current date: 2026-05-06.

Uncommitted source changes already implemented and verified:

- `src/lib/historySummarizer.ts`
  - Ignores `timeline-path` points for country, US state, and India state summaries.
- `src/lib/citySummarizer.ts`
  - Ignores `timeline-path` points for city summaries.
  - Adds narrow airport city overrides:
    - SFO -> San Francisco
    - MEX -> Mexico City
    - EWR -> New York
- `src/lib/historySummarizer.test.ts`
  - Regression test for ignoring `timeline-path` in place summaries.
- `src/lib/citySummarizer.test.ts`
  - Regression tests for ignoring `timeline-path` in city summaries.
  - Regression tests for SFO, MEX, and EWR overrides.
- `docs/research/location-history-accuracy-research.md`
  - New research note with date accuracy, flight-path, and airport override findings.

Ignored private data regenerated:

- `data/private/location-history-summary.json`
  - `sourcePointCount`: 238,574
  - `placeCount`: 94
  - `cityCount`: 151
  - `generatedAt`: 2026-05-06T14:01:24.235Z

Verification already run after the source changes:

```sh
npx vitest run src/lib/historySummarizer.test.ts src/lib/citySummarizer.test.ts
npm test
npm run build
```

Observed verification output:

- Targeted tests: 14 passed.
- Full tests: 79 passed.
- Build: `tsc && vite build` completed successfully.

Before committing in the next session, rerun:

```sh
npm test
npm run build
```

## Product Decisions Already Made

Presence rule for location summaries:

- Count `visit`, `activity-start`, and `activity-end`.
- Do not count `timeline-path`.
- `timeline-path` is movement context, not visited-place evidence.

Airport override rule for city summaries:

- Only override these airport areas for now:
  - SFO -> San Francisco
  - MEX -> Mexico City
  - EWR -> New York
- Do not add a generic "largest metro nearby" rule. It made San Mateo/Mexico City better but incorrectly collapsed real nearby-city visits such as Oakland.

Airport-code report rule for the new Airports view:

- Use scheduled large/medium airports with IATA codes.
- Match only presence points: `visit`, `activity-start`, `activity-end`.
- Exclude `timeline-path`.
- A day counts for an airport only if at least one `visit` point is within the radius.
- Supporting `activity-start` / `activity-end` points may be counted in `pointCount`, but they should not make a day count by themselves.
- Use a `1.5 km` radius.

Rationale for `1.5 km`:

- `1 km` removed Billy Bishop Toronto but excluded Frankfurt because FRA visit points are commonly about 1.278 km from the airport coordinate.
- `2 km` overcounted more nearby neighborhoods.
- `1.5 km` brings FRA back while keeping most obvious false positives out.

Known caveat:

- YTZ Billy Bishop Toronto appears with 1 day at `1.5 km`; user says they have not been there and have been downtown Toronto. Do not special-case YTZ yet unless requested.

## Full 1.5 km Airport List From Current Data

Rule: scheduled large/medium airports, unique days with at least one `visit` point within `1.5 km`, no `timeline-path`.

| Rank | Code | Days | Airport |
|---:|---|---:|---|
| 1 | SFO | 206 | San Francisco International |
| 2 | SEA | 36 | Seattle-Tacoma |
| 3 | EWR | 32 | Newark Liberty |
| 4 | LHR | 31 | London Heathrow |
| 5 | PIT | 31 | Pittsburgh International |
| 6 | ORD | 26 | Chicago O'Hare |
| 7 | DEL | 23 | Indira Gandhi |
| 8 | PHX | 14 | Phoenix Sky Harbor |
| 9 | MEX | 13 | Mexico City Benito Juarez |
| 10 | LAX | 13 | Los Angeles International |
| 11 | IAH | 11 | Houston Intercontinental |
| 12 | LGA | 11 | LaGuardia |
| 13 | HNL | 8 | Honolulu |
| 14 | LTN | 7 | London Luton |
| 15 | BOM | 7 | Mumbai International |
| 16 | FLL | 7 | Fort Lauderdale |
| 17 | LIS | 7 | Lisbon |
| 18 | FRA | 7 | Frankfurt Main |
| 19 | ARN | 6 | Stockholm-Arlanda |
| 20 | MCO | 6 | Orlando International |
| 21 | NAG | 6 | Nagpur |
| 22 | DEN | 6 | Denver International |
| 23 | SAN | 5 | San Diego |
| 24 | LAS | 5 | Las Vegas Harry Reid |
| 25 | IAD | 5 | Washington Dulles |
| 26 | ONT | 4 | Ontario International |
| 27 | MIA | 4 | Miami International |
| 28 | ZRH | 4 | Zurich |
| 29 | OAK | 4 | Oakland International |
| 30 | BCN | 4 | Barcelona-El Prat |
| 31 | BLR | 4 | Bengaluru |
| 32 | LGW | 4 | London Gatwick |
| 33 | AMS | 3 | Amsterdam Schiphol |
| 34 | BER | 3 | Berlin Brandenburg |
| 35 | FCO | 3 | Rome Fiumicino |
| 36 | SJO | 3 | San Jose, Costa Rica |
| 37 | PTY | 3 | Panama Tocumen |
| 38 | CAI | 3 | Cairo |
| 39 | YVR | 3 | Vancouver |
| 40 | DAY | 3 | Dayton |
| 41 | ATL | 3 | Atlanta |
| 42 | YYZ | 3 | Toronto Pearson |
| 43 | BKK | 3 | Bangkok Suvarnabhumi |
| 44 | SYD | 3 | Sydney |
| 45 | DUB | 3 | Dublin |
| 46 | PGA | 2 | Page Municipal |
| 47 | BLQ | 2 | Bologna |
| 48 | EDI | 2 | Edinburgh |
| 49 | ANC | 2 | Anchorage |
| 50 | OMA | 2 | Omaha |
| 51 | YUL | 2 | Montreal Trudeau |
| 52 | PPT | 2 | Papeete |
| 53 | CUN | 2 | Cancun |
| 54 | SJC | 2 | San Jose International |
| 55 | BNA | 2 | Nashville |
| 56 | CNS | 2 | Cairns |
| 57 | CLE | 2 | Cleveland Hopkins |
| 58 | STN | 2 | London Stansted |
| 59 | TIJ | 2 | Tijuana |
| 60 | AUH | 2 | Abu Dhabi |
| 61 | GAU | 2 | Guwahati |
| 62 | GUA | 2 | Guatemala City |
| 63 | ITO | 2 | Hilo |
| 64 | JLR | 2 | Jabalpur |
| 65 | LPQ | 2 | Luang Prabang |
| 66 | MOZ | 2 | Moorea |
| 67 | MSY | 2 | New Orleans |
| 68 | ORY | 2 | Paris Orly |
| 69 | SJD | 2 | Los Cabos |
| 70 | SMF | 2 | Sacramento |
| 71 | TGZ | 2 | Tuxtla Gutierrez |
| 72 | MUC | 2 | Munich |
| 73 | ELP | 2 | El Paso |
| 74 | KRK | 1 | Krakow |
| 75 | ADD | 1 | Addis Ababa |
| 76 | CDG | 1 | Paris Charles de Gaulle |
| 77 | FON | 1 | La Fortuna Arenal |
| 78 | JFK | 1 | New York JFK |
| 79 | MSP | 1 | Minneapolis-St. Paul |
| 80 | AMD | 1 | Ahmedabad |
| 81 | ASW | 1 | Aswan |
| 82 | BIL | 1 | Billings |
| 83 | BUD | 1 | Budapest |
| 84 | BUR | 1 | Burbank |
| 85 | CVG | 1 | Cincinnati/Northern Kentucky |
| 86 | DFW | 1 | Dallas-Fort Worth |
| 87 | HEL | 1 | Helsinki |
| 88 | IND | 1 | Indianapolis |
| 89 | JDH | 1 | Jodhpur |
| 90 | LCY | 1 | London City |
| 91 | LXR | 1 | Luxor |
| 92 | MAD | 1 | Madrid Barajas |
| 93 | MXP | 1 | Milan Malpensa |
| 94 | OSL | 1 | Oslo Gardermoen |
| 95 | PHL | 1 | Philadelphia |
| 96 | PSP | 1 | Palm Springs |
| 97 | SLC | 1 | Salt Lake City |
| 98 | STV | 1 | Surat |
| 99 | TPA | 1 | Tampa |
| 100 | VIE | 1 | Vienna |
| 101 | YYC | 1 | Calgary |
| 102 | DPS | 1 | Denpasar Bali |
| 103 | INV | 1 | Inverness |
| 104 | MDE | 1 | Medellin |
| 105 | DMK | 1 | Bangkok Don Mueang |
| 106 | YTZ | 1 | Billy Bishop Toronto |

## File Structure For Airports View

Create or modify these files:

- Create `src/lib/airportTypes.ts`
  - Defines `AirportRecord`, `AirportVisitSummary`, `AirportVisitDay`.
- Create `src/lib/airportData.ts`
  - Exports a curated array of scheduled large/medium airports with IATA code.
  - Initial data source: OurAirports `airports.csv`.
  - Prefer committing only required fields: `iata`, `name`, `municipality`, `countryCode`, `latitude`, `longitude`.
- Create `src/lib/airportSummarizer.ts`
  - Summarizes airport visits using the 1.5 km visit-day rule.
- Create `src/lib/airportSummarizer.test.ts`
  - Tests the exact day-count rule and radius behavior.
- Modify `src/lib/historySummaryTypes.ts`
  - Add optional `airports?: AirportVisitSummary[]` to `LocationHistoryPlaceSummary`.
- Modify `src/lib/historyImport.ts`
  - Derive airport summaries during `mergeAndSummarize`.
- Modify `scripts/summarize-location-history.ts`
  - Include airport summaries in private CLI output.
- Modify `src/components/HistoryExplorer.tsx`
  - Add an Airports section/view on the History page.
  - Show IATA code, airport name, day count, first/last dates.
  - Add detail view similar to cities/places if practical.
- Modify `src/lib/historyImport.test.ts`
  - Assert airport summaries are emitted during import.

## Data Model

Use these TypeScript shapes:

```ts
export type AirportRecord = {
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type AirportVisitSummary = {
  key: string;
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  dayCount: number;
  pointCount: number;
  visitPointCount: number;
  firstDate: string;
  lastDate: string;
  dateSpans: DateSpan[];
};
```

`key` format should be `airport:SFO`.

## Airport Summarizer Algorithm

Use this behavior:

1. Filter out `timeline-path`.
2. For each point, find the nearest airport within `1.5 km`.
3. Add the point to that airport's `pointCount`.
4. Only add the date to that airport's unique visit days when `point.source === "visit"`.
5. `visitPointCount` counts only `visit` points within radius.
6. Sort by `dayCount desc`, then `visitPointCount desc`, then `name asc`.

Use `timestampToDate(point.timestamp, point.latitude, point.longitude)` for dates.

## Task 1: Add Airport Types And Summarizer

**Files:**

- Create: `src/lib/airportTypes.ts`
- Create: `src/lib/airportSummarizer.ts`
- Create: `src/lib/airportSummarizer.test.ts`

- [ ] **Step 1: Write failing tests**

Add `src/lib/airportSummarizer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeVisitedAirports } from "./airportSummarizer";
import type { AirportRecord } from "./airportTypes";
import type { LocationPoint } from "./locationHistoryTypes";

const airport: AirportRecord = {
  iata: "TST",
  name: "Test International Airport",
  municipality: "Testville",
  countryCode: "TS",
  latitude: 10,
  longitude: 10
};

describe("airport summarizer", () => {
  it("counts only visit days within 1.5 km while retaining supporting point counts", () => {
    const points: LocationPoint[] = [
      { timestamp: "2020-01-01T10:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-start" },
      { timestamp: "2020-01-01T11:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "visit" },
      { timestamp: "2020-01-01T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-end" },
      { timestamp: "2020-01-02T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "activity-end" },
      { timestamp: "2020-01-03T12:00:00.000Z", latitude: 10.001, longitude: 10.001, source: "timeline-path" }
    ];

    expect(summarizeVisitedAirports(points, [airport])).toEqual([
      {
        key: "airport:TST",
        iata: "TST",
        name: "Test International Airport",
        municipality: "Testville",
        countryCode: "TS",
        dayCount: 1,
        pointCount: 4,
        visitPointCount: 1,
        firstDate: "2020-01-01",
        lastDate: "2020-01-01",
        dateSpans: [{ startDate: "2020-01-01", endDate: "2020-01-01", dayCount: 1 }]
      }
    ]);
  });

  it("does not count visits outside the airport radius", () => {
    const points: LocationPoint[] = [
      { timestamp: "2020-01-01T10:00:00.000Z", latitude: 10.03, longitude: 10.03, source: "visit" }
    ];

    expect(summarizeVisitedAirports(points, [airport])).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```sh
npx vitest run src/lib/airportSummarizer.test.ts
```

Expected: fail because `airportSummarizer` and `airportTypes` do not exist.

- [ ] **Step 3: Implement types**

Create `src/lib/airportTypes.ts`:

```ts
import type { DateSpan } from "./historySummaryTypes";

export type AirportRecord = {
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type AirportVisitSummary = {
  key: string;
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  dayCount: number;
  pointCount: number;
  visitPointCount: number;
  firstDate: string;
  lastDate: string;
  dateSpans: DateSpan[];
};
```

- [ ] **Step 4: Implement summarizer**

Create `src/lib/airportSummarizer.ts`:

```ts
import { compressDateSpans, timestampToDate } from "./historySummarizer";
import type { AirportRecord, AirportVisitSummary } from "./airportTypes";
import type { LocationPoint } from "./locationHistoryTypes";

export const defaultAirportMatchRadiusKm = 1.5;

type AirportAccumulator = {
  airport: AirportRecord;
  dates: Set<string>;
  pointCount: number;
  visitPointCount: number;
};

export function summarizeVisitedAirports(
  points: LocationPoint[],
  airports: AirportRecord[],
  matchRadiusKm = defaultAirportMatchRadiusKm
): AirportVisitSummary[] {
  const accumulators = new Map<string, AirportAccumulator>();

  for (const point of points) {
    if (point.source === "timeline-path") {
      continue;
    }

    const airport = findNearestAirport(point, airports, matchRadiusKm);
    if (!airport) {
      continue;
    }

    const accumulator = accumulators.get(airport.iata) ?? {
      airport,
      dates: new Set<string>(),
      pointCount: 0,
      visitPointCount: 0
    };

    accumulator.pointCount += 1;

    if (point.source === "visit") {
      accumulator.visitPointCount += 1;
      accumulator.dates.add(timestampToDate(point.timestamp, point.latitude, point.longitude));
    }

    accumulators.set(airport.iata, accumulator);
  }

  return Array.from(accumulators.values())
    .filter(({ dates }) => dates.size > 0)
    .map(({ airport, dates, pointCount, visitPointCount }) => {
      const sortedDates = Array.from(dates).sort();

      return {
        key: `airport:${airport.iata}`,
        iata: airport.iata,
        name: airport.name,
        municipality: airport.municipality,
        countryCode: airport.countryCode,
        dayCount: sortedDates.length,
        pointCount,
        visitPointCount,
        firstDate: sortedDates[0],
        lastDate: sortedDates[sortedDates.length - 1],
        dateSpans: compressDateSpans(sortedDates)
      };
    })
    .sort((left, right) => {
      if (right.dayCount !== left.dayCount) {
        return right.dayCount - left.dayCount;
      }

      if (right.visitPointCount !== left.visitPointCount) {
        return right.visitPointCount - left.visitPointCount;
      }

      return left.name.localeCompare(right.name);
    });
}

function findNearestAirport(
  point: LocationPoint,
  airports: AirportRecord[],
  matchRadiusKm: number
): AirportRecord | null {
  let nearestAirport: AirportRecord | null = null;
  let nearestDistanceKm = matchRadiusKm;

  for (const airport of airports) {
    const distanceKm = distanceBetweenCoordinatesKm(
      point.latitude,
      point.longitude,
      airport.latitude,
      airport.longitude
    );

    if (distanceKm <= nearestDistanceKm) {
      nearestAirport = airport;
      nearestDistanceKm = distanceKm;
    }
  }

  return nearestAirport;
}

function distanceBetweenCoordinatesKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number {
  const earthRadiusKm = 6371;
  const deltaLatitude = degreesToRadians(latitudeB - latitudeA);
  const deltaLongitude = degreesToRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(degreesToRadians(latitudeA)) *
      Math.cos(degreesToRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

- [ ] **Step 5: Verify tests pass**

Run:

```sh
npx vitest run src/lib/airportSummarizer.test.ts
```

Expected: pass.

## Task 2: Add Airport Data

**Files:**

- Create: `src/lib/airportData.ts`
- Optional tooling: one-off script outside committed code to transform OurAirports CSV into TypeScript records.

- [ ] **Step 1: Create airport data module**

Create `src/lib/airportData.ts` with a curated list exported as:

```ts
import type { AirportRecord } from "./airportTypes";

export const airportRecords: AirportRecord[] = [
  {
    iata: "SFO",
    name: "San Francisco International Airport",
    municipality: "San Francisco",
    countryCode: "US",
    latitude: 37.621313,
    longitude: -122.378955
  }
];
```

Populate it from OurAirports scheduled large/medium airports with IATA codes. It is okay if this file is several thousand lines; do not fetch airport data at runtime.

- [ ] **Step 2: Add data smoke test**

Create `src/lib/airportData.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { airportRecords } from "./airportData";

describe("airport data", () => {
  it("includes known airports used by overrides and reports", () => {
    expect(airportRecords.some((airport) => airport.iata === "SFO")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MEX")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "EWR")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "FRA")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MUC")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MIA")).toBe(true);
  });
});
```

- [ ] **Step 3: Run data tests**

Run:

```sh
npx vitest run src/lib/airportData.test.ts
```

Expected: pass.

## Task 3: Persist Airport Summaries

**Files:**

- Modify: `src/lib/historySummaryTypes.ts`
- Modify: `src/lib/historyImport.ts`
- Modify: `scripts/summarize-location-history.ts`
- Modify: `src/lib/historyImport.test.ts`

- [ ] **Step 1: Write failing import test**

In `src/lib/historyImport.test.ts`, extend the existing `mergeAndSummarize` test to assert `summary.airports` exists when an airport point is present. Use a stubbed airport dataset if needed by exporting `airportRecords` and using real SFO-like point coordinates.

- [ ] **Step 2: Add type field**

In `src/lib/historySummaryTypes.ts`:

```ts
import type { AirportVisitSummary } from "./airportTypes";

export type LocationHistoryPlaceSummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourcePointCount: number;
  sourcePointCounts?: { maps: number; photos: number };
  places: VisitedPlaceSummary[];
  cities?: CityVisitSummary[];
  airports?: AirportVisitSummary[];
  dailyVisits?: DailyVisitSummary[];
};
```

- [ ] **Step 3: Add summarization to import**

In `src/lib/historyImport.ts`:

```ts
import { airportRecords } from "./airportData";
import { summarizeVisitedAirports } from "./airportSummarizer";
```

Inside `mergeAndSummarize`, after `cities`:

```ts
const airports = summarizeVisitedAirports(merged, airportRecords);
```

Add `airports` to the returned summary object.

- [ ] **Step 4: Add summarization to CLI**

In `scripts/summarize-location-history.ts`, import `airportRecords` and `summarizeVisitedAirports`, compute `airports`, and add it to the `summary`.

- [ ] **Step 5: Run tests**

Run:

```sh
npx vitest run src/lib/historyImport.test.ts src/lib/airportSummarizer.test.ts src/lib/airportData.test.ts
```

Expected: pass.

## Task 4: Render Airports In History

**Files:**

- Modify: `src/components/HistoryExplorer.tsx`
- Modify: `src/components/HistoryExplorer.test.tsx`

- [ ] **Step 1: Write failing UI test**

In `src/components/HistoryExplorer.test.tsx`, add a summary fixture containing:

```ts
airports: [
  {
    key: "airport:SFO",
    iata: "SFO",
    name: "San Francisco International Airport",
    municipality: "San Francisco",
    countryCode: "US",
    dayCount: 206,
    pointCount: 639,
    visitPointCount: 255,
    firstDate: "2013-01-01",
    lastDate: "2026-01-01",
    dateSpans: [{ startDate: "2026-01-01", endDate: "2026-01-01", dayCount: 1 }]
  }
]
```

Assert that the page renders an Airports section and shows `SFO`, `San Francisco International Airport`, and `206 days`.

- [ ] **Step 2: Render airports group**

In `HistoryExplorer.tsx`, add:

- `airportSummaries = summary.airports ?? []`
- A new group titled `Airports`
- Rows showing `IATA`, airport name, and days.

Keep styling consistent with existing city/place groups. Do not add a landing page or decorative layout.

- [ ] **Step 3: Add airport detail**

If selected, show:

- IATA code
- airport name
- municipality/country
- `dayCount`
- `firstDate` / `lastDate`
- date spans

Reuse the existing detail-panel pattern rather than inventing a new layout.

- [ ] **Step 4: Run UI tests**

Run:

```sh
npx vitest run src/components/HistoryExplorer.test.tsx
```

Expected: pass.

## Task 5: Regenerate And Verify

**Files:**

- Regenerate ignored private file: `data/private/location-history-summary.json`
- No commit for ignored private data.

- [ ] **Step 1: Regenerate local summary**

Run with approval if sandbox requests it:

```sh
npm run summarize:history
```

Expected output should include `airports` only if the script output is updated to print the count. If not, inspect:

```sh
jq '{airports: (.airports | length), topAirports: [.airports[0:10][] | {iata, dayCount}]}' data/private/location-history-summary.json
```

- [ ] **Step 2: Run full verification**

Run:

```sh
npm test
npm run build
```

Expected:

- All tests pass.
- Build succeeds.

- [ ] **Step 3: Manual browser check**

Start dev server:

```sh
npm run dev
```

Open the app and verify:

- History page shows Airports.
- SFO appears at or near top.
- FRA, MUC, and MIA appear.
- The daily calendar still does not show Dec 31, 2023 flyover artifacts for Canada, Idaho, Montana, Nottingham, Manchester, or Glasgow.

## Commit Guidance

Recommended commit split:

1. `fix: filter movement paths from history summaries`
   - Include current uncommitted source changes for timeline filtering and airport city overrides.
   - Include tests and research doc.
2. `feat: summarize airport visits`
   - Include airport types, data, summarizer, and import integration.
3. `feat: show airports in history`
   - Include `HistoryExplorer` UI and tests.

Do not commit:

- `data/private/location-history-summary.json`
- Any generated raw private data.

## Next Session Start Checklist

- [ ] Read this file.
- [ ] Run `git status --short`.
- [ ] Confirm the current uncommitted changes are still present.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Decide whether to commit the already-completed timeline/airport override fix before starting the Airports view.
- [ ] Start Task 1 above using TDD.

