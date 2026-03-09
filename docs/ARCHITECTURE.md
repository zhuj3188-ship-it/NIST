# QuantumShield Architecture

## Overview

QuantumShield follows a three-tier architecture with a clear separation between the scan engine, the API server, and the user interface.

```
┌───────────────────────────────────────────────────────────────────┐
│                        User Interface                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   React SPA      │  │   Electron App   │  │  Web Worker     │ │
│  │   (Ant Design)   │  │   (Desktop)      │  │  (Offline scan) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼──────────────────────┼──────────┘
            │ HTTP/REST           │ IPC                   │ Direct
            ▼                     ▼                       ▼
┌───────────────────────────────────────────────────────────────────┐
│                        API Layer                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Express.js REST API (30+ endpoints)             │ │
│  │              Port 3001 · CORS · Gzip · Security Headers      │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Engine Layer                               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Scanner   │  │ Risk         │  │ Migration │  │Compliance │ │
│  │  Engine    │  │ Analyzer     │  │ Engine    │  │Reporter   │ │
│  │  (v5.0)   │  │              │  │           │  │           │ │
│  ├────────────┤  ├──────────────┤  ├───────────┤  ├───────────┤ │
│  │ 400+ rules│  │ 10-step      │  │ 3 strats  │  │ NIST      │ │
│  │ 11 langs  │  │ pipeline     │  │ 8 langs   │  │ CNSA      │ │
│  │ Bayesian  │  │ CVSS 3.1     │  │ Rollback  │  │ EU PQC    │ │
│  │ CVSS      │  │ HNDL         │  │ Tests     │  │ CBOM      │ │
│  │ Dedup     │  │ Timeline     │  │ Roadmap   │  │ SARIF     │ │
│  └────────────┘  └──────────────┘  └───────────┘  └───────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Shared Data Layer                         │ │
│  │  Models · Rules (v6.0) · Vulnerability DB · PQC Knowledge   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Module Details

### Scanner Engine (`server/engine/scanner.js`)

The core scanning module, version 5.0, implements 8 major optimizations:

1. **Aho-Corasick-style pre-filter** — Fast string matching to quickly reject files without crypto patterns
2. **Sliding-window context analysis** — Examines surrounding code for semantic understanding
3. **Semantic flow analysis** — Tracks imports and data flow across functions
4. **Bayesian confidence calibration** — Multi-evidence scoring (test files, vendor code, string literals, imports)
5. **Cross-file dependency graph** — Correlates findings across project files
6. **Smart deduplication** — Removes redundant/subsumed findings
7. **Incremental scan cache** — SHA-256 file hash caching for repeated scans
8. **CVSS v3.1 auto-scoring** — Automatic severity scoring per finding

### Rules Engine (`server/engine/rules.js`)

Version 6.0, 392 regex patterns across 14 language categories:

| Category | Rule Count | Key Patterns |
|:---------|:----------|:-------------|
| Python | 40+ | cryptography, pycryptodome, hashlib, hmac, bcrypt, argon2 |
| JavaScript | 40+ | crypto, Web Crypto, jsonwebtoken, crypto-js |
| Java | 40+ | JCA/JCE, BouncyCastle, KeyPairGenerator |
| Go | 35+ | crypto/*, x/crypto, tls.Config |
| C/C++ | 40+ | OpenSSL, libsodium, mbedTLS, wolfSSL |
| Rust | 30+ | ring, RustCrypto, openssl |
| C# | 30+ | System.Security.Cryptography |
| PHP | 25+ | openssl_*, sodium_*, hash() |
| Ruby | 20+ | OpenSSL, Digest, bcrypt |
| Kotlin | 20+ | javax.crypto, java.security |
| Swift | 15+ | CryptoKit, Security.framework |
| Dart | 15+ | pointycastle, crypto |
| Config | 20+ | sshd_config, Terraform, nginx |
| Dependency | 15+ | package.json, requirements.txt, go.mod |

### Risk Analyzer (`server/engine/risk-analyzer.js`)

10-step analysis pipeline:

1. Quantum vulnerability scoring
2. Business impact matrix
3. HNDL (Harvest Now, Decrypt Later) analysis
4. Attack surface hotspot detection
5. Quantum timeline risk projection
6. Exposure weighting
7. Data retention risk
8. Dependency chain risk
9. Overall risk aggregation
10. Executive summary generation

### Migration Engine (`server/engine/migration.js`)

Supports 3 strategies × 8 languages:

- **Pure PQC**: Direct replacement with post-quantum algorithms
- **Hybrid** (recommended): Classical + PQC combined for backward compatibility
- **Crypto-Agility**: Abstraction layer supporting algorithm swapping

Generated outputs:
- Migration code templates
- Rollback scripts
- Unit test templates
- Dependency installation commands
- Four-phase roadmap

### Compliance Reporter (`server/engine/compliance.js`)

Output formats:
- **Quantum Readiness Scorecard** (0-100, weighted across 5 dimensions)
- **CycloneDX 1.6 CBOM** (Crypto Bill of Materials)
- **SARIF 2.1.0** (Static Analysis Results Interchange Format)
- **Compliance Report** (NIST IR-8547, CNSA 2.0, EU PQC, SP 800-131A)

## Data Flow

```
User Uploads Code
       │
       ▼
┌──────────────┐
│ Language      │ ← EXT_LANG_MAP
│ Detection     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Quick Screen  │ ← Pre-built regex cache per language
│ (Pre-filter)  │
└──────┬───────┘
       │ (only files with potential crypto)
       ▼
┌──────────────┐
│ Rule Matching │ ← SCAN_RULES[language]
│ (400+ regex)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Multi-Phase   │
│ Filtering     │
│ ├── Comments  │
│ ├── Dead code │
│ ├── FP filter │
│ └── Strings   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Enrichment    │ ← QUANTUM_VULNERABILITY_DB
│ ├── Key size  │
│ ├── Vuln DB   │
│ ├── Bayesian  │
│ ├── CVSS      │
│ ├── External  │
│ └── Migration │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Deduplication │
└──────┬───────┘
       │
       ▼
   Findings[]
       │
       ├──▶ Risk Analyzer  ──▶ Risk Report
       ├──▶ Migration Engine ──▶ Migration Plan
       └──▶ Compliance      ──▶ Scorecard / CBOM / SARIF
```

## Frontend Architecture

The React frontend uses:
- **Ant Design Pro Layout** for the application shell
- **React Router** for client-side navigation
- **Framer Motion** for animations
- **Web Worker** for offline/browser-only scanning
- **Context providers** for theme (dark/light) and i18n (English/Chinese)

Pages:
1. **Dashboard** — Overview, statistics, quantum readiness gauge
2. **Scanner** — Code input, file upload, demo scan
3. **Migration** — Migration plans with code diffs
4. **Compliance** — Scorecard, CBOM, SARIF, compliance frameworks
5. **Knowledge** — PQC algorithms, timeline, vulnerability database
6. **Downloads** — Desktop installer download links
7. **CI/CD** — Pipeline configuration generators

## Electron Integration

The Electron main process (`electron/main.js`):
1. Forks the Express server as a child process
2. Creates a BrowserWindow pointing to `localhost:3001`
3. Sets up system tray with context menu
4. Registers global keyboard shortcuts
5. Handles native file/folder dialogs for scanning
6. Manages window lifecycle (minimize to tray, restore, quit)

Security hardening:
- `nodeIntegration: false`
- `contextIsolation: true`
- `webSecurity: true`
- Hardened runtime on macOS
- Windows Defender exclusion via NSIS installer
