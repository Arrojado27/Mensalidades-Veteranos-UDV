import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mensalidades Veteranos U.D.V.',
        short_name: 'Veteranos U.D.V.',
        description: 'Controlo de mensalidades e saldo dos Veteranos U.D.V.',
        lang: 'pt-PT',
        theme_color: '#0d0d0f',
        // Cor do ecrã de arranque. Fica no tom escuro da app, que é como ela é
        // usada; em tema claro vê-se um instante escuro antes de abrir.
        background_color: '#0d0d0f',
        // Ecrã inteiro: no Android esconde também a barra de estado do sistema.
        // O display_override dá a ordem de preferência e cai para standalone
        // onde fullscreen não existe (iOS, por exemplo).
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
})
