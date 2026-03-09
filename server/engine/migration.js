/**
 * QuantumShield — 迁移引擎
 * 三种策略：Pure PQC / Hybrid（推荐）/ Crypto-Agility
 * 按语言×算法提供完整代码转换方案 + 回滚脚本 + 自动化测试
 */

const { MigrationStrategy, QUANTUM_VULNERABILITY_DB } = require('./models');

// ================================================================
// 迁移模板库 — 每个模板提供三种策略的代码
// ================================================================

const TEMPLATES = {
  python: {
    RSA: {
      pure_pqc: {
        name: 'RSA → ML-KEM-768 (Pure PQC)',
        nist: 'FIPS 203',
        deps: ['liboqs-python'],
        install: 'pip install liboqs-python',
        before: `from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# RSA Key Generation (QUANTUM VULNERABLE)
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
public_key = private_key.public_key()

# Encrypt
ciphertext = public_key.encrypt(
    b"secret message",
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                  algorithm=hashes.SHA256(), label=None)
)`,
        after: `import oqs
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

# ====== ML-KEM-768 (NIST FIPS 203) — Quantum-Safe KEM ======
kem = oqs.KeyEncapsulation("ML-KEM-768")

# Generate key pair
public_key = kem.generate_keypair()
secret_key = kem.export_secret_key()

# Encapsulate: produces ciphertext + shared secret
ciphertext, shared_secret = kem.encap_secret(public_key)

# Use shared_secret with AES-256-GCM for symmetric encryption
key = shared_secret[:32]
cipher = AES.new(key, AES.MODE_GCM)
ct, tag = cipher.encrypt_and_digest(b"secret message")
# Package: (ciphertext, cipher.nonce, ct, tag)`,
      },
      hybrid: {
        name: 'RSA + ML-KEM-768 Hybrid (推荐)',
        nist: 'FIPS 203 + RFC 9180',
        deps: ['liboqs-python', 'cryptography'],
        install: 'pip install liboqs-python cryptography',
        before: `# (Same RSA code as above)`,
        after: `import oqs
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from Crypto.Cipher import AES
import hashlib

# ====== Hybrid Mode: RSA-2048 + ML-KEM-768 ======
# 双重保护：即使其中一种被破解，另一种仍然安全

# --- Classical RSA layer ---
rsa_private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
rsa_public = rsa_private.public_key()

# --- PQC ML-KEM layer ---
kem = oqs.KeyEncapsulation("ML-KEM-768")
pqc_public = kem.generate_keypair()

# --- Encapsulate (sender) ---
# RSA: encrypt a random shared secret
rsa_secret = get_random_bytes(32)
rsa_ct = rsa_public.encrypt(rsa_secret,
    padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                  algorithm=hashes.SHA256(), label=None))

# PQC: KEM encapsulation
pqc_ct, pqc_secret = kem.encap_secret(pqc_public)

# Combine both secrets: SHA-256(rsa_secret || pqc_secret)
combined_secret = hashlib.sha256(rsa_secret + pqc_secret).digest()

# Use combined secret for AES-256-GCM
cipher = AES.new(combined_secret, AES.MODE_GCM)
ct, tag = cipher.encrypt_and_digest(b"secret message")`,
      },
      crypto_agile: {
        name: 'RSA → Crypto-Agile Abstraction',
        nist: 'Crypto Agility Framework',
        deps: [],
        install: '# No additional deps for abstraction layer',
        before: `# (Same RSA code as above)`,
        after: `from abc import ABC, abstractmethod
from enum import Enum

# ====== Crypto-Agility: Algorithm-Agnostic Encryption ======
# 可配置、可热切换的密码学抽象层

class KEMAlgorithm(Enum):
    RSA_2048 = "rsa-2048"       # Legacy (to be deprecated)
    ML_KEM_768 = "ml-kem-768"   # Post-Quantum (FIPS 203)
    HYBRID = "hybrid"           # RSA + ML-KEM

class CryptoProvider(ABC):
    @abstractmethod
    def generate_keypair(self): ...
    @abstractmethod
    def encapsulate(self, public_key): ...
    @abstractmethod
    def decapsulate(self, ciphertext, secret_key): ...

class CryptoFactory:
    _providers = {}

    @classmethod
    def register(cls, algo: KEMAlgorithm, provider_cls):
        cls._providers[algo] = provider_cls

    @classmethod
    def get_provider(cls, algo: KEMAlgorithm = None) -> CryptoProvider:
        algo = algo or KEMAlgorithm(os.getenv("CRYPTO_KEM", "ml-kem-768"))
        return cls._providers[algo]()

# Usage: hot-swappable, config-driven
provider = CryptoFactory.get_provider()
pk, sk = provider.generate_keypair()
ct, ss = provider.encapsulate(pk)`,
      },
    },
    ECDSA: {
      pure_pqc: {
        name: 'ECDSA → ML-DSA-65 (Pure PQC)',
        nist: 'FIPS 204',
        deps: ['liboqs-python'],
        install: 'pip install liboqs-python',
        before: `from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes

private_key = ec.generate_private_key(ec.SECP256R1())
signature = private_key.sign(b"message", ec.ECDSA(hashes.SHA256()))
public_key = private_key.public_key()
public_key.verify(signature, b"message", ec.ECDSA(hashes.SHA256()))`,
        after: `import oqs

# ====== ML-DSA-65 (NIST FIPS 204) — Quantum-Safe Signature ======
signer = oqs.Signature("ML-DSA-65")
public_key = signer.generate_keypair()

message = b"message"
signature = signer.sign(message)

verifier = oqs.Signature("ML-DSA-65")
is_valid = verifier.verify(message, signature, public_key)
assert is_valid, "Signature verification failed!"`,
      },
      hybrid: {
        name: 'ECDSA + ML-DSA-65 Hybrid Signature',
        nist: 'FIPS 204 + FIPS 186-5',
        deps: ['liboqs-python', 'cryptography'],
        install: 'pip install liboqs-python cryptography',
        before: `# (Same ECDSA code as above)`,
        after: `import oqs
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes

# ====== Hybrid Signature: ECDSA P-256 + ML-DSA-65 ======
# Classical
ec_private = ec.generate_private_key(ec.SECP256R1())
ec_sig = ec_private.sign(b"message", ec.ECDSA(hashes.SHA256()))

# Post-Quantum
pqc_signer = oqs.Signature("ML-DSA-65")
pqc_pk = pqc_signer.generate_keypair()
pqc_sig = pqc_signer.sign(b"message")

# Combined signature = (ec_sig, pqc_sig)
hybrid_sig = {"classical": ec_sig, "pqc": pqc_sig, "pqc_pk": pqc_pk}
# Verification requires BOTH to pass`,
      },
    },
    MD5: {
      pure_pqc: {
        name: 'MD5 → SHA-3-256',
        nist: 'FIPS 202',
        deps: [],
        install: '# hashlib is built-in',
        before: `import hashlib\ndigest = hashlib.md5(b"data").hexdigest()`,
        after: `import hashlib\n# SHA-3-256: quantum-resistant (NIST FIPS 202)\ndigest = hashlib.sha3_256(b"data").hexdigest()`,
      },
    },
    'SHA-1': {
      pure_pqc: {
        name: 'SHA-1 → SHA-3-256',
        nist: 'FIPS 202',
        deps: [],
        install: '# hashlib is built-in',
        before: `import hashlib\ndigest = hashlib.sha1(b"data").hexdigest()`,
        after: `import hashlib\n# SHA-3-256: quantum-resistant (NIST FIPS 202)\ndigest = hashlib.sha3_256(b"data").hexdigest()`,
      },
    },
    DES: {
      pure_pqc: {
        name: 'DES → AES-256-GCM',
        nist: 'FIPS 197 + SP 800-38D',
        deps: ['pycryptodome'],
        install: 'pip install pycryptodome',
        before: `from Crypto.Cipher import DES\nkey = b'8bytesk!'\ncipher = DES.new(key, DES.MODE_ECB)\nct = cipher.encrypt(b'testtest')`,
        after: `from Crypto.Cipher import AES\nfrom Crypto.Random import get_random_bytes\n\n# AES-256-GCM: quantum-resistant symmetric encryption\nkey = get_random_bytes(32)\ncipher = AES.new(key, AES.MODE_GCM)\nct, tag = cipher.encrypt_and_digest(b'plaintext')`,
      },
    },
  },

  javascript: {
    RSA: {
      pure_pqc: {
        name: 'RSA → ML-KEM-768 (crystals-kyber)',
        nist: 'FIPS 203',
        deps: ['crystals-kyber'],
        install: 'npm install crystals-kyber',
        before: `const crypto = require('crypto');\nconst { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {\n  modulusLength: 2048,\n  publicKeyEncoding: { type: 'spki', format: 'pem' },\n  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },\n});`,
        after: `const { KyberKEM768 } = require('crystals-kyber');\n\n// ML-KEM-768 (FIPS 203) — Quantum-Safe\nconst { publicKey, secretKey } = KyberKEM768.keypair();\nconst { ciphertext, sharedSecret } = KyberKEM768.encapsulate(publicKey);\nconst recovered = KyberKEM768.decapsulate(ciphertext, secretKey);`,
      },
      hybrid: {
        name: 'RSA + ML-KEM-768 Hybrid',
        nist: 'FIPS 203',
        deps: ['crystals-kyber'],
        install: 'npm install crystals-kyber',
        before: `// Same RSA code`,
        after: `const crypto = require('crypto');\nconst { KyberKEM768 } = require('crystals-kyber');\n\n// Hybrid: RSA + ML-KEM\nconst rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });\nconst pqc = KyberKEM768.keypair();\n\n// Combine both shared secrets\nconst { ciphertext: pqcCt, sharedSecret: pqcSs } = KyberKEM768.encapsulate(pqc.publicKey);\nconst rsaSs = crypto.randomBytes(32);\nconst rsaCt = crypto.publicEncrypt(rsa.publicKey, rsaSs);\nconst combined = crypto.createHash('sha256').update(Buffer.concat([rsaSs, pqcSs])).digest();`,
      },
    },
    MD5: {
      pure_pqc: {
        name: 'MD5 → SHA-3-256',
        nist: 'FIPS 202',
        deps: [],
        install: '# Node.js built-in',
        before: `const crypto = require('crypto');\nconst hash = crypto.createHash('md5').update('data').digest('hex');`,
        after: `const crypto = require('crypto');\nconst hash = crypto.createHash('sha3-256').update('data').digest('hex');`,
      },
    },
  },

  java: {
    RSA: {
      pure_pqc: {
        name: 'RSA → ML-KEM-768 via Bouncy Castle',
        nist: 'FIPS 203',
        deps: ['org.bouncycastle:bcprov-jdk18on:1.78'],
        install: '<dependency>\n  <groupId>org.bouncycastle</groupId>\n  <artifactId>bcprov-jdk18on</artifactId>\n  <version>1.78</version>\n</dependency>',
        before: `KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");\nkpg.initialize(2048);\nKeyPair kp = kpg.generateKeyPair();`,
        after: `import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;\nimport org.bouncycastle.pqc.jcajce.spec.KyberParameterSpec;\n\nSecurity.addProvider(new BouncyCastlePQCProvider());\nKeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BCPQC");\nkpg.initialize(KyberParameterSpec.kyber768);\nKeyPair kp = kpg.generateKeyPair();`,
      },
    },
    ECDSA: {
      pure_pqc: {
        name: 'ECDSA → ML-DSA-65 via Bouncy Castle',
        nist: 'FIPS 204',
        deps: ['org.bouncycastle:bcprov-jdk18on:1.78'],
        install: '<!-- Same Bouncy Castle dependency -->',
        before: `KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");\nkpg.initialize(new ECGenParameterSpec("secp256r1"));`,
        after: `Security.addProvider(new BouncyCastlePQCProvider());\nKeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-DSA", "BCPQC");\nkpg.initialize(DilithiumParameterSpec.dilithium3);`,
      },
    },
    MD5: {
      pure_pqc: {
        name: 'MD5 → SHA3-256',
        nist: 'FIPS 202',
        deps: [],
        install: '# Java 9+ built-in',
        before: `MessageDigest md = MessageDigest.getInstance("MD5");`,
        after: `MessageDigest md = MessageDigest.getInstance("SHA3-256");`,
      },
    },
  },

  go: {
    RSA: {
      pure_pqc: {
        name: 'RSA → ML-KEM-768 via circl',
        nist: 'FIPS 203',
        deps: ['github.com/cloudflare/circl'],
        install: 'go get github.com/cloudflare/circl',
        before: `privateKey, _ := rsa.GenerateKey(rand.Reader, 2048)`,
        after: `import "github.com/cloudflare/circl/kem/mlkem/mlkem768"\n\npk, sk, _ := mlkem768.GenerateKeyPair(rand.Reader)\nct, ss, _ := mlkem768.Encapsulate(rand.Reader, pk)\nrecovered, _ := mlkem768.Decapsulate(sk, ct)`,
      },
    },
    ECDSA: {
      pure_pqc: {
        name: 'ECDSA → ML-DSA-65 via circl',
        nist: 'FIPS 204',
        deps: ['github.com/cloudflare/circl'],
        install: 'go get github.com/cloudflare/circl',
        before: `privateKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)`,
        after: `import "github.com/cloudflare/circl/sign/mldsa/mldsa65"\n\npk, sk, _ := mldsa65.GenerateKey(rand.Reader)\nsig := mldsa65.Sign(sk, message, nil)\nvalid := mldsa65.Verify(pk, message, nil, sig)`,
      },
    },
  },

  c: {
    RSA: {
      pure_pqc: {
        name: 'RSA → ML-KEM-768 via liboqs',
        nist: 'FIPS 203',
        deps: ['liboqs'],
        install: 'sudo apt install liboqs-dev',
        before: `RSA *rsa = RSA_generate_key(2048, RSA_F4, NULL, NULL);`,
        after: `#include <oqs/oqs.h>\n\nOQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_ml_kem_768);\nuint8_t *pk = malloc(kem->length_public_key);\nuint8_t *sk = malloc(kem->length_secret_key);\nOQS_KEM_keypair(kem, pk, sk);\n\nuint8_t *ct = malloc(kem->length_ciphertext);\nuint8_t *ss = malloc(kem->length_shared_secret);\nOQS_KEM_encaps(kem, ct, ss, pk);\nOQS_KEM_free(kem);`,
      },
    },
  },
};

