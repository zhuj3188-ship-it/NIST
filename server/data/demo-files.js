/** Demo vulnerable code files for scanning */
const DEMO_FILES = [
  { name: 'src/auth/login_service.py', language: 'python', content: `"""User Authentication Service — Legacy Implementation"""
import hashlib
from Crypto.PublicKey import RSA, ECC, DSA
from Crypto.Cipher import PKCS1_OAEP, DES, DES3
from Crypto.Signature import DSS
from Crypto.Hash import SHA256, MD5
from cryptography.hazmat.primitives.asymmetric import rsa, ec, dh, dsa, ed25519, x25519
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

class AuthService:
    def __init__(self):
        # RSA-2048 for token encryption
        self.rsa_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        # ECDSA P-256 for JWT signing
        self.ec_key = ec.generate_private_key(ec.SECP256R1())
        # DSA for legacy signatures
        self.dsa_key = dsa.generate_private_key(key_size=2048)
        # DH for key exchange
        self.dh_params = dh.generate_parameters(generator=2, key_size=2048)
        # Ed25519 for modern signatures
        self.ed_key = ed25519.Ed25519PrivateKey.generate()
        # X25519 for modern key exchange
        self.x_key = x25519.X25519PrivateKey.generate()

    def hash_password(self, password: str) -> str:
        return hashlib.md5(password.encode()).hexdigest()

    def session_fingerprint(self, session_id: str) -> str:
        return hashlib.sha1(session_id.encode()).hexdigest()

    def encrypt_token(self, token_data: bytes) -> bytes:
        public_key = self.rsa_key.public_key()
        return public_key.encrypt(token_data,
            padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),
                         algorithm=hashes.SHA256(), label=None))

    def sign_jwt(self, payload: bytes) -> bytes:
        return self.ec_key.sign(payload, ec.ECDSA(hashes.SHA256()))

    def legacy_encrypt(self, data: bytes, key: bytes) -> bytes:
        cipher = DES.new(key[:8], DES.MODE_ECB)
        return cipher.encrypt(data)

    def legacy_3des_encrypt(self, data: bytes, key: bytes) -> bytes:
        cipher = DES3.new(key[:24], DES3.MODE_ECB)
        return cipher.encrypt(data)

    def pycrypto_rsa(self):
        key = RSA.generate(1024)  # Dangerously small!
        return key.export_key()

    def create_api_key(self, user_id: str):
        raw = f"apikey-{user_id}-secret"
        return hashlib.sha1(raw.encode()).hexdigest()
` },
  { name: 'src/crypto/key_exchange.js', language: 'javascript', content: `const crypto = require('crypto');

/**
 * Key Exchange & Encryption Service
 * Contains multiple quantum-vulnerable patterns
 */
class KeyExchangeService {
  constructor() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  createDHExchange() {
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();
    return { publicKey: dh.getPublicKey('hex'), prime: dh.getPrime('hex') };
  }

  createECDH() {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.generateKeys();
    return ecdh.getPublicKey('hex');
  }

  signData(data) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.privateKey, 'hex');
  }

  quickHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  fingerprint(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
  }
}

module.exports = KeyExchangeService;
` },
  { name: 'src/security/CertManager.java', language: 'java', content: `package com.example.security;

import java.security.*;
import java.security.spec.ECGenParameterSpec;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;

public class CertManager {
    private KeyPair rsaKeyPair;
    private KeyPair ecKeyPair;

    public CertManager() throws Exception {
        KeyPairGenerator rsaGen = KeyPairGenerator.getInstance("RSA");
        rsaGen.initialize(2048);
        this.rsaKeyPair = rsaGen.generateKeyPair();

        KeyPairGenerator ecGen = KeyPairGenerator.getInstance("EC");
        ecGen.initialize(new ECGenParameterSpec("secp256r1"));
        this.ecKeyPair = ecGen.generateKeyPair();
    }

    public byte[] encryptRSA(byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        cipher.init(Cipher.ENCRYPT_MODE, rsaKeyPair.getPublic());
        return cipher.doFinal(data);
    }

    public byte[] signECDSA(byte[] data) throws Exception {
        Signature sig = Signature.getInstance("SHA256withECDSA");
        sig.initSign(ecKeyPair.getPrivate());
        sig.update(data);
        return sig.sign();
    }

    public byte[] hashMD5(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        return md.digest(data);
    }

    public byte[] hashSHA1(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        return md.digest(data);
    }

    public void performDH() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("DH");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        KeyAgreement ka = KeyAgreement.getInstance("DH");
        ka.init(kp.getPrivate());
    }

    public byte[] legacyDES(byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        return cipher.doFinal(data);
    }
}
` },
  { name: 'src/tls/config.go', language: 'go', content: `package tls

import (
\t"crypto/ecdsa"
\t"crypto/elliptic"
\t"crypto/md5"
\t"crypto/rand"
\t"crypto/rsa"
\t"crypto/sha1"
\t"crypto/ed25519"
)

type TLSConfig struct {
\trsaKey  *rsa.PrivateKey
\tecKey   *ecdsa.PrivateKey
\tedKey   ed25519.PrivateKey
}

func NewTLSConfig() (*TLSConfig, error) {
\trsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
\tif err != nil { return nil, err }

\tecKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
\tif err != nil { return nil, err }

\t_, edKey, err := ed25519.GenerateKey(rand.Reader)
\tif err != nil { return nil, err }

\treturn &TLSConfig{rsaKey: rsaKey, ecKey: ecKey, edKey: edKey}, nil
}

func (t *TLSConfig) SignRSA(data []byte) ([]byte, error) {
\thash := sha1.Sum(data)
\treturn rsa.SignPKCS1v15(rand.Reader, t.rsaKey, 0, hash[:])
}

func (t *TLSConfig) Fingerprint(data []byte) [16]byte {
\treturn md5.Sum(data)
}

func (t *TLSConfig) SignEd25519(data []byte) []byte {
\treturn ed25519.Sign(t.edKey, data)
}
` },
  { name: 'src/legacy/encryption.c', language: 'c', content: `#include <openssl/rsa.h>
#include <openssl/ec.h>
#include <openssl/md5.h>
#include <openssl/des.h>
#include <openssl/evp.h>
#include <string.h>

RSA* generate_rsa_keypair(int bits) {
    return RSA_generate_key(bits, RSA_F4, NULL, NULL);
}

int rsa_encrypt(RSA *rsa, const unsigned char *pt, int len, unsigned char *ct) {
    return RSA_public_encrypt(len, pt, ct, rsa, RSA_PKCS1_OAEP_PADDING);
}

int ec_sign(const unsigned char *hash, int hlen, unsigned char *sig, unsigned int *slen) {
    EC_KEY *key = EC_KEY_new_by_curve_name(NID_X9_62_prime256v1);
    EC_KEY_generate_key(key);
    int r = ECDSA_sign(0, hash, hlen, sig, slen, key);
    EC_KEY_free(key);
    return r;
}

void compute_md5(const unsigned char *data, size_t len, unsigned char *digest) {
    MD5_CTX ctx;
    MD5_Init(&ctx);
    MD5_Update(&ctx, data, len);
    MD5_Final(digest, &ctx);
}

void des_encrypt(const unsigned char *key8, const unsigned char *in, unsigned char *out) {
    DES_key_schedule schedule;
    DES_cblock des_key;
    memcpy(des_key, key8, 8);
    DES_set_key(&des_key, &schedule);
    DES_ecb_encrypt((DES_cblock *)in, (DES_cblock *)out, &schedule, DES_ENCRYPT);
}

DH* create_dh() {
    return DH_generate_parameters(2048, DH_GENERATOR_2, NULL, NULL);
}
` },
  { name: 'requirements.txt', language: 'python', content: `cryptography==42.0.0
pycryptodome==3.19.0
paramiko==3.4.0
pyOpenSSL==23.3.0
Flask==3.0.0
requests==2.31.0
` },
];

module.exports = DEMO_FILES;
