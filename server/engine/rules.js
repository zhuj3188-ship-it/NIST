/**
 * QuantumShield - Multi-language Scan Rules Engine v6.0
 * 400+ rules across 15 language categories
 * v6.0 additions: Cloud KMS/HSM, WebCrypto, FIDO2/WebAuthn, gRPC TLS,
 *   password hashing audit (bcrypt/argon2), WASM crypto, Android KeyStore,
 *   OpenPGP/GPG, enhanced false-positive reduction
 */

const { QuantumRisk, UsageType, ScanMode, QUANTUM_VULNERABILITY_DB } = require('./models');

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
    // RSA - cryptography lib
    R('rsa\\.generate_private_key\\s*\\(\\s*public_exponent\\s*=\\s*\\d+\\s*,\\s*key_size\\s*=\\s*(\\d+)',
      'RSA', { usage: UsageType.KEY_GENERATION, context: 'cryptography.hazmat RSA generation', library: 'cryptography', extractKeySize: true, mode: ScanMode.AST }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+RSA', 'RSA',
      { context: 'PyCryptodome RSA import', library: 'pycryptodome' }),
    R('RSA\\.generate\\s*\\(\\s*(\\d+)', 'RSA',
      { context: 'RSA key generation', library: 'pycryptodome', extractKeySize: true }),
    R('PKCS1_OAEP|PKCS1_v1_5', 'RSA',
      { usage: UsageType.ENCRYPTION, context: 'RSA encryption padding', library: 'pycryptodome' }),
    R('RSA\\.import_key|RSA\\.importKey', 'RSA',
      { context: 'RSA key import', library: 'pycryptodome' }),
    R('rsa\\.decrypt|rsa\\.encrypt', 'RSA',
      { usage: UsageType.ENCRYPTION, context: 'RSA encrypt/decrypt', library: 'cryptography' }),
    R('sign\\s*\\(.*padding\\.PKCS1v15|sign\\s*\\(.*padding\\.PSS', 'RSA',
      { usage: UsageType.SIGNING, context: 'RSA signing', library: 'cryptography', mode: ScanMode.AST }),
    R('jwt\\.encode\\s*\\(.*algorithm\\s*=\\s*[\'"]RS(256|384|512)', 'RSA',
      { usage: UsageType.SIGNING, context: 'JWT RSA signing', library: 'PyJWT', mode: ScanMode.AST }),

    // ECDSA / ECDH
    R('ec\\.generate_private_key\\s*\\(\\s*ec\\.(SECP256R1|SECP384R1|SECP521R1)', 'ECDSA',
      { context: 'cryptography ECDSA key generation', library: 'cryptography', mode: ScanMode.AST }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+ECC', 'ECDSA',
      { context: 'PyCryptodome ECC', library: 'pycryptodome' }),
    R("ECC\\.generate\\s*\\(\\s*curve\\s*=\\s*['\"]P-256['\"]", 'ECDSA-P256',
      { context: 'ECDSA P-256 generation', library: 'pycryptodome', mode: ScanMode.AST }),
    R("ECC\\.generate\\s*\\(\\s*curve\\s*=\\s*['\"]P-384['\"]", 'ECDSA-P384',
      { context: 'ECDSA P-384 generation', library: 'pycryptodome', mode: ScanMode.AST }),
    R("ECC\\.generate\\s*\\(\\s*curve\\s*=\\s*['\"]P-521['\"]", 'ECDSA-P521',
      { context: 'ECDSA P-521 generation', library: 'pycryptodome', mode: ScanMode.AST }),
    R('ec\\.ECDH\\s*\\(', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'ECDH key exchange', library: 'cryptography' }),
    R('ec\\.derive_private_key|SECP256R1|SECP384R1|SECP521R1', 'ECDSA',
      { context: 'Elliptic curve params', library: 'cryptography' }),
    R('jwt\\.encode\\s*\\(.*algorithm\\s*=\\s*[\'"]ES(256|384|512)', 'ECDSA',
      { usage: UsageType.SIGNING, context: 'JWT ECDSA signing', library: 'PyJWT', mode: ScanMode.AST }),
    R('ecdsa\\.SigningKey\\.generate|ecdsa\\.NIST256p|ecdsa\\.SECP256k1', 'ECDSA',
      { context: 'python-ecdsa library', library: 'ecdsa' }),

    // DSA / DH
    R('dsa\\.generate_private_key\\s*\\(', 'DSA', { usage: UsageType.SIGNING, context: 'DSA key generation', library: 'cryptography' }),
    R('dh\\.generate_parameters\\s*\\(', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'DH parameter generation', library: 'cryptography' }),
    R('from\\s+Crypto(?:dome)?\\.PublicKey\\s+import\\s+DSA', 'DSA', { context: 'PyCryptodome DSA', library: 'pycryptodome' }),
    R('dh\\.DHParameterNumbers|dh\\.generate_parameters', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'DH parameters', library: 'cryptography' }),

    // Ed25519 / X25519 / Ed448 / X448
    R('Ed25519PrivateKey|ed25519\\.Ed25519PrivateKey', 'Ed25519', { usage: UsageType.SIGNING, context: 'Ed25519 signing', library: 'cryptography' }),
    R('X25519PrivateKey|x25519\\.X25519PrivateKey', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'X25519 key exchange', library: 'cryptography' }),
    R('Ed448PrivateKey|ed448\\.Ed448PrivateKey', 'Ed448', { usage: UsageType.SIGNING, context: 'Ed448 signing', library: 'cryptography' }),
    R('X448PrivateKey|x448\\.X448PrivateKey', 'X448', { usage: UsageType.KEY_EXCHANGE, context: 'X448 key exchange', library: 'cryptography' }),
    R('nacl\\.signing\\.SigningKey|nacl\\.public\\.PrivateKey', 'Ed25519', { usage: UsageType.SIGNING, context: 'PyNaCl Ed25519', library: 'PyNaCl' }),

    // Weak symmetric
    R('from\\s+Crypto\\.Cipher\\s+import\\s+DES\\b', 'DES', { usage: UsageType.ENCRYPTION, context: 'DES cipher', library: 'pycryptodome' }),
    R('from\\s+Crypto\\.Cipher\\s+import\\s+DES3', '3DES', { usage: UsageType.ENCRYPTION, context: '3DES cipher', library: 'pycryptodome' }),
    R('algorithms\\.TripleDES', '3DES', { usage: UsageType.ENCRYPTION, context: 'cryptography 3DES', library: 'cryptography' }),
    R('ARC4|algorithms\\.ARC4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'RC4 stream cipher' }),
    R('Blowfish', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Blowfish cipher' }),
    R('algorithms\\.CAST5|from\\s+Crypto\\.Cipher\\s+import\\s+CAST', 'CAST5', { usage: UsageType.ENCRYPTION, context: 'CAST5 cipher (weak block)' }),
    R('algorithms\\.IDEA', 'IDEA', { usage: UsageType.ENCRYPTION, context: 'IDEA cipher (64-bit block)' }),

    // AES insecure modes
    R('AES\\.new\\s*\\([^)]*AES\\.MODE_ECB', 'AES-ECB',
      { usage: UsageType.ENCRYPTION, context: 'AES-ECB mode (insecure pattern leakage)', library: 'pycryptodome' }),
    R('AES\\.new\\s*\\([^)]*\\bkey\\b[^)]*\\).*(?:16\\s*(?:bytes|\\*))', 'AES-128',
      { usage: UsageType.ENCRYPTION, context: 'AES-128 usage', library: 'pycryptodome' }),
    R('algorithms\\.AES128\\b', 'AES-128', { usage: UsageType.ENCRYPTION, context: 'AES-128', library: 'cryptography' }),

    // Weak hashes
    R('hashlib\\.md5', 'MD5', { usage: UsageType.HASHING, context: 'MD5 hash', library: 'hashlib' }),
    R('MD5\\.new|from\\s+Crypto\\.Hash\\s+import\\s+MD5', 'MD5', { usage: UsageType.HASHING, context: 'PyCryptodome MD5', library: 'pycryptodome' }),
    R('hashlib\\.sha1', 'SHA-1', { usage: UsageType.HASHING, context: 'SHA-1 hash', library: 'hashlib' }),
    R('SHA1?\\.new|from\\s+Crypto\\.Hash\\s+import\\s+SHA(?:1)?\\b', 'SHA-1', { usage: UsageType.HASHING, context: 'PyCryptodome SHA-1', library: 'pycryptodome' }),
    R('hashlib\\.md4', 'MD4', { usage: UsageType.HASHING, context: 'MD4 hash (critically broken)', library: 'hashlib' }),
    R('hmac\\.new\\s*\\(.*md5', 'MD5', { usage: UsageType.MAC, context: 'HMAC-MD5', library: 'hmac', flags: 'gi' }),
    R('hmac\\.new\\s*\\(.*sha1', 'SHA-1', { usage: UsageType.MAC, context: 'HMAC-SHA1', library: 'hmac', flags: 'gi' }),

    // Password hashing — weak
    R('hashlib\\.(?:md5|sha1|sha256)\\s*\\([^)]*password', 'MD5', { usage: UsageType.PASSWORD_HASH, context: 'Raw hash for password (use bcrypt/argon2)', library: 'hashlib', flags: 'gi' }),

    // TLS/SSL
    R('ssl\\.PROTOCOL_TLSv1(?:_1)?\\b|ssl\\.PROTOCOL_SSLv[23]', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'Legacy TLS/SSL protocol version', library: 'ssl', mode: ScanMode.CONFIG }),
    R('ssl\\.create_default_context|ssl\\.SSLContext', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'Python SSL context', library: 'ssl' }),
    R('ssl\\.wrap_socket', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'SSL socket wrapping (deprecated)', library: 'ssl' }),
    R('ssl\\.CERT_NONE|verify\\s*=\\s*False', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'TLS verification disabled', library: 'ssl', mode: ScanMode.CONFIG }),

    // Paramiko SSH
    R('paramiko\\.RSAKey', 'RSA', { usage: UsageType.SSH_CONFIG, context: 'Paramiko SSH RSA key', library: 'paramiko' }),
    R('paramiko\\.DSSKey', 'DSA', { usage: UsageType.SSH_CONFIG, context: 'Paramiko SSH DSA key', library: 'paramiko' }),
    R('paramiko\\.ECDSAKey', 'ECDSA', { usage: UsageType.SSH_CONFIG, context: 'Paramiko SSH ECDSA key', library: 'paramiko' }),
    R('paramiko\\.Ed25519Key', 'Ed25519', { usage: UsageType.SSH_CONFIG, context: 'Paramiko SSH Ed25519 key', library: 'paramiko' }),

    // Insecure random
    R('\\brandom\\.random\\s*\\(|\\brandom\\.randint\\s*\\(|\\brandom\\.choice\\s*\\(', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (use secrets module)', library: 'random' }),

    // KDF detection
    R('PBKDF2HMAC|Scrypt|HKDF', 'AES-256', { usage: UsageType.KEY_DERIVATION, context: 'Key derivation function (check parameters)', library: 'cryptography' }),

    // PQC detection (positive)
    R('from\\s+Crypto\\.Random|os\\.urandom|secrets\\.token', 'AES-256', { usage: UsageType.RANDOM, context: 'Secure random (OK)', library: 'stdlib' }),
    R('oqs\\.KeyEncapsulation|oqs\\.Signature', 'AES-256', { context: 'liboqs PQC library (positive)', library: 'liboqs' }),

    // Password hashing — good practices (audit)
    R('bcrypt\\.hashpw|bcrypt\\.gensalt', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'bcrypt password hashing (OK, check cost factor)', library: 'bcrypt' }),
    R('argon2\\.PasswordHasher|argon2\\.hash_password', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Argon2 password hashing (recommended)', library: 'argon2-cffi' }),
    R('pbkdf2_sha256|crypt\\.crypt', 'AES-256', { usage: UsageType.KEY_DERIVATION, context: 'PBKDF2/crypt (check iteration count)', library: 'passlib' }),

    // AWS / Cloud KMS
    R("boto3.*kms|client\\s*\\(\\s*['\"]kms['\"]\\)", 'RSA', { context: 'AWS KMS usage (check CMK algo)', library: 'boto3' }),
    R('google\\.cloud\\.kms|KeyManagementServiceClient', 'RSA', { context: 'GCP Cloud KMS (check key type)', library: 'google-cloud-kms' }),
    R('azure\\.keyvault\\.keys|KeyClient\\(', 'RSA', { context: 'Azure Key Vault (check key type)', library: 'azure-keyvault-keys' }),

    // gRPC channel security
    R('grpc\\.ssl_channel_credentials|grpc\\.composite_channel_credentials', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Python gRPC SSL channel', library: 'grpcio' }),

    // FIDO2 / WebAuthn
    R('fido2\\.server|webauthn\\.generate_registration', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'FIDO2/WebAuthn (typically P-256)', library: 'fido2' }),

    // OpenPGP / GPG
    R('gnupg\\.GPG|gpg\\.encrypt|pgp\\.encrypt', 'RSA', { usage: UsageType.ENCRYPTION, context: 'PGP/GPG encryption (check key algo)', library: 'python-gnupg', flags: 'gi' }),
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
    R('jose\\.SignJWT|jose\\.jwtVerify|jose\\.importPKCS8', 'RSA',
      { usage: UsageType.SIGNING, context: 'jose JWT library', library: 'jose' }),
    R('jsonwebtoken.*RS256|jwt\\.sign.*RS(256|384|512)', 'RSA',
      { usage: UsageType.SIGNING, context: 'JWT RSA signing', library: 'jsonwebtoken', flags: 'gi' }),

    // ECDSA / ECDH
    R("crypto\\.createECDH\\s*\\(", 'ECDH',
      { usage: UsageType.KEY_EXCHANGE, context: 'Node.js ECDH', library: 'crypto' }),
    R("['\"]ECDSA['\"]", 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Web Crypto ECDSA' }),
    R("['\"]ECDH['\"]", 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Web Crypto ECDH' }),
    R("namedCurve:\\s*['\"]P-(256|384|521)['\"]", 'ECDSA-P256', { context: 'NIST curve', mode: ScanMode.AST }),
    R('elliptic\\.ec\\b|require\\s*\\(\\s*[\'"]elliptic', 'ECDSA', { context: 'elliptic.js library', library: 'elliptic' }),
    R('secp256k1|require\\s*\\(\\s*[\'"]secp256k1', 'secp256k1', { context: 'secp256k1 (Bitcoin/Ethereum curve)', library: 'secp256k1' }),
    R('jwt\\.sign.*ES(256|384|512)', 'ECDSA', { usage: UsageType.SIGNING, context: 'JWT ECDSA', library: 'jsonwebtoken', flags: 'gi' }),

    // DH / DSA
    R("crypto\\.createDiffieHellman\\s*\\(", 'DH-2048',
      { usage: UsageType.KEY_EXCHANGE, context: 'Node.js DH', library: 'crypto' }),
    R("crypto\\.generateKeyPair(?:Sync)?\\s*\\(\\s*['\"]dsa['\"]", 'DSA',
      { context: 'Node.js DSA', library: 'crypto' }),
    R('diffie-hellman|create-ecdh', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'DH npm package', library: 'diffie-hellman' }),

    // Ed25519 / X25519
    R("['\"]ed25519['\"]", 'Ed25519', { usage: UsageType.SIGNING, context: 'Ed25519' }),
    R("['\"]x25519['\"]", 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'X25519' }),
    R('@noble/ed25519|tweetnacl\\.sign', 'Ed25519', { usage: UsageType.SIGNING, context: 'Ed25519 npm lib', library: '@noble/ed25519' }),
    R('@noble/curves|@noble/hashes', 'Ed25519', { context: 'noble cryptography library', library: '@noble' }),

    // Weak symmetric
    R("['\"]des['\"]|CryptoJS\\.DES\\b", 'DES', { usage: UsageType.ENCRYPTION, context: 'DES cipher', flags: 'gi' }),
    R("['\"]des-ede3['\"]|CryptoJS\\.TripleDES", '3DES', { usage: UsageType.ENCRYPTION, context: '3DES cipher', flags: 'gi' }),
    R("CryptoJS\\.RC4|['\"]rc4['\"]", 'RC4', { usage: UsageType.ENCRYPTION, context: 'RC4 cipher', flags: 'gi' }),
    R("CryptoJS\\.Blowfish|['\"]bf-", 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Blowfish', flags: 'gi' }),
    R("['\"]aes-128-", 'AES-128', { usage: UsageType.ENCRYPTION, context: 'AES-128 mode', library: 'crypto' }),
    R("['\"]aes-128-ecb['\"]", 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'AES-128-ECB (insecure mode)', library: 'crypto' }),
    R("['\"]aes-256-ecb['\"]", 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'AES-256-ECB (insecure mode)', library: 'crypto' }),

    // Weak hashes
    R("crypto\\.createHash\\s*\\(\\s*['\"]md5['\"]\\s*\\)", 'MD5', { usage: UsageType.HASHING, context: 'MD5 hash', library: 'crypto' }),
    R('CryptoJS\\.MD5', 'MD5', { usage: UsageType.HASHING, context: 'CryptoJS MD5', library: 'crypto-js' }),
    R("crypto\\.createHash\\s*\\(\\s*['\"]sha1['\"]\\s*\\)", 'SHA-1', { usage: UsageType.HASHING, context: 'SHA-1 hash', library: 'crypto' }),
    R('CryptoJS\\.SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'CryptoJS SHA-1', library: 'crypto-js' }),
    R('md5\\s*\\(|require\\s*\\(\\s*[\'"]md5', 'MD5', { usage: UsageType.HASHING, context: 'md5 npm package', library: 'md5' }),
    R("crypto\\.createHash\\s*\\(\\s*['\"]ripemd160['\"]", 'RIPEMD-160', { usage: UsageType.HASHING, context: 'RIPEMD-160 hash', library: 'crypto' }),

    // TLS
    R("tls\\.createServer|https\\.createServer", 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'Node.js TLS/HTTPS server', library: 'tls' }),
    R("secureProtocol.*TLSv1_method|minVersion.*TLSv1\\.0", 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'Legacy TLS version', library: 'tls', mode: ScanMode.CONFIG }),
    R("rejectUnauthorized\\s*:\\s*false", 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'TLS cert verification disabled', library: 'tls', mode: ScanMode.CONFIG }),
    R("NODE_TLS_REJECT_UNAUTHORIZED\\s*=\\s*['\"]?0", 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'Global TLS verification disabled', library: 'node', mode: ScanMode.CONFIG }),

    // Blockchain / Web3
    R('ethers\\.Wallet|web3\\.eth\\.accounts', 'secp256k1',
      { usage: UsageType.SIGNING, context: 'Ethereum ECDSA (secp256k1)', library: 'ethers.js' }),
    R('bitcoin\\.ECPair|bitcoinjs-lib', 'secp256k1',
      { usage: UsageType.SIGNING, context: 'Bitcoin ECDSA (secp256k1)', library: 'bitcoinjs-lib' }),
    R('solana.*Keypair\\.generate|@solana/web3', 'Ed25519',
      { usage: UsageType.SIGNING, context: 'Solana Ed25519', library: '@solana/web3.js' }),

    // Insecure random
    R('Math\\.random\\s*\\(', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (Math.random is not cryptographically secure)', library: 'builtin' }),

    // gRPC / mTLS
    R('grpc\\.credentials\\.createSsl', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'gRPC SSL/TLS credentials', library: 'grpc' }),

    // Web Crypto API (SubtleCrypto)
    R('crypto\\.subtle\\.generateKey|crypto\\.subtle\\.importKey', 'RSA', { usage: UsageType.KEY_GENERATION, context: 'Web Crypto API (check algorithm param)', library: 'WebCrypto' }),
    R('crypto\\.subtle\\.sign|crypto\\.subtle\\.verify', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Web Crypto sign/verify', library: 'WebCrypto' }),
    R('crypto\\.subtle\\.encrypt|crypto\\.subtle\\.decrypt', 'AES-256', { usage: UsageType.ENCRYPTION, context: 'Web Crypto encrypt/decrypt', library: 'WebCrypto' }),

    // WebAuthn / FIDO2
    R('navigator\\.credentials\\.create|PublicKeyCredentialCreationOptions', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'WebAuthn/FIDO2 (typically P-256)', library: 'webauthn' }),

    // HMAC with weak hash
    R("crypto\\.createHmac\\s*\\(\\s*['\"]md5", 'MD5', { usage: UsageType.MAC, context: 'HMAC-MD5 (weak)', library: 'crypto' }),
    R("crypto\\.createHmac\\s*\\(\\s*['\"]sha1", 'SHA-1', { usage: UsageType.MAC, context: 'HMAC-SHA1 (weak)', library: 'crypto' }),

    // Password hashing (positive)
    R("bcrypt\\.hash\\s*\\(|bcryptjs|require\\s*\\(\\s*['\"]bcrypt", 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'bcrypt password hashing (OK)', library: 'bcrypt' }),
    R("require\\s*\\(\\s*['\"]argon2", 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Argon2 password hashing (recommended)', library: 'argon2' }),

    // AWS KMS / Cloud
    R("KMSClient|@aws-sdk/client-kms", 'RSA', { context: 'AWS KMS client (check CMK type)', library: 'aws-sdk' }),
    R("@google-cloud/kms", 'RSA', { context: 'GCP Cloud KMS client', library: '@google-cloud/kms' }),
  ],

  // ==================== Java ====================
  java: [
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"RSA"\\s*\\)', 'RSA', { context: 'Java RSA KeyPairGenerator', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"RSA', 'RSA', { usage: UsageType.ENCRYPTION, context: 'Java RSA Cipher', library: 'javax.crypto' }),
    R('Signature\\.getInstance\\s*\\(\\s*".*RSA', 'RSA', { usage: UsageType.SIGNING, context: 'Java RSA Signature', library: 'java.security' }),
    R('KeyFactory\\.getInstance\\s*\\(\\s*"RSA"', 'RSA', { context: 'Java RSA KeyFactory', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"EC"\\s*\\)', 'ECDSA-P256', { context: 'Java EC KeyPairGenerator', library: 'java.security' }),
    R('Signature\\.getInstance\\s*\\(\\s*".*ECDSA', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Java ECDSA', library: 'java.security' }),
    R('ECGenParameterSpec\\s*\\(\\s*"secp(256|384|521)r1"', 'ECDSA-P256', { context: 'Java EC params', library: 'java.security', mode: ScanMode.AST }),
    R('ECGenParameterSpec\\s*\\(\\s*"secp256k1"', 'secp256k1', { context: 'Java secp256k1 (blockchain)', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DSA"', 'DSA', { context: 'Java DSA', library: 'java.security' }),
    R('KeyPairGenerator\\.getInstance\\s*\\(\\s*"DH"', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Java DH', library: 'javax.crypto' }),
    R('KeyAgreement\\.getInstance\\s*\\(\\s*"DH"', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'Java DH KeyAgreement', library: 'javax.crypto' }),
    R('KeyAgreement\\.getInstance\\s*\\(\\s*"ECDH"', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Java ECDH', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DES[/"]', 'DES', { usage: UsageType.ENCRYPTION, context: 'Java DES', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"DESede', '3DES', { usage: UsageType.ENCRYPTION, context: 'Java 3DES', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"RC4"', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Java RC4', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"Blowfish', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Java Blowfish', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"AES/ECB', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Java AES-ECB (insecure mode)', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"AES/CBC/PKCS5', 'AES-CBC-no-HMAC', { usage: UsageType.ENCRYPTION, context: 'Java AES-CBC (check for HMAC)', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"AES"\\)', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Java AES without mode spec (defaults to ECB)', library: 'javax.crypto' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"MD5"', 'MD5', { usage: UsageType.HASHING, context: 'Java MD5', library: 'java.security' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"SHA-?1"', 'SHA-1', { usage: UsageType.HASHING, context: 'Java SHA-1', library: 'java.security' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"MD4"', 'MD4', { usage: UsageType.HASHING, context: 'Java MD4 (broken)', library: 'java.security' }),
    // Bouncy Castle
    R('RSAKeyPairGenerator|RSAKeyParameters', 'RSA', { context: 'Bouncy Castle RSA', library: 'BouncyCastle' }),
    R('ECKeyPairGenerator|ECNamedCurveTable', 'ECDSA', { context: 'Bouncy Castle EC', library: 'BouncyCastle' }),
    R('KyberParameterSpec|MLKEMParameterSpec', 'AES-256', { context: 'Bouncy Castle PQC ML-KEM (positive)', library: 'BouncyCastle' }),
    R('DilithiumParameterSpec|MLDSAParameterSpec', 'AES-256', { context: 'Bouncy Castle PQC ML-DSA (positive)', library: 'BouncyCastle' }),
    // Spring Security
    R('KeyGenerators\\.secureRandom|Encryptors\\.', 'AES-256', { usage: UsageType.ENCRYPTION, context: 'Spring Security crypto', library: 'spring-security' }),
    // JWT
    R('Jwts\\.builder\\(\\)|SignatureAlgorithm\\.RS', 'RSA', { usage: UsageType.SIGNING, context: 'JJWT RSA signing', library: 'jjwt' }),
    R('SignatureAlgorithm\\.ES', 'ECDSA', { usage: UsageType.SIGNING, context: 'JJWT ECDSA', library: 'jjwt' }),
    // Insecure random
    R('new\\s+Random\\s*\\(|Math\\.random\\s*\\(', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (use SecureRandom)', library: 'java.util' }),
    // TLS
    R('SSLContext\\.getInstance\\s*\\(\\s*"TLSv1(?:\\.1)?"', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Java legacy TLS', library: 'javax.net.ssl', mode: ScanMode.CONFIG }),
    R('setHostnameVerifier.*ALLOW_ALL|new\\s+AllowAllHostnameVerifier', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Java hostname verification disabled', library: 'javax.net.ssl', mode: ScanMode.CONFIG }),
    // PKCS#11 / HSM
    R('PKCS11|SunPKCS11', 'RSA', { context: 'PKCS#11 HSM interface (check key types)', library: 'sun.security.pkcs11' }),

    // Password hashing (audit)
    R('BCrypt\\.hashpw|BCryptPasswordEncoder', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Java bcrypt (OK, check rounds)', library: 'spring-security' }),
    R('Argon2PasswordEncoder|SCryptPasswordEncoder', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Java Argon2/SCrypt (recommended)', library: 'spring-security' }),

    // gRPC Java TLS
    R('GrpcSslContexts|TlsChannelCredentials', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Java gRPC TLS config', library: 'grpc-java' }),

    // Java KeyStore
    R('KeyStore\\.getInstance', 'RSA', { usage: UsageType.CERTIFICATE, context: 'Java KeyStore (check stored key types)', library: 'java.security', mode: ScanMode.CERTIFICATE }),

    // Android KeyStore
    R('KeyGenParameterSpec|AndroidKeyStore', 'RSA', { context: 'Android KeyStore (check key algo)', library: 'android.security' }),
  ],

  // ==================== Go ====================
  go: [
    R('rsa\\.GenerateKey\\s*\\(', 'RSA', { context: 'Go RSA', library: 'crypto/rsa' }),
    R('rsa\\.EncryptOAEP|rsa\\.EncryptPKCS1v15', 'RSA', { usage: UsageType.ENCRYPTION, context: 'Go RSA encrypt', library: 'crypto/rsa' }),
    R('rsa\\.SignPKCS1v15|rsa\\.SignPSS', 'RSA', { usage: UsageType.SIGNING, context: 'Go RSA sign', library: 'crypto/rsa' }),
    R('"crypto/rsa"', 'RSA', { context: 'Go crypto/rsa import', library: 'crypto/rsa' }),
    R('ecdsa\\.GenerateKey\\s*\\(', 'ECDSA-P256', { context: 'Go ECDSA', library: 'crypto/ecdsa' }),
    R('"crypto/ecdsa"', 'ECDSA-P256', { context: 'Go crypto/ecdsa import', library: 'crypto/ecdsa' }),
    R('elliptic\\.P256\\(\\)', 'ECDSA-P256', { context: 'Go P-256 curve', library: 'crypto/elliptic' }),
    R('elliptic\\.P384\\(\\)', 'ECDSA-P384', { context: 'Go P-384 curve', library: 'crypto/elliptic' }),
    R('elliptic\\.P521\\(\\)', 'ECDSA-P521', { context: 'Go P-521 curve', library: 'crypto/elliptic' }),
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
    // TLS
    R('tls\\.Config\\s*\\{', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Go TLS configuration', library: 'crypto/tls' }),
    R('MinVersion:\\s*tls\\.VersionTLS1[01]', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Go legacy TLS version', library: 'crypto/tls', mode: ScanMode.CONFIG }),
    R('InsecureSkipVerify:\\s*true', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Go TLS cert skip verify', library: 'crypto/tls', mode: ScanMode.CONFIG }),
    // JWT
    R('jwt\\.SigningMethodRS|jwt\\.NewWithClaims.*RS', 'RSA', { usage: UsageType.SIGNING, context: 'Go JWT RSA', library: 'golang-jwt' }),
    R('jwt\\.SigningMethodES|jwt\\.NewWithClaims.*ES', 'ECDSA', { usage: UsageType.SIGNING, context: 'Go JWT ECDSA', library: 'golang-jwt' }),
    R('jwt\\.SigningMethodEdDSA', 'Ed25519', { usage: UsageType.SIGNING, context: 'Go JWT EdDSA', library: 'golang-jwt' }),
    // circl PQC (positive)
    R('circl/kem|circl/sign', 'AES-256', { context: 'Go PQC library (circl) - positive signal', library: 'circl' }),
    // AES-ECB
    R('cipher\\.NewECBEncrypter|cipher\\.NewECBDecrypter|NewECBEncrypter', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Go AES-ECB (insecure)', library: 'crypto/cipher' }),
    // Insecure random
    R('math/rand\\b', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (use crypto/rand)', library: 'math/rand' }),
    // SSH
    R('ssh\\.Password\\(|ssh\\.PublicKeys\\(', 'RSA', { usage: UsageType.SSH_CONFIG, context: 'Go SSH authentication', library: 'golang.org/x/crypto/ssh' }),

    // Password hashing
    R('bcrypt\\.GenerateFromPassword|bcrypt\\.CompareHashAndPassword', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Go bcrypt (OK)', library: 'golang.org/x/crypto/bcrypt' }),
    R('argon2\\.IDKey|argon2\\.Key', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Go Argon2 (recommended)', library: 'golang.org/x/crypto/argon2' }),
    R('scrypt\\.Key\\(', 'AES-256', { usage: UsageType.KEY_DERIVATION, context: 'Go scrypt KDF', library: 'golang.org/x/crypto/scrypt' }),

    // gRPC Go TLS
    R('credentials\\.NewTLS|credentials\\.NewServerTLSFromCert', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Go gRPC TLS credentials', library: 'google.golang.org/grpc' }),
  ],

  // ==================== C/C++ (OpenSSL / BoringSSL / mbedTLS / WolfSSL) ====================
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
    R('RC2_set_key|EVP_rc2', 'RC2', { usage: UsageType.ENCRYPTION, context: 'OpenSSL RC2', library: 'OpenSSL' }),
    R('BF_set_key|BF_ecb_encrypt|EVP_bf_', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'OpenSSL Blowfish', library: 'OpenSSL' }),
    R('IDEA_set_encrypt_key|EVP_idea_', 'IDEA', { usage: UsageType.ENCRYPTION, context: 'OpenSSL IDEA', library: 'OpenSSL' }),
    R('CAST_set_key|EVP_cast5_', 'CAST5', { usage: UsageType.ENCRYPTION, context: 'OpenSSL CAST5', library: 'OpenSSL' }),
    R('MD5_Init|MD5_Update|MD5_Final|EVP_md5', 'MD5', { usage: UsageType.HASHING, context: 'OpenSSL MD5', library: 'OpenSSL' }),
    R('#include\\s*<openssl/md5\\.h>', 'MD5', { usage: UsageType.HASHING, context: 'OpenSSL MD5 header', library: 'OpenSSL' }),
    R('SHA1_Init|SHA1_Update|SHA1_Final|EVP_sha1\\b', 'SHA-1', { usage: UsageType.HASHING, context: 'OpenSSL SHA-1', library: 'OpenSSL' }),
    R('MD4_Init|MD4_Update|MD4_Final|EVP_md4', 'MD4', { usage: UsageType.HASHING, context: 'OpenSSL MD4 (broken)', library: 'OpenSSL' }),
    R('RIPEMD160_Init|EVP_ripemd160', 'RIPEMD-160', { usage: UsageType.HASHING, context: 'OpenSSL RIPEMD-160', library: 'OpenSSL' }),
    // EVP high-level
    R('EVP_PKEY_CTX_set_rsa_keygen_bits', 'RSA', { context: 'OpenSSL EVP RSA keygen', library: 'OpenSSL', mode: ScanMode.AST }),
    R('EVP_PKEY_EC', 'ECDSA', { context: 'OpenSSL EVP EC', library: 'OpenSSL' }),
    R('EVP_aes_128_ecb|EVP_aes_256_ecb', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'OpenSSL AES-ECB', library: 'OpenSSL' }),
    // TLS
    R('SSL_CTX_new\\s*\\(\\s*TLSv1_method|SSL_CTX_new\\s*\\(\\s*SSLv23_method', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'OpenSSL legacy TLS method', library: 'OpenSSL', mode: ScanMode.CONFIG }),
    R('SSL_CTX_set_min_proto_version.*TLS1_VERSION\\b', 'RSA',
      { usage: UsageType.TLS_CONFIG, context: 'OpenSSL TLS 1.0 min version', library: 'OpenSSL', mode: ScanMode.CONFIG }),
    // mbedTLS
    R('mbedtls_rsa_gen_key|mbedtls_pk_setup.*MBEDTLS_PK_RSA', 'RSA', { context: 'mbedTLS RSA', library: 'mbedTLS' }),
    R('mbedtls_ecdsa_genkey|mbedtls_ecp_group_load', 'ECDSA', { context: 'mbedTLS ECDSA', library: 'mbedTLS' }),
    R('mbedtls_md5|mbedtls_sha1', 'MD5', { usage: UsageType.HASHING, context: 'mbedTLS weak hash', library: 'mbedTLS' }),
    R('mbedtls_des_|mbedtls_des3_', 'DES', { usage: UsageType.ENCRYPTION, context: 'mbedTLS DES', library: 'mbedTLS' }),
    // WolfSSL
    R('wolfSSL_CTX_new|wc_RsaPublicEncrypt', 'RSA', { context: 'WolfSSL RSA', library: 'WolfSSL' }),
    R('wc_ecc_make_key|wc_ecc_sign_hash', 'ECDSA', { context: 'WolfSSL ECDSA', library: 'WolfSSL' }),
    R('wc_ed25519_make_key|wc_ed25519_sign_msg', 'Ed25519', { usage: UsageType.SIGNING, context: 'WolfSSL Ed25519', library: 'WolfSSL' }),
    // OQS (positive PQC detection)
    R('OQS_KEM_new|OQS_SIG_new', 'AES-256', { context: 'liboqs PQC library (positive signal)', library: 'liboqs' }),
    // Insecure random
    R('\\brand\\s*\\(|\\bsrand\\s*\\(', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (use RAND_bytes)', library: 'libc' }),
  ],

  // ==================== Rust ====================
  rust: [
    R('use\\s+rsa::|RsaPrivateKey::new|RsaPublicKey', 'RSA', { context: 'Rust RSA crate', library: 'rsa' }),
    R('use\\s+p256::|use\\s+p384::|use\\s+p521::', 'ECDSA-P256', { context: 'Rust elliptic curve', library: 'p256/p384/p521' }),
    R('use\\s+ed25519', 'Ed25519', { usage: UsageType.SIGNING, context: 'Rust Ed25519', library: 'ed25519' }),
    R('use\\s+x25519', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Rust X25519', library: 'x25519-dalek' }),
    R('use\\s+ed448', 'Ed448', { usage: UsageType.SIGNING, context: 'Rust Ed448', library: 'ed448-goldilocks' }),
    R('use\\s+des::|Des::', 'DES', { usage: UsageType.ENCRYPTION, context: 'Rust DES', library: 'des' }),
    R('use\\s+triple_des::|TdesEde3::', '3DES', { usage: UsageType.ENCRYPTION, context: 'Rust 3DES', library: 'des' }),
    R('use\\s+md-?5::|Md5::', 'MD5', { usage: UsageType.HASHING, context: 'Rust MD5', library: 'md-5' }),
    R('use\\s+sha1::|Sha1::', 'SHA-1', { usage: UsageType.HASHING, context: 'Rust SHA-1', library: 'sha1' }),
    R('use\\s+blowfish::', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Rust Blowfish', library: 'blowfish' }),
    R('use\\s+rc4::', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Rust RC4', library: 'rc4' }),
    R('use\\s+ring::signature::RSA', 'RSA', { context: 'Rust ring RSA', library: 'ring' }),
    R('use\\s+ring::signature::ECDSA', 'ECDSA', { usage: UsageType.SIGNING, context: 'Rust ring ECDSA', library: 'ring' }),
    R('use\\s+ring::agreement::ECDH', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Rust ring ECDH', library: 'ring' }),
    R('use\\s+ring::agreement::X25519', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Rust ring X25519', library: 'ring' }),
    R('rustls::ClientConfig|rustls::ServerConfig', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Rust TLS config', library: 'rustls' }),
    R('use\\s+k256::', 'secp256k1', { context: 'Rust secp256k1 (k256 crate)', library: 'k256' }),
    R('use\\s+ripemd::|Ripemd160::', 'RIPEMD-160', { usage: UsageType.HASHING, context: 'Rust RIPEMD-160', library: 'ripemd' }),
    // ECB mode
    R('ecb::Encryptor|ecb::Decryptor|Ecb::', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Rust ECB mode', library: 'block-modes' }),
    // PQC positive
    R('use\\s+pqcrypto|use\\s+oqs::', 'AES-256', { context: 'Rust PQC library (positive signal)', library: 'pqcrypto' }),
    R('use\\s+ml_kem::|use\\s+ml_dsa::', 'AES-256', { context: 'Rust PQC ML-KEM/ML-DSA (positive)', library: 'ml-kem/ml-dsa' }),
    // Password hashing
    R('bcrypt::hash|bcrypt::verify', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Rust bcrypt', library: 'bcrypt' }),
    R('argon2::Argon2|Argon2id::', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'Rust Argon2 (recommended)', library: 'argon2' }),
    // WASM crypto
    R('wasm_bindgen.*crypto|web_sys::Crypto', 'RSA', { context: 'Rust WASM crypto binding', library: 'wasm-bindgen' }),
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
    R('RC2CryptoServiceProvider', 'RC2', { usage: UsageType.ENCRYPTION, context: '.NET RC2', library: 'System.Security' }),
    R('RijndaelManaged|new\\s+AesManaged', 'AES-256', { usage: UsageType.ENCRYPTION, context: '.NET AES (legacy API; check key size)', library: 'System.Security' }),
    R('AesCryptoServiceProvider|Aes\\.Create', 'AES-256', { usage: UsageType.ENCRYPTION, context: '.NET AES (check key size)', library: 'System.Security' }),
    R('CipherMode\\.ECB', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: '.NET AES-ECB mode', library: 'System.Security' }),
    // .NET JWT
    R('SecurityAlgorithms\\.RsaSha256|SecurityAlgorithms\\.RsaSha512', 'RSA', { usage: UsageType.SIGNING, context: '.NET JWT RSA', library: 'Microsoft.IdentityModel' }),
    R('SecurityAlgorithms\\.EcdsaSha256', 'ECDSA', { usage: UsageType.SIGNING, context: '.NET JWT ECDSA', library: 'Microsoft.IdentityModel' }),
    // SslStream
    R('SslStream|SslProtocols\\.Tls1[01]?\\b', 'RSA', { usage: UsageType.TLS_CONFIG, context: '.NET TLS configuration', library: 'System.Net.Security' }),
    R('ServicePointManager\\.SecurityProtocol.*Tls11|Tls\\b(?!1[23])', 'RSA', { usage: UsageType.TLS_CONFIG, context: '.NET legacy TLS', library: 'System.Net', mode: ScanMode.CONFIG }),
    // Insecure random
    R('new\\s+Random\\s*\\(', 'AES-256', { usage: UsageType.RANDOM, context: 'Insecure PRNG (use RandomNumberGenerator)', library: 'System' }),
    // PQC positive
    R('ML-KEM|ML-DSA|Kyber|Dilithium', 'AES-256', { context: '.NET PQC usage (positive)', library: 'BouncyCastle' }),
    // Password hashing
    R('BCrypt\\.HashPassword|BCrypt\\.Verify', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: '.NET BCrypt (OK)', library: 'BCrypt.Net' }),
    R('Argon2id|Konscious.*Argon2', 'AES-256', { usage: UsageType.PASSWORD_HASH, context: '.NET Argon2 (recommended)', library: 'Konscious' }),
  ],

  // ==================== PHP ====================
  php: [
    R('openssl_pkey_new.*RSA|OPENSSL_KEYTYPE_RSA', 'RSA', { context: 'PHP OpenSSL RSA', library: 'openssl' }),
    R('openssl_sign|openssl_verify', 'RSA', { usage: UsageType.SIGNING, context: 'PHP OpenSSL signing', library: 'openssl' }),
    R('openssl_encrypt\\s*\\(.*DES', 'DES', { usage: UsageType.ENCRYPTION, context: 'PHP DES', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*RC4', 'RC4', { usage: UsageType.ENCRYPTION, context: 'PHP RC4', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*RC2', 'RC2', { usage: UsageType.ENCRYPTION, context: 'PHP RC2', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*BF', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'PHP Blowfish', library: 'openssl', flags: 'gi' }),
    R('openssl_encrypt\\s*\\(.*ECB', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'PHP AES-ECB mode', library: 'openssl', flags: 'gi' }),
    R('\\bmd5\\s*\\(', 'MD5', { usage: UsageType.HASHING, context: 'PHP md5()', library: 'core' }),
    R('\\bsha1\\s*\\(', 'SHA-1', { usage: UsageType.HASHING, context: 'PHP sha1()', library: 'core' }),
    R('\\bmd4\\s*\\(|hash\\s*\\(\\s*[\'"]md4', 'MD4', { usage: UsageType.HASHING, context: 'PHP MD4 (broken)', library: 'core' }),
    R('sodium_crypto_box_keypair|sodium_crypto_sign_keypair', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'PHP Sodium', library: 'sodium' }),
    R('openssl_dh_compute_key|OPENSSL_KEYTYPE_DH', 'DH-2048', { usage: UsageType.KEY_EXCHANGE, context: 'PHP DH', library: 'openssl' }),
    R('openssl_pkey_new.*OPENSSL_KEYTYPE_EC', 'ECDSA', { context: 'PHP OpenSSL EC', library: 'openssl' }),
    R('openssl_pkey_new.*OPENSSL_KEYTYPE_DSA', 'DSA', { context: 'PHP OpenSSL DSA', library: 'openssl' }),
    R("openssl_get_cipher_methods|openssl_cipher_iv_length", 'RSA', { usage: UsageType.ENCRYPTION, context: 'PHP OpenSSL cipher usage', library: 'openssl' }),
    // Laravel / framework
    R("Crypt::encrypt|Hash::make\\(.*md5", 'MD5', { usage: UsageType.HASHING, context: 'Laravel crypto facade', library: 'laravel', flags: 'gi' }),
    // JWT
    R("Firebase\\\\JWT|JWT::encode", 'RSA', { usage: UsageType.SIGNING, context: 'PHP JWT library', library: 'firebase/php-jwt' }),
    // Password hashing
    R("password_hash\\s*\\(.*PASSWORD_BCRYPT|PASSWORD_ARGON2", 'AES-256', { usage: UsageType.PASSWORD_HASH, context: 'PHP password_hash (OK)', library: 'core' }),
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
    R('OpenSSL::Cipher.*ECB', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Ruby AES-ECB mode', library: 'openssl' }),
    R('Digest::MD5', 'MD5', { usage: UsageType.HASHING, context: 'Ruby MD5', library: 'digest' }),
    R('Digest::SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'Ruby SHA-1', library: 'digest' }),
    R('Ed25519::SigningKey|RbNaCl::Signatures::Ed25519', 'Ed25519', { usage: UsageType.SIGNING, context: 'Ruby Ed25519', library: 'ed25519' }),
    R('JWT\\.encode.*RS256|JWT\\.encode.*RS512', 'RSA', { usage: UsageType.SIGNING, context: 'Ruby JWT RSA', library: 'ruby-jwt' }),
    R('JWT\\.encode.*ES256', 'ECDSA', { usage: UsageType.SIGNING, context: 'Ruby JWT ECDSA', library: 'ruby-jwt' }),
    // TLS
    R('ssl_context.*ssl_version|OpenSSL::SSL::SSLContext', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Ruby SSL context', library: 'openssl' }),
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
    R('Cipher\\.getInstance\\s*\\(\\s*"AES/ECB', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Kotlin AES-ECB', library: 'javax.crypto' }),
    R('Cipher\\.getInstance\\s*\\(\\s*"AES"\\)', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Kotlin AES no mode (defaults ECB)', library: 'javax.crypto' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"MD5"', 'MD5', { usage: UsageType.HASHING, context: 'Kotlin MD5', library: 'java.security' }),
    R('MessageDigest\\.getInstance\\s*\\(\\s*"SHA-?1"', 'SHA-1', { usage: UsageType.HASHING, context: 'Kotlin SHA-1', library: 'java.security' }),
    R('SecureRandom|java\\.security\\.SecureRandom', 'AES-256', { usage: UsageType.RANDOM, context: 'Secure random (OK)', library: 'java.security' }),
  ],

  // ==================== Swift ====================
  swift: [
    R('SecKeyCreateRandomKey.*kSecAttrKeyTypeRSA', 'RSA', { context: 'Swift Security RSA', library: 'Security' }),
    R('SecKeyCreateRandomKey.*kSecAttrKeyTypeECSECPrimeRandom', 'ECDSA-P256', { context: 'Swift Security EC', library: 'Security' }),
    R('CC_MD5\\b|Insecure\\.MD5', 'MD5', { usage: UsageType.HASHING, context: 'Swift MD5', library: 'CryptoKit' }),
    R('CC_SHA1\\b|Insecure\\.SHA1', 'SHA-1', { usage: UsageType.HASHING, context: 'Swift SHA-1', library: 'CryptoKit' }),
    R('Curve25519\\.Signing', 'Ed25519', { usage: UsageType.SIGNING, context: 'Swift Ed25519', library: 'CryptoKit' }),
    R('Curve25519\\.KeyAgreement', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Swift X25519', library: 'CryptoKit' }),
    R('ChaChaPoly|AES\\.GCM', 'AES-256', { usage: UsageType.ENCRYPTION, context: 'Swift AES-GCM / ChaChaPoly (safe)', library: 'CryptoKit' }),
    R('SecTrustEvaluate|URLSession.*tlsMinimumSupportedProtocol', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Swift TLS config', library: 'Security' }),
    R('P256\\.Signing|P384\\.Signing|P521\\.Signing', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Swift CryptoKit ECDSA', library: 'CryptoKit' }),
    R('P256\\.KeyAgreement|P384\\.KeyAgreement', 'ECDH', { usage: UsageType.KEY_EXCHANGE, context: 'Swift CryptoKit ECDH', library: 'CryptoKit' }),
    R('HPKE\\.Sender|HPKE\\.Recipient', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'Swift HPKE (hybrid encryption)', library: 'CryptoKit' }),
  ],

  // ==================== Dart / Flutter ====================
  dart: [
    R("import\\s+['\"]package:pointycastle", 'RSA', { context: 'Dart PointyCastle import', library: 'pointycastle' }),
    R('RSAKeyGenerator|RSAEngine', 'RSA', { context: 'Dart RSA', library: 'pointycastle' }),
    R('ECKeyGenerator|ECDSASigner', 'ECDSA-P256', { usage: UsageType.SIGNING, context: 'Dart ECDSA', library: 'pointycastle' }),
    R('MD5Digest|md5\\.convert', 'MD5', { usage: UsageType.HASHING, context: 'Dart MD5', library: 'pointycastle/crypto' }),
    R('SHA1Digest|sha1\\.convert', 'SHA-1', { usage: UsageType.HASHING, context: 'Dart SHA-1', library: 'pointycastle/crypto' }),
    R('DESEngine|TripleDESEngine', 'DES', { usage: UsageType.ENCRYPTION, context: 'Dart DES/3DES', library: 'pointycastle' }),
    R('BlowfishEngine', 'Blowfish', { usage: UsageType.ENCRYPTION, context: 'Dart Blowfish', library: 'pointycastle' }),
    R('RC4Engine', 'RC4', { usage: UsageType.ENCRYPTION, context: 'Dart RC4', library: 'pointycastle' }),
    R('ECBBlockCipher', 'AES-ECB', { usage: UsageType.ENCRYPTION, context: 'Dart AES-ECB mode', library: 'pointycastle' }),
    R("import\\s+['\"]package:encrypt", 'RSA', { context: 'Dart encrypt package', library: 'encrypt' }),
  ],

  // ==================== Config files ====================
  config: [
    R('ssl_ciphers.*(?:RC4|DES|3DES|MD5|NULL|EXPORT|aNULL|eNULL)', 'RC4', { usage: UsageType.TLS_CONFIG, context: 'Nginx/Apache weak cipher suite', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('SSLCipherSuite.*(?:RC4|DES|3DES|MD5|NULL|EXPORT)', 'RC4', { usage: UsageType.TLS_CONFIG, context: 'Apache weak cipher suite', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('TLSv1\\.0|TLSv1\\.1|SSLv3|SSLv2', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Legacy TLS/SSL version', mode: ScanMode.CONFIG }),
    R('ssl_protocols.*TLSv1(?:\\.0|\\.1)', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Nginx legacy TLS protocol', mode: ScanMode.CONFIG }),
    R('ssh-rsa\\b', 'RSA', { usage: UsageType.SSH_CONFIG, context: 'SSH RSA key type', mode: ScanMode.CONFIG }),
    R('ssh-dss\\b', 'DSA', { usage: UsageType.SSH_CONFIG, context: 'SSH DSA key type (deprecated)', mode: ScanMode.CONFIG }),
    R('ecdsa-sha2-nistp256', 'ECDSA-P256', { usage: UsageType.SSH_CONFIG, context: 'SSH ECDSA-P256 key', mode: ScanMode.CONFIG }),
    R('ssh-ed25519\\b', 'Ed25519', { usage: UsageType.SSH_CONFIG, context: 'SSH Ed25519 key', mode: ScanMode.CONFIG }),
    R('MinProtocol\\s*=\\s*TLSv1(?:\\.0|\\.1)?\\b', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'OpenSSL legacy TLS', mode: ScanMode.CONFIG }),
    R('CipherString\\s*=.*(?:DES|RC4|MD5|3DES)', 'RC4', { usage: UsageType.TLS_CONFIG, context: 'OpenSSL cipher string weak algo', mode: ScanMode.CONFIG, flags: 'gi' }),
    // SSH config
    R('Ciphers.*(?:3des-cbc|blowfish-cbc|arcfour|cast128)', 'DES', { usage: UsageType.SSH_CONFIG, context: 'SSH weak cipher', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('MACs.*hmac-md5|MACs.*hmac-sha1\\b', 'MD5', { usage: UsageType.SSH_CONFIG, context: 'SSH weak MAC', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('KexAlgorithms.*diffie-hellman-group1|KexAlgorithms.*diffie-hellman-group14', 'DH-2048', { usage: UsageType.SSH_CONFIG, context: 'SSH weak key exchange', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('HostKeyAlgorithms.*ssh-rsa|HostKeyAlgorithms.*ssh-dss', 'RSA', { usage: UsageType.SSH_CONFIG, context: 'SSH weak host key algorithm', mode: ScanMode.CONFIG, flags: 'gi' }),
    // Docker / K8s
    R('--tls-min-version.*1\\.0|--tls-cipher-suites.*RC4', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'K8s/Docker TLS config', mode: ScanMode.CONFIG, flags: 'gi' }),
    // Certificate files
    R('BEGIN RSA PRIVATE KEY|BEGIN DSA PRIVATE KEY', 'RSA', { usage: UsageType.CERTIFICATE, context: 'Private key file (potential exposure)', mode: ScanMode.CERTIFICATE }),
    R('BEGIN EC PRIVATE KEY', 'ECDSA', { usage: UsageType.CERTIFICATE, context: 'EC private key file', mode: ScanMode.CERTIFICATE }),
    R('BEGIN CERTIFICATE', 'RSA', { usage: UsageType.CERTIFICATE, context: 'X.509 certificate', mode: ScanMode.CERTIFICATE }),
    R('BEGIN OPENSSH PRIVATE KEY', 'Ed25519', { usage: UsageType.CERTIFICATE, context: 'OpenSSH private key', mode: ScanMode.CERTIFICATE }),
    // Terraform / IaC
    R('tls_version\\s*=\\s*"TLSv1\\.0"|tls_version\\s*=\\s*"TLSv1\\.1"', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'Terraform legacy TLS', mode: ScanMode.CONFIG }),
    R('min_tls_version\\s*=\\s*"1\\.0"|min_tls_version\\s*=\\s*"1\\.1"', 'RSA', { usage: UsageType.TLS_CONFIG, context: 'IaC legacy TLS version', mode: ScanMode.CONFIG }),
    R('algorithm\\s*=\\s*"RSA"|key_algorithm\\s*=\\s*"RSA_PKCS1_2048"', 'RSA', { context: 'Terraform RSA key', mode: ScanMode.CONFIG }),
    R('algorithm\\s*=\\s*"ECDSA"', 'ECDSA', { context: 'Terraform ECDSA key', mode: ScanMode.CONFIG }),
    // IPsec / VPN
    R('esp-3des|ah-md5-hmac|esp-des', 'DES', { usage: UsageType.ENCRYPTION, context: 'IPsec weak cipher', mode: ScanMode.CONFIG, flags: 'gi' }),
    R('ike.*group\\s*(?:1|2|5)\\b|dh-group.*(?:1|2|5)\\b', 'DH-1024', { usage: UsageType.KEY_EXCHANGE, context: 'IKE/IPsec weak DH group', mode: ScanMode.CONFIG }),
    // WireGuard (positive)
    R('\\[Interface\\].*PrivateKey|\\[Peer\\].*PublicKey', 'X25519', { usage: UsageType.KEY_EXCHANGE, context: 'WireGuard X25519 (check migration timeline)', mode: ScanMode.CONFIG }),
  ],

  // ==================== Dependency files ====================
  dependency: [
    // Python
    R('pycryptodome|pycrypto(?!dome)', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python crypto library dependency', mode: ScanMode.DEPENDENCY }),
    R('paramiko', 'RSA', { usage: UsageType.DEPENDENCY, context: 'SSH library (uses RSA)', mode: ScanMode.DEPENDENCY }),
    R('pyOpenSSL', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python OpenSSL binding', mode: ScanMode.DEPENDENCY }),
    R('cryptography[>=<]', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python cryptography library', mode: ScanMode.DEPENDENCY }),
    R('PyJWT|python-jose', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Python JWT library (check algo)', mode: ScanMode.DEPENDENCY }),
    R('liboqs-python|oqs', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'PQC library (positive)', mode: ScanMode.DEPENDENCY }),
    R('bcrypt|argon2-cffi|passlib', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'Password hashing library (positive)', mode: ScanMode.DEPENDENCY }),
    // JavaScript
    R('"node-rsa"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'node-rsa dependency', mode: ScanMode.DEPENDENCY }),
    R('"node-forge"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'node-forge dependency', mode: ScanMode.DEPENDENCY }),
    R('"crypto-js"', 'MD5', { usage: UsageType.DEPENDENCY, context: 'crypto-js (may use weak ciphers)', mode: ScanMode.DEPENDENCY }),
    R('"jsonwebtoken"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'JWT library (check signing algo)', mode: ScanMode.DEPENDENCY }),
    R('"elliptic"', 'ECDSA', { usage: UsageType.DEPENDENCY, context: 'elliptic curve library', mode: ScanMode.DEPENDENCY }),
    R('"@noble/ed25519"|"tweetnacl"', 'Ed25519', { usage: UsageType.DEPENDENCY, context: 'Curve25519 library', mode: ScanMode.DEPENDENCY }),
    R('"crystals-kyber"|"liboqs"', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'PQC library (positive)', mode: ScanMode.DEPENDENCY }),
    R('"ethers"|"web3"', 'secp256k1', { usage: UsageType.DEPENDENCY, context: 'Blockchain/Web3 dependency (secp256k1)', mode: ScanMode.DEPENDENCY }),
    R('"bcrypt"|"argon2"', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'Password hashing (positive)', mode: ScanMode.DEPENDENCY }),
    // Java
    R('bouncy-castle|bcprov-jdk|bcpkix-jdk', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Bouncy Castle dependency', mode: ScanMode.DEPENDENCY }),
    R('io\\.jsonwebtoken|com\\.auth0.*java-jwt', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Java JWT library', mode: ScanMode.DEPENDENCY }),
    // Ruby
    R('"rbnacl"|"ed25519"', 'Ed25519', { usage: UsageType.DEPENDENCY, context: 'Ruby crypto dependency', mode: ScanMode.DEPENDENCY }),
    R('"jwt"|"ruby-jwt"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Ruby JWT dependency', mode: ScanMode.DEPENDENCY }),
    // Go
    R('golang\\.org/x/crypto', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Go x/crypto dependency', mode: ScanMode.DEPENDENCY }),
    R('github\\.com/cloudflare/circl', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'Go PQC library (positive)', mode: ScanMode.DEPENDENCY }),
    R('github\\.com/golang-jwt/jwt', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Go JWT dependency', mode: ScanMode.DEPENDENCY }),
    // Rust
    R('rsa\\s*=|ring\\s*=|openssl\\s*=', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Rust crypto dependency', mode: ScanMode.DEPENDENCY }),
    R('pqcrypto\\s*=|ml-kem\\s*=', 'AES-256', { usage: UsageType.DEPENDENCY, context: 'Rust PQC dependency (positive)', mode: ScanMode.DEPENDENCY }),
    R('k256\\s*=|secp256k1\\s*=', 'secp256k1', { usage: UsageType.DEPENDENCY, context: 'Rust secp256k1 dependency (blockchain)', mode: ScanMode.DEPENDENCY }),
    // .NET
    R('System\\.Security\\.Cryptography', 'RSA', { usage: UsageType.DEPENDENCY, context: '.NET crypto dependency', mode: ScanMode.DEPENDENCY }),
    R('Microsoft\\.IdentityModel\\.Tokens', 'RSA', { usage: UsageType.DEPENDENCY, context: '.NET JWT dependency', mode: ScanMode.DEPENDENCY }),
    // PHP
    R('"phpseclib|php-jwt|defuse/php-encryption"', 'RSA', { usage: UsageType.DEPENDENCY, context: 'PHP crypto dependency', mode: ScanMode.DEPENDENCY }),
    // Dart
    R('pointycastle:|encrypt:|crypto:', 'RSA', { usage: UsageType.DEPENDENCY, context: 'Dart crypto dependency', mode: ScanMode.DEPENDENCY }),
  ],
};

// File extension to language mapping
const EXT_LANG_MAP = {
  '.py': 'python', '.pyw': 'python',
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'javascript', '.tsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.java': 'java',
  '.go': 'go',
  '.c': 'c', '.cpp': 'c', '.cc': 'c', '.h': 'c', '.hpp': 'c', '.cxx': 'c', '.m': 'c', '.mm': 'c',
  '.rs': 'rust',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby', '.erb': 'ruby',
  '.kt': 'kotlin', '.kts': 'kotlin', '.scala': 'kotlin',
  '.swift': 'swift',
  '.dart': 'dart',
  '.conf': 'config', '.cfg': 'config', '.ini': 'config',
  '.yaml': 'config', '.yml': 'config', '.toml': 'config', '.xml': 'config',
  '.pem': 'config', '.crt': 'config', '.key': 'config', '.cer': 'config', '.p12': 'config',
  '.env': 'config', '.properties': 'config',
  '.tf': 'config', '.hcl': 'config',
  '.dockerfile': 'config',
  '.ssh': 'config',
  '.proto': 'config', '.gradle': 'config', '.sbt': 'config',
  '.csr': 'config', '.der': 'config', '.pfx': 'config',
  'requirements.txt': 'dependency', 'Pipfile': 'dependency',
  'package.json': 'dependency', 'package-lock.json': 'dependency',
  'go.mod': 'dependency', 'go.sum': 'dependency',
  'pom.xml': 'dependency', 'build.gradle': 'dependency',
  'Cargo.toml': 'dependency',
  'Gemfile': 'dependency',
  'pubspec.yaml': 'dependency',
};

// Dependency file exact name matches
const DEP_FILE_NAMES = new Set([
  'requirements.txt', 'Pipfile', 'setup.py', 'pyproject.toml', 'setup.cfg',
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'go.mod', 'go.sum',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle',
  'Cargo.toml', 'Cargo.lock',
  'Gemfile', 'Gemfile.lock',
  'composer.json', 'composer.lock',
  '.csproj', 'Directory.Packages.props', 'packages.config',
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'pubspec.yaml', 'pubspec.lock',
  'Podfile', 'Podfile.lock',
  'sshd_config', 'ssh_config',
]);

module.exports = { SCAN_RULES, EXT_LANG_MAP, DEP_FILE_NAMES };
