# Where I've Been — Product & Code Evaluation

## Executive Summary

"Where I've Been" is a well-executed, lightweight travel atlas with strong fundamentals. The codebase is clean, TypeScript-first, and properly tested. It solves a real problem—tracking travel at a glance—with tasteful UX. However, it's currently a **single-feature product** (the map) with a useful-but-incomplete secondary feature (history). To become genuinely differentiated, it needs either deeper single-user features (stats, timeline, integration with other travel data) or social/gamification angles.

The biggest opportunity is recognizing this isn't a "map app"—it's a **travel memory and analytics engine** waiting to exist. Most viable near-term wins involve better visualization of the data already being captured.

---

## 1. Product Assessment

### Core Value Proposition

"Where I've Been" lets users mark countries, US states, and India states on a map as visited, lived, or want-to-visit. State persists locally and syncs across devices when signed in. It's positioned as a personal travel atlas—a lightweight, low-friction way to visually track your footprint.

### Audience & Positioning

- **Primary**: Self-aware travelers (backpackers, frequent fliers, expats) who care about stats ("how many countries have I been to?") and like visual tools.
- **Secondary**: People exporting Google Maps Timeline for memory preservation / nostalgia.
- **Tertiary**: Couples/families wanting shared travel records (not currently supported).

The implicit audience is **upper-middle-income, educated, with global mobility**. The product doesn't serve "local travelers" or people focused on specific regions.

### What Makes It Compelling

1. **Frictionless to start**: No signup required; click a country, state persists. That's it.
2. **Elegant simplicity**: Three statuses (visited, lived, want-to-visit) are just enough without being prescriptive.
3. **Privacy-first by design**: Raw location history never leaves the browser; only summaries sync to Supabase.
4. **History-aware**: Importing Google Takeout yields per-place summaries (days, date ranges, cities 500k+), showing users what their data actually means.
5. **Public gallery**: Opt-in sharing of maps and history lets users celebrate their travel without pressure.
6. **No clutter**: Two-tab UI, clean typography, intentional restraint.

### Critical Gaps

The product is **aspirational but incomplete**:

1. **Map coverage is narrow**: Only countries + US states + India states. Missing:
   - Canadian provinces, Australian states, European regions (Schengen?), Japanese prefectures.
   - Practical for Rishi (US/India focused) but globally limiting.

2. **History visualization is flat**: The current UI shows a list of places sorted by days. No:
   - Timeline view showing when trips happened.
   - Heatmap of visit intensity over time.
   - Year-by-year progression.
   - Comparison ("visited more countries in 2023 than 2022").

3. **No true travel stats**: Core travelers want:
   - Total days traveled per year / cumulative.
   - UN countries % coverage.
   - Countries visited / continents / regions.
   - Streaks (consecutive days traveling, consecutive months with a trip).

4. **"Want to visit" is a dead end**: It's marked but not actionable. No:
   - "Plan a trip" feature tying it to calendar / itineraries.
   - "Trip planner" suggesting when/how to visit.

5. **No integration with reality**: Travelers use:
   - Foursquare/Swarm (check-ins).
   - Instagram (geotagged posts).
   - Flight records (frequent flier apps, email confirmations).
   - Photos (EXIF location data).
   
   The app doesn't consume these signals.

6. **Social is performative-only**: The public gallery lets you show off a map, but there's no:
   - Comparisons ("we've both been to France").
   - Shared trips or collaborative maps.
   - Activity feed ("X visited Y new countries").
   - Leaderboards (not everyone wants this, but some travelers do).

7. **No export/sharing beyond "look at my map"**:
   - No shareable stats ("I've been to 47 countries").
   - No embeddable widget for a blog.
   - No PDF report.

---

## 2. UX and Design Issues

### Discoverability: Is the Map Clickable?

**Critical gap**: The lede text says "Click any place to cycle through visited, lived there, want to visit, and blank." This is explicit, but:
- First-time visitors may not try clicking if they treat maps as read-only (common in web design).
- No hover state or instruction hints before interaction.
- The SVG has `role="img"` for the map and `role="button"` for regions, but no visible affordances.

