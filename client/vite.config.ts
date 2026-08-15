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
