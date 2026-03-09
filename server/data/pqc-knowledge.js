/**
 * QuantumShield — PQC 算法知识库 + 量子计算时间线
 */

const PQC_ALGORITHMS = [
  {
    id: 'ml-kem', name: 'ML-KEM (CRYSTALS-Kyber)', fullName: 'Module-Lattice-Based Key-Encapsulation Mechanism',
    nist: 'FIPS 203', category: 'Key Encapsulation (KEM)', status: 'NIST Standard (Aug 2024)',
    hardness: 'Module-LWE', security: 'IND-CCA2',
    description: 'NIST 首选后量子密钥封装标准。基于格密码学 Module-LWE 困难问题，替代 RSA 加密和 ECDH/DH/X25519 密钥交换。',
    variants: [
      { name: 'ML-KEM-512', level: 'Level 1 (~AES-128)', pk: '800 B', sk: '1632 B', ct: '768 B', ss: '32 B', keygen: '0.05 ms', encaps: '0.06 ms' },
      { name: 'ML-KEM-768', level: 'Level 3 (~AES-192)', pk: '1184 B', sk: '2400 B', ct: '1088 B', ss: '32 B', keygen: '0.08 ms', encaps: '0.09 ms' },
      { name: 'ML-KEM-1024', level: 'Level 5 (~AES-256)', pk: '1568 B', sk: '3168 B', ct: '1568 B', ss: '32 B', keygen: '0.11 ms', encaps: '0.12 ms' },
    ],
    replaces: ['RSA encryption', 'ECDH', 'DH', 'ElGamal', 'X25519'],
    pros: ['极快运算速度', '小密钥/密文尺寸（格密码最优）', '强安全证明 (IND-CCA2)', 'NIST 标准化', '已有多语言成熟实现'],
    cons: ['密钥比经典方案大 (~1KB)', '是新标准，需要充分测试', '密钥大小影响 TLS 握手'],
    libs: { python: 'liboqs-python', javascript: 'crystals-kyber', java: 'Bouncy Castle 1.78+', go: 'cloudflare/circl', c: 'liboqs', rust: 'pqcrypto' },
  },
  {
    id: 'ml-dsa', name: 'ML-DSA (CRYSTALS-Dilithium)', fullName: 'Module-Lattice-Based Digital Signature Algorithm',
    nist: 'FIPS 204', category: 'Digital Signature', status: 'NIST Standard (Aug 2024)',
    hardness: 'Module-LWE + SelfTargetMSIS', security: 'EUF-CMA',
    description: 'NIST 主要后量子数字签名标准。基于格密码学，替代 RSA 签名、ECDSA、EdDSA、DSA。',
    variants: [
      { name: 'ML-DSA-44', level: 'Level 2', pk: '1312 B', sk: '2560 B', sig: '2420 B', sign: '0.2 ms', verify: '0.1 ms' },
      { name: 'ML-DSA-65', level: 'Level 3', pk: '1952 B', sk: '4032 B', sig: '3309 B', sign: '0.3 ms', verify: '0.15 ms' },
      { name: 'ML-DSA-87', level: 'Level 5', pk: '2592 B', sk: '4896 B', sig: '4627 B', sign: '0.5 ms', verify: '0.2 ms' },
    ],
    replaces: ['RSA signatures', 'ECDSA (P-256/P-384)', 'EdDSA (Ed25519)', 'DSA'],
    pros: ['高效签名与验证', '合理的签名尺寸', '强安全基础', 'NIST 标准化', '适合代码签名/TLS/证书'],
    cons: ['签名比 Ed25519 大 (~50x)', '公钥比经典方案大', '需要更多带宽'],
    libs: { python: 'liboqs-python', javascript: 'crystals-dilithium', java: 'Bouncy Castle 1.78+', go: 'cloudflare/circl', c: 'liboqs', rust: 'pqcrypto' },
  },
  {
    id: 'slh-dsa', name: 'SLH-DSA (SPHINCS+)', fullName: 'Stateless Hash-Based Digital Signature Algorithm',
    nist: 'FIPS 205', category: 'Digital Signature (Conservative)', status: 'NIST Standard (Aug 2024)',
    hardness: 'Hash function security only', security: 'EUF-CMA',
    description: '基于哈希的无状态签名方案。安全性仅依赖哈希函数，是最保守的 PQC 方案，适合对格密码学持保守态度的场景。',
    variants: [
      { name: 'SLH-DSA-128s', level: 'Level 1 (small)', pk: '32 B', sk: '64 B', sig: '7856 B' },
      { name: 'SLH-DSA-128f', level: 'Level 1 (fast)', pk: '32 B', sk: '64 B', sig: '17088 B' },
      { name: 'SLH-DSA-256s', level: 'Level 5 (small)', pk: '64 B', sk: '128 B', sig: '29792 B' },
    ],
    replaces: ['RSA signatures (conservative)'],
    pros: ['最小信任假设（仅哈希）', '极小密钥尺寸 (32-64 B)', '无状态（无 nonce 重用风险）', '抗所有已知量子攻击'],
    cons: ['签名尺寸大 (8-30 KB)', '签名速度慢', '不适合高频签名场景'],
    libs: { python: 'liboqs-python', java: 'Bouncy Castle', c: 'liboqs', go: 'cloudflare/circl' },
  },
  {
    id: 'sha3', name: 'SHA-3 (Keccak)', fullName: 'Secure Hash Algorithm 3',
    nist: 'FIPS 202', category: 'Hash Function', status: 'Quantum-Safe Standard',
    hardness: 'Sponge construction', security: 'Collision/preimage resistance',
    description: 'SHA-3 基于 Keccak 海绵结构。Grover 算法仅将安全性减半，SHA-3-256 仍有 128 位量子安全性。替代 MD5/SHA-1。',
    variants: [
      { name: 'SHA-3-256', level: '128-bit quantum', output: '256 bits' },
      { name: 'SHA-3-384', level: '192-bit quantum', output: '384 bits' },
      { name: 'SHA-3-512', level: '256-bit quantum', output: '512 bits' },
      { name: 'SHAKE128', level: '128-bit quantum', output: 'Variable' },
      { name: 'SHAKE256', level: '256-bit quantum', output: 'Variable' },
    ],
    replaces: ['MD5', 'SHA-1'],
    pros: ['广泛标准化', '量子安全', '支持可变输出 (SHAKE)', '与 SHA-2 无共同设计'],
    cons: ['部分平台无硬件加速', '比 SHA-2 稍慢'],
    libs: { python: 'hashlib (stdlib)', javascript: 'crypto (built-in)', java: 'Java 9+', go: 'golang.org/x/crypto/sha3', c: 'OpenSSL 1.1+' },
  },
  {
    id: 'aes256', name: 'AES-256', fullName: 'Advanced Encryption Standard (256-bit)',
    nist: 'FIPS 197', category: 'Symmetric Encryption', status: 'Quantum-Safe',
    hardness: 'Block cipher', security: '128-bit quantum security',
    description: 'AES-256 在量子下保持 128 位安全性（Grover 将 256→128）。推荐 GCM 认证加密模式。替代 DES/3DES/RC4/Blowfish/AES-128。',
    variants: [
      { name: 'AES-256-GCM', level: '128-bit quantum', description: '认证加密（推荐）' },
      { name: 'AES-256-CBC', level: '128-bit quantum', description: '块密码模式' },
    ],
    replaces: ['DES', '3DES', 'RC4', 'Blowfish', 'AES-128'],
    pros: ['硬件加速广泛', '量子安全', '高性能', '已被充分分析'],
    cons: ['GCM nonce 管理需注意', '密钥比 AES-128 大'],
    libs: { python: 'pycryptodome/cryptography', javascript: 'crypto (built-in)', java: 'javax.crypto', go: 'crypto/aes', c: 'OpenSSL/libsodium' },
  },
];

