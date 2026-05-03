# Where I've Been

A personal travel atlas for marking countries, US states, and India states as visited, lived there,
or want to visit.

## Phase 1

- Static React + Vite + TypeScript site.
- Clickable SVG map using `react-simple-maps`.
- Local browser persistence through `localStorage`.
- JSON export/import for backup and future migration.

## Commands

```sh
npm install
npm run dev
npm test
npm run build
npm run ingest:history -- /Users/rishi/Downloads/location-history.json
npm run summarize:history
```

## Data Model

Map state is stored as:

```json
{
  "schemaVersion": 1,
  "statuses": {
    "country:356": "visited",
    "us-state:CA": "lived",
    "india-state:Maharashtra": "wantToVisit"
  }
}
```

## Phase 2 Direction

Google Takeout Location History can be imported directly in the History tab. The browser derives a
place summary and stores only that summary in localStorage. Raw location history should not be
committed or published.

The CLI scripts are optional debugging tools. They write exact extracted points and derived summaries
to `data/private/`, which is ignored by Git.
