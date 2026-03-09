<p align="center">
  <img src="electron/icon.svg" width="120" alt="QuantumShield Logo" />
</p>

<h1 align="center">QuantumShield</h1>

<p align="center">
  <strong>企业级后量子密码学迁移平台</strong><br/>
  扫描 &middot; 分析 &middot; 迁移 &mdash; 让你的代码库量子安全
</p>

<p align="center">
  <a href="https://github.com/zhuj3188-ship-it/NIST/actions/workflows/ci.yml"><img src="https://github.com/zhuj3188-ship-it/NIST/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/zhuj3188-ship-it/NIST/releases"><img src="https://img.shields.io/github/v/release/zhuj3188-ship-it/NIST?include_prereleases&label=release" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node >= 18" />
  <img src="https://img.shields.io/badge/languages-11-orange.svg" alt="11 Languages" />
  <img src="https://img.shields.io/badge/rules-400%2B-red.svg" alt="400+ Rules" />
  <img src="https://img.shields.io/badge/NIST-FIPS%20203%2F204%2F205-blueviolet.svg" alt="NIST FIPS" />
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> &bull;
  <a href="#-功能特性">功能特性</a> &bull;
  <a href="#-项目架构">项目架构</a> &bull;
  <a href="#-支持的语言">支持语言</a> &bull;
  <a href="#-桌面应用">桌面应用</a> &bull;
  <a href="README.md">English</a>
</p>

---

## QuantumShield 是什么？

**QuantumShield** 是一个开源的企业级平台，帮助开发团队 **发现**、**评估** 并 **迁移** 经典密码算法到后量子安全的替代方案 —— 符合 **NIST FIPS 203 (ML-KEM)**、**FIPS 204 (ML-DSA)** 和 **FIPS 205 (SLH-DSA)** 标准。

> **量子计算机正在到来。** RSA-2048 可能在 2033 年左右被破解。QuantumShield 帮你今天就做好准备。

### 三步工作流

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   扫描   │ ──▶ │   分析   │ ──▶ │   迁移   │
│         │     │         │     │         │
│ 400+    │     │ 风险    │     │ 代码    │
│ 正则    │     │ 评分    │     │ 生成 +  │
│ 规则    │     │ CVSS    │     │ 路线图  │
│ 11 语言 │     │ HNDL    │     │ 混合    │
└─────────┘     └─────────┘     └─────────┘
```

---

## 功能特性

### 扫描引擎 (v5.0)
- **400+ 检测规则**，覆盖 11 种编程语言
- Aho-Corasick 风格预过滤，亚秒级扫描
- 滑动窗口上下文分析 + 语义流分析
- 贝叶斯置信度校准
- 跨文件依赖图关联
- 智能去重 & 增量扫描缓存
- CVSS v3.1 自动评分
- 依赖文件分析 (package.json, requirements.txt, go.mod 等)
- 证书 & 密钥文件检测
- 配置文件分析 (sshd_config, Terraform, nginx 等)

### 风险分析器
- 量子脆弱性评分 (Shor / Grover 攻击建模)
- **HNDL** (先收割后解密) 威胁分析
- 业务影响矩阵 & 攻击面映射
- 量子时间线风险预测 (2024-2035)
- 数据保留期风险评估
- 依赖链风险传播
- 执行摘要 & 风险矩阵生成

### 迁移引擎
- **三种策略**：纯 PQC、混合方案(推荐)、密码敏捷
- 8 种语言的代码模板 (Python, JS, Java, Go, C, Rust, C#, PHP)
- 四阶段迁移路线图
- 自动生成回滚脚本 & 单元测试模板
- 工作量估算 & 优先级评分

### 合规 & 报告
- NIST IR-8547 / CNSA 2.0 / EU PQC / NIST SP 800-131A 合规映射
- CycloneDX 1.6 CBOM (密码物料清单)
- SARIF 2.1.0 输出 (IDE / GitHub 集成)
- 量子就绪度评分 (0-100)
- HTML & JSON 报告导出

### 桌面应用 (Electron)
- 跨平台：Windows、macOS、Linux
- 系统托盘快捷操作
- 原生文件夹扫描
- 键盘快捷键
- 暗色/亮色主题
- 双语界面 (中文 / English)

---

## 支持的语言

| 语言 | 扩展名 | 规则数 |
|:-----|:-------|:------|
| Python | `.py` | 40+ |
| JavaScript / TypeScript | `.js` `.ts` `.jsx` `.tsx` | 40+ |
| Java | `.java` | 40+ |
| Go | `.go` | 35+ |
| C / C++ | `.c` `.cpp` `.h` `.hpp` | 40+ |
| Rust | `.rs` | 30+ |
| C# | `.cs` | 30+ |
| PHP | `.php` | 25+ |
| Ruby | `.rb` | 20+ |
| Kotlin / Scala | `.kt` `.scala` | 20+ |
| Swift | `.swift` | 15+ |
| Dart | `.dart` | 15+ |
| 配置文件 | `.conf` `.cfg` `.tf` `.yml` | 20+ |
| 依赖文件 | `package.json` `requirements.txt` 等 | 15+ |

---

## 快速开始

### 前提条件

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/zhuj3188-ship-it/NIST.git
cd NIST

# 安装依赖
npm install
cd client && npm install && cd ..

# 构建前端
npm run build
```