**Recommendation**: Add a subtle "Click a region" animation on first load (e.g., a country outline pulsing for 2 seconds), or show a tooltip on hover: "Click to mark as visited."

### Mobile Responsiveness

The app uses an SVG map capped at `min(82vh, 900px)` with a `1200px` viewBox. On a 375px mobile screen:
- The map is legible but the SVG doesn't downscale the stroke width or label sizes (there are no labels, which helps).
- US states and India states may be too small to click reliably on mobile.
- The layout switches to single-column at 760px, which is good.

**Issue**: No touch-friendly affordances (e.g., pinch-to-zoom on the map). Countries are reasonably sized, but small island nations are impossible to tap.

**Recommendation**: Add SVG touch targets with invisible circles around small regions, or support pinch-zoom.

### Accessibility Issues

1. **Color contrast**: 
   - Visited: `#2563eb` (blue) on white background has ~4.5:1 contrast—barely WCAG AA for text, not ideal for large areas.
   - Lived: `#dc2626` (red) on white has ~5.5:1—acceptable.
   - Want-to-visit: `#16a34a` (green) on white has ~4:1—acceptable.
   - Blank/default: `#eadfc8` (tan) on white—visually distinct but not a concern.
   
   **Verdict**: Colors pass WCAG AA for non-text. No blocking issue, but the blue is borderline. Consider slightly darker blue or higher-saturation colors.

2. **Keyboard navigation**: The map has `tabIndex={0}` per region and Enter/Space support. Works correctly. Legend doesn't need keyboard focus (passive info).

3. **Screen reader**: The map has `aria-label="Editable travel map"` and each region has `aria-label={name}: {status}`. Good, but screen reader users won't discover the click interaction easily. Consider `role="region"` with descriptive `aria-description`.

4. **Missing loading state**: When map data loads (async), there's no skeleton or spinner. The map renders blank until features arrive.

5. **Missing error state**: If a map layer fails to load, the fallback is a red error message in `.map-fallback`. Works but is jarring.

### Confusing Flows

1. **History import**: The instructions say "Select only Location History or Timeline" from Google Takeout. But Takeout's UI has changed. The exact steps may not match what users see in 2026. 
   - **Recommendation**: Add a screenshot or video walkthrough, or link directly to a help page.

2. **Auth recovery**: No "resend magic link" UI if the first one bounced. Users stuck waiting.

3. **Empty states**: 
   - History tab shows a message "Import your Google Takeout Location History JSON" with a dangling `<code>` tag (`location-history.json`). This is clear but could be a full placeholder card.
   - The public gallery says "No one has published data to the gallery yet" which is accurate but not motivating.

4. **Syncing feedback**: When a user signs in, the app loads remote map/history and syncs. The messages ("Loading...", "Loaded...", "Created a cloud copy...") are in a status element, which is right. But there's no explicit indication of which data came from local vs. remote if there's a merge conflict (unlikely, but possible).

---

## 3. Code Quality and Bugs

### Strengths

1. **Type safety**: Full TypeScript, no `any` casts found. Good schema validation in parsers.
2. **Tests**: 31 tests across 7 files, covering:
   - Place state (cycle, import/export, storage).
   - History summarization (date compression, place matching).
   - City detection (radius matching, nearest-city logic).
   - Public gallery parsing.
   - Map data extraction.
   - All passing. No test skips or TODOs.

3. **Error handling**: Try-catch blocks in async operations, user-facing error messages instead of silent failures.

4. **Separation of concerns**: 
   - Lib code handles parsing, storage, Supabase APIs.
   - Components handle rendering and state.
   - Supabase store abstracts DB operations.

### Bugs and Edge Cases

#### 1. **History Summarizer: Date Parsing Off-by-One Risk**

`historySummarizer.ts`, line 35-44:

```typescript
export function timestampToDate(timestamp: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(timestamp)) {
    return timestamp.slice(0, 10);
  }

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  return date.toISOString().slice(0, 10);
}
```

