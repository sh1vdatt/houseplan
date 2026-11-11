import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served from https://sh1vdatt.github.io/houseplan/ on GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/houseplan/' : '/',
  plugins: [react(), tailwindcss()],
}));
