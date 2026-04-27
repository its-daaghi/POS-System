import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/main'),
            rollupOptions: {
              external: ['better-sqlite3', 'electron']
            }
          }
        }
      },
      {
        entry: resolve(__dirname, 'src/main/preload.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist-electron/preload'),
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@db': resolve(__dirname, 'src/database')
    }
  },
  root: 'src/renderer',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
})
