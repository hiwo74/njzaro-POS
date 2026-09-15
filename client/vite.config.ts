import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project sites are served from /<repo-name>/, not the domain
// root, so every asset URL and the PWA manifest need that prefix baked in.
const BASE = "/njzaro-pos/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Njzaro Perfumes POS",
        short_name: "Njzaro POS",
        description: "Point of sale for Njzaro Perfumes",
        theme_color: "#18181b",
        background_color: "#f6f5f2",
        display: "standalone",
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            urlPattern: /\/uploads\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "product-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    // Allows the localtunnel dev/testing subdomain through Vite's dev-server
    // host check (a DNS-rebinding guard that otherwise blocks any Host header
    // it doesn't recognize).
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
