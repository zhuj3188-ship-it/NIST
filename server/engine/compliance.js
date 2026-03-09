/**
 * QuantumShield — 合规报告器
 * Quantum Readiness Scorecard + CBOM (CycloneDX) + SARIF + 合规映射
 */

const { QuantumRisk } = require('./models');

class ComplianceReporter {

  /**
   * 生成 Quantum Readiness Scorecard (0-100)
   * 对标 IBM Quantum-Safe Readiness Index
   */
  generateScorecard(scanResult) {
    const f = scanResult.findings;
    const total = f.length;
    if (!total) {
      return { score: 100, grade: 'A+', label: 'Quantum-Ready', breakdown: this._emptyBreakdown(), recommendations: [] };
    }

    // 各维度评分
    const dimensions = {
      algorithm_safety: this._scoreAlgorithmSafety(f),
      key_strength: this._scoreKeyStrength(f),
      crypto_agility: this._scoreCryptoAgility(scanResult),
      compliance_readiness: this._scoreComplianceReadiness(f),
      exposure_risk: this._scoreExposureRisk(f),
    };

    const weights = { algorithm_safety: 0.35, key_strength: 0.20, crypto_agility: 0.15, compliance_readiness: 0.15, exposure_risk: 0.15 };
    let totalScore = 0;
    for (const [dim, score] of Object.entries(dimensions)) {
      totalScore += score * (weights[dim] || 0.2);
    }

    const score = Math.round(totalScore);
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
    const label = score >= 90 ? 'Quantum-Ready' : score >= 75 ? 'Mostly Ready' : score >= 60 ? 'Partially Ready' : score >= 40 ? 'At Risk' : 'Critical Risk';

    return {
      score,
      grade,
      label,
      breakdown: dimensions,
      weights,
      risk_summary: {
        critical: scanResult.summary.by_risk.CRITICAL || 0,
        high: scanResult.summary.by_risk.HIGH || 0,
        medium: scanResult.summary.by_risk.MEDIUM || 0,
        low: scanResult.summary.by_risk.LOW || 0,
      },
      recommendations: this._generateRecommendations(scanResult, dimensions),
      benchmark: {
        industry_avg: 42,
        top_10_pct: 78,
        your_score: score,
      },
    };
  }

