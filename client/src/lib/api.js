/**
 * QuantumShield — Smart API Layer
 * Automatically detects if Express backend is available.
 * If yes → uses server API. If no → falls back to browser Web Worker engine.
 * This enables full functionality on GitHub Pages (static hosting) without a server.
 */
import axios from 'axios';

/* ── Server-mode API client ── */
const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.request.use(config => {
  config.metadata = { startTime: performance.now() };
  return config;
});
api.interceptors.response.use(response => {
  if (response.config.metadata) {
    response.duration = Math.round(performance.now() - response.config.metadata.startTime);
  }
  return response;
});

/* ── Worker-mode (browser-only) engine ── */
let worker = null;
let workerCallId = 0;
const workerCallbacks = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const cb = workerCallbacks.get(id);
      if (cb) {
        workerCallbacks.delete(id);
        if (error) cb.reject(new Error(error));
        else cb.resolve(result);
      }
    };
    worker.onerror = (e) => {
      console.error('[API] Worker error:', e.message);
    };
  }
  return worker;
}

function callWorker(type, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = ++workerCallId;
    workerCallbacks.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, payload });
    // Timeout after 120s
    setTimeout(() => {
      if (workerCallbacks.has(id)) {
        workerCallbacks.delete(id);
        reject(new Error('Worker timeout'));
      }
    }, 120000);
  });
}

/* ── Mode detection ── */
let _mode = null; // 'server' | 'browser'

async function detectMode() {
  if (_mode) return _mode;
  try {
    await axios.get('/api/health', { timeout: 3000 });
    _mode = 'server';
    console.log('[QuantumShield] Mode: Server (Express backend detected)');
  } catch {
    _mode = 'browser';
    console.log('[QuantumShield] Mode: Browser (static hosting, using Web Worker engine)');
  }
  return _mode;
}

// Eagerly detect on module load
const modePromise = detectMode();

/**
 * Smart caller: tries server first, falls back to worker
 */
async function smartCall(serverFn, workerType, workerPayload) {
  const mode = await modePromise;
  if (mode === 'server') {
    try {
      return await serverFn();
    } catch (e) {
      // If server call fails, try worker as fallback
      console.warn('[API] Server call failed, falling back to browser engine:', e.message);
      return callWorker(workerType, workerPayload);
    }
  }
  return callWorker(workerType, workerPayload);
}

/* ══════════════════════════════════════════════
   Exported API — same interface, smart routing
   ══════════════════════════════════════════════ */

// Scan endpoints
export const scanCode = (code, filename) =>
  smartCall(
    () => api.post('/scan/code', { code, filename }).then(r => r.data),
    'scan-code',
    { code, filename }
  );

export const scanFiles = (files) =>
  smartCall(
    () => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      return api.post('/scan/files', fd, { timeout: 120000 }).then(r => r.data);
    },
    'scan-files',
    {
      files: files.map(f => ({
        name: f.name || f.originalname || 'unknown',
        content: '', // Will be populated via FileReader below
      })),
    }
  ).catch(async () => {
    // For browser mode, we need to read file contents
    const fileData = await Promise.all(
      files.map(f => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: f.name, content: reader.result });
        reader.onerror = () => resolve({ name: f.name, content: '' });
        reader.readAsText(f);
      }))
    );
    return callWorker('scan-files', { files: fileData });
  });

export const scanDemo = () =>
  smartCall(
    () => api.post('/scan/demo').then(r => r.data),
    'scan-demo',
    {}
  );

export const getScan = (id) =>
  smartCall(
    () => api.get(`/scan/${id}`).then(r => r.data),
    'get-scan',
    { id }
  );

// Analysis endpoints
export const getRiskAnalysis = (scanId) =>
  smartCall(
    () => api.post('/risk/analyze', { scanId }).then(r => r.data),
    'risk-analyze',
    { scanId }
  );

export const getMigrationReport = (scanId) =>
  smartCall(
    () => api.post('/migrate', { scanId }).then(r => r.data),
    'migrate',
    { scanId }
  );

export const getMigrationSingle = (finding) =>
  smartCall(
    () => api.post('/migrate/single', { finding }).then(r => r.data),
    'migrate-single',
    { finding }
  );