### 运行

```bash
# 开发模式 (热重载)
npm run dev

# 生产模式
npm run preview

# 桌面应用
npm run electron:dev
```

---

## 项目架构

```
quantumshield/
├── client/                  # React + Vite 前端
│   ├── src/
│   │   ├── pages/           # 仪表板、扫描器、迁移、合规、知识库、下载、CI/CD
│   │   ├── components/      # 共享 UI 组件
│   │   ├── contexts/        # 主题 & 国际化
│   │   └── lib/             # API 客户端 & Web Worker
│   └── vite.config.js
├── server/                  # Express.js 后端
│   ├── engine/              # 核心引擎
│   │   ├── scanner.js       # 扫描引擎 (v5.0)
│   │   ├── rules.js         # 多语言正则规则 (v6.0)
│   │   ├── models.js        # 数据模型 & 量子漏洞数据库
│   │   ├── risk-analyzer.js # 风险分析引擎
│   │   ├── migration.js     # 迁移计划生成器
│   │   └── compliance.js    # 合规报告器
│   ├── data/                # 演示文件 & PQC 知识库
│   ├── routes/api.js        # REST API (30+ 端点)
│   └── index.js             # Express 入口
├── electron/                # Electron 桌面封装
├── tests/                   # 测试套件
├── docs/                    # 文档
└── package.json
```

---

## 后量子算法

| 算法 | NIST 标准 | 替代 | 用途 |
|:----|:---------|:-----|:----|
| **ML-KEM** (Kyber) | FIPS 203 | RSA, ECDH, DH | 密钥封装 |
| **ML-DSA** (Dilithium) | FIPS 204 | RSA, ECDSA, EdDSA | 数字签名 |
| **SLH-DSA** (SPHINCS+) | FIPS 205 | RSA, ECDSA | 基于哈希的签名 |
| **SHA-3** (Keccak) | FIPS 202 | MD5, SHA-1 | 哈希 |
| **AES-256** | FIPS 197 | DES, 3DES, RC4 | 对称加密 |

---

## Docker

```bash
# 构建
docker build -t quantumshield .

# 运行
docker run -p 3001:3001 quantumshield

# 或使用 docker-compose
docker-compose up -d
```

---

## 桌面下载

预构建的桌面安装程序可在 [Releases 页面](https://github.com/zhuj3188-ship-it/NIST/releases) 获取。

| 平台 | 格式 | 架构 |
|:-----|:-----|:-----|
| Windows | NSIS 安装程序, 便携版, ZIP | x64, arm64 |
| macOS | DMG, ZIP | x64 (Intel), arm64 (Apple Silicon) |
| Linux | AppImage, DEB, RPM, Snap, tar.gz | x64, arm64 |

---

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 许可证

本项目采用 **MIT 许可证** — 详见 [LICENSE](LICENSE)。

---

<p align="center">
  <strong>QuantumShield</strong> &mdash; 为后量子时代准备你的代码。<br/>
  <a href="https://github.com/zhuj3188-ship-it/NIST">GitHub</a> &bull;
  <a href="https://github.com/zhuj3188-ship-it/NIST/issues">Issues</a> &bull;
  <a href="https://github.com/zhuj3188-ship-it/NIST/releases">Releases</a>
</p>
