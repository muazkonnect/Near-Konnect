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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // core
          if (id.includes("/react/") || id.includes("/react-dom/")) return "react";
          if (id.includes("/react-router/") || id.includes("/react-router-dom/")) return "router";

          // supabase + data
          if (id.includes("@supabase/")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "react-query";

          // ui libs
          if (id.includes("@radix-ui/")) return "radix";
          if (id.includes("lucide-react")) return "icons";

          // heavy feature libs
          if (id.includes("recharts")) return "charts";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react-markdown")) return "markdown";

          return "vendor";
        },
      },
    },
  },
}));
