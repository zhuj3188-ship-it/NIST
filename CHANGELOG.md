# Changelog

All notable changes to QuantumShield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive README.md with English and Chinese documentation
- MIT LICENSE file
- CONTRIBUTING.md with developer guidelines
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SECURITY.md with vulnerability reporting process
- GitHub Actions CI/CD workflows (test, build, release)
- GitHub issue templates (bug report, feature request)
- Pull request template
- Comprehensive test suite for scanner, rules, risk analyzer, migration engine
- Docker support (Dockerfile + docker-compose.yml)
- API documentation in docs/
- Architecture documentation in docs/
- .editorconfig for consistent formatting
- .env.example with all configuration options

## [2.1.0] - 2025-03-01

### Added
- GitHub Pages live preview with browser-based engine & smart API layer
- Client-side Web Worker for offline scanning capability
- Vite plugin to copy engine files for standalone browser operation

### Changed
- Improved frontend build with manual chunk splitting
- Enhanced API proxy configuration for development

## [2.0.0] - 2025-02-15

### Added
- CI/CD Integration page with pipeline generators for 5 platforms
  - GitHub Actions, GitLab CI, Jenkins, Azure Pipelines, Bitbucket Pipelines
- Protocol Stack Detection for identifying crypto in communication protocols
- Downloads Center with auto-fetching GitHub Releases
- Enhanced Risk Analysis with HNDL (Harvest Now, Decrypt Later) threat modeling
- Attack surface mapping and quantum timeline risk projection
- Data retention period risk assessment
- Dependency chain risk propagation analysis
- SSE (Server-Sent Events) for real-time scan progress
- Batch full analysis endpoint (scan + risk + migration in one call)
- System information endpoint
- Export endpoints for CBOM, SARIF, scan results, migration plans

### Changed
- Scanner engine upgraded to v5.0 with 8 major algorithmic optimizations
- Rules engine upgraded to v6.0 with 400+ patterns across 11 languages
- Risk analyzer now performs 10-step analysis pipeline
- Migration engine supports 3 strategies across 8 languages
- Compliance reporter generates CycloneDX 1.6 CBOM

### Fixed
- False positive reduction in comment and dead code detection
- Improved Bayesian confidence calibration accuracy

## [1.0.0] - 2025-01-20

### Added
- Initial release of QuantumShield
- Core scanning engine with regex-based pattern matching
- Support for Python, JavaScript, Java, Go, C/C++ scanning
- Basic risk analysis with quantum vulnerability scoring
- Migration plan generation with code templates
- Compliance reporting (NIST, CNSA)
- React frontend with Ant Design Pro Layout
- Express.js backend with REST API
- Electron desktop application for Windows, macOS, Linux
- Dark and light theme support
- Bilingual UI (English / Chinese)
- Demo files for testing across 12 language examples

[Unreleased]: https://github.com/zhuj3188-ship-it/NIST/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/zhuj3188-ship-it/NIST/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/zhuj3188-ship-it/NIST/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/zhuj3188-ship-it/NIST/releases/tag/v1.0.0
