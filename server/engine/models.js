/**
 * QuantumShield — 核心数据模型
 * 对标文档中 Finding dataclass 的完整实现
 */

// ============ 枚举定义 ============

const QuantumRisk = {
  CRITICAL: 'CRITICAL',   // RSA, ECDSA/ECDH, DH/DSA
  HIGH: 'HIGH',           // Ed25519, X25519
  MEDIUM: 'MEDIUM',       // AES-128, SHA-256 for HMAC
  LOW: 'LOW',             // Minor issues
  SAFE: 'SAFE',           // AES-256, SHA-384+, ChaCha20-Poly1305
};

const UsageType = {
  KEY_GENERATION: 'key_generation',
  ENCRYPTION: 'encryption',
  DECRYPTION: 'decryption',
  SIGNING: 'signing',
  VERIFICATION: 'verification',
  KEY_EXCHANGE: 'key_exchange',
  HASHING: 'hashing',
  CERTIFICATE: 'certificate',
  TLS_CONFIG: 'tls_config',
  DEPENDENCY: 'dependency',
};

const MigrationStrategy = {
  PURE_PQC: 'pure_pqc',         // 纯后量子迁移
  HYBRID: 'hybrid',             // 混合迁移（推荐）
  CRYPTO_AGILE: 'crypto_agile', // 密码学敏捷化
  UPGRADE_PARAMS: 'upgrade_params', // 升级参数（如 AES-128→256）
};

const AlgorithmFamily = {
  RSA: 'RSA',
  ECC: 'ECC',
  DH: 'DH',
  DSA: 'DSA',
  SYMMETRIC: 'SYMMETRIC',
  HASH: 'HASH',
  STREAM_CIPHER: 'STREAM_CIPHER',
};

const ScanMode = {
  AST: 'ast',
  REGEX: 'regex',
  DEPENDENCY: 'dependency',
  CERTIFICATE: 'certificate',
  CONFIG: 'config',
};

// ============ Finding 核心模型 ============

function createFinding(overrides = {}) {
  return {
    // 位置信息
    file_path: '',
    line_number: 0,
    column_number: 0,
    end_line: 0,

    // 算法信息
    algorithm: '',
    algorithm_family: '',
    key_size: null,

    // 分析结果
    usage_type: UsageType.KEY_GENERATION,
    quantum_risk: QuantumRisk.CRITICAL,
    confidence: 0.9,
    scan_mode: ScanMode.REGEX,

    // 上下文
    library: '',
    library_version: '',
    code_snippet: '',
    context_before: '',
    context_after: '',
    is_external_facing: false,
    is_in_test: false,

    // 迁移建议
    migration_target: '',
    migration_strategy: MigrationStrategy.HYBRID,
    nist_standard: '',
    nist_deprecation_year: 2030,

    // 元数据
    description: '',
    description_zh: '',
    tags: [],
    cwe_id: '',

    ...overrides,
  };
}

// ============ ScanResult 结果模型 ============

function createScanResult(overrides = {}) {
  return {
    id: '',
    timestamp: new Date().toISOString(),
    scan_duration_ms: 0,

    // 输入信息
    project_name: '',
    total_files: 0,
    total_lines: 0,
    languages_detected: [],
    files_scanned: [],

    // 核心结果
    findings: [],
    quantum_readiness_score: 100,

    // 统计摘要
    summary: {
      total_findings: 0,
      by_risk: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, SAFE: 0 },
      by_category: {},
      by_algorithm: {},
      by_language: {},
      by_usage_type: {},
      by_file: {},
    },

    // 依赖分析
    dependency_findings: [],
    certificate_findings: [],

    // CBOM
    cbom: null,

    ...overrides,
  };
}

// ============ 量子脆弱性知识库 ============

