import axios from 'axios';
const api = axios.create({ baseURL: '/api', timeout: 60000 });

// Request interceptor for performance tracking
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

// Scan endpoints
export const scanCode = (code, filename) => api.post('/scan/code', { code, filename }).then(r => r.data);
export const scanFiles = (files) => { const fd = new FormData(); files.forEach(f => fd.append('files', f)); return api.post('/scan/files', fd, { timeout: 120000 }).then(r => r.data); };
export const scanDemo = () => api.post('/scan/demo').then(r => r.data);
export const getScan = (id) => api.get(`/scan/${id}`).then(r => r.data);

// Analysis endpoints
export const getRiskAnalysis = (scanId) => api.post('/risk/analyze', { scanId }).then(r => r.data);
export const getMigrationReport = (scanId) => api.post('/migrate', { scanId }).then(r => r.data);
export const getMigrationSingle = (finding) => api.post('/migrate/single', { finding }).then(r => r.data);

// Batch analysis (all-in-one for faster UX)
export const getFullAnalysis = (scanId) => api.post('/analyze/full', { scanId }).then(r => r.data);

// Compliance endpoints
export const getScorecard = (scanId) => api.post('/compliance/scorecard', { scanId }).then(r => r.data);
export const getCBOM = (scanId) => api.post('/compliance/cbom', { scanId }).then(r => r.data);
export const getSARIF = (scanId) => api.post('/compliance/sarif', { scanId }).then(r => r.data);
export const getComplianceReport = (scanId) => api.post('/compliance/report', { scanId }).then(r => r.data);

// Knowledge endpoints
export const getAlgorithms = () => api.get('/knowledge/algorithms').then(r => r.data);
export const getTimeline = () => api.get('/knowledge/timeline').then(r => r.data);
export const getVulnerabilities = () => api.get('/knowledge/vulnerabilities').then(r => r.data);

// Dashboard & system
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const getDemoFiles = () => api.get('/demo-files').then(r => r.data);
export const getHealthCheck = () => api.get('/health').then(r => r.data);
export const getSystemInfo = () => api.get('/system/info').then(r => r.data);

// Export endpoints
export const exportReport = (scanId, format) => api.get(`/export/${scanId}/${format}`, { responseType: 'blob' });

// Releases / Downloads
export const getReleases = () => api.get('/releases').then(r => r.data);

// Report generation
export const generateReport = (scanId, format = 'html') => api.post('/report/generate', { scanId, format }, { responseType: format === 'html' ? 'blob' : 'json' });

// CI/CD config generator
export const generateCIConfig = (platform, failOn, languages, report) => api.post('/cicd/generate', { platform, failOn, languages, report }).then(r => r.data);
export const getAllCIConfigs = () => api.post('/cicd/generate', { platform: 'all' }).then(r => r.data);

// Protocol stack analysis
export const analyzeProtocols = (scanId) => api.post('/scan/analyze-protocols', { scanId }).then(r => r.data);

// SSE progress stream
export const subscribeScanProgress = (scanId, onProgress) => {
  const evtSrc = new EventSource(`/api/scan/progress/${scanId}`);
  evtSrc.onmessage = (e) => {
    try { onProgress(JSON.parse(e.data)); } catch {}
  };
  evtSrc.onerror = () => evtSrc.close();
  return evtSrc;
};
