import { defineConfig } from 'vite';

export default defineConfig({
  base: '/waffle-tycoon/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
    port: 3000,
    open: true,
  },
});
