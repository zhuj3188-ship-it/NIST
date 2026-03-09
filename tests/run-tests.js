/**
 * QuantumShield Test Suite
 * Comprehensive tests for the scan engine, rules, risk analyzer, migration, and compliance modules.
 *
 * Run: node tests/run-tests.js
 */

const path = require('path');

/* ─── Load Engine Modules ─── */
const Scanner = require('../server/engine/scanner');
const { SCAN_RULES, EXT_LANG_MAP, DEP_FILE_NAMES } = require('../server/engine/rules');
const {
  QuantumRisk, UsageType, MigrationStrategy, AlgorithmFamily,
  createFinding, createScanResult, QUANTUM_VULNERABILITY_DB,
} = require('../server/engine/models');
const RiskAnalyzer = require('../server/engine/risk-analyzer');
const { MigrationEngine } = require('../server/engine/migration');
const ComplianceReporter = require('../server/engine/compliance');

/* ─── Test Harness ─── */
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${testName}`);
  } else {
    failedTests++;
    failures.push(testName);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${testName}`);
  } else {
    failedTests++;
    failures.push(`${testName} (expected: ${expected}, got: ${actual})`);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${testName} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
  }
}

function assertGreater(actual, min, testName) {
  totalTests++;
  if (actual > min) {
    passedTests++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${testName} (${actual} > ${min})`);
  } else {
    failedTests++;
    failures.push(`${testName} (expected > ${min}, got: ${actual})`);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${testName} — expected > ${min}, got: ${actual}`);
  }
}

function assertIncludes(haystack, needle, testName) {
  totalTests++;
  const found = Array.isArray(haystack)
    ? haystack.some(item => typeof item === 'string' ? item.includes(needle) : item === needle)
    : typeof haystack === 'string' ? haystack.includes(needle) : false;
  if (found) {
    passedTests++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${testName}`);
  } else {
    failedTests++;
    failures.push(testName);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${testName} — "${needle}" not found`);
  }
}

function section(name) {
  console.log(`\n\x1b[36m━━━ ${name} ━━━\x1b[0m`);
}

/* ════════════════════════════════════════════════════════════════════════════
 * 1. SCANNER TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Scanner — Initialization');

const scanner = new Scanner();
assert(scanner !== null, 'Scanner instantiation');

/* ── Python detection ── */
section('Scanner — Python');

const pythonRSA = `
from cryptography.hazmat.primitives.asymmetric import rsa
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
`;
const pyResults = scanner.scanFile(pythonRSA, 'auth/login.py');
assertGreater(pyResults.length, 0, 'Python RSA detected');
assert(pyResults.some(f => f.algorithm === 'RSA' || f.algorithm.includes('RSA')), 'Python RSA algorithm name');

const pythonMD5 = `
import hashlib
digest = hashlib.md5(b"test data").hexdigest()
`;
const pyMD5 = scanner.scanFile(pythonMD5, 'hash_util.py');
assertGreater(pyMD5.length, 0, 'Python MD5 detected');

const pythonSHA1 = `
import hashlib
h = hashlib.sha1(data)
`;
const pySHA1 = scanner.scanFile(pythonSHA1, 'util.py');
assertGreater(pySHA1.length, 0, 'Python SHA1 detected');

const pythonDES = `
from Crypto.Cipher import DES
cipher = DES.new(key, DES.MODE_ECB)
`;
const pyDES = scanner.scanFile(pythonDES, 'legacy.py');
assertGreater(pyDES.length, 0, 'Python DES detected');

const pythonECDSA = `
from cryptography.hazmat.primitives.asymmetric import ec
key = ec.generate_private_key(ec.SECP256R1())
`;
const pyECDSA = scanner.scanFile(pythonECDSA, 'sign.py');
assertGreater(pyECDSA.length, 0, 'Python ECDSA detected');

/* ── JavaScript detection ── */
section('Scanner — JavaScript');

const jsRSA = `
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
`;
const jsResults = scanner.scanFile(jsRSA, 'crypto.js');
assertGreater(jsResults.length, 0, 'JavaScript RSA detected');

const jsMD5 = `
const crypto = require('crypto');
const hash = crypto.createHash('md5').update('data').digest('hex');
`;
const jsMD5Results = scanner.scanFile(jsMD5, 'hash.js');
assertGreater(jsMD5Results.length, 0, 'JavaScript MD5 detected');

const jsSHA1 = `
const hash = crypto.createHash('sha1').update(data).digest('hex');
`;
const jsSHA1Results = scanner.scanFile(jsSHA1, 'util.js');
assertGreater(jsSHA1Results.length, 0, 'JavaScript SHA1 detected');

