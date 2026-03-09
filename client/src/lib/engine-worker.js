/**
 * QuantumShield — Browser Engine Worker
 * Runs the full scanning engine inside a Web Worker for GitHub Pages (no server) mode.
 * Polyfills Node.js builtins (path, crypto, uuid) to make server engine code work in browser.
 */

/* ── Node.js polyfills ── */
const path = {
  extname: (f) => { const i = f.lastIndexOf('.'); return i > 0 ? f.slice(i) : ''; },
  basename: (f) => f.split('/').pop() || f,
  join: (...p) => p.join('/').replace(/\/+/g, '/'),
};

const crypto = {
  createHash: (alg) => {
    let data = '';
    return {
      update(d) { data += (typeof d === 'string' ? d : String(d)); return this; },
      digest(enc) {
        // Simple hash for cache keying — not crypto-grade but sufficient for dedup/caching
        let h = 0;
        for (let i = 0; i < data.length; i++) { h = ((h << 5) - h + data.charCodeAt(i)) | 0; }
        const hex = (h >>> 0).toString(16).padStart(8, '0');
        return enc === 'hex' ? hex : hex;
      },
    };
  },
  randomBytes: (n) => {
    const arr = new Uint8Array(n);
    self.crypto.getRandomValues(arr);
    return { toString: (enc) => Array.from(arr, b => b.toString(16).padStart(2, '0')).join('') };
  },
};

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ── Dynamic import of server engine modules via fetch ── */
let engineReady = false;
let QuantumShieldScanner, MigrationEngine, ComplianceReporter, RiskAnalyzer;
let QUANTUM_VULNERABILITY_DB, PQC_ALGORITHMS, TIMELINE, DEMO_FILES, SCAN_RULES;

/**
 * We load all engine source files, replace `require(...)` calls with our polyfills,
 * and eval them in the worker scope. This avoids duplicating 4000+ lines of code.
 */
async function initEngine() {
  if (engineReady) return;

  // Fetch all engine source files from the deployed static assets
  const base = self.location.href.replace(/\/[^/]*$/, '');
  // Go up from worker location to find engine files served as static assets
  const engineBase = base.replace(/\/assets$/, '') + '/engine';

  const files = [
    'models.js', 'rules.js', 'scanner.js',
    'migration.js', 'risk-analyzer.js', 'compliance.js',
    'demo-files.js', 'pqc-knowledge.js',
  ];

  const sources = {};
  for (const f of files) {
    try {
      const resp = await fetch(`${engineBase}/${f}`);
      if (resp.ok) sources[f] = await resp.text();
    } catch (e) {
      console.warn(`[Worker] Failed to fetch ${f}:`, e.message);
    }
  }

  // Build a mini CommonJS environment
  const modules = {};
  const moduleExports = {};

  function createModule(filename, src) {
    if (moduleExports[filename]) return moduleExports[filename];

    const mod = { exports: {} };
    moduleExports[filename] = mod.exports; // pre-register to handle circular deps

    // Replace require calls
    const requireFn = (dep) => {
      if (dep === 'path') return path;
      if (dep === 'crypto') return crypto;
      if (dep === 'uuid') return { v4: uuidv4 };
      // Internal dependencies
      if (dep === './models') return createModule('models.js', sources['models.js']);
      if (dep === './rules') return createModule('rules.js', sources['rules.js']);
      if (dep === '../engine/models' || dep === './models') return createModule('models.js', sources['models.js']);
      if (dep === '../data/pqc-knowledge') return createModule('pqc-knowledge.js', sources['pqc-knowledge.js']);
      if (dep === '../data/demo-files') return createModule('demo-files.js', sources['demo-files.js']);
      console.warn(`[Worker] Unknown require: ${dep}`);
      return {};
    };

    try {
      const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', src);
      fn(mod, mod.exports, requireFn, filename, '/engine');
    } catch (e) {
      console.error(`[Worker] Error loading ${filename}:`, e.message);
    }

    moduleExports[filename] = mod.exports;
    return mod.exports;
  }

  // Load in dependency order
  if (sources['models.js']) createModule('models.js', sources['models.js']);
  if (sources['rules.js']) createModule('rules.js', sources['rules.js']);
  if (sources['scanner.js']) createModule('scanner.js', sources['scanner.js']);
  if (sources['migration.js']) createModule('migration.js', sources['migration.js']);
  if (sources['risk-analyzer.js']) createModule('risk-analyzer.js', sources['risk-analyzer.js']);
  if (sources['compliance.js']) createModule('compliance.js', sources['compliance.js']);
  if (sources['demo-files.js']) createModule('demo-files.js', sources['demo-files.js']);
  if (sources['pqc-knowledge.js']) createModule('pqc-knowledge.js', sources['pqc-knowledge.js']);

  // Extract constructors and data
  const modelsExports = moduleExports['models.js'] || {};
  const rulesExports = moduleExports['rules.js'] || {};
  const scannerExports = moduleExports['scanner.js'];
  const migrationExports = moduleExports['migration.js'] || {};
  const riskExports = moduleExports['risk-analyzer.js'];
  const complianceExports = moduleExports['compliance.js'];
  const demoExports = moduleExports['demo-files.js'];
  const pqcExports = moduleExports['pqc-knowledge.js'] || {};

  QUANTUM_VULNERABILITY_DB = modelsExports.QUANTUM_VULNERABILITY_DB || [];
  PQC_ALGORITHMS = pqcExports.PQC_ALGORITHMS || pqcExports.default || [];
  TIMELINE = pqcExports.TIMELINE || [];
  DEMO_FILES = Array.isArray(demoExports) ? demoExports : (demoExports?.default || demoExports?.DEMO_FILES || []);
  SCAN_RULES = rulesExports.SCAN_RULES || {};

  // Scanner can be a constructor or class
  QuantumShieldScanner = typeof scannerExports === 'function' ? scannerExports : scannerExports?.default || scannerExports;
  MigrationEngine = migrationExports.MigrationEngine || migrationExports.default || migrationExports;
  ComplianceReporter = typeof complianceExports === 'function' ? complianceExports : complianceExports?.default || complianceExports;
  RiskAnalyzer = typeof riskExports === 'function' ? riskExports : riskExports?.default || riskExports;

  engineReady = true;
  console.log('[Worker] Engine initialized successfully');
}

