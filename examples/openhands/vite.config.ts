import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '#': path.resolve(__dirname, './src'),
      // Resolve SDK from parent's src directory for development
      '@openhands/client': path.resolve(__dirname, '../../src/index.ts'),
    },
  },
  build: {
    // Skip type checking during build since SDK types come from source
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress warnings from external modules
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  server: {
    port: 3001,
    host: true,
    allowedHosts: ['.all-hands.dev', 'localhost'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'react-hot-toast',
      'clsx',
      'tailwind-merge',
      '@heroui/react',
      'lucide-react',
      'zustand',
      '@monaco-editor/react',
      '@xterm/xterm',
      '@xterm/addon-fit',
      'react-markdown',
      'remark-gfm',
      'react-syntax-highlighter',
      'framer-motion',
    ],
  },
});
