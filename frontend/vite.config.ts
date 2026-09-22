import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from './public/manifest.json'
import gasQuebecProxy from './server/gasQuebecProxy'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gas-quebec-proxy',
      configureServer(server) {
        server.middlewares.use('/api/gas-stations', (req, res) => { void gasQuebecProxy(req, res) })
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/gas-stations', (req, res) => { void gasQuebecProxy(req, res) })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon.png'],
      manifest
    })
  ]
})