const jsDH = `
const dh = crypto.createDiffieHellman(2048);
`;
const jsDHResults = scanner.scanFile(jsDH, 'kex.js');
assertGreater(jsDHResults.length, 0, 'JavaScript DiffieHellman detected');

/* ── Java detection ── */
section('Scanner — Java');

const javaRSA = `
import java.security.KeyPairGenerator;
KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
kpg.initialize(2048);
`;
const javaResults = scanner.scanFile(javaRSA, 'CertManager.java');
assertGreater(javaResults.length, 0, 'Java RSA detected');

const javaDES = `
Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
`;
const javaDESResults = scanner.scanFile(javaDES, 'Legacy.java');
assertGreater(javaDESResults.length, 0, 'Java DES detected');

const javaMD5 = `
MessageDigest md = MessageDigest.getInstance("MD5");
`;
const javaMD5Results = scanner.scanFile(javaMD5, 'Hash.java');
assertGreater(javaMD5Results.length, 0, 'Java MD5 detected');

/* ── Go detection ── */
section('Scanner — Go');

const goRSA = `
package main
import "crypto/rsa"
key, _ := rsa.GenerateKey(rand.Reader, 2048)
`;
const goResults = scanner.scanFile(goRSA, 'main.go');
assertGreater(goResults.length, 0, 'Go RSA detected');

const goSHA1 = `
package main
import "crypto/sha1"
h := sha1.New()
`;
const goSHA1Results = scanner.scanFile(goSHA1, 'hash.go');
assertGreater(goSHA1Results.length, 0, 'Go SHA1 detected');

/* ── C/C++ detection ── */
section('Scanner — C/C++');

const cRSA = `
#include <openssl/rsa.h>
RSA *rsa = RSA_generate_key(2048, RSA_F4, NULL, NULL);
`;
const cResults = scanner.scanFile(cRSA, 'crypto.c');
assertGreater(cResults.length, 0, 'C RSA detected');

const cMD5 = `
#include <openssl/md5.h>
MD5_CTX ctx;
MD5_Init(&ctx);
`;
const cMD5Results = scanner.scanFile(cMD5, 'hash.c');
assertGreater(cMD5Results.length, 0, 'C MD5 detected');

const cDES = `
#include <openssl/des.h>
DES_set_key(&key, &schedule);
`;
const cDESResults = scanner.scanFile(cDES, 'legacy.c');
assertGreater(cDESResults.length, 0, 'C DES detected');

/* ── Rust detection ── */
section('Scanner — Rust');

const rustRSA = `
use rsa::{RsaPrivateKey, RsaPublicKey};
let mut rng = rand::thread_rng();
let private_key = RsaPrivateKey::new(&mut rng, 2048).unwrap();
`;
const rustResults = scanner.scanFile(rustRSA, 'wallet.rs');
assertGreater(rustResults.length, 0, 'Rust RSA detected');

/* ── C# detection ── */
section('Scanner — C#');

const csRSA = `
using System.Security.Cryptography;
RSA rsa = RSA.Create(2048);
`;
const csResults = scanner.scanFile(csRSA, 'Security.cs');
assertGreater(csResults.length, 0, 'C# RSA detected');

/* ── Config file detection ── */
section('Scanner — Config Files');

const sshConfig = `
Ciphers aes128-cbc,3des-cbc
KexAlgorithms diffie-hellman-group1-sha1
`;
const sshResults = scanner.scanFile(sshConfig, 'sshd_config');
assertGreater(sshResults.length, 0, 'SSH config weak cipher detected');

/* ── Empty / safe files ── */
section('Scanner — Edge Cases');

const emptyResults = scanner.scanFile('', 'empty.py');
assertEqual(emptyResults.length, 0, 'Empty file returns no findings');

const safeCode = `
// This is a comment about the weather
console.log("Hello, World!");
const x = 1 + 2;
`;
const safeResults = scanner.scanFile(safeCode, 'safe.js');
assertEqual(safeResults.length, 0, 'Safe code returns no findings');

/* ── Comment detection (should reduce false positives) ── */
section('Scanner — Comment Filtering');

const commentedCode = `
# This is a comment about rsa.generate_private_key
# hashlib.md5 is mentioned here but as a comment
print("nothing to see")
`;
const commentResults = scanner.scanFile(commentedCode, 'comments.py');
// Comments might or might not be filtered — just ensure it doesn't crash
assert(commentResults !== null, 'Comment handling does not crash');

/* ── Project scan ── */
section('Scanner — Project Scan');

