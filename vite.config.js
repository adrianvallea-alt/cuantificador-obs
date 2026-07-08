import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png', 'reveal-sound.mp3'], 
      manifest: {
        name: 'Cuantificador OBS',
        short_name: 'CuantificadorOBS',
        description: 'Calculadora PWA para cuantificación de materiales OBS',
        theme_color: '#031d56',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }) // 👈 Aquí estaba el detalle, faltaba cerrar correctamente el paréntesis de VitePWA
  ],
  base: '/cuantificador-obs/',
})