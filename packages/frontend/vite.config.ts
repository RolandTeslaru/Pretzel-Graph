import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { Agent } from 'node:http'


// Reuse one upstream socket instead of opening a fresh TCP connection per
// proxied request. Without keepAlive, every /api and /socket call leaves a
// socket in TIME_WAIT for 2*MSL; busy editor sessions accumulate thousands,
// saturate the kernel TCB pool, and start getting SYNs silently dropped —
// surfacing as Vite "hanging" with no response. The timeouts make a stuck
// upstream fail after 30s instead of holding the proxy socket forever.
const backendProxy = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  agent: new Agent({ keepAlive: true, maxSockets: 50 }),
  timeout: 30_000,
  proxyTimeout: 30_000,
}

// https://vite.dev/config/
export default defineConfig({
  envDir: '../../',
  server: {
    // The page is served through the fleet router on another origin, so the
    // reload socket is told where the dev server actually is.
    hmr: { host: 'localhost', port: 5173, protocol: 'ws' },
    proxy: {
      '/api': backendProxy,
      '/webhook': backendProxy,
      '/webhook-test': backendProxy,
      '/socket': { ...backendProxy, ws: true },
    },
  },
  preview: {
    proxy: {
      '/api': backendProxy,
      '/webhook': backendProxy,
      '/webhook-test': backendProxy,
      '/socket': { ...backendProxy, ws: true },
    },
  },
  plugins: [
    tsconfigPaths(),
    tanstackRouter(),
    react({
      babel: {
        plugins: [
          "babel-plugin-react-compiler",
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          ["@babel/plugin-proposal-class-properties", { loose: true }],
        ],
      },
    }),
    tailwindcss(),
  ],
})
