import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const backendProxy = {
  target: 'http://localhost:3001',
  changeOrigin: true,
}

// https://vite.dev/config/
export default defineConfig({
  envDir: '../../',
  server: {
    proxy: {
      '/api': backendProxy,
      '/socket': { ...backendProxy, ws: true },
    },
  },
  preview: {
    proxy: {
      '/api': backendProxy,
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
