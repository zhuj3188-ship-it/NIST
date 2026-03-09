/**
 * I18n Context - Chinese / English language support
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const I18nContext = createContext();

const translations = {
  zh: {
    // Navigation
    'nav.dashboard': '仪表盘',
    'nav.scanner': '代码扫描',
    'nav.migration': '迁移方案',
    'nav.compliance': '合规审计',
    'nav.knowledge': '知识库',
    'nav.downloads': '下载中心',
    'nav.cicd': 'CI/CD 集成',

    // Alerts
    'alert.critical_rsa': 'CRITICAL: 检测到 RSA-2048 量子脆弱性',
    'alert.high_tls': 'HIGH: TLS 1.0/1.1 配置风险',
    'alert.medium_sha': 'MEDIUM: SHA-1 哈希使用',
    'alert.view_all': '查看所有告警...',

    // App shell
    'app.shortcuts': '快捷键',
    'app.github': 'GitHub 仓库',
    'app.docs': 'NIST PQC 文档',
    'app.about': '关于 QuantumShield',
    'app.about_desc': '企业级后量子密码学迁移平台',
    'app.about_rules': '支持 13 种编程语言，258+ 扫描规则',
    'app.about_nist': '完全对标 NIST FIPS 203/204/205 标准',
    'app.fullscreen': '全屏',
    'app.exit_fullscreen': '退出全屏',
    'app.alerts': '安全告警',
    'app.engine_online': '扫描引擎在线',
    'app.engine_offline': '扫描引擎离线',
    'app.status_loading': '加载中...',
    'app.quick_nav': '快速导航',
    'app.nist_compliant': 'NIST FIPS 203/204/205 合规',
    'app.status_ready': '就绪',
    'theme.dark': '深色模式',
    'theme.light': '浅色模式',

    // ─── Dashboard (short keys: dash.*) ───
    'dash.title': 'QuantumShield 控制台',
    'dash.subtitle': '企业级后量子密码学安全迁移平台，对标 NIST FIPS 203/204/205 标准，覆盖 13 种编程语言，258+ 扫描规则。',
    'dash.lang_support': '支持 Python · JavaScript · Java · Go · C/C++ · Rust · C# · PHP · Ruby · Kotlin · Swift',
    'dash.scan_demo': '扫描演示项目',
    'dash.scan_my_code': '扫描我的代码',
    'dash.compliance_report': '合规报告',
    'dash.scanning': '正在扫描...',
    'dash.hndl_title': 'HNDL (先存储后解密) 威胁警告',
    'dash.hndl_desc': '你的加密通信可能正在被对手截获并存储 — 等量子计算机可用时解密。立即评估风险。',
    'dash.hndl_detect': ' 个量子脆弱加密点。',
    'dash.hndl_years': '年',
    'dash.hndl_affected': '受影响',
    'dash.files_scanned': '扫描文件',
    'dash.total_findings': '发现总数',
    'dash.scan_duration': '扫描耗时',
    'dash.code_lines': '代码行数',
    'dash.risk_dist': '风险分布',
    'dash.vuln_algo': '脆弱算法 Top10',
    'dash.quantum_readiness': '量子就绪度',
    'dash.total': '总计',
    'dash.risk_level': '风险等级',
    'dash.risk_matrix': '风险矩阵',
    'dash.high_prob_high': '高概率高影响',
    'dash.high_prob_low': '高概率低影响',
    'dash.low_prob_high': '低概率高影响',
    'dash.low_prob_low': '低概率低影响',
    'dash.business_impact': '业务影响分析',
    'dash.threat_timeline': '量子威胁时间线',
    'dash.lang_dist': '语言分布',
    'dash.usage_type': '用途分类',
    'dash.migrate': '迁移',
    'dash.compliance': '合规',

    // ─── Scanner (short keys: scan.*) ───
    'scan.title': '量子密码学安全扫描',
    'scan.rules_tag': '258 rules · 13 langs',
    'scan.demo': '演示',
    'scan.paste': '粘贴',
    'scan.upload': '上传',
    'scan.paste_placeholder': '粘贴代码到此处...',
    'scan.upload_hint': '拖拽文件到此处或点击上传',
    'scan.upload_desc': '支持 .py .js .java .go .c .rs .cs .php .conf .yaml .json .pem .crt 等',
    'scan.demo_desc': '以下是演示项目的源代码，包含常见的量子脆弱密码学用法。点击扫描以分析。',
    'scan.parse': '解析',
    'scan.parse_desc': '构建 AST',
    'scan.scan_step': '扫描',
    'scan.scan_step_desc': '258 条规则',
    'scan.evaluate': '评估',
    'scan.evaluate_desc': '风险评分',
    'scan.done': '完成',
    'scan.done_desc': '生成报告',
    'scan.scanning': '扫描中',
    'scan.start': '开始扫描',
    'scan.complete': '扫描完成',
    'scan.no_input_code': '请先粘贴代码',
    'scan.no_input_file': '请先上传文件',
    'scan.risk': '风险',
    'scan.algorithm': '算法',
    'scan.usage': '用途',
    'scan.file': '文件',
    'scan.confidence': '置信度',
    'scan.migration_target': '迁移目标',
    'scan.strategy': '策略',
    'scan.findings': '扫描发现',
    'scan.migration_plan': '迁移方案',
    'scan.compliance_report': '合规报告',
    'scan.total_items': (total) => `共 ${total} 条`,
    'scan.code_context': '代码上下文',
    'scan.quantum_threat': '量子威胁',
    'scan.zh_desc': '中文描述',
    'scan.deprecation_year': '弃用年份',
    'scan.migration_path': '迁移路径',
    'scan.external_facing': '外部暴露',
    'scan.yes': '是',
    'scan.no': '否',
    'scan.file_dist': '文件维度分布',
    'scan.protocol_stack': '协议栈检测',
    'scan.tls_stacks': 'TLS 协议栈',
    'scan.custom_stacks': '自定义协议栈',
    'scan.kem': '密钥封装',
    'scan.signature': '数字签名',
    'scan.aead': 'AEAD 加密',
    'scan.not_detected': '未检测到',
    'scan.correlation': '关联分析',
    'scan.by_algorithm': '按算法',
    'scan.by_usage': '按用途',
    'scan.by_library': '按依赖库',

    // ─── Migration (short keys: migrate.*) ───
    'migrate.title': '后量子密码学迁移方案',
    'migrate.strategies': '三种迁移策略',
    'migrate.pure_pqc': 'Pure PQC',
    'migrate.hybrid': 'Hybrid',
    'migrate.crypto_agile': 'Crypto-Agile',
    'migrate.desc': '根据扫描发现，自动生成代码级迁移方案，包含代码 Diff、测试模板、回滚脚本和合规映射。',
    'migrate.generate': '生成迁移方案',
    'migrate.demo_migrate': '演示迁移方案',
    'migrate.scan_first': '先去扫描代码',
    'migrate.scan_prompt': '请先扫描代码以生成迁移方案',
    'migrate.generating': '正在生成迁移方案...',

    // ─── Knowledge (short keys: know.*) ───
    'know.title': '后量子密码学知识库',
    'know.desc': '全面介绍 NIST 标准化的后量子密码学算法（ML-KEM, ML-DSA, SLH-DSA）、量子脆弱算法清单、以及量子计算威胁时间线。',
    'know.pqc_tab': 'PQC 标准算法',
    'know.vuln_tab': '量子脆弱性',
    'know.timeline_tab': '量子时间线',
    'know.algo': '算法',
    'know.risk': '风险',
    'know.family': '算法族',
    'know.quantum_threat': '量子威胁',
    'know.time_to_break': '破解时间估计',
    'know.migration_target': '迁移目标',
    'know.quantum_safe': '量子安全',
    'know.deprecation': '弃用年份',
    'know.vuln_desc': (count) => `量子脆弱算法数据库，共 ${count} 个条目。包含每种算法的量子威胁评级、预计破解时间、NIST 推荐替代和 CWE 映射。`,
    'know.vuln_sub': '点击展开查看详细威胁评估和迁移建议。',
    'know.timeline_desc': '后量子密码学发展时间线 — 从 NIST 标准发布到量子计算机威胁实现。',

    // ─── Compliance (short keys: comp.*) ───
    'comp.empty_title': '量子安全合规审计',
    'comp.empty_desc': '综合评估代码库对 NIST IR 8547、CNSA 2.0、NCSC、EU PQC 等合规框架的符合程度，生成 CBOM、SARIF 报告。',
    'comp.empty_sub': '包含量子就绪度评分、评分维度雷达图、安全建议和合规框架映射。',
    'comp.generate': '生成合规报告',
    'comp.demo_compliance': '运行演示合规',
    'comp.scan_first': '先去扫描代码',
    'comp.load_failed': '加载合规数据失败',
    'comp.loading': '正在生成合规报告...',
    'comp.loading_sub': '评估量子就绪度、生成 CBOM/SARIF、映射合规框架...',
    'comp.algorithm_safety': '算法安全',
    'comp.key_strength': '密钥强度',
    'comp.crypto_agility': '密码敏捷',
    'comp.compliance_readiness': '合规就绪',
    'comp.exposure_risk': '暴露风险',

    // ─── CI/CD (short keys: cicd.*) ───
    'cicd.title': 'CI/CD 集成',
    'cicd.subtitle': '将 QuantumShield 量子安全扫描集成到你的 CI/CD 流水线中。自动扫描每次提交和 PR，生成 SARIF/CBOM 报告。',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.scanner': 'Code Scanner',
    'nav.migration': 'Migration',
    'nav.compliance': 'Compliance',
    'nav.knowledge': 'Knowledge Base',
    'nav.downloads': 'Downloads',
    'nav.cicd': 'CI/CD Integration',

    // Alerts
    'alert.critical_rsa': 'CRITICAL: RSA-2048 quantum vulnerability detected',
    'alert.high_tls': 'HIGH: TLS 1.0/1.1 config risk',
    'alert.medium_sha': 'MEDIUM: SHA-1 hash usage found',
    'alert.view_all': 'View all alerts...',

    // App shell
    'app.shortcuts': 'Shortcuts',
    'app.github': 'GitHub Repository',
    'app.docs': 'NIST PQC Docs',
    'app.about': 'About QuantumShield',
    'app.about_desc': 'Enterprise Post-Quantum Cryptography Migration Platform',
    'app.about_rules': 'Supports 13 languages, 258+ scanning rules',
    'app.about_nist': 'Fully compliant with NIST FIPS 203/204/205',
    'app.fullscreen': 'Fullscreen',
    'app.exit_fullscreen': 'Exit Fullscreen',
    'app.alerts': 'Security Alerts',
    'app.engine_online': 'Scan Engine Online',
    'app.engine_offline': 'Scan Engine Offline',
    'app.status_loading': 'Loading...',
    'app.quick_nav': 'Quick Nav',
    'app.nist_compliant': 'NIST FIPS 203/204/205 Compliant',
    'app.status_ready': 'Ready',
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',

    // ─── Dashboard ───
    'dash.title': 'QuantumShield Console',
    'dash.subtitle': 'Enterprise PQC security migration platform, aligned with NIST FIPS 203/204/205, covering 13 languages and 258+ scan rules.',
    'dash.lang_support': 'Supports Python · JavaScript · Java · Go · C/C++ · Rust · C# · PHP · Ruby · Kotlin · Swift',
    'dash.scan_demo': 'Scan Demo Project',
    'dash.scan_my_code': 'Scan My Code',
    'dash.compliance_report': 'Compliance Report',
    'dash.scanning': 'Scanning...',
    'dash.hndl_title': 'HNDL (Harvest Now, Decrypt Later) Threat',
    'dash.hndl_desc': 'Your encrypted communications may be harvested and stored by adversaries — to be decrypted when quantum computers become available. Assess risk now.',
    'dash.hndl_detect': ' quantum-vulnerable encryption points.',
    'dash.hndl_years': 'years',
    'dash.hndl_affected': 'affected',
    'dash.files_scanned': 'Files Scanned',
    'dash.total_findings': 'Total Findings',
    'dash.scan_duration': 'Scan Duration',
    'dash.code_lines': 'Lines of Code',
    'dash.risk_dist': 'Risk Distribution',
    'dash.vuln_algo': 'Top 10 Vulnerable Algorithms',
    'dash.quantum_readiness': 'Quantum Readiness',
    'dash.total': 'Total',
    'dash.risk_level': 'Risk Level',
    'dash.risk_matrix': 'Risk Matrix',
    'dash.high_prob_high': 'High Prob / High Impact',
    'dash.high_prob_low': 'High Prob / Low Impact',
    'dash.low_prob_high': 'Low Prob / High Impact',
    'dash.low_prob_low': 'Low Prob / Low Impact',
    'dash.business_impact': 'Business Impact',
    'dash.threat_timeline': 'Threat Timeline',
    'dash.lang_dist': 'Language Distribution',
    'dash.usage_type': 'Usage Types',
    'dash.migrate': 'Migrate',
    'dash.compliance': 'Compliance',

    // ─── Scanner ───
    'scan.title': 'Quantum Cryptography Security Scan',
    'scan.rules_tag': '258 rules · 13 langs',
    'scan.demo': 'Demo',
    'scan.paste': 'Paste',
    'scan.upload': 'Upload',
    'scan.paste_placeholder': 'Paste your code here...',
    'scan.upload_hint': 'Drag & drop files here or click to upload',
    'scan.upload_desc': 'Supports .py .js .java .go .c .rs .cs .php .conf .yaml .json .pem .crt etc.',
    'scan.demo_desc': 'Demo project source code with common quantum-vulnerable cryptography patterns. Click scan to analyze.',
    'scan.parse': 'Parse',
    'scan.parse_desc': 'Build AST',
    'scan.scan_step': 'Scan',
    'scan.scan_step_desc': '258 rules',
    'scan.evaluate': 'Evaluate',
    'scan.evaluate_desc': 'Risk scoring',
    'scan.done': 'Done',
    'scan.done_desc': 'Generate report',
    'scan.scanning': 'Scanning',
    'scan.start': 'Start Scan',
    'scan.complete': 'Scan Complete',
    'scan.no_input_code': 'Please paste code first',
    'scan.no_input_file': 'Please upload files first',
    'scan.risk': 'Risk',
    'scan.algorithm': 'Algorithm',
    'scan.usage': 'Usage',
    'scan.file': 'File',
    'scan.confidence': 'Confidence',
    'scan.migration_target': 'Migration Target',
    'scan.strategy': 'Strategy',
    'scan.findings': 'Scan Findings',
    'scan.migration_plan': 'Migration Plan',
    'scan.compliance_report': 'Compliance Report',
    'scan.total_items': (total) => `${total} items total`,
    'scan.code_context': 'Code Context',
    'scan.quantum_threat': 'Quantum Threat',
    'scan.zh_desc': 'Description (ZH)',
    'scan.deprecation_year': 'Deprecation Year',
    'scan.migration_path': 'Migration Path',
    'scan.external_facing': 'External Facing',
    'scan.yes': 'Yes',
    'scan.no': 'No',
    'scan.file_dist': 'File Distribution',
    'scan.protocol_stack': 'Protocol Stack Detection',
    'scan.tls_stacks': 'TLS Stacks',
    'scan.custom_stacks': 'Custom Stacks',
    'scan.kem': 'Key Encapsulation',
    'scan.signature': 'Digital Signature',
    'scan.aead': 'AEAD Encryption',
    'scan.not_detected': 'Not detected',
    'scan.correlation': 'Correlation Analysis',
    'scan.by_algorithm': 'By Algorithm',
    'scan.by_usage': 'By Usage',
    'scan.by_library': 'By Library',

    // ─── Migration ───
    'migrate.title': 'Post-Quantum Migration Plan',
    'migrate.strategies': 'Three migration strategies',
    'migrate.pure_pqc': 'Pure PQC',
    'migrate.hybrid': 'Hybrid',
    'migrate.crypto_agile': 'Crypto-Agile',
    'migrate.desc': 'Based on scan findings, auto-generate code-level migration plans with code diffs, test templates, rollback scripts, and compliance mapping.',
    'migrate.generate': 'Generate Migration Plan',
    'migrate.demo_migrate': 'Demo Migration Plan',
    'migrate.scan_first': 'Scan Code First',
    'migrate.scan_prompt': 'Please scan code first to generate migration plan',
    'migrate.generating': 'Generating migration plan...',

    // ─── Knowledge ───
    'know.title': 'Post-Quantum Cryptography Knowledge Base',
    'know.desc': 'Comprehensive guide to NIST-standardized PQC algorithms (ML-KEM, ML-DSA, SLH-DSA), quantum-vulnerable algorithm catalog, and quantum computing threat timeline.',
    'know.pqc_tab': 'PQC Standard Algorithms',
    'know.vuln_tab': 'Quantum Vulnerabilities',
    'know.timeline_tab': 'Quantum Timeline',
    'know.algo': 'Algorithm',
    'know.risk': 'Risk',
    'know.family': 'Family',
    'know.quantum_threat': 'Quantum Threat',
    'know.time_to_break': 'Time to Break',
    'know.migration_target': 'Migration Target',
    'know.quantum_safe': 'Quantum Safe',
    'know.deprecation': 'Deprecation',
    'know.vuln_desc': (count) => `Quantum vulnerability database with ${count} entries. Each algorithm includes quantum threat rating, estimated time to break, NIST recommended replacement, and CWE mapping.`,
    'know.vuln_sub': 'Click to expand for detailed threat assessment and migration recommendations.',
    'know.timeline_desc': 'Post-Quantum Cryptography timeline — from NIST standard publication to quantum computing threat realization.',

    // ─── Compliance ───
    'comp.empty_title': 'Quantum Security Compliance Audit',
    'comp.empty_desc': 'Comprehensive assessment of codebase compliance with NIST IR 8547, CNSA 2.0, NCSC, EU PQC frameworks. Generates CBOM and SARIF reports.',
    'comp.empty_sub': 'Includes quantum readiness score, radar chart, security recommendations, and compliance framework mapping.',
    'comp.generate': 'Generate Compliance Report',
    'comp.demo_compliance': 'Run Demo Compliance',
    'comp.scan_first': 'Scan Code First',
    'comp.load_failed': 'Failed to load compliance data',
    'comp.loading': 'Generating compliance report...',
    'comp.loading_sub': 'Assessing quantum readiness, generating CBOM/SARIF, mapping compliance frameworks...',
    'comp.algorithm_safety': 'Algorithm Safety',
    'comp.key_strength': 'Key Strength',
    'comp.crypto_agility': 'Crypto Agility',
    'comp.compliance_readiness': 'Compliance Ready',
    'comp.exposure_risk': 'Exposure Risk',

    // ─── CI/CD ───
    'cicd.title': 'CI/CD Integration',
    'cicd.subtitle': 'Integrate QuantumShield quantum security scanning into your CI/CD pipeline. Auto-scan every commit and PR, generate SARIF/CBOM reports.',
  },
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('qs-lang');
      if (saved) return saved;
    } catch {}
    return 'zh';
  });

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('qs-lang', next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback((key, ...args) => {
    const val = translations[lang]?.[key] || translations.en[key] || key;
    if (typeof val === 'function') return val(...args);
    return val;
  }, [lang]);

  const value = useMemo(() => ({ lang, t, toggleLang }), [lang, t, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default I18nContext;