**Issue**: If a timestamp like `"2011-09-12T06:31:54-04:00"` is passed (with timezone offset), the regex matches and returns the substring—which is correct (local date, not UTC-shifted). But the test only checks timestamps with timezone offset. If a timestamp arrives in UTC (`"2011-09-12T06:31:54Z"`) but the user is in UTC-4, the date will be off by one.

**Verdict**: Unlikely to happen (Google Takeout uses local time), but the code assumes the timestamp string is always in a specific format. Test coverage is there, so it's low-risk. Consider adding a comment explaining the assumption.

#### 2. **City Matching: Haversine Distance Has ~1% Precision Loss**

`citySummarizer.ts`, lines 115-131:

```typescript
function distanceBetweenCoordinatesKm(...): number {
  const earthRadiusKm = 6371;
  // ...haversine formula
}
```

Using Earth radius 6371 km is standard but loses ~1% precision. For the 50 km default match radius, this is negligible. But if someone imports a huge city database (thousands of points) or uses a 1 km radius, the accumulation could cause subtle mismatches.

**Verdict**: Not a bug in practice. This is standard. No action needed.

#### 3. **LocationHistoryParser: Missing Null Checks on Nested Properties**

`locationHistoryParser.ts`, lines 16-26:

```typescript
if (entry.visit?.topCandidate?.placeLocation && entry.startTime) {
  const point = parseGeoPoint(entry.visit.topCandidate.placeLocation);
  // ...
}
```

The parser correctly uses optional chaining for nested objects. Good. But `parseGeoPoint` is called even if the value might be undefined (though the check prevents it). No issue here.

**Verdict**: Code is safe. Optional chaining prevents null reference errors.

#### 4. **HistoryExplorer: PlaceGroup Truncates at 24 Results**

`HistoryExplorer.tsx`, line 335:

```typescript
{places.slice(0, 24).map((place) => (
```

If a user has visited 200 countries (unlikely but not impossible for a well-traveled person or data artifact), the list shows only the top 24 sorted by days. The UI doesn't indicate truncation ("Show more", "24 of {total}").

**Verdict**: Minor UX issue. A user with 200+ places would notice, but edge case is rare. Consider adding a message if `places.length > 24`.

#### 5. **Supabase Store: No Rate Limiting or Batch Operations**

`supabaseStore.ts` has separate `upsert` calls for map statuses and history summaries. If a user marks 100 places while importing history, there could be 101 Supabase requests in quick succession (100 incremental updates + 1 history save). Supabase doesn't rate-limit aggressively, but best practice is to debounce or batch.

**Verdict**: Won't break the app but could cause issues at scale. If user base grows to 10k concurrent users, this becomes a problem. Consider adding a debounce timer (e.g., batch updates over 1 second).

#### 6. **App.tsx: Race Condition in Sync Logic**

`App.tsx`, lines 115-121:

```typescript
useEffect(() => {
  if (session && isRemoteReady) {
    void saveRemotePlaceStatuses(session, statuses).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not sync map to your account.");
    });
  }
}, [isRemoteReady, session, statuses]);
```

This effect fires every time `statuses` changes. If a user clicks 10 places in rapid succession, there are 10 Supabase writes. Each one is independent, so the last write wins—but the UI message ("synced...") may reflect an intermediate write, not the final state.

**Verdict**: Not a data-loss bug (Supabase upsert ensures consistency), but the UX is inaccurate. The last sync message displayed may not match the final stored state if the user is editing rapidly. **Consider debouncing or showing "pending changes..." during rapid edits.**

#### 7. **LocationHistoryParser: Assumes Timezone Consistency**

`locationHistoryParser.ts` doesn't normalize timezones. If a Takeout export has times from different timezones (e.g., a trip spanning UTC-8 to UTC+8), the parser treats them all as-is. The `timestampToDate` function extracts the local date component, which is correct, but the actual UTC milliseconds could be off.

**Verdict**: Not a bug for the use case (days visited is what matters, not seconds), but a gap in comments. The code is correct for its purpose—extracting visit dates—but the assumption isn't documented.

### Missing Features / Code Gaps

