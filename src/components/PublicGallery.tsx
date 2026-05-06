import { useEffect, useState } from "react";
import { EditableMap } from "./EditableMap";
import { HistoryExplorer } from "./HistoryExplorer";
import { isSupabaseConfigured } from "../lib/supabase";
import { loadPublicGalleryEntries, type PublicGalleryEntry } from "../lib/supabaseStore";

const avatarColors = ["#c8431b", "#1f4d3a", "#0c4a6e", "#7c2d12", "#d68a14", "#1e3a5f"];

export function PublicGallery() {
  const [entries, setEntries] = useState<PublicGalleryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PublicGalleryEntry | null>(null);
  const [message, setMessage] = useState(
    isSupabaseConfigured
      ? "Loading public gallery…"
      : "Set Supabase env vars to enable the public gallery."
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isCancelled = false;
    void (async () => {
      try {
        const publicEntries = await loadPublicGalleryEntries();
        if (isCancelled) return;
        setEntries(publicEntries);
        setSelectedEntry(publicEntries[0] ?? null);
        setMessage(
          publicEntries.length
            ? `${publicEntries.length} public ${publicEntries.length === 1 ? "profile" : "profiles"}`
            : "No one has published to the gallery yet."
        );
      } catch (error) {
        if (!isCancelled) setMessage(error instanceof Error ? error.message : "Could not load the public gallery.");
      }
    })();
    return () => { isCancelled = true; };
  }, []);

  return (
    <div className="gallery-page">
      <div>
        <p className="section-eyebrow">§ 04 — Public Gallery</p>
        <h2 className="section-title">
          Travelers,<br />
          <em>shared.</em>
        </h2>
        <p className="section-lede">Read-only maps from people who chose to publish.</p>
      </div>

      {entries.length > 0 ? (
        <div className="gallery-grid">
          {/* Profile list */}
          <div className="gallery-profile-list">
            {entries.map((entry, i) => {
              const active = entry.userId === selectedEntry?.userId;
              const initials = entry.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const color = avatarColors[i % avatarColors.length];
              return (
                <button
                  key={entry.userId}
                  type="button"
                  className={`gallery-profile-card${active ? " active" : ""}`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="profile-header">
                    <div className="profile-avatar" style={{ background: color }}>{initials}</div>
                    <div>
                      <div className="profile-name">{entry.displayName}</div>
                    </div>
                  </div>
                  <div className="profile-meta">
                    {Object.keys(entry.mapStatuses).length} places marked
                  </div>
                  <div className="profile-updated">
                    Updated {new Date(entry.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected profile detail */}
          {selectedEntry && (
            <div className="gallery-detail">
              <div className="gallery-detail-top">
                <div>
                  <p className="gallery-detail-eyebrow">Now viewing</p>
                  <h2 className="gallery-detail-title">{selectedEntry.displayName}'s atlas</h2>
                </div>
                <div className="stamp" style={{ color: "var(--accent-2)", transform: "rotate(6deg)" }}>
                  public
                </div>
              </div>

              <div className="gallery-stats">
                <div className="stat-card">
                  <div className="stat-card-label">Places marked</div>
                  <div className="stat-card-value">{Object.keys(selectedEntry.mapStatuses).length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Updated</div>
                  <div className="stat-card-value" style={{ fontSize: "clamp(16px, 2vw, 22px)" }}>
                    {new Date(selectedEntry.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">History</div>
                  <div className="stat-card-value" style={{ fontSize: "clamp(16px, 2vw, 22px)" }}>
                    {selectedEntry.historySummary ? "Published" : "Private"}
                  </div>
                </div>
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
                <div style={{
                  padding: "16px",
                  background: "var(--surface-muted)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>
                  No location history published
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow)",
        }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", margin: "0 0 8px" }}>
            Nothing published yet.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-muted)", margin: 0 }}>
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