// 算法族映射到模板 key
const ALGO_TEMPLATE_KEY = {
  'RSA-1024': 'RSA', 'RSA-2048': 'RSA', 'RSA-3072': 'RSA', 'RSA-4096': 'RSA',
  'ECDSA-P256': 'ECDSA', 'ECDSA-P384': 'ECDSA',
  'ECDH': 'RSA', 'DH-2048': 'RSA', 'ElGamal': 'RSA', 'X25519': 'RSA',
  'DSA': 'ECDSA', 'Ed25519': 'ECDSA',
  'DES': 'DES', '3DES': 'DES', 'RC4': 'DES', 'Blowfish': 'DES',
  'MD5': 'MD5', 'SHA-1': 'SHA-1',
  'AES-128': 'DES',
};

class MigrationEngine {

  getMigrationPlan(finding) {
    const lang = finding.tags?.[0] || 'python';
    const templateKey = ALGO_TEMPLATE_KEY[finding.algorithm] || finding.algorithm;
    const langTemplates = TEMPLATES[lang] || TEMPLATES.python;
    const template = langTemplates[templateKey];

    if (!template) {
      return this._genericPlan(finding);
    }

    const strategies = {};
    for (const [key, val] of Object.entries(template)) {
      strategies[key] = {
        name: val.name,
        nist_standard: val.nist,
        dependencies: val.deps,
        install_command: val.install,
        before_code: val.before,
        after_code: val.after,
      };
    }

    const effort = this._estimateEffort(finding);

    return {
      finding,
      recommended_strategy: finding.migration_strategy || MigrationStrategy.HYBRID,
      strategies,
      effort,
      rollback_plan: this._generateRollback(finding, template),
      test_template: this._generateTest(finding, template),
    };
  }