1. **No input sanitization on display name**: `VisibilityPanel.tsx` accepts user input for display name with a `maxLength={80}` but no validation. If someone enters `<img onerror="alert(1)">`, it's rendered as text (React escapes it), so it's safe. But a stronger check would be good.

   **Verdict**: Safe in practice (React defaults to text escaping), but add a comment or use a dedicated sanitizer for future-proofing.

2. **No CI test gating**: `.github/workflows/deploy.yml` runs tests but always deploys if the branch is main, even if tests fail (the workflow doesn't use `if: failure()`). If a test fails, the deployment proceeds.

   **Verdict**: This is a bug. The deploy step should only run if tests pass. **Fix: Add `if: success()` to the deploy job.**

3. **localStorage quota not monitored**: If a user imports a huge history (millions of points, now summarized), the summary could theoretically exceed the ~5-10 MB localStorage limit. The app doesn't check available space before saving.

   **Verdict**: Unlikely with current summarization (summaries are small), but if a user later imports photos' EXIF data (planned), this could become an issue. **Consider adding a warning: "This will use X MB of browser storage."**

4. **No error recovery for partial failures**: If `loadRemoteUserProfile` succeeds but `loadRemotePlaceStatuses` fails, the app shows the error but the profile is now inconsistent. 

   **Verdict**: Low impact (both are idempotent), but add a comment about the assumption.

---

## 4. Feature Ideas — Near-Term (1–2 Sprints)

### A. Timeline View for History

**What**: Replace the flat list of places with a timeline. Show visits chronologically (2023 → 2024), with months/years as sections. Click a visit to expand its details (cities, date spans).

**Why**: Travelers want to relive trips chronologically. "I went to Japan in March 2023" is more meaningful than a list. Narrative matters.

**Implementation**:
- Sort `summary.places` and `summary.cities` by `firstDate`.
- Group by year/quarter/month.
- CSS grid or a custom layout component.
- Estimate: 80 lines of React, 40 lines of CSS, 2 days.

**Impact**: Makes history feature feel like a memory album, not a database.

---

### B. Heatmap of Visit Intensity Over Time

**What**: Add a "Stats" tab showing a heatmap (days visited per month, like a GitHub contribution graph). Darker = more days.

**Why**: Travelers can see their patterns ("I travel in summer") and celebrate intensity ("48 days traveled in 2023!").

**Implementation**:
- Use `summary.places[].dateSpans` to count days per month.
- Build a 12-month-per-row grid (like `contrib-calendar`).
- Color scale: white (0) → light blue → dark blue (max).
- Estimate: 120 lines of React, 60 lines of CSS, 3 days.

**Impact**: High engagement driver. Users screenshot and share ("Look at my travel heatmap").

---

### C. Expand Map Coverage

**What**: Add major regions:
- Canadian provinces (10).
- Australian states (6).
- European regions (e.g., Schengen zones, or country subdivisions like German Lander).
- Japanese prefectures (47).

**Why**: Current coverage is India/US-centric. A global audience expects more.

**Implementation**:
- Source TopoJSON/GeoJSON from Natural Earth or OpenStreetMap.
- Add new `PlaceScope` types: `"ca-province"`, `"au-state"`, etc.
- Update `EditableMap` to load additional layers.
- Estimate: 3–5 days (mostly data sourcing, not code).

**Impact**: Makes the app useful for more regions. Reduces the "US-only" complaint.

---

### D. Better History Import Instructions

**What**: Replace the static `<ol>` with a step-by-step wizard or inline screenshots showing the exact Takeout UI.

**Why**: Users get stuck on vague steps like "Select only Location History or Timeline."

**Implementation**:
- Add a modal with carousel showing Takeout screenshots.
- Link to an always-updated help page.
- Estimate: 2 days.

**Impact**: Reduces friction. Support emails decrease.

---

### E. Stats Sidebar: Quick Wins

**What**: Add a card below the map showing:
- Total places marked.
- Countries vs. states vs. want-to-visit split.
- Most recent change (e.g., "Added France — 2 days ago").

**Why**: Users like seeing their stats at a glance. Encourages adding more places.

**Implementation**:
- Compute counts in `App.tsx`.
- Render as a 2-column grid (mobile: 1 col).
- Estimate: 1 day.

**Impact**: Low effort, high engagement.

---

### F. Export Stats as Image

**What**: "Download my stats" button that generates a PNG showing:
- Map preview.
- Total places, countries %, continents.
- Favorite country (most days).

**Why**: Sharable on Twitter/LinkedIn. Drives word-of-mouth.

**Implementation**:
- Use `html2canvas` or similar to snapshot the stats card.
- Estimate: 2–3 days (testing across browsers is time-consuming).

**Impact**: Viral potential. Users share on social.

---

### G. Keyboard Shortcuts

**What**: Add shortcuts:
- `V` = visited, `L` = lived, `W` = want-to-visit (when a region is focused).
- `?` = show shortcuts.

**Why**: Power users (who will exist) want to mark 50 places quickly.

**Implementation**:
- Listen to `onKeyDown` at the map level.
- Add a modal help screen.
- Estimate: 1 day.

**Impact**: Quality-of-life. Makes the app feel more polished.

---

## 5. Feature Ideas — Longer Term (1+ Month)

### A. Gamification: Stats & Streaks

**What**: Add a stats dashboard showing:
- Days traveled per year (cumulative).
- Continents visited (ish, with % coverage).
- Streaks (consecutive months with a trip, consecutive days traveling).
- Badges ("First visit to a new continent", "100-day traveler", "Visited all EU countries").

**Why**: Travelers are competitive. This drives engagement and retention.

**Implementation**:
- Compute streaks on history summaries (new lib function).
- Define achievement rules (thresholds, icons).
- Render a "Achievements" tab or card.
- Estimate: 2–3 weeks.

**Impact**: Keeps users coming back. Feeds social sharing.

---

### B. Trip Detection & Clustering

**What**: Automatically detect "trips" by clustering nearby points in time. Show "March 2023: Japan & Thailand (18 days)" instead of separate country entries.

**Why**: Users think in trips, not countries. This matches their mental model.

**Implementation**:
- Use DBSCAN or similar clustering on location points (by distance + time gap).
- Annotate each trip with:
  - Start/end date.
  - Countries/cities visited.
  - Total days.
  - Distance traveled (optional).
- Estimate: 4–5 weeks (complex algorithm, lots of edge cases).

**Impact**: Transforms the history view. Becomes a trip journal.

---

### C. Integrations: Foursquare, Instagram, Flight Records

**What**: Let users connect Foursquare/Swarm check-ins, Instagram (via scraping or official API), or email (parse flight confirmations) to auto-populate visited places.

**Why**: One-time setup; then the app stays fresh without manual effort. The source of truth is consolidated.

**Implementation**:
- Foursquare: OAuth + `geosearch` API to fetch check-ins, map to places.
- Instagram: User provides username; scrape geotagged posts (or use official API).
- Flights: Parse email receipts (Gmail integration) for origin/destination.
- Estimate: 6–8 weeks (API integrations are time-consuming).

**Impact**: Huge. The app becomes a travel **aggregator**, not just a tracker.

---

### D. Collaborative Maps & Trip Planning

**What**:
1. Let two users share a "couple's map" or "friend group trip."
2. Add a "want-to-visit" itinerary planner: click a place, add dates, notes.
3. Suggest upcoming trips based on common "want-to-visit" places.

**Why**: Couples planning trips together is a use case. Shared maps are fun.

**Implementation**:
- New Supabase tables: `collaborative_maps`, `trip_itineraries`, `invitations`.
- Modify `EditableMap` to support read-write collaboration.
- Build a simple itinerary UI (dates, notes, estimated cost).
- Estimate: 6–7 weeks.

**Impact**: Expands the audience. Drives group signups.

---

### E. Travel Blog Embed

**What**: Let users embed a read-only version of their map + stats on a personal website (e.g., a Markdown blog).

**Why**: Travel bloggers want to show their footprint. Easy distribution.

**Implementation**:
- Generate a shareable embed code (iFrame).
- Host a lightweight read-only page.
- Estimate: 2–3 weeks.

**Impact**: Medium. Niche use case but high SEO potential.

---

### F. Photo Gallery with Geotagging (Planned)

**What**: Users can upload photos with EXIF location data. The app extracts coordinates, maps visits to places, and shows a "2023 Japan trip" with a photo grid.

**Why**: Photos are the emotional core of travel memories. This is the killer feature for retention.

**Implementation**:
- EXIF extraction (library: `piexifjs` or similar).
- S3/Supabase Storage for photo hosting (avoid on-browser storage).
- Gallery UI (grid, lightbox).
- Optional: reverse geocode photos to places for automatic place detection.
- Estimate: 8–10 weeks.

**Impact**: **Highest**. Transforms the app from "map tracker" to "travel memory engine." Retention multiplier.

---

## 6. Technical Debt and Architecture

### Current Strengths

1. **Schema versioning**: The app uses `schemaVersion: 1` for exports, allowing future migrations.
2. **Modular storage**: Abstract storage layer (localStorage, Supabase) makes swaps possible.
3. **No external state management**: React hooks are sufficient. No Redux/Zustand bloat.

### Scaling Concerns

#### 1. **Supabase JSONB Column Will Become a Bottleneck**

`supabaseStore.ts` stores the entire `PlaceStatuses` object as a single JSONB column:

```typescript
await supabaseClient.from(mapStatusesTable).upsert({
  user_id: session.user.id,
  payload: statuses  // entire object
});
```

**Issue**: 
- As the user base grows, the `map_statuses` table becomes wide and slow to scan.
- If you ever want to query "how many users visited France?", you'd need to unnest the JSONB and GROUP BY, which is expensive.
- No indexing on individual places.

**When it breaks**: 10k+ users with detailed maps.

**Fix**: Normalize to a `user_place_statuses` table:
```sql
CREATE TABLE user_place_statuses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  place_key STRING NOT NULL,
  status ENUM('visited', 'lived', 'wantToVisit'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, place_key)
);
```
Then queries like "countries with most visitors" are trivial.

**Estimate to fix**: 2–3 weeks (data migration, schema update, app changes).

---

#### 2. **History Summary Storage Will Exceed localStorage**

A typical Takeout export yields ~100k location points. After summarization, a user might have:
- 100 places × 10 date spans = 1k entries.
- ~20 cities × 5 date spans = 100 entries.

Serialized JSON: ~80–100 KB. This fits comfortably in localStorage (5 MB limit). But:
- If you add photos (planned), the size explodes.
- If a user imports multiple Takeout files (current, archive), sizes compound.

**When it breaks**: Photo feature ships; users with 500+ photos × location = multi-MB storage.

**Fix**: 
- Use IndexedDB instead of localStorage for large summaries.
- Keep localStorage for map statuses (small).
- Estimate: 1 week.

---

#### 3. **No Observability / Error Tracking**

The app catches errors and shows messages to users, but:
- No server-side logs of failures (e.g., "10% of Supabase upserts are timing out").
- No metrics on feature usage (e.g., "how many users import history?").
- No alerting if something silently breaks.

**When it matters**: Post-launch. If Takeout export format changes, you won't know until users complain.

**Fix**: Add Sentry or PostHog:
```typescript
import * as Sentry from "@sentry/react";

Sentry.captureException(error);
```
Estimate: 3 days.

---

#### 4. **City Matching at Scale**

`citySummarizer.ts` loops through all cities for each point:

```typescript
for (const point of points) {
  const city = findNearestCity(point, cities, matchRadiusKm);  // O(n * m)
}
```

If a user imports 1M points and there are 10k cities, this is 10B distance calculations. It's slow.

**When it breaks**: Users with 1+ years of constant location tracking (unlikely, but possible).

**Fix**: Use a spatial index (KD-tree or R-tree) on cities. Libraries: `rbush`.

**Estimate to fix**: 1 week.

---

#### 5. **CI/CD: No Test Gating on Deployment**

`.github/workflows/deploy.yml` runs tests but doesn't block deployment if they fail.

**Current**:
```yaml
- name: Test
  run: npm test
- name: Build
  run: npm run build
- name: Deploy
  id: deployment
  uses: actions/deploy-pages@v5
```

**Fix**:
```yaml
- name: Deploy
  if: success()  # Only deploy if tests passed
  id: deployment
  uses: actions/deploy-pages@v5
```

---

#### 6. **No Rate Limiting on Supabase Queries**

If a malicious user or a buggy script floods the API with requests, there's no client-side protection. Supabase has built-in rate limiting, but the app doesn't retry gracefully.

**Fix**: Add exponential backoff + jitter:
```typescript
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.random() * (2 ** i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

**Estimate**: 1 day.

---

#### 7. **No Data Validation on Supabase Read**

When loading data from Supabase, the app trusts the payload shape:

```typescript
const payload = (data as SupabasePayload | null | undefined)?.payload;
return isPlaceStatuses(payload) ? payload : null;
```

There's a `isPlaceStatuses` check, which is good. But if a user manually edits the database or Supabase is compromised, the app could load malformed data.

**Fix**: Use a schema validation library (e.g., Zod):
```typescript
const PlaceStatusesSchema = z.record(z.enum(['visited', 'lived', 'wantToVisit']));
const parsed = PlaceStatusesSchema.parse(payload);
```

**Estimate**: 3 days.

---

## 7. Prioritized Roadmap Recommendation

Based on impact × effort, here's what to build next (over the next 6 months):

### **Month 1: Fix Bugs & Near-Term UX**

- **Week 1–2**: 
  - Fix CI/CD test gating (30 min).
  - Add debounce to Supabase syncs (2 days).
  - Add input validation (Zod) for loaded data (2 days).
  
- **Week 3–4**:
  - Add timeline view for history (3 days).
  - Improve history import instructions (2 days).
  - Add stats sidebar (1 day).

**Outcome**: Smoother experience, fewer edge cases, better history exploration.

---

### **Month 2: Map Expansion & Stats Dashboard**

- **Week 1–2**: 
  - Source and integrate Canadian provinces + Australian states (3 days).
  
- **Week 3–4**:
  - Build stats dashboard: days per year, continents, top countries (4 days).
  - Heatmap of visit intensity (3 days).

**Outcome**: Larger audience, higher engagement with stats.

---

### **Month 3: Social Features**

- **Week 1–2**:
  - Collaborative maps schema (2 days).
  - Sharing UI (3 days).
  
- **Week 3–4**:
  - Public gallery improvements: leaderboards, comparisons (4 days).

**Outcome**: Users invite friends, word-of-mouth growth.

---

### **Month 4–5: First Integration & Photos (Parallel)**

- **Parallel Track A**: 
  - Foursquare OAuth + check-in import (4 weeks).
  
- **Parallel Track B**: 
  - Photo upload infrastructure (Supabase Storage) (3 weeks).
  - EXIF extraction + reverse geocoding (2 weeks).

**Outcome**: Consolidate travel data, kill the "manual entry" friction.

---

### **Month 6: Refinement**

- Fix any scaling issues discovered (Supabase queries, localStorage).
- Observability setup (Sentry, PostHog).
- Performance profiling (map rendering on 1000+ marked places).

---

## Summary

**Where I've Been** has excellent bones: clean code, smart privacy design, and a core feature that resonates. The app is **launch-ready** but needs a roadmap to become sticky.

**Near-term** (1–2 months): Fix bugs, expand map coverage, add stats. These are low-hanging fruit with high engagement impact.

**Medium-term** (3–5 months): Social features and integrations. The public gallery is passive; making it social (comparisons, shared trips) drives retention.

**Long-term** (6+ months): Photos + trip detection. This is the killer feature—transforming the app from a map tracker to a **memory engine**. Every travel memory tied to a place, date, and photo.

The biggest opportunity is **recognizing the app isn't about the map—it's about remembering and sharing travel**. The map is just the UI. Lean into that.
