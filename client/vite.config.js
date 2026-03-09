import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-pro': ['@ant-design/pro-components', '@ant-design/pro-layout'],
          'vendor-charts': ['@ant-design/plots', '@ant-design/charts'],
          'vendor-motion': ['framer-motion'],
          'vendor-syntax': ['react-syntax-highlighter'],
          'vendor-diff': ['react-diff-viewer-continued'],
          'vendor-countup': ['react-countup'],
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'antd', '@ant-design/icons',
      '@ant-design/pro-components', '@ant-design/plots',
      'framer-motion', 'react-countup',
    ],
  },
});
