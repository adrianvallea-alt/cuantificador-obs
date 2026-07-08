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
      includeAssets: ['logo.png', 'reveal-sound.mp3'], // Asegura tus archivos premium en la caché
      manifest: {
        name: 'Cuantificador OBS',
        short_name: 'CuantificadorOBS',
        description: 'Calculadora PWA para cuantificación de materiales OBS',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Abre la app a pantalla completa sin barras del navegador
        orientation: 'portrait',
        icons: [
          {
            src: 'logo.png', // Usamos tu logo actual como icono de la app
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Para que Android lo adapte perfecto a sus iconos redondos
          }
        ]
      }
    })
  ],
  base: '/cuantificador-obs/', // 👈 Esto le dice a Vite que el proyecto se sube a tu repositorio específico
})