import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/wiki-heat/',
  build: {
    outDir: 'dist',
  },
})
