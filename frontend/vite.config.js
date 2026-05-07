import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Plugin: injeta versão de build no sw.js ─────────────────
function swVersionPlugin() {
  return {
    name: 'vite-plugin-sw-version',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const version = Date.now()
      let sw = fs.readFileSync(swPath, 'utf-8')
      sw = sw
        .replace(/'alsistemas-v1'/g,     `'alsistemas-${version}'`)
        .replace(/'alsistemas-api-v1'/g, `'alsistemas-api-${version}'`)
      fs.writeFileSync(swPath, sw)
      console.log(`\x1b[32m✓ sw-version\x1b[0m cache → alsistemas-${version}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    port: 5173,
    host: true,
    // ─── Proxy local: redireciona /api → backend Termux ───────
    // Evita problemas de CORS em dev sem precisar de extensão no browser.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-hot-toast'],
  },
})
