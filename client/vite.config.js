import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Bazaar@IITGN',
        short_name: 'Bazaar',
        description: 'The official peer-to-peer marketplace for IIT Gandhinagar',
        theme_color: '#ea580c', // This makes the mobile browser top-bar match your orange theme
        background_color: '#f9fafb',
        display: 'standalone', // This is what hides the browser URL bar when installed!
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})