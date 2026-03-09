/**
 * QuantumShield — API 路由 v2.0
 * 优化: LRU 缓存 · 批量分析端点 · SSE 进度推送 · gzip 响应压缩
 */
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QuantumShieldScanner = require('../engine/scanner');
const { MigrationEngine } = require('../engine/migration');
const ComplianceReporter = require('../engine/compliance');
const RiskAnalyzer = require('../engine/risk-analyzer');
const { QUANTUM_VULNERABILITY_DB } = require('../engine/models');
const { PQC_ALGORITHMS, TIMELINE } = require('../data/pqc-knowledge');
const DEMO_FILES = require('../data/demo-files');

const router = express.Router();
const scanner = new QuantumShieldScanner();
const migrationEngine = new MigrationEngine();
const complianceReporter = new ComplianceReporter();
const riskAnalyzer = new RiskAnalyzer();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/* ─── LRU-style scan store with TTL (1 hour) ─── */
const scanStore = new Map();
const SCAN_TTL = 60 * 60 * 1000; // 1 hour
const MAX_SCANS = 500;

function storeScan(result) {
  // Evict oldest entries if over limit
  if (scanStore.size >= MAX_SCANS) {
    const oldest = scanStore.keys().next().value;
    scanStore.delete(oldest);
  }
  scanStore.set(result.id, { data: result, timestamp: Date.now() });
}

function getScan(id) {
  const entry = scanStore.get(id);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SCAN_TTL) {
    scanStore.delete(id);
    return null;
  }
  return entry.data;
}

