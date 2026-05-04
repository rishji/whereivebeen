import { useEffect, useState } from "react";
import { EditableMap } from "./EditableMap";
import { HistoryExplorer } from "./HistoryExplorer";
import {
  isSupabaseConfigured
} from "../lib/supabase";
import {
  loadPublicGalleryEntries,
  type PublicGalleryEntry
} from "../lib/supabaseStore";

export function PublicGallery() {
  const [entries, setEntries] = useState<PublicGalleryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PublicGalleryEntry | null>(null);
  const [message, setMessage] = useState(
    isSupabaseConfigured
      ? "Loading public gallery..."
      : "Set Supabase env vars to enable the public gallery."
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const publicEntries = await loadPublicGalleryEntries();

        if (isCancelled) {
          return;
        }

        setEntries(publicEntries);
        setSelectedEntry(publicEntries[0] ?? null);
        setMessage(
          publicEntries.length
            ? `Loaded ${publicEntries.length} public ${publicEntries.length === 1 ? "profile" : "profiles"}.`
            : "No one has published data to the gallery yet."
        );
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load the public gallery.");
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="gallery-page">
      <div className="history-header">
        <div>
          <p className="eyebrow">Public gallery</p>
          <h2>Shared Travel Maps</h2>
          <p className="lede">
            Browse read-only maps and history summaries that users have chosen to publish.
          </p>
        </div>
      </div>

      {entries.length ? (
        <div className="gallery-grid">
          <section className="place-group">
            <h3>
              Profiles <span>{entries.length}</span>
            </h3>
            <div className="place-list">
              {entries.map((entry) => (
                <button
                  type="button"
                  className="place-row"
                  key={entry.userId}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <span>{entry.displayName}</span>
                  <strong>{Object.keys(entry.mapStatuses).length} marked</strong>
                </button>
              ))}
            </div>
          </section>

          {selectedEntry ? (
            <section className="gallery-detail">
              <div className="gallery-detail-header">
                <div>
                  <p className="eyebrow">Viewing</p>
                  <h3>{selectedEntry.displayName}</h3>
                </div>
                <span>{new Date(selectedEntry.updatedAt).toLocaleDateString()}</span>
              </div>
              <EditableMap statuses={selectedEntry.mapStatuses} onTogglePlace={() => undefined} readOnly />
              {selectedEntry.historySummary ? (
                <HistoryExplorer
                  key={selectedEntry.userId}
                  initialSummary={selectedEntry.historySummary}
                  session={null}
                  readOnly
                />
              ) : (
                <div className="empty-state">
                  <p>This profile has not published a location-history summary.</p>
                </div>
              )}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">
          <p>{message}</p>
        </div>
      )}

      {entries.length ? (
        <p className="status-message" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
