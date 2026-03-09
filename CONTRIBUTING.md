# Contributing to QuantumShield

Thank you for your interest in contributing to QuantumShield! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Adding New Language Rules](#adding-new-language-rules)
- [Adding Migration Templates](#adding-migration-templates)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/NIST.git
   cd NIST
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/zhuj3188-ship-it/NIST.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install root dependencies (server + Electron)
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### Running in Development

```bash
# Web development (server + client with hot-reload)
npm run dev

# Electron development
npm run electron:dev

# Run tests
npm test
```

## Project Structure

```
├── server/engine/       # Core scanning & analysis engine
│   ├── scanner.js       # Main scan engine
│   ├── rules.js         # Detection rules (add new rules here)
│   ├── models.js        # Data models & vulnerability DB
│   ├── risk-analyzer.js # Risk analysis
│   ├── migration.js     # Migration code generation
│   └── compliance.js    # Compliance reporting
├── server/routes/       # Express API routes
├── client/src/          # React frontend
│   ├── pages/           # Page components
│   ├── components/      # Shared components
│   └── contexts/        # React contexts
├── electron/            # Electron desktop app
└── tests/               # Test suite
```

## How to Contribute

### Reporting Bugs

- Use [GitHub Issues](https://github.com/zhuj3188-ship-it/NIST/issues/new?template=bug_report.md)
- Include your environment (OS, Node.js version)
- Provide steps to reproduce
- Include relevant error messages or screenshots

### Suggesting Features

- Use [GitHub Issues](https://github.com/zhuj3188-ship-it/NIST/issues/new?template=feature_request.md)
- Describe the use case and expected behavior
- Explain why this would benefit other users

### Types of Contributions We Welcome

- **New language rules** in `server/engine/rules.js`
- **Migration templates** in `server/engine/migration.js`
- **UI improvements** in `client/src/`
- **Documentation** improvements
- **Bug fixes** and performance improvements
- **Test coverage** improvements
- **CI/CD pipeline** templates
- **Translations** (i18n)

## Pull Request Process

1. **Sync** your fork with upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Make** your changes in a feature branch

3. **Test** your changes:
   ```bash
   npm test
   ```

4. **Commit** with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(rules): add Kotlin coroutines crypto detection
   fix(scanner): correct false positive in Go import detection
   docs(readme): update supported languages table
   test(engine): add scanner edge case tests
   ```

5. **Push** and create a Pull Request

6. **Fill out** the PR template completely

7. **Wait** for review — maintainers will provide feedback

## Coding Standards

### JavaScript

- Use modern ES2022+ syntax
- Use `const` by default, `let` when needed, never `var`
- Use template literals for string concatenation
- Use descriptive variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and under 50 lines when possible

### React (Client)

- Use functional components with hooks
- Use Ant Design components consistently
- Support both English and Chinese (i18n)
- Support dark and light themes

### Testing

- Write tests for all new engine features
- Test edge cases (empty input, malformed files, large files)
- Maintain test coverage above 80% for engine code

## Adding New Language Rules

To add rules for a new language, edit `server/engine/rules.js`:

```javascript
// In the SCAN_RULES object, add a new language section:
'new_language': [
  R('rsa_usage',       'RSA',      /pattern_for_rsa/gi,       'RSA detected',      'HIGH',   'key_generation'),
  R('ecdsa_usage',     'ECDSA',    /pattern_for_ecdsa/gi,     'ECDSA detected',    'MEDIUM', 'signing'),
  // ... more rules
],
```

Also update `EXT_LANG_MAP` to map file extensions:

```javascript
'.newext': 'new_language',
```

### Rule Guidelines

- Use non-greedy quantifiers (`.*?` instead of `.*`)
- Avoid lookbehinds when possible (performance)
- Test against real-world code samples
- Include false positive patterns if needed
- Set appropriate risk levels (CRITICAL, HIGH, MEDIUM, LOW, SAFE)

## Adding Migration Templates

To add migration templates, edit `server/engine/migration.js`:

```javascript
// In the TEMPLATES object:
'new_language': {
  'RSA': {
    pure_pqc: { code: '...', deps: ['...'], description: '...' },
    hybrid:   { code: '...', deps: ['...'], description: '...' },
    agile:    { code: '...', deps: ['...'], description: '...' },
  },
  // ... more algorithms
},
```

---

## Questions?

Feel free to open an [issue](https://github.com/zhuj3188-ship-it/NIST/issues) or start a [discussion](https://github.com/zhuj3188-ship-it/NIST/discussions).

Thank you for helping make the world quantum-safe!
