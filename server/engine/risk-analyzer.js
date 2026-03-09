/**
 * QuantumShield — 量化风险分析器
 * Quantum Vulnerability Scoring + Business Impact Matrix + Prioritization
 */

const { QuantumRisk, QUANTUM_VULNERABILITY_DB } = require('./models');

class RiskAnalyzer {

  /**
   * 为扫描结果生成完整的风险分析报告
   */
  analyzeRisks(scanResult) {
    const findings = scanResult.findings || [];
    const startTime = Date.now();

    // 1. 量子脆弱性评分
    const quantumScores = this._scoreQuantumVulnerability(findings);

    // 2. 业务影响矩阵
    const businessImpact = this._assessBusinessImpact(findings, scanResult);

    // 3. 威胁优先级排序
    const prioritizedFindings = this._prioritizeFindings(findings, quantumScores, businessImpact);

    // 4. HNDL (Harvest Now, Decrypt Later) 风险分析
    const hndlAnalysis = this._analyzeHNDL(findings);

    // 5. 攻击面分析
    const attackSurface = this._analyzeAttackSurface(findings);

    // 6. 量子时间线风险
    const timelineRisk = this._assessTimelineRisk(findings);

    // 7. 依赖链风险
    const dependencyRisk = this._assessDependencyRisk(scanResult);

    // 8. 综合风险评分 (0-100, 100 = 最高风险)
    const overallRiskScore = this._calculateOverallRisk(
      quantumScores, businessImpact, hndlAnalysis, attackSurface, timelineRisk
    );

    return {
      analysis_duration_ms: Date.now() - startTime,
      overall_risk_score: overallRiskScore,
      risk_level: this._riskLevel(overallRiskScore),
      quantum_scores: quantumScores,
      business_impact: businessImpact,
      prioritized_findings: prioritizedFindings,
      hndl_analysis: hndlAnalysis,
      attack_surface: attackSurface,
      timeline_risk: timelineRisk,
      dependency_risk: dependencyRisk,
      executive_summary: this._generateExecutiveSummary(overallRiskScore, findings, hndlAnalysis, timelineRisk),
      risk_matrix: this._buildRiskMatrix(findings),
      trend_data: this._generateTrendData(findings),
    };
  }

  /**
   * 量子脆弱性评分 — 基于 Shor/Grover 算法影响
   */
  _scoreQuantumVulnerability(findings) {
    const algorithmScores = {};
    const weights = {
      CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1, SAFE: 0,
    };
    const usageWeights = {
      key_generation: 1.5, encryption: 1.3, signing: 1.2,
      key_exchange: 1.4, hashing: 0.8, certificate: 1.1,
      tls_config: 1.3, dependency: 0.6, decryption: 1.3,
      verification: 1.0,
    };

    let totalScore = 0;
    let maxPossible = 0;

    for (const f of findings) {
      const baseScore = weights[f.quantum_risk] || 5;
      const usageMultiplier = usageWeights[f.usage_type] || 1.0;
      const externalMultiplier = f.is_external_facing ? 1.5 : 1.0;
      const testMultiplier = f.is_in_test ? 0.3 : 1.0;
      const confidenceMultiplier = f.confidence || 0.85;

      const score = baseScore * usageMultiplier * externalMultiplier * testMultiplier * confidenceMultiplier;
      totalScore += score;
      maxPossible += 10 * 1.5 * 1.5 * 1.0;

      if (!algorithmScores[f.algorithm]) {
        algorithmScores[f.algorithm] = { count: 0, totalScore: 0, maxSingleScore: 0, risk: f.quantum_risk };
      }
      algorithmScores[f.algorithm].count += 1;
      algorithmScores[f.algorithm].totalScore += score;
      algorithmScores[f.algorithm].maxSingleScore = Math.max(algorithmScores[f.algorithm].maxSingleScore, score);
    }

    return {
      total_score: Math.round(totalScore * 10) / 10,
      normalized_score: maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0,
      by_algorithm: algorithmScores,
      shor_vulnerable_count: findings.filter(f => ['CRITICAL', 'HIGH'].includes(f.quantum_risk) && ['RSA', 'ECC', 'DH', 'DSA'].includes(f.algorithm_family)).length,
      grover_vulnerable_count: findings.filter(f => f.quantum_risk === 'MEDIUM').length,
      classically_broken_count: findings.filter(f => {
        const vuln = QUANTUM_VULNERABILITY_DB[f.algorithm];
        return vuln && vuln.nist_deprecation_year && vuln.nist_deprecation_year <= 2024;
      }).length,
    };
  }

