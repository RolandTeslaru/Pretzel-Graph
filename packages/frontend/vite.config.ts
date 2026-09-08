import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { Agent } from 'node:http'

// Keep-alive upstream sockets; without it busy sessions exhaust TIME_WAIT and Vite hangs.
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
    // Pin the HMR socket to the dev server when the page is served from another origin.
    hmr: { host: 'localhost', port: 5173, protocol: 'ws' },
    proxy: {
      '/api': backendProxy,
      '/webhook': backendProxy,
      '/webhook-test': backendProxy,
      '/oauth': backendProxy,
      '/socket': { ...backendProxy, ws: true },
    },
  },
  preview: {
    proxy: {
      '/api': backendProxy,
      '/webhook': backendProxy,
      '/webhook-test': backendProxy,
      '/oauth': backendProxy,
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
