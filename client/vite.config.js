import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.PROXY_TARGET || 'http://server:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,

    proxy: {
      // Forward API requests to the server container
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },

      // Forward authentication requests to the server container
      '/auth': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
