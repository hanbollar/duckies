// vite.config.js
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/duckies/',
  esbuild: {
    supported: {
      'top-level-await': true // browsers can handle top-level-await features
    },
  },
  assetsInclude: [
    'assets/**',
    'images/**'
  ],
  resolve: {
    extensions: ['.js']
  },
})

