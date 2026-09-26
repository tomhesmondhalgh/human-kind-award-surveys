import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip console/debugger from production builds: the app logs session and
  // user details that shouldn't appear in visitors' browsers. Dev keeps them.
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
}));
