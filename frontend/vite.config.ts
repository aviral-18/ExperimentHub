import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Dev server proxies /api to the FastAPI backend (default port 8010) so the SPA
// can use same-origin relative URLs and avoid CORS during development.
const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8010";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
