import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore DB / uploads so API writes do not trigger full page reload (white flash)
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
            ignored: ['**/data/**', '**/uploads/**', '**/node_modules/**', '**/.git/**'],
          },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'axios', 'lucide-react'],
    },
  };
});
