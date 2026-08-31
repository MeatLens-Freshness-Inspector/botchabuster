import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

const sourceDirectory = path.resolve(process.cwd(), "src");

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,json,bin}"],
        // SPA fallback: serve the cached shell for any navigation when offline
        navigateFallback: "/index.html",
        // Only apply the HTML fallback to real SPA navigations — never to
        // sub-resource fetches like dynamically imported JS chunks
        // (e.g. pdfmake-*.js, vfs_fonts-*.js).  Without the allowlist the
        // service worker would intercept a stale/missing chunk URL and hand
        // back the HTML shell, which the browser then rejects with
        // "Expected a JavaScript module script but got text/html".
        navigateFallbackAllowlist: [/^\/(?!assets\/)[^.]*$/],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/assets\//],
        runtimeCaching: [
          // Google Fonts stylesheet — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts files — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Authenticated SSE must never be cloned, cached, or replayed by Workbox.
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.endsWith("/api/user-chat/events"),
            handler: "NetworkOnly",
          },
          // Backend API GET requests prefer fresh data with an offline cache fallback.
          {
            urlPattern: ({ url, request }: { url: URL; request: Request }) =>
              request.method === "GET" &&
              !url.pathname.endsWith("/api/user-chat/events") &&
              (url.pathname.startsWith("/api/") ||
                url.href.includes("/api/")),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase storage images — stale-while-revalidate, 7 days
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ONNX model files — network-first so new model deployments are
          // picked up quickly while still allowing cached offline fallback.
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.endsWith(".onnx") &&
              (url.pathname.startsWith("/model/") || url.pathname.startsWith("/models/")),
            handler: "NetworkFirst",
            options: {
              cacheName: "onnx-model-cache",
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 6,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ONNX Runtime sidecar assets used by the WASM backend.
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.startsWith("/ort/") &&
              (url.pathname.endsWith(".wasm") || url.pathname.endsWith(".mjs")),
            handler: "CacheFirst",
            options: {
              cacheName: "onnx-runtime-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "MeatLens - Freshness Inspector",
        short_name: "MeatLens",
        description: "AI-powered meat freshness inspection for wet markets",
        theme_color: "#1a1e2e",
        background_color: "#161a26",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": sourceDirectory,
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
}));
