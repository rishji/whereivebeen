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
      ? "Sign in to sync your map and history across devices."
      : "Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable accounts."
  );
  const [isBusy, setIsBusy] = useState(false);

  async function handleSendLink() {
    if (!email.trim()) {
      setMessage("Enter an email address first.");
      return;
    }

    setIsBusy(true);

    try {
      await sendMagicLink(email.trim());
      setMessage("Magic link sent. Check your email and return here.");
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

  return (
    <section className="auth-card" aria-label="Account controls">
      {loading ? (
        <p>Checking account session...</p>
      ) : session?.user ? (
        <>
          <div>
            <p className="auth-label">Signed in</p>
            <strong>{session.user.email}</strong>
          </div>
          <button type="button" className="secondary" onClick={() => void handleSignOut()} disabled={isBusy}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <div className="auth-form">
            <input
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="button" onClick={() => void handleSendLink()} disabled={isBusy || !isSupabaseConfigured}>
              {isBusy ? "Sending..." : "Send magic link"}
            </button>
          </div>
        </>
      )}
      <p className="auth-message">{message}</p>
    </section>
  );
}
