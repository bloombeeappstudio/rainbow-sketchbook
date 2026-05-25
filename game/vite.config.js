import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,  // 작은 자산도 별도 파일로 (Capacitor 호환)
  },
});
