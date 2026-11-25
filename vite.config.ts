/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const disableViteClientWs: Plugin = {
  name: 'disable-vite-client-ws',
  apply: 'serve',
  enforce: 'post',
  transform(code, id) {
    if (id.includes('vite/dist/client/client.mjs')) {
      return {
        code: code
          .replace(
            /await wsTransport\.connect\(handlers\);/g,
            'return;',
          )
          .replace(
            /await wsTransport\.disconnect\(\);/g,
            'return;',
          )
          .replace(
            /wsTransport\.send\(data\);/g,
            'return;',
          ),
        map: null,
      };
    }
    return null;
  },
};

const basePath = process.env.VITE_BASE || '/';

export default defineConfig({
  base: basePath,
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
    ws: false,
  },
  plugins: [
    disableViteClientWs,
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        id: basePath,
        name: 'AngelOS-web (Windows 11 + 10 Hybrid)',
        short_name: 'AngelOS-web',
        description: 'AngelOS-web — Installable Windows 11 + 10 hybrid web OS with Google Chrome, left-side search bar, physical booter, local accounts, and 5,120+ BIOS features.',
        theme_color: '#0078d4',
        background_color: '#008080',
        display: 'standalone',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: `${basePath}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${basePath}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${basePath}pwa-maskable-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
