# Where I've Been Multi-User Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors use the app locally, let signed-in users keep private synced map/history data, and let signed-in users explicitly publish read-only data to a public gallery.

**Architecture:** Keep GitHub Pages as a static frontend and use Supabase for auth plus row-level-protected owner data. Read from local storage immediately on load, then sync to Supabase after sign-in so the app remains usable while offline or unauthenticated. Public gallery reads go through a narrow Supabase function that returns only rows whose owners opted in.

**Tech Stack:** React, TypeScript, Vite, Supabase Auth, Supabase Postgres, GitHub Pages, browser `localStorage`.

---

### Task 1: Verify auth plumbing

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/useSupabaseSession.ts`
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`
- Test: `src/lib/useSupabaseSession` behavior through existing app tests

- [ ] **Step 1: Confirm env wiring**
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are read only from Vite env variables.
  - Keep the app disabled for sync when either variable is missing.

- [ ] **Step 2: Confirm session bootstrap**
  - Ensure the auth session is restored on refresh before any sync writes happen.

- [ ] **Step 3: Verify build-time env injection**
  - Keep GitHub Pages workflow passing repo variables into the build.

- [ ] **Step 4: Run verification**
  - Run `npm test`
  - Run `npm run build`

### Task 2: Lock down the database schema

**Files:**
- Modify: `supabase/schema.sql`
- Test: Supabase SQL policies via manual console verification

- [ ] **Step 1: Confirm tables**
  - `map_statuses` stores one place status row per user/place.
  - `history_summaries` stores one derived summary row per user.
  - `user_profiles` stores display name and public-gallery opt-in per user.

- [ ] **Step 2: Confirm ownership**
  - Ensure each row carries `user_id` and uses `auth.uid()` for inserts.

- [ ] **Step 3: Confirm row-level security**
  - Keep select, insert, update, and delete policies limited to the signed-in user.
  - Expose public-gallery reads only through `list_public_gallery()`.

- [ ] **Step 4: Confirm cleanup behavior**
  - Make delete policies available so reset can remove both tables’ rows.

### Task 3: Finish editable map sync

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/EditableMap.tsx`
- Modify: `src/lib/placeState.ts`
- Modify: `src/lib/supabaseStore.ts`
- Test: `src/lib/placeState.test.ts`

- [ ] **Step 1: Keep local-first behavior**
  - Render saved map state from `localStorage` immediately on load.

- [ ] **Step 2: Hydrate remote state after sign-in**
  - Load the signed-in user’s map rows from Supabase.
  - Merge remote data into the local map state only for matching user rows.

- [ ] **Step 3: Persist edits locally and remotely**
  - Save each click cycle locally first.
  - Mirror the same write to Supabase when signed in.

- [ ] **Step 4: Confirm reset behavior**
  - Clear the browser cache and delete the signed-in user’s remote rows.

- [ ] **Step 5: Run verification**
  - Run the map state tests.
  - Open the app locally and verify sign-in, edit, refresh, and sign-out.

### Task 4: Finish history sync

**Files:**
- Modify: `src/components/HistoryExplorer.tsx`
- Modify: `src/lib/historyStorage.ts`
- Modify: `src/lib/historyImport.ts`
- Modify: `src/lib/supabaseStore.ts`
- Test: `src/lib/historyStorage.test.ts`
- Test: `src/lib/historySummarizer.test.ts`

- [ ] **Step 1: Keep raw import browser-local**
  - Continue accepting the generic Google Takeout `location-history.json` file in the browser only.

- [ ] **Step 2: Store only derived summary**
  - Save the summarized countries, states, and city spans locally.
  - Mirror only the summary to Supabase when signed in.

- [ ] **Step 3: Preserve reload behavior**
  - On page load, hydrate from local storage before touching the network.

- [ ] **Step 4: Preserve reset behavior**
  - Clear local summary and remote summary for the signed-in user.

- [ ] **Step 5: Run verification**
  - Import a synthetic history file.
  - Confirm the summary survives reload and sign-out.

### Task 5: Verify privacy boundaries

**Files:**
- Modify: `README.md`
- Modify: `src/components/AuthPanel.tsx`
- Modify: `src/components/VisibilityPanel.tsx`
- Modify: `src/components/PublicGallery.tsx`
- Modify: `src/components/HistoryExplorer.tsx`

- [ ] **Step 1: Keep anonymous local use**
  - Allow signed-out visitors to edit the map and import history into browser storage.
  - Do not sync or publish anonymous data.

- [ ] **Step 2: Make scope obvious**
  - Show that synced data is private by default.
  - Show that public-gallery publishing is an explicit opt-in.

- [ ] **Step 3: Avoid raw data retention**
  - State clearly that location-history uploads are not stored in Supabase.

- [ ] **Step 4: Verify public gallery behavior**
  - Confirm public gallery entries are read-only.
  - Confirm signed-out visitors can browse public gallery entries.
  - Confirm toggling visibility off removes the entry from the gallery.

- [ ] **Step 5: Verify two-user separation**
  - Test with two browser profiles or two accounts and confirm no cross-user data leakage.

### Task 6: Rollout and deployment

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] **Step 1: Create or verify the Supabase project**
  - Apply `supabase/schema.sql` in the target project.

- [ ] **Step 2: Configure GitHub repo variables**
  - Set `VITE_SUPABASE_URL`
  - Set `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 3: Verify production build**
  - Run the full test suite and build locally before pushing.

- [ ] **Step 4: Deploy**
  - Push the auth changes and confirm GitHub Pages still serves the app.

- [ ] **Step 5: Smoke test after deploy**
  - Confirm sign-in loads the right user state.
  - Confirm reset clears only the current user’s rows.

### Current Acceptance Criteria
- [ ] A signed-out user can still use the app locally with browser storage.
- [ ] A signed-in user gets private, per-account sync for map and history data.
- [ ] Refreshing the page restores the current user’s remote data.
- [ ] Reset removes both local and remote data for that user.
- [ ] Two accounts do not see each other’s map edits or history summaries.
- [ ] A signed-in user can opt into and out of the public gallery.
- [ ] A signed-out visitor can view read-only public gallery entries.
- [ ] Anonymous local data is not synced or publishable until the visitor signs in.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
