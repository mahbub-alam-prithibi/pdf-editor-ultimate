import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works both on Vercel (root) and on
// GitHub Pages project sites (served from /<repo-name>/).
export default defineConfig({
  plugins: [react()],
  base: './',
})
