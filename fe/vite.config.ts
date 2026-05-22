import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/portal": {
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/login": {
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/register": {
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
        },
      },
      "/api": {
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
      },
      "/sanctum": {
        target: "http://localhost:8000",
        secure: false,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
