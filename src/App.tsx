import { useEffect, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { EditableMap } from "./components/EditableMap";
import { HistoryExplorer } from "./components/HistoryExplorer";
import { Legend } from "./components/Legend";
import { PublicGallery } from "./components/PublicGallery";
import { VisibilityPanel } from "./components/VisibilityPanel";
import {
  clearRemotePlaceStatuses,
  loadRemotePlaceStatuses,
  loadRemoteUserProfile,
  saveRemotePlaceStatuses,
  saveRemoteUserProfile
} from "./lib/supabaseStore";
import { useSupabaseSession } from "./lib/useSupabaseSession";
import { defaultUserProfile, type UserProfile } from "./lib/publicGallery";
import {
  cyclePlaceStatus,
  exportPlaceStatuses,
  importPlaceStatuses,
  loadPlaceStatuses,
  savePlaceStatuses,
  type PlaceStatuses
} from "./lib/placeState";
import { loadHistorySummary } from "./lib/historyStorage";
import type { LocationHistoryPlaceSummary } from "./lib/historySummaryTypes";
import { computeMapStats } from "./lib/mapStats";

const derivedStatusesKey = "where-ive-been.derived-place-statuses.v2";

function loadDerivedStatuses(): PlaceStatuses {
  const stored = window.localStorage.getItem(derivedStatusesKey);
  if (stored) {
    try { return importPlaceStatuses(stored); } catch { /* fall through */ }
  }
  const summary = loadHistorySummary();
  return summary ? buildDerivedStatusesFromSummary(summary) : {};
}

function buildDerivedStatusesFromSummary(summary: LocationHistoryPlaceSummary): PlaceStatuses {
  const mapScopes = new Set(["country", "us-state", "india-state"]);
  // Exclude country-level entries for USA (840) and India (356) so state fills
  // render properly — country fills behind them would obscure state-level detail.
  const excludedKeys = new Set(["country:840", "country:356"]);
  return Object.fromEntries(
    summary.places
      .filter((p) => mapScopes.has(p.scope) && !excludedKeys.has(p.key))
      .map((p) => [p.key, "visited" as const])
  );
}

function saveDerivedStatuses(statuses: PlaceStatuses): void {
  window.localStorage.setItem(derivedStatusesKey, exportPlaceStatuses(statuses));
}

type Tab = "map" | "history" | "derivedMap" | "gallery";

export function App({ initialUserSlug }: { initialUserSlug?: string }) {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [activePage, setActivePage] = useState<Tab>(initialUserSlug ? "gallery" : "map");
  const [statuses, setStatuses] = useState<PlaceStatuses>(() => loadPlaceStatuses());
  const [derivedStatuses, setDerivedStatuses] = useState<PlaceStatuses>(() => loadDerivedStatuses());
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isRemoteReady, setIsRemoteReady] = useState(!session);

  const stats = computeMapStats(statuses);

  useEffect(() => { savePlaceStatuses(statuses); }, [statuses]);
  useEffect(() => { saveDerivedStatuses(derivedStatuses); }, [derivedStatuses]);

  useEffect(() => {
    if (!session) { setProfile(defaultUserProfile); setIsProfileLoading(false); return; }
    let isCancelled = false;
    setIsProfileLoading(true);
    void (async () => {
      try {
        const remoteProfile = await loadRemoteUserProfile(session);
        if (!isCancelled) setProfile(remoteProfile);
      } catch (error) {
        if (!isCancelled) setMessage(error instanceof Error ? error.message : "Could not load public gallery settings.");
      } finally {
        if (!isCancelled) setIsProfileLoading(false);
      }
    })();
    return () => { isCancelled = true; };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) { setIsRemoteReady(true); return; }
    let isCancelled = false;
    setIsRemoteReady(false);
    setMessage(`Loading your saved map for ${session.user.email ?? "your account"}…`);
    void (async () => {
      try {
        const remoteStatuses = await loadRemotePlaceStatuses(session);
        if (isCancelled) return;
        if (remoteStatuses) {
          setStatuses(remoteStatuses);
          savePlaceStatuses(remoteStatuses);
          setMessage("Loaded your saved map.");
        } else {
          await saveRemotePlaceStatuses(session, statuses);
          setMessage(`Created a cloud copy for ${session.user.email ?? "your account"}.`);
        }
      } catch (error) {
        if (!isCancelled) setMessage(error instanceof Error ? error.message : "Could not load account data.");
      } finally {
        if (!isCancelled) setIsRemoteReady(true);
      }
    })();
    return () => { isCancelled = true; };
  }, [session?.user.id]);

  useEffect(() => {
    if (session && isRemoteReady) {
      void saveRemotePlaceStatuses(session, statuses).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Could not sync map to your account.");
      });
    }
  }, [isRemoteReady, session, statuses]);

  function togglePlace(placeKey: string) {
    setStatuses((cur) => {
      const nextStatus = cyclePlaceStatus(cur[placeKey]);
      const next = { ...cur };
      if (nextStatus) next[placeKey] = nextStatus; else delete next[placeKey];
      return next;
    });
  }

  function exportJson() {
    const blob = new Blob([exportPlaceStatuses(statuses)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "where-ive-been-statuses.json"; a.click();
    URL.revokeObjectURL(url);
    setMessage("Exported your map statuses as JSON.");
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      setStatuses(importPlaceStatuses(await file.text()));
      setMessage("Imported map statuses.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that JSON file.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function resetMap() {
    setStatuses({});
    setMessage("Reset all map statuses.");
    if (session) {
      try { await clearRemotePlaceStatuses(session); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Could not clear account map."); }
    }
  }

  function toggleDerivedPlace(placeKey: string) {
    setDerivedStatuses((cur) => {
      const nextStatus = cyclePlaceStatus(cur[placeKey]);
      const next = { ...cur };
      if (nextStatus) next[placeKey] = nextStatus; else delete next[placeKey];
      return next;
    });
  }

  function resetDerivedFromHistory() {
    const summary = loadHistorySummary();
    setDerivedStatuses(summary ? buildDerivedStatusesFromSummary(summary) : {});
  }

  function fillFromDerived() {
    let count = 0;
    setStatuses((prev) => {
      const next = { ...prev };
      for (const [key, status] of Object.entries(derivedStatuses)) {
        if (!(key in next) || next[key] === "wantToVisit") {
          next[key] = status;
          count++;
        }
      }
      return next;
    });
    setMessage(`Added ${count} places from derived atlas to editable atlas.`);
  }

  async function saveProfile(nextProfile: UserProfile) {
    if (!session) return;
    await saveRemoteUserProfile(session, nextProfile);
    setProfile(nextProfile);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "map", label: "Editable Atlas" },
    { id: "history", label: "History Explorer" },
    { id: "derivedMap", label: "Derived Atlas" },
    { id: "gallery", label: "Public Gallery" },
  ];

  const derivedStats = computeMapStats(derivedStatuses);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-top">
          <div className="header-brand">
            <div className="logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="11" r="10" fill="none" stroke="rgba(255,248,231,0.7)" strokeWidth="1"/>
                <polygon points="11,2 13,11 11,20 9,11" fill="#fff8e7"/>
                <polygon points="2,11 11,9 20,11 11,13" fill="#fff8e7" opacity="0.5"/>
                <circle cx="11" cy="11" r="1.6" fill="#1f4d3a"/>
              </svg>
            </div>
            <div className="header-brand-text">
              <p className="app-title">Where I've Been</p>
              <p className="app-subtitle">Personal travel atlas · est. 2026</p>
            </div>
          </div>

          <div className="header-actions">
            <span className="pill">◐ {stats.totalMarked} marked</span>
            <AuthPanel session={session} loading={sessionLoading} />
          </div>
        </div>

        <nav className="tab-nav" aria-label="Where I've Been sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={activePage === t.id ? "active" : ""}
              onClick={() => setActivePage(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Map tab ── */}
      {activePage === "map" && (
        <div className="section-wrap">
          <div className="section-title-row">
            <div style={{ flex: 1, minWidth: 280 }}>
              <p className="section-eyebrow">§ 01 — Editable Atlas</p>
              <h2 className="section-title">
                Trace the world,<br />
                <em>one click at a time.</em>
              </h2>
              <p className="section-lede">
                Click any country, US state, or India state to cycle through{" "}
                <strong style={{ color: "var(--status-visited)" }}>visited</strong>,{" "}
                <strong style={{ color: "var(--status-lived)" }}>lived there</strong>, and{" "}
                <strong style={{ color: "var(--status-want)" }}>want to visit</strong>.
                Your map saves locally — sign in to sync.
              </p>
            </div>
            <Legend />
          </div>

          <div className="stat-strip" style={{ padding: 0 }}>
            <StatCard value={stats.countries} label="Countries" sub={`${stats.pctWorld}% of the world`} accent="var(--accent)" />
            <StatCard value={stats.continents} label="Continents" sub="of 7 covered" />
            <StatCard value={`${stats.usStates} · ${stats.indiaStates}`} label="US · India States" sub="states visited or lived" />
            <StatCard value={stats.lived} label="Lived in" sub="places called home" accent="var(--status-lived)" />
          </div>

          <div className="map-shell">
            <div className="map-cartouche">
              <div>natural earth · 1:110m</div>
              <span>{stats.totalMarked} regions marked</span>
            </div>
            <EditableMap statuses={statuses} onTogglePlace={togglePlace} />
            <div className="map-action-bar">
              <span className="map-action-hint">↪ Click any region to cycle status</span>
              <div className="map-action-buttons">
                <button className="btn btn-sm" type="button" onClick={exportJson}>Export JSON</button>
                <button className="btn btn-sm" type="button" onClick={() => importInputRef.current?.click()}>Import</button>
                <button className="btn btn-sm" type="button" onClick={() => void resetMap()}>Reset</button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  className="visually-hidden"
                  onChange={(e) => void importJson(e.target.files?.[0])}
                />
              </div>
            </div>
          </div>

          <VisibilityPanel
            session={session}
            profile={profile}
            disabled={sessionLoading || isProfileLoading}
            onSave={saveProfile}
          />
        </div>
      )}

      {/* ── History tab ── */}
      {activePage === "history" && (
        <div className="section-wrap">
          <HistoryExplorer session={session} />
          <VisibilityPanel
            session={session}
            profile={profile}
            disabled={sessionLoading || isProfileLoading}
            onSave={saveProfile}
          />
        </div>
      )}

      {/* ── Derived map tab ── */}
      {activePage === "derivedMap" && (
        <div className="section-wrap">
          <div className="section-title-row">
            <div>
              <p className="section-eyebrow">§ 03 — Derived Atlas</p>
              <h2 className="section-title">
                Auto-filled from<br />
                <em>your timeline.</em>
              </h2>
            </div>
            <div className="actions">
              <button className="btn btn-sm" type="button" onClick={resetDerivedFromHistory}>
                ↻ Reset from history
              </button>
              <button className="btn btn-sm" type="button" onClick={fillFromDerived}>
                → Fill editable atlas
              </button>
            </div>
          </div>

          <div className="stat-strip" style={{ padding: 0 }}>
            <StatCard value={derivedStats.countries} label="Countries" sub={`${derivedStats.pctWorld}% of the world`} accent="var(--accent)" />
            <StatCard value={derivedStats.continents} label="Continents" sub="of 7 covered" />
            <StatCard value={`${derivedStats.usStates} · ${derivedStats.indiaStates}`} label="US · India States" />
            <StatCard value={derivedStats.totalMarked} label="Total marked" />
          </div>

          <div className="map-shell" style={{ position: "relative" }}>
            <div className="derived-stamp">derived</div>
            <EditableMap statuses={derivedStatuses} onTogglePlace={toggleDerivedPlace} />
            <div className="map-action-bar">
              <span className="map-action-hint">
                {derivedStats.countries} countries · {derivedStats.usStates} US · {derivedStats.indiaStates} India states · auto-detected
              </span>
            </div>
          </div>

          <VisibilityPanel
            session={session}
            profile={profile}
            disabled={sessionLoading || isProfileLoading}
            onSave={saveProfile}
          />
        </div>
      )}

      {/* ── Gallery tab ── */}
      {activePage === "gallery" && (
        <div className="section-wrap">
          <PublicGallery initialUserSlug={initialUserSlug} />
        </div>
      )}

      {message && (
        <p className="status-message" role="status">{message}</p>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  sub,
  accent,
}: {
  value: string | number;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
