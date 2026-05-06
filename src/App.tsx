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

const derivedStatusesKey = "where-ive-been.derived-place-statuses.v1";

function loadDerivedStatuses(): PlaceStatuses {
  const stored = window.localStorage.getItem(derivedStatusesKey);
  if (stored) {
    try {
      return importPlaceStatuses(stored);
    } catch {
      // fall through to seed from history
    }
  }
  const summary = loadHistorySummary();
  return summary ? buildDerivedStatusesFromSummary(summary) : {};
}

function buildDerivedStatusesFromSummary(summary: LocationHistoryPlaceSummary): PlaceStatuses {
  const mapScopes = new Set(["country", "us-state", "india-state"]);
  return Object.fromEntries(
    summary.places
      .filter((p) => mapScopes.has(p.scope))
      .map((p) => [p.key, "visited" as const])
  );
}

function saveDerivedStatuses(statuses: PlaceStatuses): void {
  window.localStorage.setItem(derivedStatusesKey, exportPlaceStatuses(statuses));
}

export function App() {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [activePage, setActivePage] = useState<"map" | "history" | "derivedMap" | "gallery">("map");
  const [statuses, setStatuses] = useState<PlaceStatuses>(() => loadPlaceStatuses());
  const [derivedStatuses, setDerivedStatuses] = useState<PlaceStatuses>(() => loadDerivedStatuses());
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [message, setMessage] = useState<string>("Click a place to cycle through statuses.");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isRemoteReady, setIsRemoteReady] = useState(!session);

  useEffect(() => {
    savePlaceStatuses(statuses);
  }, [statuses]);

  useEffect(() => {
    saveDerivedStatuses(derivedStatuses);
  }, [derivedStatuses]);

  useEffect(() => {
    if (!session) {
      setProfile(defaultUserProfile);
      setIsProfileLoading(false);
      return;
    }

    let isCancelled = false;
    setIsProfileLoading(true);

    void (async () => {
      try {
        const remoteProfile = await loadRemoteUserProfile(session);

        if (!isCancelled) {
          setProfile(remoteProfile);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load public gallery settings.");
        }
      } finally {
        if (!isCancelled) {
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) {
      setIsRemoteReady(true);
      return;
    }

    let isCancelled = false;
    setIsRemoteReady(false);
    setMessage(`Loading your saved map for ${session.user.email ?? "your account"}...`);

    void (async () => {
      try {
        const remoteStatuses = await loadRemotePlaceStatuses(session);

        if (isCancelled) {
          return;
        }

        if (remoteStatuses) {
          setStatuses(remoteStatuses);
          savePlaceStatuses(remoteStatuses);
          setMessage(`Loaded your saved map for ${session.user.email ?? "your account"}.`);
        } else {
          await saveRemotePlaceStatuses(session, statuses);
          setMessage(`Created a cloud copy for ${session.user.email ?? "your account"}.`);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load account data.");
        }
      } finally {
        if (!isCancelled) {
          setIsRemoteReady(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (session && isRemoteReady) {
      void saveRemotePlaceStatuses(session, statuses).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Could not sync map to your account.");
      });
    }
  }, [isRemoteReady, session, statuses]);

  function togglePlace(placeKey: string) {
    setStatuses((currentStatuses) => {
      const nextStatus = cyclePlaceStatus(currentStatuses[placeKey]);
      const nextStatuses = { ...currentStatuses };

      if (nextStatus) {
        nextStatuses[placeKey] = nextStatus;
      } else {
        delete nextStatuses[placeKey];
      }

      return nextStatuses;
    });
  }

  function exportJson() {
    const blob = new Blob([exportPlaceStatuses(statuses)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "where-ive-been-statuses.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Exported your map statuses as JSON.");
  }

  async function importJson(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      setStatuses(importPlaceStatuses(await file.text()));
      setMessage("Imported map statuses.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that JSON file.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  async function resetMap() {
    setStatuses({});
    setMessage("Reset all map statuses.");

    if (session) {
      try {
        await clearRemotePlaceStatuses(session);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not clear account map.");
      }
    }
  }

  function toggleDerivedPlace(placeKey: string) {
    setDerivedStatuses((current) => {
      const nextStatus = cyclePlaceStatus(current[placeKey]);
      const next = { ...current };
      if (nextStatus) {
        next[placeKey] = nextStatus;
      } else {
        delete next[placeKey];
      }
      return next;
    });
  }

  function resetDerivedFromHistory() {
    const summary = loadHistorySummary();
    const next = summary ? buildDerivedStatusesFromSummary(summary) : {};
    setDerivedStatuses(next);
  }

  async function saveProfile(nextProfile: UserProfile) {
    if (!session) {
      return;
    }

    await saveRemoteUserProfile(session, nextProfile);
    setProfile(nextProfile);
  }

  const markedPlacesCount = Object.keys(statuses).length;

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Personal travel atlas</p>
          <h1>Where I've Been</h1>
          <p className="lede">
            Mark countries, US states, and India states directly on the map. Click any place to cycle
            through visited, lived there, want to visit, and blank.
          </p>
          <p className="subtle-note">Edits are saved in this browser and survive refreshes and deploys.</p>
        </div>
        <div className="hero-side">
          <AuthPanel session={session} loading={sessionLoading} />
          <VisibilityPanel
            session={session}
            profile={profile}
            disabled={sessionLoading || isProfileLoading}
            onSave={saveProfile}
          />
        </div>
      </section>

      <nav className="page-tabs" aria-label="Where I've Been sections">
        <button
          type="button"
          className={activePage === "map" ? "active" : "secondary"}
          onClick={() => setActivePage("map")}
        >
          Editable Map
        </button>
        <button
          type="button"
          className={activePage === "history" ? "active" : "secondary"}
          onClick={() => setActivePage("history")}
        >
          History
        </button>
        <button
          type="button"
          className={activePage === "derivedMap" ? "active" : "secondary"}
          onClick={() => setActivePage("derivedMap")}
        >
          Derived Map
        </button>
        <button
          type="button"
          className={activePage === "gallery" ? "active" : "secondary"}
          onClick={() => setActivePage("gallery")}
        >
          Public Gallery
        </button>
      </nav>

      {activePage === "map" ? (
        <>
          <section className="tab-header" aria-label="Map controls">
            <div>
              <p className="eyebrow">Editable map</p>
              <h2>Travel Map</h2>
              <p className="lede">
                Mark countries, US states, and India states. Changes save locally first and sync to
                your account when you are signed in.
              </p>
            </div>
            <div className="actions">
              <button type="button" onClick={exportJson}>
                Export JSON
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()}>
                Import JSON
              </button>
              <button type="button" className="secondary" onClick={() => void resetMap()}>
                Reset
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="visually-hidden"
                onChange={(event) => void importJson(event.target.files?.[0])}
              />
            </div>
            <div className="tab-header-footer">
              <Legend />
            </div>
          </section>

          <div className="map-stat-row">
            <div className="stats-card">
              <span className="stats-value">{markedPlacesCount}</span>
              <span className="stats-label">marked places</span>
            </div>
          </div>

          <EditableMap statuses={statuses} onTogglePlace={togglePlace} />

          <p className="status-message" role="status">
            {message}
          </p>
        </>
      ) : activePage === "history" ? (
        <HistoryExplorer session={session} />
      ) : activePage === "derivedMap" ? (
        <>
          <section className="tab-header" aria-label="Derived map controls">
            <div>
              <p className="eyebrow">Derived map</p>
              <h2>History Map</h2>
              <p className="lede">
                Auto-filled from your imported location history. Click any place to adjust the status. Edits save locally.
              </p>
            </div>
            <div className="actions">
              <button type="button" className="secondary" onClick={resetDerivedFromHistory}>
                Reset from history
              </button>
            </div>
          </section>

          <div className="map-stat-row">
            <div className="stats-card">
              <span className="stats-value">{Object.keys(derivedStatuses).length}</span>
              <span className="stats-label">marked places</span>
            </div>
          </div>

          <EditableMap statuses={derivedStatuses} onTogglePlace={toggleDerivedPlace} />
        </>
      ) : (
        <PublicGallery />
      )}
    </main>
  );
}
