import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Portugal Absence Tracker',
        // short_name is what appears under the home-screen icon on Android
        // (and is the manifest fallback for iOS when no apple-mobile-web-app-title
        // is set). Match Apple's canonical label so the two stay in sync.
        short_name: 'Portugal Absence',
        description: 'Track absence days against Portuguese residence permit limits.',
        theme_color: '#1a1d24',
        background_color: '#1a1d24',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Maskable variants — Android may crop to its adaptive-icon shape.
          // The source PNG has a cream safe-area border, so the same files
          // work as maskable without re-export.
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ]
});
