import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// Source maps let Sentry show the original code for an error. They're only
// built and uploaded when SENTRY_AUTH_TOKEN is set (in Vercel), and are
// deleted after upload so visitors can't download them.
const uploadSourceMaps = !!process.env.SENTRY_AUTH_TOKEN;

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    uploadSourceMaps &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        url: "https://de.sentry.io/",
        release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
        telemetry: false,
      }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: uploadSourceMaps ? "hidden" : false,
  },
  // Strip console/debugger from production builds: the app logs session and
  // user details that shouldn't appear in visitors' browsers. Dev keeps them.
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : undefined,
}));
