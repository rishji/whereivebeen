# AGENTS.md

Codebase documentation for AI agents working in the `where-ive-been` repository.

## Agent Workflow

Follow the workspace policy in `/Users/rishi/Projects/AGENTS.md` — it includes session workflow trigger phrases and the pointer to the vault for session entry format.

## Commands

```sh
npm run dev              # Vite dev server
npm run build            # tsc + vite build → dist/
npm test                 # vitest run (single pass)
npm run test:watch       # vitest watch mode
npm run ingest:history -- /path/to/location-history.json   # CLI: extract points → data/private/
npm run summarize:history                                   # CLI: summarize points → data/private/
```

Run a single test file:
```sh
npx vitest run src/lib/historySummarizer.test.ts
```

The app is deployed to GitHub Pages at `/whereivebeen/` (set as `base` in `vite.config.ts`).

## Architecture Overview

**Stack:** React 18 + TypeScript + Vite, no CSS framework, no routing library, Supabase for auth and cloud sync, deployed to GitHub Pages.

### Three-tab app (`src/App.tsx`)

`App` owns the top-level state and renders three tab pages behind a `activePage` state variable:

| Tab | Component | What it does |
|-----|-----------|--------------|
| Editable Map | `EditableMap` | Clickable SVG world/US/India map; click cycles place status |
| History | `HistoryExplorer` | Import Google Takeout JSON; view derived place/city summary |
| Public Gallery | `PublicGallery` | Read-only view of users who opted into sharing |

### State and persistence layers

There are two parallel persistence concerns — **place statuses** (map marks) and **history summary** (derived from location history) — each with the same two-layer pattern:

1. **localStorage** — always used, survives reloads. Keys: `where-ive-been.place-statuses.v1` and `where-ive-been.location-history-summary.v1`.
2. **Supabase** — used when signed in. On sign-in, remote wins if a row exists; otherwise local is pushed up. All subsequent changes are synced immediately.

`supabaseClient` in `src/lib/supabase.ts` is `null` when env vars are absent, so all Supabase calls guard with `if (!supabaseClient) return`.

### Supabase tables (`supabase/schema.sql`)

| Table | Columns | Notes |
|-------|---------|-------|
| `map_statuses` | `user_id PK`, `payload jsonb` | Full `PlaceStatuses` object stored as JSONB |
| `history_summaries` | `user_id PK`, `payload jsonb` | Full `LocationHistoryPlaceSummary` stored as JSONB |
| `user_profiles` | `user_id PK`, `display_name`, `is_public` | Controls public gallery opt-in |

All three tables have RLS policies (authenticated users can only touch their own rows). The `list_public_gallery()` SQL function joins all three and is callable by `anon` — it's how the public gallery works without auth.

### Location history pipeline (`src/lib/`)

When a user imports a Google Takeout `location-history.json`:

```
File → parseGoogleLocationHistory()     (locationHistoryParser.ts)
      → LocationPoint[]
      → summarizeVisitedPlaces()         (historySummarizer.ts)   fetches boundary GeoJSON from CDN
      → VisitedPlaceSummary[]
      → summarizeVisitedCities()         (citySummarizer.ts)      fetches Natural Earth cities from CDN
      → CityVisitSummary[]
      → LocationHistoryPlaceSummary      saved to localStorage + Supabase
```

All processing happens in the browser. Raw points are never stored or sent anywhere — only the derived summary is persisted.

**Point sources parsed from Takeout entries:**
- `visit.topCandidate.placeLocation` → `"visit"` source
- `activity.start` / `activity.end` → `"activity-start"` / `"activity-end"` sources
- `timelinePath[].point` → `"timeline-path"` source

**Geo containment:** `d3-geo`'s `geoContains` does the point-in-polygon check against TopoJSON/GeoJSON boundaries fetched from CDNs at import time. A bounding-box pre-filter (`isPointInBounds`) avoids running the expensive check for clearly out-of-bounds points.

### Map rendering (`src/components/EditableMap.tsx`)

The map is a custom SVG rendered with `d3-geo`. Boundary data is fetched from three CDN sources defined in `src/lib/mapSources.ts`:

- **Countries:** `world-atlas` TopoJSON (110m)
- **US states:** `us-atlas` TopoJSON (10m)
- **India states:** GeoJSON from `geohacker/india` on GitHub

Place keys follow the format `scope:id` (e.g. `country:356`, `us-state:CA`, `india-state:Maharashtra`).

### Auth (`src/lib/auth.ts`, `src/lib/useSupabaseSession.ts`, `src/components/AuthPanel.tsx`)

Magic-link email login via Supabase Auth. `useSupabaseSession` is a hook that subscribes to `supabase.auth.onAuthStateChange`. No passwords are stored.

### Public gallery (`src/lib/publicGallery.ts`, `src/components/PublicGallery.tsx`)

`PublicGalleryEntry` contains `displayName`, `mapPayload` (PlaceStatuses), and `historyPayload` (LocationHistoryPlaceSummary). Fetched via the `list_public_gallery()` RPC, which is readable by anonymous users. Each gallery entry renders a read-only `HistoryExplorer` (with `readOnly={true}`).

### CLI scripts (`scripts/`)

Optional debugging tools that run with `tsx`. They write to `data/private/` which is git-ignored. They are not part of the browser build.

## Key type relationships

```
PlaceStatus = "visited" | "lived" | "wantToVisit"
PlaceStatuses = Record<string, PlaceStatus>          // keyed by "scope:id"

LocationPoint = { timestamp, latitude, longitude, source, placeId? }

VisitedPlaceSummary = { key, scope, id, name, dayCount, firstDate, lastDate, dateSpans }
DateSpan = { startDate, endDate, dayCount }

LocationHistoryPlaceSummary = {
  schemaVersion: 1, generatedAt, sourcePointCount,
  places: VisitedPlaceSummary[],
  cities?: CityVisitSummary[]
}
```

## Tests

Tests use Vitest + jsdom + `@testing-library/react`. Test files sit next to the modules they test (e.g. `historySummarizer.test.ts`). Test fixtures live in `src/lib/fixtures/`. The setup file is `src/test/setup.ts`.

## Environment variables

Required to enable Supabase (set in `.env.local` for dev, repository secrets for CI/CD):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

See `.env.example` for the template. Without these, the app runs fully offline using localStorage only.