  generateFullReport(scanResult) {
    const plans = scanResult.findings
      .filter(f => f.quantum_risk !== 'SAFE')
      .map(f => this.getMigrationPlan(f));

    const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
    plans.sort((a, b) =>
      (priorityOrder[this._migPriority(a.finding)] || 9) -
      (priorityOrder[this._migPriority(b.finding)] || 9)
    );

    const allDeps = new Set();
    const installCmds = new Set();
    for (const p of plans) {
      const strats = Object.values(p.strategies);
      for (const s of strats) {
        s.dependencies?.forEach(d => allDeps.add(d));
        if (s.install_command && !s.install_command.startsWith('#')) installCmds.add(s.install_command);
      }
    }

    const byAlgorithm = {};
    for (const p of plans) {
      const a = p.finding.algorithm;
      if (!byAlgorithm[a]) byAlgorithm[a] = [];
      byAlgorithm[a].push(p);
    }

    const effortMap = { low: 0.5, medium: 2, high: 5 };
    const totalDays = plans.reduce((s, p) => s + (effortMap[p.effort] || 2), 0);

    return {
      total_migrations: plans.length,
      plans,
      by_algorithm: byAlgorithm,
      dependencies: [...allDeps],
      install_commands: [...installCmds],
      estimated_effort: {
        total_days: Math.ceil(totalDays),
        breakdown: {
          immediate: plans.filter(p => this._migPriority(p.finding) === 'immediate').length,
          high: plans.filter(p => this._migPriority(p.finding) === 'high').length,
          medium: plans.filter(p => this._migPriority(p.finding) === 'medium').length,
          low: plans.filter(p => this._migPriority(p.finding) === 'low').length,
        },
      },
      phases: this._buildPhases(plans),
      compliance_mapping: this._buildComplianceMapping(scanResult),
      timestamp: new Date().toISOString(),
    };
  }