/* ── Scan store (in-worker memory) ── */
const scanStore = new Map();
const analysisCache = new Map();

function storeScan(result) {
  if (scanStore.size >= 200) {
    const oldest = scanStore.keys().next().value;
    scanStore.delete(oldest);
  }
  scanStore.set(result.id, result);
}

function getScanById(id) {
  return scanStore.get(id) || null;
}

/* ── Message handler ── */
self.onmessage = async function (e) {
  const { id, type, payload } = e.data;

  try {
    await initEngine();

    let result;

    switch (type) {
      case 'health': {
        result = {
          status: 'ok', version: '2.1.0-browser',
          uptime: Math.round(performance.now() / 1000),
          scans_stored: scanStore.size, cache_size: analysisCache.size,
          memory: 'N/A (browser)',
        };
        break;
      }

      case 'system-info': {
        const ruleCount = Object.values(SCAN_RULES).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0);
        const langCount = Object.keys(SCAN_RULES).length;
        result = {
          version: '2.1.0-browser', platform: 'browser', arch: navigator.userAgent.includes('arm') ? 'arm64' : 'x64',
          node: 'browser', languages: langCount, rules: ruleCount,
          supported_languages: Object.keys(SCAN_RULES),
          extensions: 0, uptime: Math.round(performance.now() / 1000), memory_mb: 0,
        };
        break;
      }

      case 'scan-code': {
        const scanner = new QuantumShieldScanner();
        const { code, filename } = payload;
        result = scanner.scanProject([{ name: filename || 'untitled.py', content: code }]);
        storeScan(result);
        break;
      }

      case 'scan-files': {
        const scanner = new QuantumShieldScanner();
        result = scanner.scanProject(payload.files);
        storeScan(result);
        break;
      }

      case 'scan-demo': {
        const scanner = new QuantumShieldScanner();
        result = scanner.scanProject(DEMO_FILES, 'QuantumShield Demo Project');
        storeScan(result);
        break;
      }

      case 'get-scan': {
        result = getScanById(payload.id);
        if (!result) throw new Error('Scan not found');
        break;
      }

      case 'analyze-full': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        const cacheKey = `${payload.scanId}:full`;
        if (analysisCache.has(cacheKey)) { result = analysisCache.get(cacheKey); break; }

        const riskAnalyzer = new RiskAnalyzer();
        const complianceReporter = new ComplianceReporter();
        const migrationEngine = typeof MigrationEngine === 'function' ? new MigrationEngine() : MigrationEngine;

        const start = performance.now();
        result = {
          scan: sr,
          risk: riskAnalyzer.analyzeRisks(sr),
          scorecard: complianceReporter.generateScorecard(sr),
          migration: migrationEngine.generateFullReport(sr),
          cbom: complianceReporter.generateCBOM(sr),
          sarif: complianceReporter.generateSARIF(sr),
          compliance_report: complianceReporter.generateComplianceReport(sr),
          analysis_duration_ms: Math.round(performance.now() - start),
        };
        analysisCache.set(cacheKey, result);
        break;
      }

      case 'risk-analyze': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        const riskAnalyzer = new RiskAnalyzer();
        result = riskAnalyzer.analyzeRisks(sr);
        break;
      }

      case 'migrate': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        const migrationEngine = typeof MigrationEngine === 'function' ? new MigrationEngine() : MigrationEngine;
        result = migrationEngine.generateFullReport(sr);
        break;
      }

      case 'migrate-single': {
        const migrationEngine = typeof MigrationEngine === 'function' ? new MigrationEngine() : MigrationEngine;
        result = migrationEngine.getMigrationPlan(payload.finding);
        break;
      }

      case 'compliance-scorecard': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        result = new ComplianceReporter().generateScorecard(sr);
        break;
      }

      case 'compliance-cbom': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        result = new ComplianceReporter().generateCBOM(sr);
        break;
      }

      case 'compliance-sarif': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        result = new ComplianceReporter().generateSARIF(sr);
        break;
      }

      case 'compliance-report': {
        const sr = getScanById(payload.scanId);
        if (!sr) throw new Error('Scan not found');
        result = new ComplianceReporter().generateComplianceReport(sr);
        break;
      }

      case 'knowledge-algorithms': {
        result = PQC_ALGORITHMS;
        break;
      }

      case 'knowledge-timeline': {
        result = TIMELINE;
        break;
      }

      case 'knowledge-vulnerabilities': {
        result = QUANTUM_VULNERABILITY_DB;
        break;
      }

      case 'demo-files': {
        result = DEMO_FILES;
        break;
      }

      case 'dashboard-stats': {
        let totalVulns = 0, totalFiles = 0;
        const allFindings = [];
        for (const [, sr] of scanStore) {
          totalVulns += sr.summary?.total_findings || 0;
          totalFiles += sr.total_files || 0;
          allFindings.push(...(sr.findings || []));
        }
        const byRisk = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        const byAlgo = {};
        for (const f of allFindings) {
          byRisk[f.quantum_risk] = (byRisk[f.quantum_risk] || 0) + 1;
          byAlgo[f.algorithm] = (byAlgo[f.algorithm] || 0) + 1;
        }
        result = { totalScans: scanStore.size, totalVulnerabilities: totalVulns, totalFiles, byRisk, byAlgorithm: byAlgo };
        break;
      }

      case 'releases': {
        // Return fallback release data (no GitHub API in browser worker)
        result = [{
          version: 'v2.1.0',
          name: 'QuantumShield v2.1.0',
          published_at: new Date().toISOString(),
          html_url: 'https://github.com/zhuj3188-ship-it/NIST/releases/tag/v2.1.0',
          prerelease: false,
          assets: [],
        }];
        break;
      }

      case 'cicd-generate': {
        // Minimal CI/CD config generator
        const { platform = 'github' } = payload;
        result = {
          name: platform === 'github' ? 'GitHub Actions' : platform,
          filename: platform === 'github' ? '.github/workflows/quantumshield.yml' : `${platform}-ci.yml`,
          config: `# QuantumShield PQC Security Scan\n# Platform: ${platform}\n# Generated in browser mode`,
        };
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
