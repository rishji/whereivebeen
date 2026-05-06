import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../lib/supabase";
import { sendMagicLink, signOut } from "../lib/auth";

type AuthPanelProps = {
  session: Session | null;
  loading: boolean;
};

export function AuthPanel({ session, loading }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    isSupabaseConfigured
      ? "Sign in to sync your map across devices."
      : "Set Supabase env vars to enable accounts."
  );
  const [isBusy, setIsBusy] = useState(false);

  async function handleSendLink() {
    if (!email.trim()) { setMessage("Enter an email address first."); return; }
    setIsBusy(true);
    try {
      await sendMagicLink(email.trim());
      setMessage("Magic link sent — check your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send magic link.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignOut() {
    setIsBusy(true);
    try {
      await signOut();
      setMessage("Signed out.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setIsBusy(false);
    }
  }

  if (loading) {
    return <span className="pill">Checking session…</span>;
  }

  if (session?.user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="pill" title={message}>{session.user.email}</span>
        <button className="btn btn-sm" type="button" onClick={() => void handleSignOut()} disabled={isBusy}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        className="text-input"
        style={{ width: 180 }}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void handleSendLink(); }}
      />
      <button
        className="btn btn-sm btn-primary"
        type="button"
        onClick={() => void handleSendLink()}
        disabled={isBusy || !isSupabaseConfigured}
      >
        {isBusy ? "Sending…" : "Sign in"}
      </button>
    </div>
  );
}
