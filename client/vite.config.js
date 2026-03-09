import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin: copy server engine files to public/engine/ so the Web Worker can fetch them
function copyEngineFiles() {
  return {
    name: 'copy-engine-files',
    buildStart() {
      const engineDir = resolve(__dirname, 'public', 'engine');
      if (!existsSync(engineDir)) mkdirSync(engineDir, { recursive: true });

      const serverEngine = resolve(__dirname, '..', 'server', 'engine');
      const serverData = resolve(__dirname, '..', 'server', 'data');

      const engineFiles = ['models.js', 'rules.js', 'scanner.js', 'migration.js', 'risk-analyzer.js', 'compliance.js'];
      const dataFiles = ['demo-files.js', 'pqc-knowledge.js'];

      for (const f of engineFiles) {
        const src = resolve(serverEngine, f);
        if (existsSync(src)) copyFileSync(src, resolve(engineDir, f));
      }
      for (const f of dataFiles) {
        const src = resolve(serverData, f);
        if (existsSync(src)) copyFileSync(src, resolve(engineDir, f));
      }
      console.log('[vite] Copied engine files to public/engine/');
    },
  };
}

// Detect GitHub Pages deployment: GITHUB_PAGES env or --base flag
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.REPO_NAME || 'NIST';

export default defineConfig({
  // For GitHub Pages: /REPO_NAME/; for local dev or server: /
  base: isGitHubPages ? `/${repoName}/` : '/',
  plugins: [react(), copyEngineFiles()],
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
  // Web Worker support
  worker: {
    format: 'es',
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
