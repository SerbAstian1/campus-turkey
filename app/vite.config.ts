/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
      output: {
        /* Motion and map are the two heavy dependencies. Splitting them keeps both out
           of the initial bundle, which is what the performance budget in
           Developer handoff notes.md is measured against. */
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["gsap", "framer-motion"],
          map: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
