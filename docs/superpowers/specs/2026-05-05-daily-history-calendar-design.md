# Daily History Calendar Design

## Goal

Add a bottom section to History Explorer that lets a user look up where they were on a selected date or continuous date range. The lookup uses a derived daily summary, not raw location points, so the app keeps its existing privacy posture while supporting day-level exploration.

## Current Context

The app currently imports Google Maps Timeline and optional Google Photos metadata in the browser, converts raw points into country/state/city summaries, and persists only the derived `LocationHistoryPlaceSummary`. Raw points are held in memory during import and discarded after summarization or reload.

The existing saved summary includes per-place and per-city `dateSpans`, but it does not include a direct per-day index. Date lookups could be inferred from spans, but a daily index is better for calendar coverage, range counts, missing-day visibility, and future UI performance.

## Data Model

Extend `LocationHistoryPlaceSummary` with an optional `dailyVisits` array.

```ts
export type DailyVisitSummary = {
  date: string; // yyyy-mm-dd
  placeKeys: string[];
  cityKeys: string[];
  sourceCounts: {
    maps: number;
    photos: number;
  };
};
```

The daily summary stores no latitude, longitude, timestamp, point ID, place coordinates, or ordered movement trail. It stores only:

- the calendar date
- normalized place keys already used by the app, such as `country:840` or `us-state:CA`
- city keys from the existing city summarizer
- source counts for data coverage context

Existing summaries without `dailyVisits` remain valid. When `dailyVisits` is absent, the calendar section shows a re-import prompt rather than failing.

## Import Flow

During import and merge:

1. Parse Maps and Photos points as today.
2. Build country/state summaries as today.
3. Build city summaries as today.
4. Build `dailyVisits` from the same summarized place/city date memberships.
5. Save the extended summary locally and, when signed in, to Supabase.

The builder derives day membership from existing `dateSpans` instead of storing raw points. That keeps one source of truth for the summarized places and cities while producing a compact lookup index.

## Query Behavior

For a single selected date:

- If the date exists in `dailyVisits`, show matching countries, states, and cities.
- If the date is missing, show an empty state that clearly says there is no summarized data for that date.

For a continuous date range:

- Include only days in the range that exist in `dailyVisits`.
- Roll up all matching places and cities across those days.
- Show each result with the number of matched days within the selected range.
- Show coverage counts: total days in range, days with data, and missing days.

The range is start/end only. Non-contiguous multi-select is out of scope for this iteration.

## Calendar UI

Add a bottom section beneath the current History Explorer summary grid.

The section includes:

- `mm-dd-yyyy` start input
- optional `mm-dd-yyyy` end input
- a month calendar picker
- previous/next month controls
- coverage legend
- grouped results for countries, states, and cities

Calendar day states:

- dates with data use a light blue treatment
- missing dates use a muted light beige-gray treatment
- selected date/range uses the existing dark app accent, with selected in-range days distinguishable from unselected data days
- days outside the visible month are visually muted or omitted

Typed date input assists by stripping non-digits, inserting dashes, validating real dates, and converting valid values to internal `yyyy-mm-dd`.

## Public Gallery

Published read-only summaries may include `dailyVisits` if the owner has re-imported after this feature ships. The public gallery can render the calendar for those summaries because it already exposes date spans. If `dailyVisits` is missing, read-only profiles show the same unavailable state.

## Error Handling

- Invalid typed dates show inline validation and do not update the selected query.
- End dates before start dates show inline validation.
- Summaries without `dailyVisits` show a re-import prompt for owners and a neutral unavailable message for read-only gallery viewers.
- Empty result dates show a missing-data state, not an error.

## Testing

Add focused Vitest coverage for:

- building daily visits from place and city date spans
- querying one date
- querying date ranges and returning matched-day counts
- identifying missing days in a range
- parsing and formatting `mm-dd-yyyy` dates
- storage/public-gallery validators accepting optional `dailyVisits`

Component tests can stay limited to the new pure helpers unless the UI behavior becomes complex enough to justify jsdom interaction tests.

## Non-Goals

- Persisting raw location points
- Showing exact coordinates, route order, or time-of-day movement
- Supporting non-contiguous multi-date selection
- Changing Supabase table shape; the payload remains JSONB
- Backfilling existing summaries without re-import
