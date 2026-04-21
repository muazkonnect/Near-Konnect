import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("scheduler") || id.match(/[\\/]react[\\/]/)) {
            return "react-vendor";
          }
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("libphonenumber-js")) return "phone";
          if (id.includes("react-markdown") || id.includes("micromark") || id.includes("mdast") || id.includes("unist") || id.includes("hast")) {
            return "markdown";
          }
          if (id.includes("date-fns")) return "date-fns";
          if (id.includes("react-day-picker")) return "day-picker";
          return "vendor";
        },
      },
    },
  },
}));
