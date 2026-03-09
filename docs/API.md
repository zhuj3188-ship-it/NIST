# QuantumShield API Reference

Base URL: `http://localhost:3001/api`

All endpoints return JSON unless otherwise noted.

---

## Health & System

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "engine": "QuantumShield v2.0",
  "uptime": 12345,
  "languages": 11,
  "rules": 392
}
```

### `GET /api/system/info`

System and engine information.

**Response:**
```json
{
  "version": "2.1.0",
  "node_version": "v20.11.0",
  "platform": "linux",
  "arch": "x64",
  "uptime": 12345,
  "memory": { "rss": 50000000, "heapUsed": 30000000 }
}
```

---

## Scanning

### `POST /api/scan`

Scan code snippets.

**Request Body:**
```json
{
  "files": [
    {
      "name": "example.py",
      "content": "import hashlib\nhashlib.md5(b'test')"
    }
  ],
  "projectName": "my-project"
}
```

**Response:** Scan result object with findings.

### `POST /api/scan/files`

Scan uploaded files (multipart/form-data).

**Form Fields:**
- `files` — File(s) to scan (multipart upload)
- `projectName` — (optional) Project name

### `POST /api/scan/demo`

Scan built-in demo files. No request body needed.

### `GET /api/scans/:id`

Retrieve a previously stored scan result.

**Parameters:**
- `id` — Scan result UUID

---

## Analysis

### `POST /api/analyze/full`

Full batch analysis: scan + risk analysis + migration plan in one call.

**Request Body:**
```json
{
  "files": [
    { "name": "example.py", "content": "..." }
  ],
  "projectName": "my-project"
}
```

**Response:**
```json
{
  "scan": { ... },
  "risk": { ... },
  "migration": { ... }
}
```

### `POST /api/risk/analyze`

Run risk analysis on an existing scan result.

**Request Body:**
```json
{
  "scanResult": { ... }
}
```

**Response:** Risk analysis report with overall score, risk level, HNDL analysis, attack surface, timeline risk, etc.

---

## Migration

### `POST /api/migration/full`

Generate a full migration plan from scan results.

**Request Body:**
```json
{
  "scanResult": { ... }
}
```

**Response:** Migration plan with phases, code templates, rollback scripts, and test templates.

### `POST /api/migration/single`

Generate migration plan for a single finding.

**Request Body:**
```json
{
  "finding": { ... }
}
```

---

## Compliance

### `GET /api/compliance/scorecard/:id`

Quantum readiness scorecard.

**Response:**
```json
{
  "score": 42,
  "grade": "D",
  "label": "Needs Improvement",
  "dimensions": { ... },
  "recommendations": [ ... ]
}
```

### `GET /api/compliance/cbom/:id`

CycloneDX 1.6 Crypto Bill of Materials.

**Response:** CycloneDX BOM JSON document.

### `GET /api/compliance/sarif/:id`

SARIF 2.1.0 report.

**Response:** SARIF JSON document.

### `GET /api/compliance/report/:id`

Full compliance report across all frameworks.

**Response:**
```json
{
  "frameworks": [
    {
      "name": "NIST IR-8547",
      "status": "partial",
      "findings": 12,
      "recommendations": [ ... ]
    }
  ]
}
```

---

## Knowledge

### `GET /api/knowledge/algorithms`

PQC algorithm database.

### `GET /api/knowledge/timeline`

Quantum threat timeline (2019–2035).

### `GET /api/knowledge/vulnerabilities`

Quantum vulnerability database.

### `GET /api/knowledge/demo-files`

List of available demo files.

---

## Dashboard

### `GET /api/dashboard/stats`

Aggregated dashboard statistics.

---

## Progress

### `GET /api/progress/:id`

Server-Sent Events (SSE) stream for real-time scan progress.

**Headers:** `Content-Type: text/event-stream`

---

## Export

### `GET /api/export/cbom/:id`

Download CBOM as a file.

### `GET /api/export/sarif/:id`

Download SARIF as a file.

### `GET /api/export/scan/:id`

Download scan results as JSON.

### `GET /api/export/migration/:id`

Download migration plan as JSON.

---

## CI/CD

### `GET /api/cicd/generate`

Generate CI/CD pipeline configuration.

**Query Parameters:**
- `platform` — One of: `github`, `gitlab`, `jenkins`, `azure`, `bitbucket`

**Response:** YAML/Groovy pipeline configuration as text.

---

## Reports

### `GET /api/report/html/:id`

Generate and download an HTML report.

### `GET /api/report/json/:id`

Generate and download a JSON report.

---

## Releases

### `GET /api/releases`

Fetch latest GitHub releases with download links.

**Response:**
```json
{
  "tag": "v2.1.0",
  "name": "QuantumShield v2.1.0",
  "published_at": "2025-03-01T00:00:00Z",
  "assets": [
    {
      "name": "QuantumShield-2.1.0-win-x64.exe",
      "platform": "Windows",
      "arch": "x64",
      "format": "NSIS",
      "size": 85000000,
      "download_url": "https://github.com/..."
    }
  ]
}
```