const QUANTUM_VULNERABILITY_DB = {
  // ===== CRITICAL: Shor's algorithm breaks in polynomial time =====
  'RSA-1024': {
    family: AlgorithmFamily.RSA, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm factors in O((log N)³)",
    time_to_break: 'Already insecure classically',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2024,
    description_zh: 'RSA-1024 即使在经典计算下也已不安全',
    cwe_id: 'CWE-327',
  },
  'RSA-2048': {
    family: AlgorithmFamily.RSA, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm: ~4000 logical qubits needed",
    time_to_break: '2030-2035 with CRQC',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'RSA-2048 在量子计算机面前将不堪一击',
    cwe_id: 'CWE-327',
  },
  'RSA-3072': {
    family: AlgorithmFamily.RSA, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm",
    time_to_break: '2033-2038 with advanced CRQC',
    migration_target: 'ML-KEM-1024', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'RSA-3072 提供更多经典安全性但仍不抗量子',
    cwe_id: 'CWE-327',
  },
  'RSA-4096': {
    family: AlgorithmFamily.RSA, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm",
    time_to_break: '2035-2040 with advanced CRQC',
    migration_target: 'ML-KEM-1024', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'RSA-4096 不提供量子安全',
    cwe_id: 'CWE-327',
  },
  'ECDSA-P256': {
    family: AlgorithmFamily.ECC, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves ECDLP",
    time_to_break: 'Immediate with CRQC',
    migration_target: 'ML-DSA-65', nist_standard: 'FIPS 204',
    nist_deprecation_year: 2030,
    description_zh: 'ECDSA P-256 基于椭圆曲线离散对数，量子脆弱',
    cwe_id: 'CWE-327',
  },
  'ECDSA-P384': {
    family: AlgorithmFamily.ECC, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves ECDLP",
    time_to_break: 'Immediate with CRQC',
    migration_target: 'ML-DSA-87', nist_standard: 'FIPS 204',
    nist_deprecation_year: 2030,
    description_zh: 'ECDSA P-384 基于椭圆曲线，量子脆弱',
    cwe_id: 'CWE-327',
  },
  'ECDH': {
    family: AlgorithmFamily.ECC, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves ECDLP",
    time_to_break: 'Immediate with CRQC',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'ECDH 密钥交换基于椭圆曲线，量子脆弱',
    cwe_id: 'CWE-327',
  },
  'DSA': {
    family: AlgorithmFamily.DSA, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves DLP",
    time_to_break: 'Immediate with CRQC',
    migration_target: 'ML-DSA-65', nist_standard: 'FIPS 204',
    nist_deprecation_year: 2028,
    description_zh: 'DSA 基于离散对数问题，量子可破解',
    cwe_id: 'CWE-327',
  },
  'DH-2048': {
    family: AlgorithmFamily.DH, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves DLP",
    time_to_break: '2030-2035 with CRQC',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'Diffie-Hellman 2048 密钥交换量子脆弱',
    cwe_id: 'CWE-327',
  },
  'ElGamal': {
    family: AlgorithmFamily.DH, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Shor's algorithm solves DLP",
    time_to_break: 'Immediate with CRQC',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2030,
    description_zh: 'ElGamal 加密基于离散对数',
    cwe_id: 'CWE-327',
  },

  // ===== HIGH: Quantum-vulnerable but modern =====
  'Ed25519': {
    family: AlgorithmFamily.ECC, risk: QuantumRisk.HIGH,
    quantum_threat: "Shor's algorithm solves ECDLP",
    time_to_break: '2030-2035 with CRQC',
    migration_target: 'ML-DSA-65', nist_standard: 'FIPS 204',
    nist_deprecation_year: 2031,
    description_zh: 'Ed25519 是现代椭圆曲线签名但仍不抗量子',
    cwe_id: 'CWE-327',
  },
  'X25519': {
    family: AlgorithmFamily.ECC, risk: QuantumRisk.HIGH,
    quantum_threat: "Shor's algorithm solves ECDLP",
    time_to_break: '2030-2035 with CRQC',
    migration_target: 'ML-KEM-768', nist_standard: 'FIPS 203',
    nist_deprecation_year: 2031,
    description_zh: 'X25519 密钥交换量子脆弱',
    cwe_id: 'CWE-327',
  },

  // ===== MEDIUM: Grover's weakens but survivable with upgrades =====
  'AES-128': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.MEDIUM,
    quantum_threat: "Grover's reduces to 64-bit security",
    time_to_break: 'Post-quantum: equivalent to 64-bit classical',
    migration_target: 'AES-256', nist_standard: 'FIPS 197',
    nist_deprecation_year: 2031,
    description_zh: 'AES-128 在量子下安全性降至 64 位，需升级至 AES-256',
    cwe_id: 'CWE-326',
  },
  'SHA-256-HMAC': {
    family: AlgorithmFamily.HASH, risk: QuantumRisk.MEDIUM,
    quantum_threat: "Grover's reduces HMAC security margin",
    time_to_break: 'Still secure but reduced margin',
    migration_target: 'SHA-384 / SHA-3-256', nist_standard: 'FIPS 198-1',
    nist_deprecation_year: 2035,
    description_zh: 'SHA-256 用于 HMAC 时安全边际降低，建议升级',
    cwe_id: 'CWE-328',
  },

  // ===== CRITICAL (classically broken) =====
  'DES': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Grover's reduces to 28-bit + already broken classically",
    time_to_break: 'Already broken',
    migration_target: 'AES-256-GCM', nist_standard: 'FIPS 197',
    nist_deprecation_year: 2005,
    description_zh: 'DES 56位密钥已被暴力破解',
    cwe_id: 'CWE-327',
  },
  '3DES': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Grover's + Sweet32 birthday attack",
    time_to_break: 'Deprecated 2023',
    migration_target: 'AES-256-GCM', nist_standard: 'FIPS 197',
    nist_deprecation_year: 2023,
    description_zh: '3DES 已被 NIST 废弃',
    cwe_id: 'CWE-327',
  },
  'RC4': {
    family: AlgorithmFamily.STREAM_CIPHER, risk: QuantumRisk.CRITICAL,
    quantum_threat: 'Already broken classically',
    time_to_break: 'Already broken',
    migration_target: 'ChaCha20-Poly1305 / AES-256-GCM', nist_standard: 'RFC 8439',
    nist_deprecation_year: 2015,
    description_zh: 'RC4 存在多种经典攻击，已被全面禁用',
    cwe_id: 'CWE-327',
  },
  'Blowfish': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.HIGH,
    quantum_threat: "64-bit block birthday attack + Grover's",
    time_to_break: '64-bit block vulnerable to birthday attacks',
    migration_target: 'AES-256-GCM', nist_standard: 'FIPS 197',
    nist_deprecation_year: 2020,
    description_zh: 'Blowfish 64位分组大小存在生日攻击风险',
    cwe_id: 'CWE-327',
  },
  'MD5': {
    family: AlgorithmFamily.HASH, risk: QuantumRisk.CRITICAL,
    quantum_threat: "Collision attacks + Grover's speedup",
    time_to_break: 'Already broken for collision resistance',
    migration_target: 'SHA-3-256 / SHA-256', nist_standard: 'FIPS 202',
    nist_deprecation_year: 2010,
    description_zh: 'MD5 碰撞攻击已被实证',
    cwe_id: 'CWE-328',
  },
  'SHA-1': {
    family: AlgorithmFamily.HASH, risk: QuantumRisk.CRITICAL,
    quantum_threat: "SHAttered collision + Grover's speedup",
    time_to_break: 'Already broken (SHAttered 2017)',
    migration_target: 'SHA-3-256 / SHA-256', nist_standard: 'FIPS 202',
    nist_deprecation_year: 2013,
    description_zh: 'SHA-1 碰撞攻击已被 Google 实证',
    cwe_id: 'CWE-328',
  },

  // ===== SAFE: Quantum-resistant =====
  'AES-256': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.SAFE,
    quantum_threat: "Grover's reduces to 128-bit (still safe)",
    time_to_break: 'Quantum-resistant (128-bit equivalent)',
    migration_target: null, nist_standard: 'FIPS 197',
    description_zh: 'AES-256 在量子下仍有128位安全性',
  },
  'SHA-384': {
    family: AlgorithmFamily.HASH, risk: QuantumRisk.SAFE,
    quantum_threat: 'Quantum-resistant with large margin',
    time_to_break: 'Quantum-safe',
    migration_target: null, nist_standard: 'FIPS 180-4',
    description_zh: 'SHA-384 量子安全',
  },
  'SHA-512': {
    family: AlgorithmFamily.HASH, risk: QuantumRisk.SAFE,
    quantum_threat: 'Quantum-resistant',
    time_to_break: 'Quantum-safe',
    migration_target: null, nist_standard: 'FIPS 180-4',
    description_zh: 'SHA-512 量子安全',
  },
  'ChaCha20-Poly1305': {
    family: AlgorithmFamily.SYMMETRIC, risk: QuantumRisk.SAFE,
    quantum_threat: "Grover's reduces to 128-bit (still safe)",
    time_to_break: 'Quantum-resistant',
    migration_target: null, nist_standard: 'RFC 8439',
    description_zh: 'ChaCha20-Poly1305 (256-bit) 量子安全',
  },
};

module.exports = {
  QuantumRisk, UsageType, MigrationStrategy, AlgorithmFamily, ScanMode,
  QUANTUM_VULNERABILITY_DB, createFinding, createScanResult,
};