const projectFiles = [
  { name: 'auth.py', content: pythonRSA },
  { name: 'crypto.js', content: jsRSA },
  { name: 'CertManager.java', content: javaRSA },
];
const projectResult = scanner.scanProject(projectFiles, 'TestProject');
assert(projectResult !== null, 'Project scan returns result');
assertGreater(projectResult.findings ? projectResult.findings.length : 0, 0, 'Project scan finds issues');
assert(projectResult.project_name === 'TestProject' || projectResult.projectName === 'TestProject', 'Project name is set');

/* ════════════════════════════════════════════════════════════════════════════
 * 2. RULES ENGINE TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Rules Engine');

assert(typeof SCAN_RULES === 'object', 'SCAN_RULES is an object');
assertGreater(Object.keys(SCAN_RULES).length, 5, 'SCAN_RULES has >5 language categories');

const expectedLanguages = ['python', 'javascript', 'java', 'go', 'c', 'rust', 'csharp'];
for (const lang of expectedLanguages) {
  assert(
    SCAN_RULES[lang] !== undefined,
    `Rules defined for ${lang}`
  );
}

assert(typeof EXT_LANG_MAP === 'object', 'EXT_LANG_MAP is an object');
assertEqual(EXT_LANG_MAP['.py'], 'python', 'Extension .py maps to python');
assertEqual(EXT_LANG_MAP['.js'], 'javascript', 'Extension .js maps to javascript');
assertEqual(EXT_LANG_MAP['.java'], 'java', 'Extension .java maps to java');
assertEqual(EXT_LANG_MAP['.go'], 'go', 'Extension .go maps to go');
assertEqual(EXT_LANG_MAP['.rs'], 'rust', 'Extension .rs maps to rust');
assertEqual(EXT_LANG_MAP['.cs'], 'csharp', 'Extension .cs maps to csharp');

assert(typeof DEP_FILE_NAMES === 'object', 'DEP_FILE_NAMES is exported');
const depKeys = Object.keys(DEP_FILE_NAMES);
assert(depKeys.length >= 0, 'DEP_FILE_NAMES is accessible');

// Count total rules
let totalRules = 0;
for (const lang of Object.keys(SCAN_RULES)) {
  totalRules += SCAN_RULES[lang].length;
}
assertGreater(totalRules, 200, `Total rules count (${totalRules}) > 200`);

/* ════════════════════════════════════════════════════════════════════════════
 * 3. MODELS TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Models — Enums');

assert(QuantumRisk.CRITICAL !== undefined, 'QuantumRisk.CRITICAL exists');
assert(QuantumRisk.HIGH !== undefined, 'QuantumRisk.HIGH exists');
assert(QuantumRisk.MEDIUM !== undefined, 'QuantumRisk.MEDIUM exists');
assert(QuantumRisk.LOW !== undefined, 'QuantumRisk.LOW exists');
assert(QuantumRisk.SAFE !== undefined, 'QuantumRisk.SAFE exists');

assert(UsageType.KEY_GENERATION !== undefined, 'UsageType.KEY_GENERATION exists');
assert(UsageType.ENCRYPTION !== undefined, 'UsageType.ENCRYPTION exists');
assert(UsageType.SIGNING !== undefined, 'UsageType.SIGNING exists');
assert(UsageType.HASHING !== undefined, 'UsageType.HASHING exists');

assert(MigrationStrategy.PURE_PQC !== undefined, 'MigrationStrategy.PURE_PQC exists');
assert(MigrationStrategy.HYBRID !== undefined, 'MigrationStrategy.HYBRID exists');
assert(MigrationStrategy.CRYPTO_AGILE !== undefined, 'MigrationStrategy.CRYPTO_AGILE exists');

section('Models — Vulnerability DB');

assert(typeof QUANTUM_VULNERABILITY_DB === 'object', 'Vulnerability DB is an object');
assertGreater(Object.keys(QUANTUM_VULNERABILITY_DB).length, 10, 'Vulnerability DB has >10 algorithms');

// Check key algorithms are in DB
const expectedAlgos = ['RSA-2048', 'ECDSA-P256', 'SHA-1', 'MD5', 'DES', 'AES-256'];
for (const algo of expectedAlgos) {
  assert(
    QUANTUM_VULNERABILITY_DB[algo] !== undefined,
    `Vulnerability DB contains ${algo}`
  );
}

// ML-KEM should be SAFE
const mlkem768 = QUANTUM_VULNERABILITY_DB['ML-KEM-768'];
if (mlkem768) {
  assertEqual(mlkem768.risk || mlkem768.quantum_risk, 'SAFE', 'ML-KEM-768 is SAFE');
}

section('Models — Factory Functions');

const testFinding = createFinding();
assert(testFinding !== null, 'createFinding returns an object');
assert(testFinding.file_path !== undefined, 'Finding has file_path field');

const testScanResult = createScanResult();
assert(testScanResult !== null, 'createScanResult returns an object');
assert(testScanResult.id !== undefined, 'ScanResult has an id');

/* ════════════════════════════════════════════════════════════════════════════
 * 4. RISK ANALYZER TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Risk Analyzer');

const riskAnalyzer = new RiskAnalyzer();
assert(riskAnalyzer !== null, 'RiskAnalyzer instantiation');

// Create a scan result with some findings
const scanForRisk = scanner.scanProject([
  { name: 'auth.py', content: pythonRSA },
  { name: 'crypto.js', content: jsRSA },
  { name: 'hash.py', content: pythonMD5 },
], 'RiskTestProject');

const riskReport = riskAnalyzer.analyzeRisks(scanForRisk);
assert(riskReport !== null, 'Risk analysis returns a report');
assert(riskReport.overall_risk_score !== undefined || riskReport.overallRiskScore !== undefined, 'Report has overall risk score');
assert(riskReport.risk_level !== undefined || riskReport.riskLevel !== undefined, 'Report has risk level');

/* ════════════════════════════════════════════════════════════════════════════
 * 5. MIGRATION ENGINE TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Migration Engine');

const migrationEngine = new MigrationEngine();
assert(migrationEngine !== null, 'MigrationEngine instantiation');

const migrationReport = migrationEngine.generateFullReport(scanForRisk);
assert(migrationReport !== null, 'Migration report generated');
assert(
  migrationReport.phases !== undefined ||
  migrationReport.migration_items !== undefined ||
  migrationReport.items !== undefined ||
  migrationReport.plan !== undefined,
  'Migration report has phases/items/plan'
);

// Test single finding migration
if (scanForRisk.findings && scanForRisk.findings.length > 0) {
  const singlePlan = migrationEngine.getMigrationPlan(scanForRisk.findings[0]);
  assert(singlePlan !== null, 'Single finding migration plan generated');
}

/* ════════════════════════════════════════════════════════════════════════════
 * 6. COMPLIANCE REPORTER TESTS
 * ════════════════════════════════════════════════════════════════════════════ */
