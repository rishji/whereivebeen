import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  defaultUserProfile,
  normalizeDisplayName,
  type UserProfile
} from "../lib/publicGallery";

type VisibilityPanelProps = {
  session: Session | null;
  profile: UserProfile;
  disabled: boolean;
  onSave: (profile: UserProfile) => Promise<void>;
};

export function VisibilityPanel({ session, profile, disabled, onSave }: VisibilityPanelProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [message, setMessage] = useState("Private by default. Publish only when you are ready.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setIsPublic(profile.isPublic);
  }, [profile.displayName, profile.isPublic]);

  if (!session) {
    return (
      <section className="visibility-card" aria-label="Public gallery controls">
        <p className="auth-label">Public gallery</p>
        <p className="auth-message">
          You can upload and store data locally. Sign in to sync it or publish it.
        </p>
      </section>
    );
  }

  async function handleSave() {
    setIsSaving(true);

    const nextProfile = {
      displayName: normalizeDisplayName(displayName),
      isPublic
    };

    try {
      await onSave(nextProfile);
      setDisplayName(nextProfile.displayName);
      setMessage(nextProfile.isPublic ? "Visible in the public gallery." : "Removed from the public gallery.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update public gallery settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="visibility-card" aria-label="Public gallery controls">
      <div>
        <p className="auth-label">Public gallery</p>
        <label className="field-label">
          Display name
          <input
            type="text"
            maxLength={80}
            value={displayName}
            placeholder={defaultUserProfile.displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={disabled || isSaving}
          />
        </label>
      </div>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          disabled={disabled || isSaving}
        />
        Show my data in the gallery
      </label>
      <button type="button" onClick={() => void handleSave()} disabled={disabled || isSaving}>
        {isSaving ? "Saving..." : "Save visibility"}
      </button>
      <p className="auth-message">{message}</p>
    </section>
  );
}