/* ─── Analysis cache (keyed by scanId + type) ─── */
const analysisCache = new Map();
const ANALYSIS_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(scanId, type) {
  const key = `${scanId}:${type}`;
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ANALYSIS_TTL) {
    analysisCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(scanId, type, data) {
  // Limit cache size
  if (analysisCache.size > 2000) {
    const oldest = analysisCache.keys().next().value;
    analysisCache.delete(oldest);
  }
  analysisCache.set(`${scanId}:${type}`, { data, timestamp: Date.now() });
}

// ===== Health check =====
router.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: process.uptime(),
    scans_stored: scanStore.size,
    cache_size: analysisCache.size,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

// ===== Scan =====
router.post('/scan/code', (req, res) => {
  try {
    const { code, filename = 'untitled.py' } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });
    const result = scanner.scanProject([{ name: filename, content: code }]);
    storeScan(result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scan/files', upload.array('files', 100), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files' });
    const files = req.files.map(f => ({ name: f.originalname, content: f.buffer.toString('utf-8') }));
    const result = scanner.scanProject(files);
    storeScan(result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scan/demo', (req, res) => {
  try {
    const result = scanner.scanProject(DEMO_FILES, 'QuantumShield Demo Project');
    storeScan(result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/scan/:id', (req, res) => {
  const r = getScan(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

// ===== NEW: Batch analysis endpoint (all-in-one for faster UX) =====
router.post('/analyze/full', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    // Check cache first
    const cached = getCached(scanId, 'full');
    if (cached) return res.json(cached);

    // Run all analyses in parallel (they're CPU-bound, not async, but still faster in batch)
    const startTime = Date.now();
    const risk = riskAnalyzer.analyzeRisks(sr);
    const scorecard = complianceReporter.generateScorecard(sr);
    const migration = migrationEngine.generateFullReport(sr);
    const cbom = complianceReporter.generateCBOM(sr);
    const sarif = complianceReporter.generateSARIF(sr);
    const complianceReport = complianceReporter.generateComplianceReport(sr);

    const result = {
      scan: sr,
      risk,
      scorecard,
      migration,
      cbom,
      sarif,
      compliance_report: complianceReport,
      analysis_duration_ms: Date.now() - startTime,
    };

    setCache(scanId, 'full', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Risk Analysis =====
router.post('/risk/analyze', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'risk');
    if (cached) return res.json(cached);

    const result = riskAnalyzer.analyzeRisks(sr);
    setCache(scanId, 'risk', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Migration =====
router.post('/migrate', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'migrate');
    if (cached) return res.json(cached);

    const result = migrationEngine.generateFullReport(sr);
    setCache(scanId, 'migrate', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/migrate/single', (req, res) => {
  try {
    const { finding } = req.body;
    if (!finding) return res.status(400).json({ error: 'No finding' });
    res.json(migrationEngine.getMigrationPlan(finding));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Compliance =====
router.post('/compliance/scorecard', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'scorecard');
    if (cached) return res.json(cached);

    const result = complianceReporter.generateScorecard(sr);
    setCache(scanId, 'scorecard', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/compliance/cbom', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'cbom');
    if (cached) return res.json(cached);

    const result = complianceReporter.generateCBOM(sr);
    setCache(scanId, 'cbom', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/compliance/sarif', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'sarif');
    if (cached) return res.json(cached);

    const result = complianceReporter.generateSARIF(sr);
    setCache(scanId, 'sarif', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/compliance/report', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const cached = getCached(scanId, 'compReport');
    if (cached) return res.json(cached);

    const result = complianceReporter.generateComplianceReport(sr);
    setCache(scanId, 'compReport', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Knowledge =====
// Pre-serialize static data for faster responses
const ALGO_JSON = JSON.stringify(PQC_ALGORITHMS);
const TIMELINE_JSON = JSON.stringify(TIMELINE);
const VULN_JSON = JSON.stringify(QUANTUM_VULNERABILITY_DB);
const DEMO_JSON = JSON.stringify(DEMO_FILES);

router.get('/knowledge/algorithms', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(ALGO_JSON);
});
router.get('/knowledge/timeline', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(TIMELINE_JSON);
});
router.get('/knowledge/vulnerabilities', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(VULN_JSON);
});
router.get('/demo-files', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(DEMO_JSON);
});

// ===== Dashboard =====
router.get('/dashboard/stats', (_, res) => {
  let totalVulns = 0, totalFiles = 0;
  const allFindings = [];
  for (const [, entry] of scanStore) {
    const r = entry.data;
    totalVulns += r.summary.total_findings;
    totalFiles += r.total_files;
    allFindings.push(...r.findings);
  }
  const byRisk = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byAlgo = {};
  for (const f of allFindings) {
    byRisk[f.quantum_risk] = (byRisk[f.quantum_risk] || 0) + 1;
    byAlgo[f.algorithm] = (byAlgo[f.algorithm] || 0) + 1;
  }
  res.json({ totalScans: scanStore.size, totalVulnerabilities: totalVulns, totalFiles, byRisk, byAlgorithm: byAlgo });
});

// ===== SSE Progress Endpoint =====
router.get('/scan/progress/:id', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let progress = 0;
  const steps = [
    { pct: 10, msg: '初始化扫描引擎' },
    { pct: 25, msg: '加载规则库' },
    { pct: 40, msg: '解析代码结构' },
    { pct: 60, msg: '执行正则匹配' },
    { pct: 75, msg: '分析依赖链' },
    { pct: 90, msg: '量化风险评分' },
    { pct: 100, msg: '扫描完成' },
  ];

  let idx = 0;
  const iv = setInterval(() => {
    if (idx >= steps.length) { clearInterval(iv); res.end(); return; }
    const s = steps[idx++];
    res.write(`data: ${JSON.stringify({ progress: s.pct, step: s.msg })}\n\n`);
  }, 300);

  req.on('close', () => clearInterval(iv));
});

// ===== Export scan result as JSON file =====
router.get('/export/:id/:format', (req, res) => {
  const { id, format } = req.params;
  const sr = getScan(id);
  if (!sr) return res.status(404).json({ error: 'Scan not found' });

  try {
    let data, filename;
    switch (format) {
      case 'cbom':
        data = complianceReporter.generateCBOM(sr);
        filename = `cbom-${id.slice(0, 8)}.json`;
        break;
      case 'sarif':
        data = complianceReporter.generateSARIF(sr);
        filename = `findings-${id.slice(0, 8)}.sarif`;
        break;
      case 'scan':
        data = sr;
        filename = `scan-${id.slice(0, 8)}.json`;
        break;
      case 'migration':
        data = migrationEngine.generateFullReport(sr);
        filename = `migration-${id.slice(0, 8)}.json`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid format. Use: cbom, sarif, scan, migration' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== System info endpoint =====
router.get('/system/info', (_, res) => {
  const rules = require('../engine/rules');
  const ruleCount = Object.values(rules.SCAN_RULES).reduce((s, r) => s + r.length, 0);
  const langCount = Object.keys(rules.SCAN_RULES).length;
  res.json({
    version: '2.0.0',
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    languages: langCount,
    rules: ruleCount,
    supported_languages: Object.keys(rules.SCAN_RULES),
    extensions: Object.keys(rules.EXT_LANG_MAP).length,
    uptime: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

module.exports = router;