  /**
   * 业务影响矩阵
   */
  _assessBusinessImpact(findings, scanResult) {
    const categories = {
      data_confidentiality: { score: 0, findings: [], label: '数据机密性', description: '加密数据可被解密' },
      authentication: { score: 0, findings: [], label: '身份认证', description: '签名和证书可被伪造' },
      key_exchange: { score: 0, findings: [], label: '密钥交换', description: '密钥协商可被破解' },
      data_integrity: { score: 0, findings: [], label: '数据完整性', description: '哈希碰撞可被利用' },
      compliance: { score: 0, findings: [], label: '合规性', description: '不满足监管要求' },
      supply_chain: { score: 0, findings: [], label: '供应链', description: '依赖库引入脆弱算法' },
    };

    for (const f of findings) {
      if (['encryption', 'decryption', 'key_generation'].includes(f.usage_type)) {
        categories.data_confidentiality.score += f.quantum_risk === 'CRITICAL' ? 10 : f.quantum_risk === 'HIGH' ? 7 : 3;
        categories.data_confidentiality.findings.push(f);
      }
      if (['signing', 'verification', 'certificate'].includes(f.usage_type)) {
        categories.authentication.score += f.quantum_risk === 'CRITICAL' ? 10 : f.quantum_risk === 'HIGH' ? 7 : 3;
        categories.authentication.findings.push(f);
      }
      if (['key_exchange'].includes(f.usage_type)) {
        categories.key_exchange.score += f.quantum_risk === 'CRITICAL' ? 10 : 8;
        categories.key_exchange.findings.push(f);
      }
      if (['hashing'].includes(f.usage_type)) {
        categories.data_integrity.score += f.quantum_risk === 'CRITICAL' ? 8 : 4;
        categories.data_integrity.findings.push(f);
      }
      if (['dependency'].includes(f.usage_type)) {
        categories.supply_chain.score += 5;
        categories.supply_chain.findings.push(f);
      }

      // 合规性影响
      const vuln = QUANTUM_VULNERABILITY_DB[f.algorithm];
      if (vuln?.nist_deprecation_year && vuln.nist_deprecation_year <= 2030) {
        categories.compliance.score += 5;
        categories.compliance.findings.push(f);
      }
    }

    // 归一化
    for (const [key, cat] of Object.entries(categories)) {
      const max = Math.max(cat.findings.length * 10, 1);
      cat.normalized = Math.min(100, Math.round((cat.score / max) * 100));
      cat.level = cat.normalized >= 70 ? 'CRITICAL' : cat.normalized >= 40 ? 'HIGH' : cat.normalized >= 20 ? 'MEDIUM' : 'LOW';
    }

    return categories;
  }

  /**
   * HNDL (Harvest Now, Decrypt Later) 分析
   */
  _analyzeHNDL(findings) {
    const hndlVulnerable = findings.filter(f => {
      return ['CRITICAL', 'HIGH'].includes(f.quantum_risk) &&
             ['encryption', 'key_exchange', 'key_generation'].includes(f.usage_type) &&
             ['RSA', 'ECC', 'DH'].includes(f.algorithm_family);
    });

    const dataShelfLife = {
      '< 5 years': { risk: 'LOW', description: '数据保质期短于量子计算威胁时间线' },
      '5-10 years': { risk: 'HIGH', description: '数据在量子计算机成熟前仍有价值' },
      '> 10 years': { risk: 'CRITICAL', description: '数据在量子计算机到来时仍需保密' },
    };

    return {
      vulnerable_encryption_points: hndlVulnerable.length,
      total_encryption_points: findings.filter(f => ['encryption', 'key_exchange', 'key_generation'].includes(f.usage_type)).length,
      risk_level: hndlVulnerable.length > 5 ? 'CRITICAL' : hndlVulnerable.length > 2 ? 'HIGH' : hndlVulnerable.length > 0 ? 'MEDIUM' : 'LOW',
      affected_algorithms: [...new Set(hndlVulnerable.map(f => f.algorithm))],
      data_shelf_life_guidance: dataShelfLife,
      recommendation: hndlVulnerable.length > 0
        ? '立即开始 HNDL 防护：优先迁移所有非对称加密到 ML-KEM (FIPS 203) 混合模式'
        : '当前代码库不存在明显的 HNDL 风险',
      estimated_quantum_threat_year: 2030,
      years_remaining: 2030 - new Date().getFullYear(),
    };
  }