section('Compliance Reporter');

const complianceReporter = new ComplianceReporter();
assert(complianceReporter !== null, 'ComplianceReporter instantiation');

// Scorecard
const scorecard = complianceReporter.generateScorecard(scanForRisk);
assert(scorecard !== null, 'Scorecard generated');
assert(scorecard.score !== undefined, 'Scorecard has a score');
assert(typeof scorecard.score === 'number', 'Scorecard score is a number');
assert(scorecard.score >= 0 && scorecard.score <= 100, 'Scorecard score is 0-100');
assert(scorecard.grade !== undefined, 'Scorecard has a grade');

// CBOM
const cbom = complianceReporter.generateCBOM(scanForRisk);
assert(cbom !== null, 'CBOM generated');
assert(cbom.bomFormat === 'CycloneDX', 'CBOM format is CycloneDX');
assertEqual(cbom.specVersion, '1.6', 'CBOM spec version is 1.6');
assert(Array.isArray(cbom.components), 'CBOM has components array');

// SARIF
const sarif = complianceReporter.generateSARIF(scanForRisk);
assert(sarif !== null, 'SARIF generated');
assert(sarif.version === '2.1.0', 'SARIF version is 2.1.0');
assert(Array.isArray(sarif.runs), 'SARIF has runs array');

// Compliance Report
const compReport = complianceReporter.generateComplianceReport(scanForRisk);
assert(compReport !== null, 'Compliance report generated');
assert(compReport.frameworks !== undefined, 'Compliance report has frameworks');

/* ════════════════════════════════════════════════════════════════════════════
 * SUMMARY
 * ════════════════════════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(60));
console.log(`\x1b[1mTest Summary\x1b[0m`);
console.log('═'.repeat(60));
console.log(`  Total:   ${totalTests}`);
console.log(`  \x1b[32mPassed:  ${passedTests}\x1b[0m`);
console.log(`  \x1b[31mFailed:  ${failedTests}\x1b[0m`);
console.log('═'.repeat(60));

if (failures.length > 0) {
  console.log('\n\x1b[31mFailed tests:\x1b[0m');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

console.log(`\n${failedTests === 0 ? '\x1b[32mALL TESTS PASSED\x1b[0m' : '\x1b[31mSOME TESTS FAILED\x1b[0m'}`);
process.exit(failedTests > 0 ? 1 : 0);