  _buildPhases(plans) {
    return [
      {
        phase: 1, name: '紧急修复', name_en: 'Critical Remediation',
        description: '修复已被经典计算破解的算法（MD5, SHA-1, DES, RC4, 3DES）',
        timeline: '1-2 周',
        items: plans.filter(p => ['MD5', 'SHA-1', 'DES', '3DES', 'RC4', 'Blowfish'].includes(p.finding.algorithm)),
      },
      {
        phase: 2, name: '量子关键迁移', name_en: 'Quantum-Critical Migration',
        description: '迁移非对称加密到 PQC 标准（RSA → ML-KEM, ECDSA → ML-DSA）',
        timeline: '3-6 周',
        items: plans.filter(p =>
          ['RSA-1024', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDH', 'DSA', 'DH-2048', 'ElGamal'].includes(p.finding.algorithm)),
      },
      {
        phase: 3, name: '混合模式过渡', name_en: 'Hybrid Transition',
        description: '为现代算法部署混合模式（Ed25519 + ML-DSA, X25519 + ML-KEM）',
        timeline: '2-3 周',
        items: plans.filter(p => ['Ed25519', 'X25519', 'AES-128'].includes(p.finding.algorithm)),
      },
      {
        phase: 4, name: '验证与合规', name_en: 'Validation & Compliance',
        description: '回归测试、安全审计、CBOM 生成、合规报告',
        timeline: '1-2 周',
        items: [],
      },
    ];
  }

  _buildComplianceMapping(scanResult) {
    const critCount = scanResult.summary.by_risk.CRITICAL || 0;
    const highCount = scanResult.summary.by_risk.HIGH || 0;
    return {
      nist_ir_8547: { status: critCount > 0 ? 'NON_COMPLIANT' : 'PARTIALLY_COMPLIANT', details: 'NIST IR 8547: Migration to PQC Standards' },
      cnsa_2_0: { status: critCount + highCount > 0 ? 'NON_COMPLIANT' : 'COMPLIANT', deadline: '2031', details: 'NSA CNSA 2.0 Suite' },
      eu_pqc_roadmap: { status: critCount > 0 ? 'AT_RISK' : 'ON_TRACK', details: 'EU Post-Quantum Cryptography Roadmap' },
      nist_sp_800_131a: { status: critCount > 0 ? 'NON_COMPLIANT' : 'COMPLIANT', details: 'NIST SP 800-131A Rev 2' },
    };
  }

  _genericPlan(finding) {
    const vuln = QUANTUM_VULNERABILITY_DB[finding.algorithm] || {};
    return {
      finding,
      recommended_strategy: MigrationStrategy.HYBRID,
      strategies: {
        pure_pqc: {
          name: `${finding.algorithm} → ${vuln.migration_target || 'PQC Standard'}`,
          nist_standard: vuln.nist_standard || '',
          dependencies: [],
          install_command: '# Consult NIST PQC guidelines',
          before_code: finding.code_snippet,
          after_code: `// TODO: Migrate ${finding.algorithm} to ${vuln.migration_target || 'post-quantum standard'}`,
        },
      },
      effort: 'high',
      rollback_plan: '# Revert to previous version via version control',
      test_template: '# Add appropriate tests for migrated code',
    };
  }

  _estimateEffort(finding) {
    const complex = ['RSA-1024', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384', 'ECDH', 'DH-2048', 'DSA'];
    if (complex.includes(finding.algorithm)) return 'high';
    if (['Ed25519', 'X25519', '3DES', 'Blowfish', 'ElGamal'].includes(finding.algorithm)) return 'medium';
    return 'low';
  }

  _migPriority(finding) {
    if (finding.quantum_risk === 'CRITICAL') return 'immediate';
    if (finding.quantum_risk === 'HIGH') return 'high';
    if (finding.quantum_risk === 'MEDIUM') return 'medium';
    return 'low';
  }

  _generateRollback(finding, template) {
    return `# Rollback Plan for ${finding.algorithm} migration
# 1. Revert code changes via git:
#    git revert <migration-commit-hash>
# 2. Remove new dependencies:
#    ${template.pure_pqc?.install ? template.pure_pqc.install.replace(/install/, 'uninstall') : ''}
# 3. Re-run test suite to verify rollback
# 4. Update CBOM inventory`;
  }

  _generateTest(finding, template) {
    const lang = finding.tags?.[0] || 'python';
    if (lang === 'python') {
      return `import pytest

def test_pqc_migration_${finding.algorithm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}():
    """Verify PQC migration for ${finding.algorithm}"""
    import oqs

    # Test key generation
    kem = oqs.KeyEncapsulation("ML-KEM-768")
    pk = kem.generate_keypair()
    assert pk is not None

    # Test encapsulation / decapsulation round-trip
    ct, ss_enc = kem.encap_secret(pk)
    ss_dec = kem.decap_secret(ct)
    assert ss_enc == ss_dec, "Shared secrets must match"`;
    }
    return `// Test migration for ${finding.algorithm}\n// Verify key generation, encapsulation, and decapsulation round-trip`;
  }
}

module.exports = { MigrationEngine, TEMPLATES };