const TIMELINE = [
  { year: 2019, event: 'Google Sycamore: 53-qubit 量子优越性演示', type: 'milestone' },
  { year: 2022, event: 'NIST 选定首批 PQC 候选算法 (Kyber, Dilithium, SPHINCS+, FALCON)', type: 'standard' },
  { year: 2023, event: 'IBM Condor: 1,121 量子比特处理器', type: 'milestone' },
  { year: 2024, event: 'NIST 正式发布 FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)', type: 'standard' },
  { year: 2025, event: 'Microsoft Majorana 1 拓扑量子芯片 / Google Willow 量子纠错突破', type: 'milestone' },
  { year: 2025, event: 'Chrome/Firefox 开始支持 ML-KEM 混合密钥交换 (X25519+ML-KEM-768)', type: 'standard' },
  { year: 2026, event: '主流云服务商开始提供 PQC TLS 证书', type: 'prediction' },
  { year: 2027, event: 'NIST 发布 HQC (备选 KEM 标准)', type: 'prediction' },
  { year: 2028, event: '预计达到 1,000+ 逻辑量子比特', type: 'prediction' },
  { year: 2029, event: 'NIST SP 800-131A 全面禁止非 PQC 算法', type: 'prediction' },
  { year: 2030, event: 'CRQC（密码学相关量子计算机）可能出现', type: 'deadline' },
  { year: 2031, event: 'NSA CNSA 2.0: 所有国家安全系统必须完成 PQC 迁移', type: 'deadline' },
  { year: 2033, event: '预计 RSA-2048 可在数小时内被量子计算机因式分解', type: 'deadline' },
  { year: 2035, event: '所有经典非对称加密预计全面失效', type: 'deadline' },
];

module.exports = { PQC_ALGORITHMS, TIMELINE };
