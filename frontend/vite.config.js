import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Ép IPv4 để tránh lỗi 502 trên Windows khi localhost ưu tiên IPv6.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