// Batch analysis
export const getFullAnalysis = (scanId) =>
  smartCall(
    () => api.post('/analyze/full', { scanId }).then(r => r.data),
    'analyze-full',
    { scanId }
  );

// Compliance endpoints
export const getScorecard = (scanId) =>
  smartCall(
    () => api.post('/compliance/scorecard', { scanId }).then(r => r.data),
    'compliance-scorecard',
    { scanId }
  );

export const getCBOM = (scanId) =>
  smartCall(
    () => api.post('/compliance/cbom', { scanId }).then(r => r.data),
    'compliance-cbom',
    { scanId }
  );

export const getSARIF = (scanId) =>
  smartCall(
    () => api.post('/compliance/sarif', { scanId }).then(r => r.data),
    'compliance-sarif',
    { scanId }
  );

export const getComplianceReport = (scanId) =>
  smartCall(
    () => api.post('/compliance/report', { scanId }).then(r => r.data),
    'compliance-report',
    { scanId }
  );

// Knowledge endpoints
export const getAlgorithms = () =>
  smartCall(
    () => api.get('/knowledge/algorithms').then(r => r.data),
    'knowledge-algorithms',
    {}
  );

export const getTimeline = () =>
  smartCall(
    () => api.get('/knowledge/timeline').then(r => r.data),
    'knowledge-timeline',
    {}
  );

export const getVulnerabilities = () =>
  smartCall(
    () => api.get('/knowledge/vulnerabilities').then(r => r.data),
    'knowledge-vulnerabilities',
    {}
  );

// Dashboard & system
export const getDashboardStats = () =>
  smartCall(
    () => api.get('/dashboard/stats').then(r => r.data),
    'dashboard-stats',
    {}
  );

export const getDemoFiles = () =>
  smartCall(
    () => api.get('/demo-files').then(r => r.data),
    'demo-files',
    {}
  );

export const getHealthCheck = () =>
  smartCall(
    () => api.get('/health').then(r => r.data),
    'health',
    {}
  );

export const getSystemInfo = () =>
  smartCall(
    () => api.get('/system/info').then(r => r.data),
    'system-info',
    {}
  );

// Export endpoints
export const exportReport = (scanId, format) =>
  smartCall(
    () => api.get(`/export/${scanId}/${format}`, { responseType: 'blob' }),
    'analyze-full', // Fallback: return full analysis
    { scanId }
  );

// Releases / Downloads
export const getReleases = () =>
  smartCall(
    () => api.get('/releases').then(r => r.data),
    'releases',
    {}
  );

// Report generation
export const generateReport = (scanId, format = 'html') =>
  smartCall(
    () => api.post('/report/generate', { scanId, format }, { responseType: format === 'html' ? 'blob' : 'json' }),
    'analyze-full',
    { scanId }
  );

// CI/CD config generator
export const generateCIConfig = (platform, failOn, languages, report) =>
  smartCall(
    () => api.post('/cicd/generate', { platform, failOn, languages, report }).then(r => r.data),
    'cicd-generate',
    { platform, failOn, languages, report }
  );

export const getAllCIConfigs = () =>
  smartCall(
    () => api.post('/cicd/generate', { platform: 'all' }).then(r => r.data),
    'cicd-generate',
    { platform: 'all' }
  );

// Protocol stack analysis
export const analyzeProtocols = (scanId) =>
  smartCall(
    () => api.post('/scan/analyze-protocols', { scanId }).then(r => r.data),
    'analyze-full', // Use full analysis as fallback
    { scanId }
  );

// SSE progress stream (server-only, with graceful degradation)
export const subscribeScanProgress = (scanId, onProgress) => {
  // In browser mode, simulate progress
  if (_mode === 'browser') {
    const steps = [
      { progress: 10, step: 'Initializing engine' },
      { progress: 40, step: 'Scanning code' },
      { progress: 70, step: 'Analyzing risks' },
      { progress: 100, step: 'Complete' },
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= steps.length) { clearInterval(iv); return; }
      onProgress(steps[i++]);
    }, 200);
    return { close: () => clearInterval(iv) };
  }

  const evtSrc = new EventSource(`/api/scan/progress/${scanId}`);
  evtSrc.onmessage = (e) => {
    try { onProgress(JSON.parse(e.data)); } catch {}
  };
  evtSrc.onerror = () => evtSrc.close();
  return evtSrc;
};
