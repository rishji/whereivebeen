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

Google Takeout Location History should be processed locally into derived JSON artifacts before
being loaded by the web app. Raw location history should not be committed or published.
