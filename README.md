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

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Set the repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Redeploy the GitHub Pages workflow.

The app uses email magic-link login. Signed-in users get per-account map/status and history syncing;
unsigned users keep using local browser storage only.

## Privacy and Sharing

- Anonymous visitors can edit the map and import location history locally in their browser.
- Signing in syncs the local map state and derived history summary to the user's private Supabase rows.
- Raw Google Takeout data is processed in the browser and is not stored in Supabase.
- Synced data is private by default.
- A signed-in user can opt in to the public gallery with a display name. Public gallery entries are
  read-only and visible to any visitor, including signed-out visitors.
- Turning the public gallery toggle off removes that user's data from the gallery while preserving
  their private synced copy.
