/**
 * QuantumShield — 核心扫描器 v2.0
 * 优化: 预编译行号索引 · 批量正则匹配 · 缓存复用 · 并行文件处理
 * 支持多语言 AST/Regex 混合扫描 + 依赖分析 + 证书检测
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  QuantumRisk, UsageType, ScanMode, MigrationStrategy,
  QUANTUM_VULNERABILITY_DB, createFinding, createScanResult,
} = require('./models');
const { SCAN_RULES, EXT_LANG_MAP, DEP_FILE_NAMES } = require('./rules');

/* ─── Pre-build line-break index for O(log n) line lookups ─── */
function buildLineIndex(content) {
  const offsets = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

/* Binary search to find line number from offset — O(log n) vs O(n) */
function getLineFromOffset(offsets, offset) {
  let lo = 0, hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-based
}

/* ─── Comment detection lookup table (avoid repeated string checks) ─── */
const COMMENT_PREFIX = {
  python: ['#'], php: ['#', '//'], config: ['#'], dependency: ['#'],
  javascript: ['//', '/*', '*'], java: ['//', '/*', '*'],
  go: ['//', '/*', '*'], c: ['//', '/*', '*'],
  rust: ['//', '/*', '*'], csharp: ['//', '/*', '*'],
  ruby: ['#'], kotlin: ['//', '/*', '*'], swift: ['//', '/*', '*'],
};

/* ─── External-facing pattern (pre-compiled once) ─── */
const EXTERNAL_PATTERN = /api|endpoint|route|handler|public|export|@app\.|@router\.|@RequestMapping|func\s+\w+Handler|@Controller|@RestController|@GetMapping|@PostMapping|express\(\)|app\.get|app\.post|http\.Handle/i;

class QuantumShieldScanner {

  constructor() {
    // Pre-compile merged regex per language for fast initial screening
    this._quickScreenCache = {};
    for (const [lang, rules] of Object.entries(SCAN_RULES)) {
      // Extract simple literal keywords from each rule for fast screening
      const keywords = new Set();
      for (const r of rules) {
        const src = r.pattern.source;
        // Extract all literal alphanumeric sequences >= 3 chars
        const literals = src.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g);
        if (literals) {
          for (const lit of literals) {
            // Skip common regex meta-terms
            if (!['undefined', 'false', 'true', 'null'].includes(lit)) {
              keywords.add(lit);
            }
          }
        }
      }
      if (keywords.size > 0) {
        try {
          this._quickScreenCache[lang] = new RegExp([...keywords].join('|'), 'i');
        } catch { /* fallback: no pre-screening */ }
      }
    }

    // Pre-build vulnerability lookup for common algorithms
    this._vulnCache = new Map();
    for (const [key, val] of Object.entries(QUANTUM_VULNERABILITY_DB)) {
      this._vulnCache.set(key, val);
    }
  }

  /**
   * 扫描单个文件 — 优化版
   * - 预编译行号索引 (binary search O(log n))
   * - 批量正则匹配避免多次扫描
   * - 缓存漏洞查询
   */
  scanFile(content, filename) {
    const ext = path.extname(filename).toLowerCase();
    const baseName = path.basename(filename);

    // 确定语言
    let lang = EXT_LANG_MAP[ext];
    if (DEP_FILE_NAMES.has(baseName)) lang = 'dependency';
    if (!lang) return [];

    // 快速预筛: 如果文件不包含任何可能的关键词，直接跳过
    const quickScreen = this._quickScreenCache[lang];
    if (quickScreen && !quickScreen.test(content)) {
      // Also check config rules if not config language
      if (lang !== 'config') {
        const cfgScreen = this._quickScreenCache.config;
        if (!cfgScreen || !cfgScreen.test(content)) return [];
      } else {
        return [];
      }
    }

    const findings = [];
    const lineIndex = buildLineIndex(content);
    const lines = content.split('\n');
    const isTest = /test|spec|__test__|_test\.|\.test\.|\.spec\./i.test(filename);

    // 获取规则
    const rules = SCAN_RULES[lang] || [];
    const allRules = lang === 'config' ? rules : [...rules, ...(SCAN_RULES.config || [])];

    // Pre-compute external facing for entire file context (once)
    const isFileExternalFacing = EXTERNAL_PATTERN.test(content);

    for (const rule of allRules) {
      // Clone regex to ensure lastIndex is reset
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        const matchPos = match.index;
        // O(log n) line lookup instead of O(n) split
        const lineNumber = getLineFromOffset(lineIndex, matchPos);
        const lineContent = lines[lineNumber - 1]?.trim() || '';

        // 检查注释
        if (this._isCommentFast(lineContent, lang)) continue;

        // 提取密钥大小
        let keySize = null;
        let algoId = rule.algorithm;
        if (rule.extractKeySize && match[1]) {
          keySize = parseInt(match[1]);
          if (algoId === 'RSA' && keySize) {
            if (keySize <= 1024) algoId = 'RSA-1024';
            else if (keySize <= 2048) algoId = 'RSA-2048';
            else if (keySize <= 3072) algoId = 'RSA-3072';
            else algoId = 'RSA-4096';
          }
        }

        if (algoId === 'RSA') algoId = 'RSA-2048';

        const vuln = this._vulnCache.get(algoId) || this._vulnCache.get('RSA-2048');

        // 上下文行 (optimized slice)
        const ctxStart = Math.max(0, lineNumber - 3);
        const ctxEnd = Math.min(lines.length, lineNumber + 2);
        const ctxBefore = lines.slice(ctxStart, lineNumber - 1).join('\n');
        const ctxAfter = lines.slice(lineNumber, ctxEnd).join('\n');

        // 置信度计算
        let confidence = 0.85;
        if (rule.scan_mode === ScanMode.AST) confidence = 0.95;
        else if (rule.scan_mode === ScanMode.DEPENDENCY) confidence = 0.7;
        else if (rule.scan_mode === ScanMode.CONFIG) confidence = 0.8;
        if (isTest) confidence *= 0.5;

        // 外部暴露检测 (fast path: check file-level flag first)
        const isExternalFacing = isFileExternalFacing && this._isLineLevelExternal(lineContent, lines, lineNumber);

        // 确定迁移策略
        let strategy = MigrationStrategy.HYBRID;
        if (vuln?.risk === QuantumRisk.CRITICAL && vuln?.nist_deprecation_year < 2020) {
          strategy = MigrationStrategy.PURE_PQC;
        } else if (vuln?.risk === QuantumRisk.SAFE) {
          strategy = MigrationStrategy.UPGRADE_PARAMS;
        }

        const column = matchPos - (lineIndex[lineNumber - 1] || 0) + 1;

        findings.push(createFinding({
          file_path: filename,
          line_number: lineNumber,
          column_number: column,
          algorithm: algoId,
          algorithm_family: vuln?.family || '',
          key_size: keySize,
          usage_type: rule.usage_type,
          quantum_risk: vuln?.risk || QuantumRisk.HIGH,
          confidence,
          scan_mode: rule.scan_mode || ScanMode.REGEX,
          library: rule.library,
          code_snippet: lineContent,
          context_before: ctxBefore,
          context_after: ctxAfter,
          is_external_facing: isExternalFacing,
          is_in_test: isTest,
          migration_target: vuln?.migration_target || '',
          migration_strategy: strategy,
          nist_standard: vuln?.nist_standard || '',
          nist_deprecation_year: vuln?.nist_deprecation_year || 2030,
          description: vuln?.quantum_threat || '',
          description_zh: vuln?.description_zh || '',
          tags: [lang, rule.context],
          cwe_id: vuln?.cwe_id || '',
        }));

        // Safety: prevent infinite loop on zero-width matches
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }
    }

    return this._dedup(findings);
  }

  /**
   * 批量扫描 — 优化版
   * - 单次遍历统计
   * - 预分配结果集
   * - 高效聚合
   */
  scanProject(files, projectName = '') {
    const startTime = Date.now();
    const allFindings = [];
    const fileResults = {};
    const langSet = new Set();
    let totalLines = 0;

    for (const file of files) {
      // Count lines efficiently (count newlines instead of splitting)
      let lineCount = 1;
      for (let i = 0; i < file.content.length; i++) {
        if (file.content[i] === '\n') lineCount++;
      }
      totalLines += lineCount;

      const ext = path.extname(file.name).toLowerCase();
      const baseName = path.basename(file.name);
      let lang = EXT_LANG_MAP[ext];
      if (DEP_FILE_NAMES.has(baseName)) lang = 'dependency';
      if (lang) langSet.add(lang);

      const findings = this.scanFile(file.content, file.name);

      // Single-pass risk counting
      const riskCount = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, SAFE: 0 };
      for (const f of findings) {
        riskCount[f.quantum_risk] = (riskCount[f.quantum_risk] || 0) + 1;
      }

      if (findings.length > 0) {
        allFindings.push(...findings);
      }

      fileResults[file.name] = {
        findings,
        total: findings.length,
        lines: lineCount,
        language: lang || 'unknown',
        risk_counts: riskCount,
      };
    }

    const result = createScanResult({
      id: uuidv4(),
      scan_duration_ms: Date.now() - startTime,
      project_name: projectName || 'Uploaded Project',
      total_files: files.length,
      total_lines: totalLines,
      languages_detected: [...langSet],
      files_scanned: files.map(f => f.name),
      findings: allFindings,
      quantum_readiness_score: this._calcReadinessScore(allFindings),
      summary: this._buildSummary(allFindings),
      dependency_findings: allFindings.filter(f => f.scan_mode === ScanMode.DEPENDENCY),
      certificate_findings: allFindings.filter(f => f.usage_type === UsageType.CERTIFICATE),
    });

    result.fileResults = fileResults;
    return result;
  }

  // ============ Quantum Readiness Score (0-100) ============
  _calcReadinessScore(findings) {
    if (!findings.length) return 100;
    const weights = { CRITICAL: 8, HIGH: 5, MEDIUM: 2, LOW: 0.5, SAFE: 0 };
    let penalty = 0;
    for (const f of findings) {
      let w = weights[f.quantum_risk] || 3;
      if (f.is_external_facing) w *= 1.5;
      if (f.is_in_test) w *= 0.3;
      penalty += w;
    }
    return Math.max(0, Math.round(100 - penalty));
  }

  _buildSummary(findings) {
    const s = {
      total_findings: findings.length,
      by_risk: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, SAFE: 0 },
      by_category: {},
      by_algorithm: {},
      by_language: {},
      by_usage_type: {},
      by_file: {},
      by_library: {},
    };
    for (const f of findings) {
      s.by_risk[f.quantum_risk] = (s.by_risk[f.quantum_risk] || 0) + 1;
      s.by_category[f.algorithm_family] = (s.by_category[f.algorithm_family] || 0) + 1;
      s.by_algorithm[f.algorithm] = (s.by_algorithm[f.algorithm] || 0) + 1;

      const lang = f.tags?.[0] || 'unknown';
      s.by_language[lang] = (s.by_language[lang] || 0) + 1;
      s.by_usage_type[f.usage_type] = (s.by_usage_type[f.usage_type] || 0) + 1;
      s.by_file[f.file_path] = (s.by_file[f.file_path] || 0) + 1;
      if (f.library) s.by_library[f.library] = (s.by_library[f.library] || 0) + 1;
    }
    return s;
  }

  _dedup(findings) {
    const seen = new Set();
    return findings.filter(f => {
      const key = `${f.file_path}:${f.line_number}:${f.algorithm}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Fast comment detection using lookup table
   */
  _isCommentFast(line, lang) {
    const t = line.trim();
    const prefixes = COMMENT_PREFIX[lang];
    if (!prefixes) return false;
    for (const p of prefixes) {
      if (t.startsWith(p)) return true;
    }
    return false;
  }

  /**
   * Line-level external facing check — only called if file-level is true
   */
  _isLineLevelExternal(lineContent, lines, lineNumber) {
    if (EXTERNAL_PATTERN.test(lineContent)) return true;
    // Check surrounding context (5 lines above)
    const start = Math.max(0, lineNumber - 5);
    for (let i = start; i < lineNumber - 1; i++) {
      if (EXTERNAL_PATTERN.test(lines[i])) return true;
    }
    return false;
  }
}

module.exports = QuantumShieldScanner;
