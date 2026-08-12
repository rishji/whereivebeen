import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // whereivebeen.rishimohnot.com is served by Cloudflare Pages from the domain
  // root; rishji.github.io/whereivebeen/ is served by GitHub Pages from a
  // subpath. CF_PAGES is set automatically during Cloudflare Pages builds.
  base: process.env.CF_PAGES ? "/" : "/whereivebeen/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