  /**
   * 生成 CBOM (Cryptographic Bill of Materials) — CycloneDX 1.6 格式
   */
  generateCBOM(scanResult) {
    const components = [];
    const seen = new Set();

    for (const f of scanResult.findings) {
      const key = `${f.algorithm}|${f.library}`;
      if (seen.has(key)) continue;
      seen.add(key);

      components.push({
        type: 'cryptographic-asset',
        name: f.algorithm,
        version: f.library_version || 'unknown',
        'bom-ref': `crypto-${f.algorithm}-${components.length}`,
        cryptoProperties: {
          assetType: this._mapAssetType(f.usage_type),
          algorithmProperties: {
            primitive: this._mapPrimitive(f.algorithm_family),
            parameterSetIdentifier: f.algorithm,
            executionEnvironment: 'software',
            implementationPlatform: f.tags?.[0] || 'generic',
            certificationLevel: 'none',
            cryptoFunctions: [f.usage_type],
          },
          oid: this._getOID(f.algorithm),
        },
        properties: [
          { name: 'quantumRisk', value: f.quantum_risk },
          { name: 'migrationTarget', value: f.migration_target },
          { name: 'nistStandard', value: f.nist_standard },
          { name: 'deprecationYear', value: String(f.nist_deprecation_year) },
        ],
      });
    }

    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      serialNumber: `urn:uuid:${scanResult.id}`,
      version: 1,
      metadata: {
        timestamp: scanResult.timestamp,
        tools: [{ vendor: 'QuantumShield', name: 'PQC Migration Toolkit', version: '1.0.0' }],
        component: {
          type: 'application',
          name: scanResult.project_name,
          'bom-ref': 'project-root',
        },
      },
      components,
      compositions: [{
        aggregate: 'incomplete',
        assemblies: components.map(c => c['bom-ref']),
      }],
    };
  }

  /**
   * 生成 SARIF (Static Analysis Results Interchange Format)
   */
  generateSARIF(scanResult) {
    return {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'QuantumShield',
            version: '1.0.0',
            informationUri: 'https://quantumshield.dev',
            rules: this._sarifRules(scanResult),
          },
        },
        results: scanResult.findings.map((f, i) => ({
          ruleId: `QS-${f.quantum_risk}-${f.algorithm}`,
          level: f.quantum_risk === 'CRITICAL' ? 'error' : f.quantum_risk === 'HIGH' ? 'warning' : 'note',
          message: { text: `Quantum-vulnerable algorithm: ${f.algorithm}. ${f.description}. Migrate to: ${f.migration_target}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: f.file_path },
              region: { startLine: f.line_number, startColumn: f.column_number },
            },
          }],
        })),
      }],
    };
  }

  /**
   * 合规映射
   */
  generateComplianceReport(scanResult) {
    const s = scanResult.summary;
    const crit = s.by_risk.CRITICAL || 0;
    const high = s.by_risk.HIGH || 0;

    return {
      frameworks: [
        {
          id: 'nist-ir-8547',
          name: 'NIST IR 8547 — Transition to Post-Quantum Cryptography Standards',
          status: crit > 0 ? 'NON_COMPLIANT' : high > 0 ? 'PARTIAL' : 'COMPLIANT',
          deadline: '2035',
          findings_count: crit + high,
          recommendation: crit > 0 ? '立即开始 PQC 迁移' : '继续推进迁移计划',
        },
        {
          id: 'cnsa-2.0',
          name: 'NSA CNSA 2.0 Suite',
          status: crit + high > 0 ? 'NON_COMPLIANT' : 'COMPLIANT',
          deadline: '2031',
          findings_count: crit + high,
          requirements: [
            { algo: 'ML-KEM-1024', purpose: 'Key Establishment', status: crit > 0 ? 'MISSING' : 'OK' },
            { algo: 'ML-DSA-87', purpose: 'Digital Signatures', status: s.by_algorithm?.['ECDSA-P256'] ? 'MISSING' : 'OK' },
            { algo: 'AES-256', purpose: 'Symmetric Encryption', status: s.by_algorithm?.['AES-128'] ? 'UPGRADE_NEEDED' : 'OK' },
            { algo: 'SHA-384+', purpose: 'Hashing', status: (s.by_algorithm?.['MD5'] || s.by_algorithm?.['SHA-1']) ? 'MISSING' : 'OK' },
          ],
        },
        {
          id: 'eu-pqc-roadmap',
          name: 'EU Post-Quantum Cryptography Roadmap',
          status: crit > 0 ? 'AT_RISK' : 'ON_TRACK',
          deadline: '2030',
          findings_count: crit,
          recommendation: '遵循 ENISA PQC 迁移指南',
        },
        {
          id: 'nist-sp-800-131a',
          name: 'NIST SP 800-131A Rev 2 — Transitioning Use of Crypto Algorithms',
          status: (s.by_algorithm?.['DES'] || s.by_algorithm?.['MD5'] || s.by_algorithm?.['SHA-1']) ? 'NON_COMPLIANT' : 'COMPLIANT',
          deadline: '2024 (已到期)',
          findings_count: (s.by_algorithm?.['DES'] || 0) + (s.by_algorithm?.['MD5'] || 0) + (s.by_algorithm?.['SHA-1'] || 0),
        },
      ],
      overall_status: crit > 0 ? 'CRITICAL_NON_COMPLIANT' : high > 0 ? 'PARTIAL_COMPLIANT' : 'COMPLIANT',
    };
  }

  // ============ Private Methods ============

  _scoreAlgorithmSafety(findings) {
    if (!findings.length) return 100;
    const riskWeights = { CRITICAL: 0, HIGH: 30, MEDIUM: 60, LOW: 85, SAFE: 100 };
    let total = 0;
    for (const f of findings) total += riskWeights[f.quantum_risk] || 50;
    return Math.round(total / findings.length);
  }

  _scoreKeyStrength(findings) {
    const keyFindings = findings.filter(f => f.key_size);
    if (!keyFindings.length) return 80;
    let score = 0;
    for (const f of keyFindings) {
      if (f.algorithm_family === 'RSA') score += f.key_size >= 4096 ? 40 : f.key_size >= 2048 ? 20 : 0;
      else if (f.algorithm_family === 'SYMMETRIC') score += f.key_size >= 256 ? 100 : f.key_size >= 128 ? 50 : 0;
      else score += 30;
    }
    return Math.min(100, Math.round(score / keyFindings.length));
  }

  _scoreCryptoAgility(scanResult) {
    // 基于代码中是否有抽象层的启发式判断
    const hasAbstraction = scanResult.findings.some(f =>
      f.code_snippet?.includes('factory') || f.code_snippet?.includes('provider') || f.code_snippet?.includes('abstract'));
    return hasAbstraction ? 70 : 30;
  }

  _scoreComplianceReadiness(findings) {
    const deprecated = findings.filter(f => f.nist_deprecation_year <= 2024).length;
    const total = findings.length || 1;
    return Math.round(100 - (deprecated / total) * 100);
  }

  _scoreExposureRisk(findings) {
    const external = findings.filter(f => f.is_external_facing).length;
    const total = findings.length || 1;
    return Math.round(100 - (external / total) * 80);
  }

  _emptyBreakdown() {
    return { algorithm_safety: 100, key_strength: 100, crypto_agility: 100, compliance_readiness: 100, exposure_risk: 100 };
  }

  _generateRecommendations(scanResult, dimensions) {
    const recs = [];
    if (dimensions.algorithm_safety < 50) recs.push({ priority: 'CRITICAL', text: '存在大量量子脆弱算法，立即启动 PQC 迁移计划', action: '优先迁移所有 RSA/ECDSA/DH 到 ML-KEM/ML-DSA' });
    if (dimensions.key_strength < 60) recs.push({ priority: 'HIGH', text: '密钥强度不足', action: '将所有对称加密升级至 AES-256，淘汰 DES/3DES' });
    if (dimensions.crypto_agility < 50) recs.push({ priority: 'MEDIUM', text: '缺乏密码学敏捷性', action: '引入 CryptoProvider 抽象层，实现算法可配置化' });
    if (dimensions.compliance_readiness < 60) recs.push({ priority: 'HIGH', text: '存在已废弃算法', action: '立即替换 MD5/SHA-1/DES 等已废弃算法' });
    if (dimensions.exposure_risk < 60) recs.push({ priority: 'HIGH', text: '外部暴露面存在量子脆弱算法', action: '优先修复外部 API 和 TLS 配置中的脆弱算法' });
    if (recs.length === 0) recs.push({ priority: 'LOW', text: '量子安全态势良好', action: '继续监控 NIST PQC 标准更新' });
    return recs;
  }

  _sarifRules(scanResult) {
    const rulesMap = {};
    for (const f of scanResult.findings) {
      const id = `QS-${f.quantum_risk}-${f.algorithm}`;
      if (!rulesMap[id]) {
        rulesMap[id] = {
          id,
          name: `QuantumVulnerable_${f.algorithm}`,
          shortDescription: { text: `Quantum-vulnerable: ${f.algorithm}` },
          fullDescription: { text: f.description },
          helpUri: `https://quantumshield.dev/kb/${f.algorithm}`,
          properties: { tags: ['security', 'cryptography', 'post-quantum'] },
        };
      }
    }
    return Object.values(rulesMap);
  }

  _mapAssetType(usageType) {
    const map = {
      key_generation: 'algorithm', encryption: 'algorithm', decryption: 'algorithm',
      signing: 'algorithm', verification: 'algorithm', key_exchange: 'protocol',
      hashing: 'algorithm', certificate: 'certificate', tls_config: 'protocol',
      dependency: 'related-crypto-material',
    };
    return map[usageType] || 'algorithm';
  }

  _mapPrimitive(family) {
    const map = { RSA: 'pk-encryption', ECC: 'pk-encryption', DH: 'key-agree', DSA: 'signature', SYMMETRIC: 'block-cipher', HASH: 'hash', STREAM_CIPHER: 'stream-cipher' };
    return map[family] || 'other';
  }

  _getOID(algo) {
    const oids = {
      'RSA-2048': '1.2.840.113549.1.1.1', 'RSA-4096': '1.2.840.113549.1.1.1',
      'ECDSA-P256': '1.2.840.10045.4.3.2', 'ECDSA-P384': '1.2.840.10045.4.3.3',
      'DSA': '1.2.840.10040.4.1', 'DH-2048': '1.2.840.113549.1.3.1',
      'MD5': '1.2.840.113549.2.5', 'SHA-1': '1.3.14.3.2.26',
      'AES-128': '2.16.840.1.101.3.4.1.1', 'AES-256': '2.16.840.1.101.3.4.1.41',
    };
    return oids[algo] || '';
  }
}

module.exports = ComplianceReporter;
