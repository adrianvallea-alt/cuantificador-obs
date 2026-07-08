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
      // Agregamos tus nuevos iconos a los assets incluidos en la caché offline
      includeAssets: ['logo.png', 'pwa-192x192.png', 'pwa-512x512.png', 'reveal-sound.mp3'], 
      manifest: {
        name: 'Cuantificador OBS',
        short_name: 'CuantificadorOBS',
        description: 'Calculadora PWA para cuantificación de materiales OBS',
        theme_color: '#031d56', // 🛠️ Cambiado al azul corporativo para que la barra de notificaciones del cel combine
        background_color: '#ffffff',
        display: 'standalone', // Abre la app a pantalla completa sin barras del navegador
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png', // 👈 Tu nuevo icono con fondo sólido y margen seguro
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Permite a Android adaptarlo a formas circulares/cuadradas sin romperlo
          },
          {
            src: 'pwa-512x512.png', // 👈 Tu nuevo icono de alta resolución
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    ])
  ],
  base: '/cuantificador-obs/', // Esto le dice a Vite que el proyecto se sube a tu repositorio específico
})