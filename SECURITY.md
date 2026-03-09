# Security Policy

## Supported Versions

| Version | Supported          |
|:--------|:-------------------|
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

The QuantumShield team takes security seriously. If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities.
2. Email the details to the maintainers through [GitHub's private vulnerability reporting](https://github.com/zhuj3188-ship-it/NIST/security/advisories/new).
3. Alternatively, open a confidential issue via GitHub Security Advisories.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix or mitigation**: Within 2 weeks for critical issues

### What Happens Next

1. We will acknowledge your report and begin investigation.
2. We will work on a fix and coordinate the disclosure timeline with you.
3. Once a fix is ready, we will release a patched version.
4. We will credit you in the release notes (unless you prefer to remain anonymous).

## Security Design Principles

### Local-First Architecture

QuantumShield is designed with a **local-first** security model:

- **All scanning is performed locally** on the user's machine
- **Source code never leaves the local environment**
- No telemetry, analytics, or cloud dependencies for core functionality
- The Express server binds to `localhost` by default

### No Remote Code Execution

- The scan engine uses regex-based pattern matching only
- No code is evaluated or executed from scanned files
- User-uploaded files are processed in-memory and not persisted to disk (unless explicitly exported)

### Dependencies

We regularly audit our dependency tree:

- Runtime dependencies are minimized (express, cors, multer, uuid)
- Frontend dependencies are standard React ecosystem packages
- Electron builds use hardened runtime on macOS
- Windows installers configure appropriate firewall rules

### Electron Security

- `nodeIntegration` is disabled
- `contextIsolation` is enabled
- `webSecurity` is enabled
- Hardened runtime on macOS with appropriate entitlements
- No remote content loading — all resources are local

## Security Best Practices for Users

1. **Keep QuantumShield updated** to the latest version
2. **Run from trusted sources** — only download from the official GitHub releases
3. **Review scan results carefully** before applying migration suggestions
4. **Test migrated code** in a staging environment before deploying to production
5. **Use the hybrid migration strategy** for gradual, safe transitions

## Acknowledgments

We thank the security research community for helping keep QuantumShield secure. Contributors who responsibly disclose vulnerabilities will be acknowledged here.
