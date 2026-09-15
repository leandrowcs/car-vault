import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Car Vault',
        short_name: 'Car Vault',
        description: 'Personal digital garage and vehicle expense tracker',
        start_url: '/',
        display: 'standalone',
        theme_color: '#F59E0B',
        background_color: '#020617',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})

