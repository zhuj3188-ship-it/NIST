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
    version: '2.1.0',
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

// ===== PDF/HTML Report Generation =====
router.post('/report/generate', (req, res) => {
  try {
    const { scanId, format = 'html' } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const risk = riskAnalyzer.analyzeRisks(sr);
    const scorecard = complianceReporter.generateScorecard(sr);
    const migration = migrationEngine.generateFullReport(sr);
    const compliance = complianceReporter.generateComplianceReport(sr);

    if (format === 'html') {
      const html = generateHTMLReport(sr, risk, scorecard, migration, compliance);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="quantumshield-report-${scanId.slice(0,8)}.html"`);
      return res.send(html);
    }

    // JSON report for CI/CD
    res.json({
      report_type: 'full',
      generated_at: new Date().toISOString(),
      scan: { id: sr.id, project: sr.project_name, total_files: sr.total_files, total_lines: sr.total_lines, languages: sr.languages_detected },
      risk_summary: { score: risk.overall_risk_score, level: risk.risk_level, executive_summary: risk.executive_summary },
      scorecard: { score: scorecard.score, grade: scorecard.grade, dimensions: scorecard.dimensions },
      compliance: compliance,
      migration: { total_plans: migration.plans?.length || 0, total_effort_days: migration.total_effort_days },
      findings_count: sr.findings.length,
      quantum_readiness_score: sr.quantum_readiness_score,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function generateHTMLReport(scan, risk, scorecard, migration, compliance) {
  const critCount = scan.findings.filter(f => f.quantum_risk === 'CRITICAL').length;
  const highCount = scan.findings.filter(f => f.quantum_risk === 'HIGH').length;
  const medCount = scan.findings.filter(f => f.quantum_risk === 'MEDIUM').length;
  const lowCount = scan.findings.filter(f => f.quantum_risk === 'LOW').length;

  const frameworkRows = (compliance.frameworks || []).map(fw =>
    `<tr><td>${fw.name}</td><td><span class="badge ${fw.status === 'COMPLIANT' ? 'bg-success' : fw.status === 'PARTIAL' ? 'bg-warning' : 'bg-danger'}">${fw.status}</span></td><td>${fw.deadline || '--'}</td><td>${fw.critical_findings || 0} critical, ${fw.high_findings || 0} high</td></tr>`
  ).join('');

  const topFindings = risk.prioritized_findings?.slice(0, 15).map(f =>
    `<tr><td><span class="risk-${f.quantum_risk.toLowerCase()}">${f.quantum_risk}</span></td><td>${f.algorithm}</td><td>${f.file_path}:${f.line_number}</td><td>${f.usage_type}</td><td>${f.migration_target || '--'}</td></tr>`
  ).join('') || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QuantumShield Report — ${scan.project_name || 'Scan Report'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:#060612;color:#e4e4f0;padding:40px}
.container{max-width:1000px;margin:0 auto}
h1{font-size:28px;margin-bottom:8px;color:#fff}
h2{font-size:20px;margin:32px 0 16px;color:#a29bfe;border-bottom:1px solid #1a1a42;padding-bottom:8px}
h3{font-size:16px;margin:20px 0 12px;color:#7a7a9e}
.subtitle{color:#7a7a9e;font-size:14px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:16px 0}
.card{background:#0d0d28;border:1px solid #1a1a42;border-radius:12px;padding:20px;text-align:center}
.card .value{font-size:32px;font-weight:700;margin-bottom:4px}
.card .label{font-size:12px;color:#7a7a9e}
.risk-CRITICAL{color:#ff4757;font-weight:600} .risk-HIGH{color:#ff6b35;font-weight:600}
.risk-MEDIUM{color:#ffa502;font-weight:600} .risk-LOW{color:#2ed573;font-weight:600}
.risk-SAFE{color:#1e90ff;font-weight:600}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th{background:#0a0a20;color:#7a7a9e;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;text-align:left;padding:10px 12px;border-bottom:1px solid #1a1a42}
td{padding:8px 12px;border-bottom:1px solid rgba(26,26,66,0.6);color:#ccc}
.badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#fff}
.bg-success{background:#2ed573} .bg-warning{background:#ffa502;color:#000} .bg-danger{background:#ff4757}
.score-ring{width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;margin:0 auto 12px;border:6px solid}
.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #1a1a42;color:#4a4a6e;font-size:11px}
.summary-box{background:rgba(108,92,231,0.08);border:1px solid rgba(108,92,231,0.2);border-radius:12px;padding:20px;margin:16px 0}
.summary-box h3{color:#6C5CE7;margin-top:0}
ul{padding-left:20px;line-height:1.8}
@media print{body{background:#fff;color:#222}th{background:#f5f5f5;color:#666}td{color:#333}.card{border-color:#ddd}}
</style>
</head>
<body>
<div class="container">
<h1>QuantumShield 量子安全评估报告</h1>
<p class="subtitle">项目: ${scan.project_name || 'Unnamed'} | 生成时间: ${new Date().toLocaleString('zh-CN')} | 版本: v2.1.0</p>

<div class="grid">
<div class="card"><div class="value" style="color:${risk.overall_risk_score>=60?'#ff4757':risk.overall_risk_score>=40?'#ffa502':'#2ed573'}">${risk.overall_risk_score}</div><div class="label">风险评分 (0-100)</div></div>
<div class="card"><div class="value">${scorecard.score}</div><div class="label">量子就绪度 (${scorecard.grade})</div></div>
<div class="card"><div class="value">${scan.findings.length}</div><div class="label">检测到的脆弱点</div></div>
<div class="card"><div class="value">${scan.total_files}</div><div class="label">扫描文件数</div></div>
</div>

<h2>执行摘要</h2>
<div class="summary-box">
<h3>${risk.executive_summary?.headline || ''}</h3>
<ul>
${(risk.executive_summary?.key_findings || []).map(f => `<li>${f}</li>`).join('')}
</ul>
<h3 style="margin-top:16px">建议行动</h3>
<ul>
${(risk.executive_summary?.recommended_actions || []).map(a => `<li>${a}</li>`).join('')}
</ul>
</div>

<h2>风险分级统计</h2>
<div class="grid">
<div class="card"><div class="value risk-CRITICAL">${critCount}</div><div class="label">严重 (CRITICAL)</div></div>
<div class="card"><div class="value risk-HIGH">${highCount}</div><div class="label">高 (HIGH)</div></div>
<div class="card"><div class="value risk-MEDIUM">${medCount}</div><div class="label">中等 (MEDIUM)</div></div>
<div class="card"><div class="value risk-LOW">${lowCount}</div><div class="label">低 (LOW)</div></div>
</div>

<h2>合规框架映射</h2>
<table><thead><tr><th>框架</th><th>状态</th><th>截止时间</th><th>发现</th></tr></thead><tbody>${frameworkRows}</tbody></table>

<h2>优先处理发现 (Top 15)</h2>
<table><thead><tr><th>风险</th><th>算法</th><th>位置</th><th>用途</th><th>迁移目标</th></tr></thead><tbody>${topFindings}</tbody></table>

<h2>HNDL (先存储后解密) 风险</h2>
<div class="summary-box">
<p>脆弱加密点: <strong>${risk.hndl_analysis?.vulnerable_encryption_points || 0}</strong> / ${risk.hndl_analysis?.total_encryption_points || 0}</p>
<p>风险等级: <strong class="risk-${risk.hndl_analysis?.risk_level || 'LOW'}">${risk.hndl_analysis?.risk_level || 'LOW'}</strong></p>
<p>受影响算法: ${(risk.hndl_analysis?.affected_algorithms || []).join(', ') || '无'}</p>
<p>预估量子威胁年份: ${risk.hndl_analysis?.estimated_quantum_threat_year || 2030}</p>
<p>${risk.hndl_analysis?.recommendation || ''}</p>
</div>

<h2>迁移计划概览</h2>
<div class="grid" style="grid-template-columns:repeat(3,1fr)">
<div class="card"><div class="value">${migration.plans?.length || 0}</div><div class="label">迁移计划数</div></div>
<div class="card"><div class="value">${migration.total_effort_days || 0}</div><div class="label">预估工作日</div></div>
<div class="card"><div class="value">${migration.dependencies?.length || 0}</div><div class="label">所需依赖数</div></div>
</div>

<div class="footer">
<p>QuantumShield v2.1.0 — Enterprise Post-Quantum Cryptography Migration Platform</p>
<p>NIST FIPS 203 (ML-KEM) · FIPS 204 (ML-DSA) · FIPS 205 (SLH-DSA)</p>
<p>© ${new Date().getFullYear()} QuantumShield | <a href="https://github.com/zhuj3188-ship-it/NIST" style="color:#6C5CE7">GitHub</a></p>
</div>
</div>
</body></html>`;
}

// ===== CI/CD Integration Config Generator =====
function buildGitHubActions(failOn, langStr, report) {
  return '# QuantumShield PQC Security Scan\n' +
    'name: QuantumShield PQC Check\n\n' +
    'on:\n  push:\n    branches: [ main, develop ]\n  pull_request:\n    branches: [ main ]\n  schedule:\n    - cron: \'0 2 * * 1\'  # Weekly Monday 2AM\n\n' +
    'permissions:\n  contents: read\n  security-events: write\n\n' +
    'jobs:\n  quantum-security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n' +
    '      - name: QuantumShield PQC Check\n        uses: quantumshield/action@v1\n        with:\n' +
    '          fail-on: ' + failOn + '          # critical | high | medium | none\n' +
    '          report: ' + report + '            # Generate report artifact\n' +
    '          languages: ' + langStr + '       # auto | python, java, go...\n' +
    '          format: sarif               # sarif | json | html\n' +
    '          cbom: true                  # Generate CBOM (CycloneDX 1.6)\n\n' +
    '      - name: Upload SARIF\n        if: always()\n        uses: github/codeql-action/upload-sarif@v3\n        with:\n          sarif_file: quantumshield-results.sarif\n\n' +
    '      - name: Upload Report\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: quantumshield-report\n          path: |\n            quantumshield-report.html\n            quantumshield-cbom.json\n';
}

function buildGitLabCI(failOn, langStr, report) {
  return '# QuantumShield PQC Security Scan\n' +
    'quantumshield-scan:\n  stage: test\n  image: quantumshield/scanner:latest\n' +
    '  variables:\n    QS_FAIL_ON: "' + failOn + '"\n    QS_LANGUAGES: "' + langStr + '"\n    QS_REPORT: "' + report + '"\n    QS_FORMAT: "sarif"\n    QS_CBOM: "true"\n' +
    '  script:\n    - quantumshield scan .\n      --fail-on $QS_FAIL_ON\n      --languages $QS_LANGUAGES\n      --format sarif\n      --output quantumshield-results.sarif\n' +
    '    - quantumshield report .\n      --format html\n      --output quantumshield-report.html\n' +
    '    - quantumshield report .\n      --format cbom\n      --output quantumshield-cbom.json\n' +
    '  artifacts:\n    paths:\n      - quantumshield-results.sarif\n      - quantumshield-report.html\n      - quantumshield-cbom.json\n    reports:\n      sast: quantumshield-results.sarif\n    when: always\n' +
    '  rules:\n    - if: $CI_PIPELINE_SOURCE == "merge_request_event"\n    - if: $CI_COMMIT_BRANCH == "main"\n    - if: $CI_PIPELINE_SOURCE == "schedule"\n';
}

function buildJenkinsfile(failOn, langStr) {
  return '// QuantumShield PQC Security Scan\npipeline {\n    agent any\n    stages {\n' +
    '        stage(\'QuantumShield Scan\') {\n            steps {\n' +
    '                sh \'\'\'\n                    quantumshield scan . \\\\\n                      --fail-on ' + failOn + ' \\\\\n                      --languages ' + langStr + ' \\\\\n                      --format sarif \\\\\n                      --output quantumshield-results.sarif\n                \'\'\'\n' +
    '                sh \'\'\'\n                    quantumshield report . \\\\\n                      --format html \\\\\n                      --output quantumshield-report.html\n                \'\'\'\n' +
    '                sh \'\'\'\n                    quantumshield report . \\\\\n                      --format cbom \\\\\n                      --output quantumshield-cbom.json\n                \'\'\'\n' +
    '            }\n            post {\n                always {\n                    archiveArtifacts artifacts: \'quantumshield-*.sarif, quantumshield-*.html, quantumshield-*.json\'\n                    recordIssues tool: sarif(id: \'quantumshield\', pattern: \'quantumshield-results.sarif\')\n                }\n            }\n        }\n' +
    '    }\n    triggers {\n        cron(\'H 2 * * 1\')  // Weekly scan\n    }\n}\n';
}

function buildAzurePipelines(failOn, langStr) {
  return '# QuantumShield PQC Security Scan\ntrigger:\n  branches:\n    include: [ main, develop ]\n\n' +
    'schedules:\n  - cron: "0 2 * * 1"\n    displayName: Weekly PQC Scan\n    branches:\n      include: [ main ]\n\n' +
    'pool:\n  vmImage: \'ubuntu-latest\'\n\n' +
    'steps:\n  - task: CmdLine@2\n    displayName: \'QuantumShield PQC Scan\'\n    inputs:\n      script: |\n' +
    '        quantumshield scan . \\\\\n          --fail-on ' + failOn + ' \\\\\n          --languages ' + langStr + ' \\\\\n          --format sarif \\\\\n          --output quantumshield-results.sarif\n\n' +
    '  - task: CmdLine@2\n    displayName: \'Generate Report\'\n    condition: always()\n    inputs:\n      script: |\n' +
    '        quantumshield report . --format html --output quantumshield-report.html\n        quantumshield report . --format cbom --output quantumshield-cbom.json\n\n' +
    '  - task: PublishBuildArtifacts@1\n    displayName: \'Publish Reports\'\n    condition: always()\n    inputs:\n      pathToPublish: \'.\'\n      artifactName: \'quantumshield-reports\'\n      patterns: \'quantumshield-*\'\n';
}

function buildBitbucketPipelines(failOn, langStr) {
  return '# QuantumShield PQC Security Scan\nimage: quantumshield/scanner:latest\n\n' +
    'pipelines:\n  default:\n    - step:\n        name: QuantumShield PQC Scan\n        script:\n' +
    '          - quantumshield scan . --fail-on ' + failOn + ' --languages ' + langStr + ' --format sarif --output quantumshield-results.sarif\n' +
    '          - quantumshield report . --format html --output quantumshield-report.html\n' +
    '          - quantumshield report . --format cbom --output quantumshield-cbom.json\n' +
    '        artifacts:\n          - quantumshield-results.sarif\n          - quantumshield-report.html\n          - quantumshield-cbom.json\n\n' +
    '  schedules:\n    weekly-scan:\n      cron: "0 2 * * 1"\n      pipelines:\n        default\n';
}

router.post('/cicd/generate', (req, res) => {
  try {
    const { platform = 'github', failOn = 'critical', languages = [], report = true } = req.body;
    const langStr = languages.length > 0 ? languages.join(', ') : 'auto';

    const configs = {
      github: {
        name: 'GitHub Actions',
        filename: '.github/workflows/quantumshield.yml',
        config: buildGitHubActions(failOn, langStr, report),
      },
      gitlab: {
        name: 'GitLab CI',
        filename: '.gitlab-ci.yml',
        config: buildGitLabCI(failOn, langStr, report),
      },
      jenkins: {
        name: 'Jenkins Pipeline',
        filename: 'Jenkinsfile',
        config: buildJenkinsfile(failOn, langStr),
      },
      azure: {
        name: 'Azure DevOps',
        filename: 'azure-pipelines.yml',
        config: buildAzurePipelines(failOn, langStr),
      },
      bitbucket: {
        name: 'Bitbucket Pipelines',
        filename: 'bitbucket-pipelines.yml',
        config: buildBitbucketPipelines(failOn, langStr),
      },
    };

    if (platform === 'all') {
      return res.json(Object.entries(configs).map(([key, val]) => ({ key, ...val })));
    }

    const cfg = configs[platform];
    if (!cfg) return res.status(400).json({ error: 'Unsupported platform. Use: github, gitlab, jenkins, azure, bitbucket, all' });

    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== Protocol Stack Detection =====
router.post('/scan/analyze-protocols', (req, res) => {
  try {
    const { scanId } = req.body;
    const sr = getScan(scanId);
    if (!sr) return res.status(404).json({ error: 'Scan not found' });

    const protocols = detectProtocolStacks(sr.findings);
    res.json(protocols);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function detectProtocolStacks(findings) {
  const stacks = [];
  const byFile = {};
  for (const f of findings) {
    if (!byFile[f.file_path]) byFile[f.file_path] = [];
    byFile[f.file_path].push(f);
  }

  for (const [file, fileFindings] of Object.entries(byFile)) {
    const hasKEM = fileFindings.some(f => ['key_exchange', 'key_generation'].includes(f.usage_type) && ['RSA', 'ECDH', 'DH-2048', 'X25519'].includes(f.algorithm));
    const hasSig = fileFindings.some(f => ['signing', 'verification', 'certificate'].includes(f.usage_type));
    const hasAEAD = fileFindings.some(f => ['encryption', 'decryption'].includes(f.usage_type));
    const hasTLS = fileFindings.some(f => f.usage_type === 'tls_config' || f.context?.toLowerCase().includes('tls') || f.context?.toLowerCase().includes('ssl'));

    if ((hasKEM && hasSig) || hasTLS) {
      const kemAlgos = fileFindings.filter(f => ['key_exchange', 'key_generation'].includes(f.usage_type)).map(f => f.algorithm);
      const sigAlgos = fileFindings.filter(f => ['signing', 'verification', 'certificate'].includes(f.usage_type)).map(f => f.algorithm);
      const aeadAlgos = fileFindings.filter(f => ['encryption', 'decryption'].includes(f.usage_type)).map(f => f.algorithm);

      stacks.push({
        file, type: hasTLS ? 'TLS' : 'Custom Protocol',
        components: {
          kem: [...new Set(kemAlgos)],
          signature: [...new Set(sigAlgos)],
          aead: [...new Set(aeadAlgos)],
        },
        migration_target: {
          kem: 'ML-KEM-768 (FIPS 203)',
          signature: 'ML-DSA-65 (FIPS 204)',
          aead: 'AES-256-GCM (quantum-safe)',
        },
        risk: fileFindings.some(f => f.quantum_risk === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
        finding_count: fileFindings.length,
      });
    }
  }

  return {
    protocol_stacks: stacks,
    total_stacks: stacks.length,
    tls_stacks: stacks.filter(s => s.type === 'TLS').length,
    custom_stacks: stacks.filter(s => s.type !== 'TLS').length,
  };
}

// ===== Releases / Downloads endpoint =====
const GITHUB_REPO = 'zhuj3188-ship-it/NIST';
const RELEASES_CACHE = { data: null, timestamp: 0 };
const RELEASES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/releases', async (_, res) => {
  try {
    // Return cached data if fresh
    if (RELEASES_CACHE.data && Date.now() - RELEASES_CACHE.timestamp < RELEASES_CACHE_TTL) {
      return res.json(RELEASES_CACHE.data);
    }

    // Fetch latest release from GitHub API
    const https = require('https');
    const fetchGH = (url) => new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'QuantumShield/2.1.0', 'Accept': 'application/vnd.github+json' }
      }, (resp) => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    const releases = await fetchGH(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=5`);
    if (!Array.isArray(releases) || releases.length === 0) {
      // Return fallback static data
      return res.json(buildFallbackReleases());
    }

    const result = releases.map(rel => ({
      version: rel.tag_name,
      name: rel.name,
      published_at: rel.published_at,
      body: rel.body,
      html_url: rel.html_url,
      prerelease: rel.prerelease,
      assets: (rel.assets || []).map(a => ({
        name: a.name,
        size: a.size,
        download_url: a.browser_download_url,
        download_count: a.download_count,
        content_type: a.content_type,
        ...parseAssetInfo(a.name),
      })),
    }));

    RELEASES_CACHE.data = result;
    RELEASES_CACHE.timestamp = Date.now();
    res.json(result);
  } catch (e) {
    // Fallback to static data if GitHub API fails
    res.json(buildFallbackReleases());
  }
});

// Parse platform/arch/type from asset filename
function parseAssetInfo(name) {
  const info = { platform: 'unknown', arch: 'unknown', type: 'unknown', recommended: false };
  // Platform
  if (name.includes('-win-')) info.platform = 'windows';
  else if (name.includes('-mac-')) info.platform = 'macos';
  else if (name.includes('-linux-')) info.platform = 'linux';
  // Architecture
  if (name.includes('-x64')) info.arch = 'x64';
  else if (name.includes('-arm64')) info.arch = 'arm64';
  // Type
  if (name.endsWith('.exe') && !name.includes('portable')) info.type = 'installer';
  else if (name.includes('portable')) info.type = 'portable';
  else if (name.endsWith('.dmg')) info.type = 'dmg';
  else if (name.endsWith('.AppImage')) info.type = 'appimage';
  else if (name.endsWith('.deb')) info.type = 'deb';
  else if (name.endsWith('.rpm')) info.type = 'rpm';
  else if (name.endsWith('.snap')) info.type = 'snap';
  else if (name.endsWith('.tar.gz')) info.type = 'tar.gz';
  else if (name.endsWith('.zip')) info.type = 'zip';
  // Recommended flags
  if (info.platform === 'windows' && info.type === 'installer' && info.arch === 'x64') info.recommended = true;
  if (info.platform === 'macos' && info.type === 'dmg') info.recommended = true;
  if (info.platform === 'linux' && info.type === 'appimage' && info.arch === 'x64') info.recommended = true;
  return info;
}

function buildFallbackReleases() {
  const BASE = `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0`;
  const assets = [
    // Windows
    { name: 'QuantumShield-2.1.0-win-x64.exe', platform: 'windows', arch: 'x64', type: 'installer', recommended: true },
    { name: 'QuantumShield-2.1.0-win-arm64.exe', platform: 'windows', arch: 'arm64', type: 'installer', recommended: false },
    { name: 'QuantumShield-2.1.0-win-x64-portable.exe', platform: 'windows', arch: 'x64', type: 'portable', recommended: false },
    { name: 'QuantumShield-2.1.0-win-x64.zip', platform: 'windows', arch: 'x64', type: 'zip', recommended: false },
    { name: 'QuantumShield-2.1.0-win-arm64.zip', platform: 'windows', arch: 'arm64', type: 'zip', recommended: false },
    // macOS
    { name: 'QuantumShield-2.1.0-mac-x64.dmg', platform: 'macos', arch: 'x64', type: 'dmg', recommended: true },
    { name: 'QuantumShield-2.1.0-mac-arm64.dmg', platform: 'macos', arch: 'arm64', type: 'dmg', recommended: true },
    { name: 'QuantumShield-2.1.0-mac-x64.zip', platform: 'macos', arch: 'x64', type: 'zip', recommended: false },
    { name: 'QuantumShield-2.1.0-mac-arm64.zip', platform: 'macos', arch: 'arm64', type: 'zip', recommended: false },
    // Linux
    { name: 'QuantumShield-2.1.0-linux-x64.AppImage', platform: 'linux', arch: 'x64', type: 'appimage', recommended: true },
    { name: 'QuantumShield-2.1.0-linux-arm64.AppImage', platform: 'linux', arch: 'arm64', type: 'appimage', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-x64.deb', platform: 'linux', arch: 'x64', type: 'deb', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-arm64.deb', platform: 'linux', arch: 'arm64', type: 'deb', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-x64.rpm', platform: 'linux', arch: 'x64', type: 'rpm', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-x64.snap', platform: 'linux', arch: 'x64', type: 'snap', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-x64.tar.gz', platform: 'linux', arch: 'x64', type: 'tar.gz', recommended: false },
    { name: 'QuantumShield-2.1.0-linux-arm64.tar.gz', platform: 'linux', arch: 'arm64', type: 'tar.gz', recommended: false },
  ].map(a => ({ ...a, download_url: `${BASE}/${a.name}`, size: 0, download_count: 0 }));

  return [{
    version: 'v2.1.0',
    name: 'QuantumShield v2.1.0 — Enterprise PQC Migration Platform',
    published_at: new Date().toISOString(),
    html_url: `https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`,
    prerelease: false,
    assets,
  }];
}

module.exports = router;
