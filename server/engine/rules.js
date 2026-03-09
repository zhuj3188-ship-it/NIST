/**
 * QuantumShield — 多语言扫描规则引擎
 * 支持 AST 级别（正则模拟）+ 依赖分析 + 证书扫描 + 配置文件
 */

const { QuantumRisk, UsageType, ScanMode, QUANTUM_VULNERABILITY_DB } = require('./models');

// ============================================================
// 扫描规则 — 按语言和算法分类，每条规则包含完整 Finding 元数据
// ============================================================

function R(pattern, algo, opts = {}) {
  return {
    pattern: new RegExp(pattern, opts.flags || 'g'),
    algorithm: algo,
    usage_type: opts.usage || UsageType.KEY_GENERATION,
    context: opts.context || '',
    scan_mode: opts.mode || ScanMode.REGEX,
    extractKeySize: opts.extractKeySize || false,
    library: opts.library || '',
  };
}

const SCAN_RULES = {
  // ==================== Python ====================
  python: [
    // RSA — cryptography lib (AST-like patterns)
    R('rsa\\.generate_private_key\\s*\\(\\s*public_exponent\\s*=\\s*\\d+\\s*,\\s*key_size\\s*=\\s*(\\d+)',
      'RSA', { usage: UsageType.KEY_GENERATION, context: 'cryptography.hazmat RSA generation', library: 'cryptography', extractKeySize: true, mode: ScanMode.AST }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+RSA', 'RSA',
      { context: 'PyCryptodome RSA import', library: 'pycryptodome' }),
    R('RSA\\.generate\\s*\\(\\s*(\\d+)', 'RSA',
      { context: 'RSA key generation', library: 'pycryptodome', extractKeySize: true }),
    R('PKCS1_OAEP|PKCS1_v1_5', 'RSA',
      { usage: UsageType.ENCRYPTION, context: 'RSA encryption padding', library: 'pycryptodome' }),

    // ECDSA / ECDH
    R('ec\\.generate_private_key\\s*\\(\\s*ec\\.(SECP256R1|SECP384R1|SECP521R1)', 'ECDSA',
      { context: 'cryptography ECDSA key generation', library: 'cryptography', mode: ScanMode.AST }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+ECC', 'ECDSA',
      { context: 'PyCryptodome ECC', library: 'pycryptodome' }),
    R("ECC\\.generate\\s*\\(\\s*curve\\s*=\\s*['\"]P-256['\"]", 'ECDSA-P256',
      { context: 'ECDSA P-256 generation', library: 'pycryptodome', mode: ScanMode.AST }),
    R('ec\\.ECDH\\s*\\(', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'ECDH key exchange', library: 'cryptography' }),
    R('ec\\.derive_private_key|SECP256R1|SECP384R1|SECP521R1', 'ECDSA',
      { context: 'Elliptic curve params', library: 'cryptography' }),

    // DSA / DH
    R('dsa\\.generate_private_key\\s*\\(', 'DSA', { usage: UsageType.SIGNING, context: 'DSA key generation', library: 'cryptography' }),
    R('dh\\.generate_parameters\\s*\\(', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'DH parameter generation', library: 'cryptography' }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+DSA', 'DSA', { context: 'PyCryptodome DSA', library: 'pycryptodome' }),

    // Ed25519 / X25519
    R('Ed25519PrivateKey|ed25519\\.Ed25519PrivateKey', 'Ed25519', { usage: UsageType.SIGNING, context: 'Ed25519 signing', library: 'cryptography' }),
    R('X25519PrivateKey|x25519\\.X25519PrivateKey', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'X25519 key exchange', library: 'cryptography' }),

    // Weak symmetric
    R('from\\s+Crypto\\.Cipher\\s+import\\s+DES\\b', 'DES', { usage: UsageType.ENCRYPTION, context: 'DES cipher', library: 'pycryptodome' }),
    R('from\\s+Crypto\\.Cipher\\s+import\\s+DES3', '3DES', { usage: UsageType.ENCRYPTION, context: '3DES cipher', library: 'pycryptodome' }),
    R('algorithms\\.TripleDES', '3DES', { usage: UsageType.ENCRYPTION, context: 'cryptography 3DES', library: 'cryptography' }),
    R('ARC4|algorithms\\.ARC4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'RC4 stream cipher' }),
    R('Blowfish', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Blowfish cipher' }),

    // AES-128 detection
    R('AES\\.new\\s*\\([^)]*\\bkey\\b[^)]*\\).*(?:16\\s*(?:bytes|\\*))', 'AES-128',
      { usage: UsageType.ENCRYPTION, context: 'AES-128 usage', library: 'pycryptodome' }),

    // Weak hashes
    R('hashlib\\.md5', 'MD5', { usage: UsageType.HASHING, context: 'MD5 hash', library: 'hashlib' }),
    R('MD5\\.new|from\\s+Crypto\\.Hash\\s+import\\s+MD5', 'MD5', { usage: UsageType.HASHING, context: 'PyCryptodome MD5', library: 'pycryptodome' }),
    R('hashlib\\.sha1', 'SHA-1', { usage: UsageType.HASHING, context: 'SHA-1 hash', library: 'hashlib' }),
    R('SHA1?\\.new|from\\s+Crypto\\.Hash\\s+import\\s+SHA(?:1)?\\b', 'SHA-1', { usage: UsageType.HASHING, context: 'PyCryptodome SHA-1', library: 'pycryptodome' }),
  ],

  // ==================== JavaScript / TypeScript ====================
  javascript: [
    // RSA
    R("crypto\\.generateKeyPair(?:Sync)?\\s*\\(\\s*['\"]rsa['\"]", 'RSA',
      { context: 'Node.js RSA generation', library: 'crypto', mode: ScanMode.AST }),
    R("modulusLength:\\s*(\\d+)", 'RSA',
      { context: 'RSA key size', library: 'crypto', extractKeySize: true }),
    R("['\"]RSA-OAEP['\"]|['\"]RSA-PSS['\"]", 'RSA',
      { usage: UsageType.ENCRYPTION, context: 'Web Crypto RSA' }),
    R('new\\s+NodeRSA|require\\s*\\(\\s*[\'"]node-rsa', 'RSA',
      { context: 'node-rsa library', library: 'node-rsa' }),
    R('forge\\.pki\\.rsa', 'RSA', { context: 'node-forge RSA', library: 'node-forge' }),

    // ECDSA / ECDH
    R("crypto\\.createECDH\\s*\\(", 'ECDH',
      { usage: UsageType.KEY_EXCHANGE, context: 'Node.js ECDH', library: 'crypto' }),
    R("['\"]ECDSA['\"]", 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Web Crypto ECDSA' }),
    R("['\"]ECDH['\"]", 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Web Crypto ECDH' }),
    R("namedCurve:\\s*['\"]P-(256|384|521)['\"]", 'ECDSA-P256', { context: 'NIST curve', mode: ScanMode.AST }),

    // DH / DSA
    R("crypto\\.createDiffieHellman\\s*\\(", 'DH-2048',
      { usage: UsageType.KEY_EXCHANGE, context: 'Node.js DH', library: 'crypto' }),
    R("crypto\\.generateKeyPair(?:Sync)?\\s*\\(\\s*['\"]dsa['\"]", 'DSA',
      { context: 'Node.js DSA', library: 'crypto' }),

    // Ed25519 / X25519
    R("['\"]ed25519['\"]", 'Ed25519', { usage: UsageType.SIGNING, context: 'Ed25519' }),
    R("['\"]x25519['\"]", 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'X25519' }),

    // Weak symmetric
    R("['\"]des['\"]|CryptoJS\\.DES\\b", 'DES', { usage: UsageType.ENCRYPTION, context: 'DES cipher', flags: 'gi' }),
    R("['\"]des-ede3['\"]|CryptoJS\\.TripleDES", '3DES', { usage: UsageType.ENCRYPTION, context: '3DES cipher', flags: 'gi' }),
    R("CryptoJS\\.RC4|['\"]rc4['\"]", 'RC4', { usage: UsageType.ENCRYPTION, context: 'RC4 cipher', flags: 'gi' }),
    R("CryptoJS\\.Blowfish|['\"]bf-", 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Blowfish', flags: 'gi' }),

    // Weak hashes
    R("crypto\\.createHash\\s*\\(\\s*['\"]md5['\"]\\s*\\)", 'MD5', { usage: UsageType.HASHING, context: 'MD5 hash', library: 'crypto' }),
    R('CryptoJS\\.MD5', 'MD5', { usage: UsageType.HASHING, context: 'CryptoJS MD5', library: 'crypto-js' }),
    R("crypto\\.createHash\\s*\\(\\s*['\"]sha1['\"]\\s*\\)", 'SHA-1', { usage: UsageType.HASHING, context: 'SHA-1 hash', library: 'crypto' }),
    R('CryptoJS\\.SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'CryptoJS SHA-1', library: 'crypto-js' }),
  ],

  // ==================== Java ====================
  java: [
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"RSA"\\s*\\)', 'RSA', { context: 'Java RSA KeyPairGenerator', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"RSA', 'RSA', { usage: UsageType.ENCRYPTION, context: 'Java RSA Cipher', library: 'javax.crypto' }),
    R('Signature\\.getInstance\\s*\\(\\s*".*RSA', 'RSA', { usage: UsageType.SIGNING, context: 'Java RSA Signature', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"EC"\\s*\\)', 'ECDSA-P256', { context: 'Java EC KeyPairGenerator', library: 'java.security' }),
    R('Signature\\.getInstance\\s*\\(\\s*".*ECDSA', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Java ECDSA', library: 'java.security' }),
    R('ECGenParameterSpec\\s*\\(\\s*"secp(256|384|521)r1"', 'ECDSA-P256', { context: 'Java EC params', library: 'java.security', mode: ScanMode.AST }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DSA"', 'DSA', { context: 'Java DSA', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DH"', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Java DH', library: 'javax.crypto' }),
    R('KeyAgreement\\.getInstance\\s*\\(\\s*"DH"', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Java DH KeyAgreement', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DES[/"]', 'DES', { usage: UsageType.ENCRYPTION, context: 'Java DES', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DESede', '3DES', { usage: UsageType.ENCRYPTION, context: 'Java 3DES', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"RC4"', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Java RC4', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"Blowfish', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Java Blowfish', library: 'javax.crypto' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"MD5"', 'MD5', { usage: UsageType.HASHING, context: 'Java MD5', library: 'java.security' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"SHA-?1"', 'SHA-1', { usage: UsageType.HASHING, context: 'Java SHA-1', library: 'java.security' }),
  ],

  // ==================== Go ====================
  go: [
    R('rsa\\.GenerateKey\\s*\\(', 'RSA', { context: 'Go RSA', library: 'crypto/rsa' }),
    R('rsa\\.EncryptOAEP|rsa\\.EncryptPKCS1v15', 'RSA', { usage: UsageType.ENCRYPTION, context: 'Go RSA encrypt', library: 'crypto/rsa' }),
    R('rsa\\.SignPKCS1v15|rsa\\.SignPSS', 'RSA', { usage: UsageType.SIGNING, context: 'Go RSA sign', library: 'crypto/rsa' }),
    R('"crypto/rsa"', 'RSA', { context: 'Go crypto/rsa import', library: 'crypto/rsa' }),
    R('ecdsa\\.GenerateKey\\s*\\(', 'ECDSA-P256', { context: 'Go ECDSA', library: 'crypto/ecdsa' }),
    R('"crypto/ecdsa"', 'ECDSA-P256', { context: 'Go crypto/ecdsa import', library: 'crypto/ecdsa' }),
    R('elliptic\\.P256|elliptic\\.P384|elliptic\\.P521', 'ECDSA-P256', { context: 'Go elliptic curve', library: 'crypto/elliptic' }),
    R('ecdh\\.P256|ecdh\\.X25519', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Go ECDH', library: 'crypto/ecdh' }),
    R('dsa\\.GenerateParameters|dsa\\.GenerateKey', 'DSA', { context: 'Go DSA', library: 'crypto/dsa' }),
    R('"crypto/dsa"', 'DSA', { context: 'Go crypto/dsa import', library: 'crypto/dsa' }),
    R('ed25519\\.GenerateKey|ed25519\\.Sign', 'Ed25519', { usage: UsageType.SIGNING, context: 'Go Ed25519', library: 'crypto/ed25519' }),
    R('"crypto/ed25519"', 'Ed25519', { context: 'Go ed25519 import', library: 'crypto/ed25519' }),
    R('des\\.NewCipher|des\\.NewTripleDESCipher', 'DES', { usage: UsageType.ENCRYPTION, context: 'Go DES', library: 'crypto/des' }),
    R('rc4\\.NewCipher', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Go RC4', library: 'crypto/rc4' }),
    R('blowfish\\.NewCipher', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Go Blowfish', library: 'golang.org/x/crypto/blowfish' }),
    R('md5\\.New\\(\\)|md5\\.Sum\\(', 'MD5', { usage: UsageType.HASHING, context: 'Go MD5', library: 'crypto/md5' }),
    R('"crypto/md5"', 'MD5', { usage: UsageType.HASHING, context: 'Go md5 import', library: 'crypto/md5' }),
    R('sha1\\.New\\(\\)|sha1\\.Sum\\(', 'SHA-1', { usage: UsageType.HASHING, context: 'Go SHA-1', library: 'crypto/sha1' }),
    R('"crypto/sha1"', 'SHA-1', { usage: UsageType.HASHING, context: 'Go sha1 import', library: 'crypto/sha1' }),
  ],

  // ==================== C/C++ (OpenSSL) ====================
  c: [
    R('RSA_generate_key(?:_ex)?', 'RSA', { context: 'OpenSSL RSA generation', library: 'OpenSSL' }),
    R('RSA_public_encrypt|RSA_private_decrypt', 'RSA', { usage: UsageType.ENCRYPTION, context: 'OpenSSL RSA', library: 'OpenSSL' }),
    R('EVP_PKEY_RSA', 'RSA', { context: 'OpenSSL EVP RSA', library: 'OpenSSL' }),
    R('#include\\s*<openssl/rsa\\.h>', 'RSA', { context: 'OpenSSL RSA header', library: 'OpenSSL' }),
    R('EC_KEY_generate_key|EC_KEY_new_by_curve_name', 'ECDSA-P256', { context: 'OpenSSL EC', library: 'OpenSSL' }),
    R('ECDSA_sign|ECDSA_verify|ECDSA_do_sign', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'OpenSSL ECDSA', library: 'OpenSSL' }),
    R('ECDH_compute_key', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'OpenSSL ECDH', library: 'OpenSSL' }),
    R('DSA_generate_parameters|DSA_generate_key', 'DSA', { context: 'OpenSSL DSA', library: 'OpenSSL' }),
    R('DH_generate_parameters|DH_generate_key', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'OpenSSL DH', library: 'OpenSSL' }),
    R('DES_ecb_encrypt|DES_cbc_encrypt|DES_set_key', 'DES', { usage: UsageType.ENCRYPTION, context: 'OpenSSL DES', library: 'OpenSSL' }),
    R('EVP_des_|EVP_des_ede3', 'DES', { usage: UsageType.ENCRYPTION, context: 'OpenSSL EVP DES', library: 'OpenSSL' }),
    R('RC4_set_key|EVP_rc4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'OpenSSL RC4', library: 'OpenSSL' }),
    R('BF_set_key|BF_ecb_encrypt|EVP_bf_', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'OpenSSL Blowfish', library: 'OpenSSL' }),
    R('MD5_Init|MD5_Update|MD5_Final|EVP_md5', 'MD5', { usage: UsageType.HASHING, context: 'OpenSSL MD5', library: 'OpenSSL' }),
    R('#include\\s*<openssl/md5\\.h>', 'MD5', { usage: UsageType.HASHING, context: 'OpenSSL MD5 header', library: 'OpenSSL' }),
    R('SHA1_Init|SHA1_Update|SHA1_Final|EVP_sha1\\b', 'SHA-1', { usage: UsageType.HASHING, context: 'OpenSSL SHA-1', library: 'OpenSSL' }),
  ],

  // ==================== Rust ====================
  rust: [
    R('use\\s+rsa::|RsaPrivateKey::new|RsaPublicKey', 'RSA', { context: 'Rust RSA crate', library: 'rsa' }),
    R('use\\s+p256::|use\\s+p384::', 'ECDSA-P256', { context: 'Rust elliptic curve', library: 'p256/p384' }),
    R('use\\s+ed25519', 'Ed25519', { usage: UsageType.SIGNING, context: 'Rust Ed25519', library: 'ed25519' }),
    R('use\\s+x25519', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Rust X25519', library: 'x25519-dalek' }),
    R('use\\s+des::|Des::', 'DES', { usage: UsageType.ENCRYPTION, context: 'Rust DES', library: 'des' }),
    R('use\\s+md-?5::|Md5::', 'MD5', { usage: UsageType.HASHING, context: 'Rust MD5', library: 'md-5' }),
    R('use\\s+sha1::|Sha1::', 'SHA-1', { usage: UsageType.HASHING, context: 'Rust SHA-1', library: 'sha1' }),
    R('use\\s+blowfish::', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Rust Blowfish', library: 'blowfish' }),
    R('use\\s+rc4::', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Rust RC4', library: 'rc4' }),
  ],

  // ==================== C# / .NET ====================
  csharp: [
    R('new\\s+RSACryptoServiceProvider|RSA\\.Create', 'RSA', { context: '.NET RSA', library: 'System.Security' }),
    R('ECDsa\\.Create|new\\s+ECDsaCng', 'ECDSA-P256', { context: '.NET ECDSA', library: 'System.Security' }),
    R('ECDiffieHellman\\.Create', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: '.NET ECDH', library: 'System.Security' }),
    R('new\\s+DSACryptoServiceProvider|DSA\\.Create', 'DSA', { context: '.NET DSA', library: 'System.Security' }),
    R('new\\s+DESCryptoServiceProvider|DES\\.Create', 'DES', { usage: UsageType.ENCRYPTION, context: '.NET DES', library: 'System.Security' }),
    R('new\\s+TripleDESCryptoServiceProvider|TripleDES\\.Create', '3DES', { usage: UsageType.ENCRYPTION, context: '.NET 3DES', library: 'System.Security' }),
    R('MD5\\.Create\\s*\\(|new\\s+MD5CryptoServiceProvider', 'MD5', { usage: UsageType.HASHING, context: '.NET MD5', library: 'System.Security' }),
    R('SHA1\\.Create\\s*\\(|new\\s+SHA1CryptoServiceProvider', 'SHA-1', { usage: UsageType.HASHING, context: '.NET SHA-1', library: 'System.Security' }),
  ],

  // ==================== PHP ====================
  php: [
    R('openssl_pkey_new.*RSA|OPENSSL_KEYTYPE_RSA', 'RSA', { context: 'PHP OpenSSL RSA', library: 'openssl' }),
    R('openssl_sign|openssl_verify', 'RSA', { usage: UsageType.SIGNING, context: 'PHP OpenSSL signing', library: 'openssl' }),
    R('openssl_encrypt\\s*\\(.*DES', 'DES', { usage: UsageType.ENCRYPTION, context: 'PHP DES', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*RC4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'PHP RC4', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*BF', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'PHP Blowfish', library: 'openssl', flags: 'gi' }),
    R('\\bmd5\\s*\\(', 'MD5', { usage: UsageType.HASHING, context: 'PHP md5()', library: 'core' }),
    R('\\bsha1\\s*\\(', 'SHA-1', { usage: UsageType.HASHING, context: 'PHP sha1()', library: 'core' }),
    R('sodium_crypto_box_keypair|sodium_crypto_sign_keypair', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'PHP Sodium', library: 'sodium' }),
    R('openssl_dh_compute_key|OPENSSL_KEYTYPE_DH', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'PHP DH', library: 'openssl' }),
  ],

  // ==================== Ruby ====================
  ruby: [
    R('OpenSSL::PKey::RSA\\.(?:new|generate)', 'RSA', { context: 'Ruby OpenSSL RSA', library: 'openssl' }),
    R('OpenSSL::PKey::RSA\\.new\\s*\\(\\s*(\\d+)', 'RSA', { context: 'Ruby RSA generation', library: 'openssl', extractKeySize: true }),
    R('OpenSSL::PKey::EC\\.(?:new|generate)', 'ECDSA-P256', { context: 'Ruby OpenSSL EC', library: 'openssl' }),
    R('OpenSSL::PKey::DSA\\.(?:new|generate)', 'DSA', { context: 'Ruby OpenSSL DSA', library: 'openssl' }),
    R('OpenSSL::PKey::DH\\.(?:new|generate)', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Ruby OpenSSL DH', library: 'openssl' }),
    R('OpenSSL::Cipher.*DES', 'DES', { usage: UsageType.ENCRYPTION, context: 'Ruby DES', library: 'openssl' }),
    R('OpenSSL::Cipher.*RC4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Ruby RC4', library: 'openssl' }),
    R('OpenSSL::Cipher.*Blowfish|BF', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Ruby Blowfish', library: 'openssl' }),
    R('Digest::MD5', 'MD5', { usage: UsageType.HASHING, context: 'Ruby MD5', library: 'digest' }),
    R('Digest::SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'Ruby SHA-1', library: 'digest' }),
    R('Ed25519::SigningKey|RbNaCl::Signatures::Ed25519', 'Ed25519', { usage: UsageType.SIGNING, context: 'Ruby Ed25519', library: 'ed25519' }),
  ],

  // ==================== Kotlin / Scala (JVM) ====================
  kotlin: [
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"RSA"', 'RSA', { context: 'Kotlin RSA', library: 'java.security' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"RSA', 'RSA', { usage: UsageType.ENCRYPTION, context: 'Kotlin RSA Cipher', library: 'javax.crypto' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"EC"', 'ECDSA-P256', { context: 'Kotlin EC', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DSA"', 'DSA', { context: 'Kotlin DSA', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DH"', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Kotlin DH', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DES', 'DES', { usage: UsageType.ENCRYPTION, context: 'Kotlin DES', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DESede', '3DES', { usage: UsageType.ENCRYPTION, context: 'Kotlin 3DES', library: 'javax.crypto' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"MD5"', 'MD5', { usage: UsageType.HASHING, context: 'Kotlin MD5', library: 'java.security' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"SHA-?1"', 'SHA-1', { usage: UsageType.HASHING, context: 'Kotlin SHA-1', library: 'java.security' }),
  ],

  // ==================== Swift ====================
  swift: [
    R('SecKeyCreateRandomKey.*kSecAttrKeyTypeRSA', 'RSA', { context: 'Swift Security RSA', library: 'Security' }),
    R('SecKeyCreateRandomKey.*kSecAttrKeyTypeECSECPrimeRandom', 'ECDSA-P256', { context: 'Swift Security EC', library: 'Security' }),
    R('CC_MD5\\b|Insecure\\.MD5', 'MD5', { usage: UsageType.HASHING, context: 'Swift MD5', library: 'CryptoKit' }),
    R('CC_SHA1\\b|Insecure\\.SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'Swift SHA-1', library: 'CryptoKit' }),
    R('Curve25519\\.Signing', 'Ed25519', { usage: UsageType.SIGNING, context: 'Swift Ed25519', library: 'CryptoKit' }),
    R('Curve25519\\.KeyAgreement', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Swift X25519', library: 'CryptoKit' }),
    R('ChaChaPoly|AES\\.GCM', 'AES-256', { usage: UsageType.ENCRYPTION, context: 'Swift AES-GCM (safe)', library: 'CryptoKit' }),
  ],

  // ==================== Config files ====================
  config: [
    R('ssl_ciphers.*(?:RC4|DES|3DES|MD5)', 'RC4', { usage: UsageType.TLS_CONFIG, context: 'Nginx/Apache weak cipher', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('SSLCipherSuite.*(?:RC4|DES|3DES|MD5)', 'RC4', { usage: UsageType.TLS_CONFIG, context: 'Apache weak cipher', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('TLSv1\\.0|TLSv1\\.1|SSLv3', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Legacy TLS/SSL version', mode: ScanMode.CONFIG }),
    R('ssh-rsa\\b', 'RSA', { usage: UsageType.CERTIFICATE, context: 'SSH RSA key type', mode: ScanMode.CONFIG }),
    R('ssh-dss\\b', 'DSA', { usage: UsageType.CERTIFICATE, context: 'SSH DSA key type', mode: ScanMode.CONFIG }),
    R('MinProtocol\\s*=\\s*TLSv1(?:\\.0|\\.1)?\\b', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'OpenSSL legacy TLS', mode: ScanMode.CONFIG }),
  ],

  // ==================== 依赖文件扫描 ====================
  dependency: [
    // Python
    R('pycryptodome|pycrypto(?!dome)', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python crypto library dependency', mode: ScanMode.DEPENDENCY }),
    R('paramiko', 'RSA', { usage: UsageType.DEPENDENCY, context: 'SSH library (uses RSA)', mode: ScanMode.DEPENDENCY }),
    R('pyOpenSSL', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python OpenSSL binding', mode: ScanMode.DEPENDENCY }),
    // JavaScript
    R('"node-rsa"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'node-rsa dependency', mode: ScanMode.DEPENDENCY }),
    R('"node-forge"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'node-forge dependency', mode: ScanMode.DEPENDENCY }),
    R('"crypto-js"', 'MD5', { usage: UsageType.DEPENDENCY, context: 'crypto-js (may use weak ciphers)', mode: ScanMode.DEPENDENCY }),
    // Java
    R('bouncy-castle|bcprov-jdk', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Bouncy Castle dependency', mode: ScanMode.DEPENDENCY }),
    // Ruby
    R('"rbnacl"|"ed25519"', 'Ed25519', { usage: UsageType.DEPENDENCY, context: 'Ruby crypto dependency', mode: ScanMode.DEPENDENCY }),
    // Go
    R('golang\.org/x/crypto', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Go x/crypto dependency', mode: ScanMode.DEPENDENCY }),
    // Rust
    R('rsa\s*=|ring\s*=|openssl\s*=', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Rust crypto dependency', mode: ScanMode.DEPENDENCY }),
    // .NET
    R('System\.Security\.Cryptography', 'RSA', { usage: UsageType.DEPENDENCY, context: '.NET crypto dependency', mode: ScanMode.DEPENDENCY }),
  ],
};

// 文件扩展名 → 语言映射
const EXT_LANG_MAP = {
  '.py': 'python', '.pyw': 'python',
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'javascript', '.tsx': 'javascript', '.mjs': 'javascript',
  '.java': 'java',
  '.go': 'go',
  '.c': 'c', '.cpp': 'c', '.cc': 'c', '.h': 'c', '.hpp': 'c',
  '.rs': 'rust',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.kt': 'kotlin', '.kts': 'kotlin', '.scala': 'kotlin',
  '.swift': 'swift',
  '.conf': 'config', '.cfg': 'config', '.ini': 'config',
  '.yaml': 'config', '.yml': 'config', '.toml': 'config', '.xml': 'config',
  '.pem': 'config', '.crt': 'config', '.key': 'config',
  '.env': 'config', '.properties': 'config',
  // 依赖文件
  'requirements.txt': 'dependency', 'Pipfile': 'dependency',
  'package.json': 'dependency', 'package-lock.json': 'dependency',
  'go.mod': 'dependency', 'go.sum': 'dependency',
  'pom.xml': 'dependency', 'build.gradle': 'dependency',
  'Cargo.toml': 'dependency',
  'Gemfile': 'dependency',
};

// 依赖文件的精确名匹配
const DEP_FILE_NAMES = new Set([
  'requirements.txt', 'Pipfile', 'setup.py', 'pyproject.toml',
  'package.json', 'package-lock.json', 'yarn.lock',
  'go.mod', 'go.sum',
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'Cargo.toml', 'Cargo.lock',
  'Gemfile', 'Gemfile.lock',
  'composer.json', 'composer.lock',
]);

module.exports = { SCAN_RULES, EXT_LANG_MAP, DEP_FILE_NAMES };
