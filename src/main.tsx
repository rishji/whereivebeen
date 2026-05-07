import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// When GitHub Pages 404.html redirects /whereivebeen/<slug> to /?user=<slug>,
// read the slug and clean it from the URL so it doesn't persist in the address bar.
const params = new URLSearchParams(window.location.search);
const initialUserSlug = params.get("user") ?? undefined;
if (initialUserSlug) {
  const clean = window.location.pathname + window.location.hash;
  window.history.replaceState(null, "", clean);
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App initialUserSlug={initialUserSlug} />
  </StrictMode>
);
