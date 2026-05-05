import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Plugin: injeta versão de build no sw.js ─────────────────
// O sw.js fica em public/ e é copiado como está pelo Vite.
// Este plugin substitui os nomes de cache por versões contendo o
// timestamp do build, garantindo que cada deploy limpe o cache antigo.
function swVersionPlugin() {
  return {
    name: 'vite-plugin-sw-version',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const version = Date.now()
      let sw = fs.readFileSync(swPath, 'utf-8')
      sw = sw
        .replace(/'iguanews-v1'/g,     `'iguanews-${version}'`)
        .replace(/'iguanews-api-v1'/g, `'iguanews-api-${version}'`)
      fs.writeFileSync(swPath, sw)
      console.log(`\x1b[32m✓ sw-version\x1b[0m cache → iguanews-${version}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: { port: 5173, host: true },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-hot-toast'],
  },
})
