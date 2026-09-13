import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://wave-labs.pages.dev",
  base: process.env.SITE_BASE ?? "/",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
