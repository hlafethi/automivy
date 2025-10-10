import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'jsonwebtoken', 'pg', 'bcryptjs'],
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.env.NODE_ENV': '"development"',
  },
  resolve: {
    alias: {
      process: 'process/browser',
    },
  },
  build: {
    rollupOptions: {
      external: ['jsonwebtoken', 'pg', 'bcryptjs'],
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
