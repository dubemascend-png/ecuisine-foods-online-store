import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // This is a parallel preview under the existing GitHub Pages site.
  // The legacy storefront and dashboards remain untouched.
  base: "/ecuisine-foods-online-store/modern/",
  build: {
    outDir: "../docs/modern",
    emptyOutDir: false,
  },
});
