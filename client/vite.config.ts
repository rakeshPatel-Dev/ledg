import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "src/public",
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
      "@ledg/shared": import.meta.dirname + "/src/shared",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("clerk")) return "clerk";
            if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
              return "motion";
            }
            if (id.includes("react") || id.includes("scheduler")) return "react";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-day-picker") || id.includes("date-fns")) return "date";
            if (id.includes("tanstack")) return "query";
            if (id.includes("zod")) return "zod";
            return "vendor";
          }
        },
      },
    },
  },
  // Dev proxy: forwards /api/* → local API server so CORS isn't needed in dev.
  // In production, VITE_API_URL is set as an env var pointing at the deployed API,
  // and the proxy is not used (Vite only runs during `vite dev`).
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
