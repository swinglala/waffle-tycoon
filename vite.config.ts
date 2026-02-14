import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const isGitHubPages = process.env.DEPLOY_TARGET === 'ghpages';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: isGitHubPages ? '/waffle-tycoon/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 2000, // Phaser 포함 번들 크기 경고 임계값 (2MB)
  },
  server: {
    port: 3000,
    open: true,
  },
});