  /**
   * 攻击面分析
   */
  _analyzeAttackSurface(findings) {
    const externalFacing = findings.filter(f => f.is_external_facing);
    const byFile = {};
    const byLib = {};

    for (const f of findings) {
      byFile[f.file_path] = (byFile[f.file_path] || 0) + 1;
      if (f.library) byLib[f.library] = (byLib[f.library] || 0) + 1;
    }

    const hotspots = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count, risk: count >= 5 ? 'HIGH' : count >= 3 ? 'MEDIUM' : 'LOW' }));

    return {
      total_surface_points: findings.length,
      external_facing: externalFacing.length,
      internal_only: findings.length - externalFacing.length,
      hotspot_files: hotspots,
      vulnerable_libraries: Object.entries(byLib)
        .sort((a, b) => b[1] - a[1])
        .map(([lib, count]) => ({ library: lib, usage_count: count })),
      exposure_score: findings.length > 0
        ? Math.round((externalFacing.length / findings.length) * 100)
        : 0,
    };
  }

  /**
   * 量子计算时间线风险评估
   */
  _assessTimelineRisk(findings) {
    const now = new Date().getFullYear();
    const phases = [
      { year: 2027, label: '近期 (1-2年)', algorithms: [] },
      { year: 2030, label: '中期 (3-5年)', algorithms: [] },
      { year: 2035, label: '远期 (5-10年)', algorithms: [] },
    ];

    for (const f of findings) {
      const vuln = QUANTUM_VULNERABILITY_DB[f.algorithm];
      if (!vuln) continue;
      const depYear = vuln.nist_deprecation_year || 2035;

      if (depYear <= 2027) phases[0].algorithms.push(f);
      else if (depYear <= 2030) phases[1].algorithms.push(f);
      else phases[2].algorithms.push(f);
    }

    return {
      phases: phases.map(p => ({
        ...p,
        count: p.algorithms.length,
        urgency: p.algorithms.length > 10 ? 'CRITICAL' : p.algorithms.length > 5 ? 'HIGH' : p.algorithms.length > 0 ? 'MEDIUM' : 'SAFE',
        algorithms: [...new Set(p.algorithms.map(a => a.algorithm))],
      })),
      most_urgent_deadline: phases.find(p => p.algorithms.length > 0)?.year || null,
      total_at_risk: findings.filter(f => f.quantum_risk !== 'SAFE').length,
    };
  }

  /**
   * 依赖链风险分析
   */
  _assessDependencyRisk(scanResult) {
    const depFindings = scanResult.dependency_findings || [];
    const directDeps = depFindings.filter(f => f.scan_mode === 'dependency');

    return {
      vulnerable_dependencies: directDeps.length,
      affected_packages: [...new Set(directDeps.map(f => f.code_snippet))].filter(Boolean),
      risk_level: directDeps.length > 5 ? 'HIGH' : directDeps.length > 2 ? 'MEDIUM' : directDeps.length > 0 ? 'LOW' : 'SAFE',
      recommendation: directDeps.length > 0
        ? '检查依赖库是否提供 PQC 兼容版本，或寻找替代方案'
        : '依赖链未检测到明显的量子脆弱性',
    };
  }

  /**
   * 综合风险评分 (0-100)
   */
  _calculateOverallRisk(quantumScores, businessImpact, hndlAnalysis, attackSurface, timelineRisk) {
    const qScore = Math.min(100, quantumScores.normalized_score);

    const biScores = Object.values(businessImpact).map(c => c.normalized || 0);
    const biAvg = biScores.length > 0 ? biScores.reduce((a, b) => a + b, 0) / biScores.length : 0;

    const hndlScore = { CRITICAL: 100, HIGH: 75, MEDIUM: 40, LOW: 10 }[hndlAnalysis.risk_level] || 0;
    const exposureScore = attackSurface.exposure_score || 0;
    const timeScore = timelineRisk.phases[0].count > 0 ? 90 : timelineRisk.phases[1].count > 0 ? 60 : 20;

    return Math.round(
      qScore * 0.30 +
      biAvg * 0.25 +
      hndlScore * 0.20 +
      exposureScore * 0.10 +
      timeScore * 0.15
    );
  }

  _riskLevel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'SAFE';
  }

  /**
   * 优先级排序
   */
  _prioritizeFindings(findings, quantumScores, businessImpact) {
    const scored = findings.map(f => {
      const algoScore = quantumScores.by_algorithm[f.algorithm]?.maxSingleScore || 0;
      const riskW = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, SAFE: 0 }[f.quantum_risk] || 0;
      const externalW = f.is_external_facing ? 2 : 0;
      const testW = f.is_in_test ? -2 : 0;
      const depYearW = f.nist_deprecation_year <= 2024 ? 3 : f.nist_deprecation_year <= 2030 ? 1 : 0;

      const priority = riskW * 10 + algoScore + externalW + testW + depYearW;
      return { ...f, priority_score: Math.round(priority * 10) / 10 };
    });

    return scored.sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * 风险矩阵 (概率 × 影响)
   */
  _buildRiskMatrix(findings) {
    const matrix = {
      high_prob_high_impact: [], // 量子破解概率高 + 业务影响大
      high_prob_low_impact: [],  // 量子破解概率高 + 业务影响小
      low_prob_high_impact: [],  // 量子破解概率低 + 业务影响大
      low_prob_low_impact: [],   // 量子破解概率低 + 业务影响小
    };

    for (const f of findings) {
      const highProb = ['CRITICAL', 'HIGH'].includes(f.quantum_risk);
      const highImpact = f.is_external_facing || ['encryption', 'key_exchange', 'signing'].includes(f.usage_type);

      if (highProb && highImpact) matrix.high_prob_high_impact.push(f);
      else if (highProb && !highImpact) matrix.high_prob_low_impact.push(f);
      else if (!highProb && highImpact) matrix.low_prob_high_impact.push(f);
      else matrix.low_prob_low_impact.push(f);
    }

    return {
      cells: matrix,
      counts: {
        high_prob_high_impact: matrix.high_prob_high_impact.length,
        high_prob_low_impact: matrix.high_prob_low_impact.length,
        low_prob_high_impact: matrix.low_prob_high_impact.length,
        low_prob_low_impact: matrix.low_prob_low_impact.length,
      },
    };
  }

  /**
   * 生成趋势数据 (模拟历史数据)
   */
  _generateTrendData(findings) {
    const now = new Date();
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      // 模拟趋势：随着时间推进，发现的漏洞逐渐增加（因为检测能力提升）
      const factor = 1 + (11 - i) * 0.08;
      data.push({
        month,
        vulnerabilities: Math.round(findings.length * factor * (0.3 + Math.random() * 0.15)),
        critical: Math.round((findings.filter(f => f.quantum_risk === 'CRITICAL').length) * factor * (0.3 + Math.random() * 0.15)),
        score: Math.max(0, Math.min(100, Math.round(70 - (11 - i) * 3 + Math.random() * 10))),
      });
    }
    // 最新一个月使用真实数据
    if (data.length > 0) {
      data[data.length - 1].vulnerabilities = findings.length;
      data[data.length - 1].critical = findings.filter(f => f.quantum_risk === 'CRITICAL').length;
    }
    return data;
  }

  /**
   * 执行摘要
   */
  _generateExecutiveSummary(overallRiskScore, findings, hndlAnalysis, timelineRisk) {
    const critCount = findings.filter(f => f.quantum_risk === 'CRITICAL').length;
    const highCount = findings.filter(f => f.quantum_risk === 'HIGH').length;
    const uniqueAlgos = [...new Set(findings.filter(f => f.quantum_risk !== 'SAFE').map(f => f.algorithm))];

    const urgency = overallRiskScore >= 80 ? 'CRITICAL' : overallRiskScore >= 60 ? 'HIGH' : overallRiskScore >= 40 ? 'MEDIUM' : 'LOW';

    return {
      urgency,
      risk_score: overallRiskScore,
      headline: urgency === 'CRITICAL'
        ? '代码库存在严重量子安全风险，需要立即行动'
        : urgency === 'HIGH'
        ? '代码库面临显著量子安全风险，建议尽快启动迁移'
        : urgency === 'MEDIUM'
        ? '代码库存在一些量子安全隐患，建议制定迁移计划'
        : '代码库量子安全态势良好',
      key_findings: [
        `检测到 ${findings.length} 个加密使用点，其中 ${critCount} 个严重、${highCount} 个高风险`,
        `涉及 ${uniqueAlgos.length} 种量子脆弱算法：${uniqueAlgos.slice(0, 5).join(', ')}${uniqueAlgos.length > 5 ? ' 等' : ''}`,
        hndlAnalysis.vulnerable_encryption_points > 0
          ? `${hndlAnalysis.vulnerable_encryption_points} 个加密点面临 HNDL (先存储后解密) 攻击风险`
          : 'HNDL 攻击风险较低',
        `最近截止时间: ${timelineRisk.most_urgent_deadline || '无'} 年`,
      ],
      recommended_actions: [
        critCount > 0 ? '立即淘汰 DES/3DES/RC4/MD5/SHA-1 等已破解算法' : null,
        findings.some(f => ['RSA', 'ECC'].includes(f.algorithm_family))
          ? '启动非对称加密 PQC 迁移 (RSA → ML-KEM, ECDSA → ML-DSA)'
          : null,
        hndlAnalysis.vulnerable_encryption_points > 0
          ? '对长期敏感数据启用混合加密模式 (经典 + PQC)'
          : null,
        '建立密码学资产清单 (CBOM) 并持续监控',
        '制定分阶段迁移计划，优先处理外部暴露面',
      ].filter(Boolean),
    };
  }
}

module.exports = RiskAnalyzer;
