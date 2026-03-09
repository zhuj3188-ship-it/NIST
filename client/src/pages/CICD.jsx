import React, { useState, useCallback } from 'react';
import { Card, Select, Button, Typography, Tag, Space, Tabs, Switch, Checkbox, message, Tooltip, Row, Col, Steps, Alert, Collapse, Divider } from 'antd';
import {
  GithubOutlined, GitlabOutlined, CodeOutlined, CopyOutlined,
  CloudOutlined, ThunderboltOutlined, CheckCircleOutlined,
  SafetyOutlined, ApiOutlined, SettingOutlined, RocketOutlined,
  FileTextOutlined, BranchesOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { motion } from 'framer-motion';
import { generateCIConfig, getAllCIConfigs } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function CICDPage() {
  const { isDark, colors } = useTheme();
  const { t, lang } = useI18n();
  const isZh = lang === 'zh';
  const [platform, setPlatform] = useState('github');
  const [failOn, setFailOn] = useState('critical');
  const [languages, setLanguages] = useState([]);
  const [generateReport, setGenerateReport] = useState(true);
  const [generateCBOM, setGenerateCBOM] = useState(true);
  const [configResult, setConfigResult] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---- Platform configs ---- */
  const PLATFORMS = [
    { key: 'github', name: 'GitHub Actions', icon: <GithubOutlined />, color: colors.text, desc: isZh ? 'GitHub 工作流集成，支持 SARIF 上传到 Code Scanning' : 'GitHub workflow integration with SARIF upload to Code Scanning' },
    { key: 'gitlab', name: 'GitLab CI', icon: <GitlabOutlined />, color: '#FC6D26', desc: isZh ? 'GitLab CI/CD 管道集成，支持 SAST 报告' : 'GitLab CI/CD pipeline with SAST report' },
    { key: 'jenkins', name: 'Jenkins', icon: <SettingOutlined />, color: '#D24939', desc: isZh ? 'Jenkins Pipeline 集成，支持 SARIF 插件' : 'Jenkins Pipeline with SARIF plugin' },
    { key: 'azure', name: 'Azure DevOps', icon: <CloudOutlined />, color: '#0078D7', desc: isZh ? 'Azure Pipelines 集成，支持构建产物发布' : 'Azure Pipelines with build artifact publishing' },
    { key: 'bitbucket', name: 'Bitbucket', icon: <BranchesOutlined />, color: '#0052CC', desc: isZh ? 'Bitbucket Pipelines 集成，支持定时扫描' : 'Bitbucket Pipelines with scheduled scanning' },
  ];

  const LANGUAGES = [
    { label: 'Python', value: 'python' }, { label: 'Java', value: 'java' },
    { label: 'Go', value: 'go' }, { label: 'JavaScript/TS', value: 'javascript' },
    { label: 'C/C++', value: 'c' }, { label: 'Rust', value: 'rust' },
    { label: 'C#', value: 'csharp' }, { label: 'PHP', value: 'php' },
    { label: 'Ruby', value: 'ruby' }, { label: 'Kotlin', value: 'kotlin' },
    { label: 'Swift', value: 'swift' },
  ];

  const FAIL_LEVELS = [
    { value: 'critical', label: isZh ? '仅严重' : 'Critical Only', desc: isZh ? '仅在发现 CRITICAL 级别问题时阻断构建' : 'Block build only on CRITICAL findings', color: '#ff4757' },
    { value: 'high', label: isZh ? '高及以上' : 'High+', desc: isZh ? '在发现 HIGH 或 CRITICAL 级别问题时阻断' : 'Block on HIGH or CRITICAL findings', color: '#ff6b35' },
    { value: 'medium', label: isZh ? '中等及以上' : 'Medium+', desc: isZh ? '在发现 MEDIUM 及以上级别问题时阻断' : 'Block on MEDIUM+ findings', color: '#ffa502' },
    { value: 'none', label: isZh ? '仅报告' : 'Report Only', desc: isZh ? '不阻断构建，仅生成报告' : 'No blocking, report only', color: '#2ed573' },
  ];

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateCIConfig(platform, failOn, languages, generateReport);
      setConfigResult(result);
      message.success(isZh ? 'CI/CD 配置已生成' : 'CI/CD config generated');
    } catch (err) {
      message.error((isZh ? '生成失败: ' : 'Generation failed: ') + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [platform, failOn, languages, generateReport, isZh]);

  const handleCopy = useCallback(() => {
    if (configResult?.config) {
      navigator.clipboard.writeText(configResult.config).then(() => {
        message.success(isZh ? '已复制到剪贴板' : 'Copied to clipboard');
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = configResult.config;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        message.success(isZh ? '已复制到剪贴板' : 'Copied to clipboard');
      });
    }
  }, [configResult, isZh]);

  const handleDownload = useCallback(() => {
    if (configResult?.config && configResult?.filename) {
      const blob = new Blob([configResult.config], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = configResult.filename.replace(/\//g, '-').replace(/^\./, '');
      a.click();
      URL.revokeObjectURL(url);
      message.success(isZh ? '文件已下载' : 'File downloaded');
    }
  }, [configResult, isZh]);

  const currentPlatform = PLATFORMS.find(p => p.key === platform);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={2} style={{ color: colors.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <RocketOutlined style={{ color: '#6C5CE7' }} />
            {t('cicd.title')}
          </Title>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {t('cicd.subtitle')}
          </Text>
          <div style={{ marginTop: 12 }}>
            <Tag color="purple">quantumshield/action@v1</Tag>
            <Tag color="blue">SARIF 2.1.0</Tag>
            <Tag color="cyan">CycloneDX 1.6</Tag>
            <Tag color="green">{isZh ? '自动化扫描' : 'Automated Scanning'}</Tag>
          </div>
        </div>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Left: Configuration Panel */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <ProCard title={<span><SettingOutlined style={{ marginRight: 8 }} />{isZh ? '配置选项' : 'Configuration'}</span>} bordered style={{ marginBottom: 24 }}>
              {/* Platform selector */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: colors.text, display: 'block', marginBottom: 8 }}>{isZh ? 'CI/CD 平台' : 'CI/CD Platform'}</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {PLATFORMS.map(p => (
                    <div
                      key={p.key}
                      onClick={() => setPlatform(p.key)}
                      style={{
                        padding: '12px 16px', borderRadius: 8,
                        border: `1px solid ${platform === p.key ? '#6C5CE7' : colors.border}`,
                        background: platform === p.key ? (isDark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.06)') : colors.bgCard,
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 20, color: p.color, marginBottom: 4 }}>{p.icon}</div>
                      <Text style={{ color: platform === p.key ? colors.text : colors.textSecondary, fontSize: 12 }}>{p.name}</Text>
                    </div>
                  ))}
                </div>
                <Text style={{ color: colors.textDim, fontSize: 11, display: 'block', marginTop: 6 }}>{currentPlatform?.desc}</Text>
              </div>

              <Divider style={{ borderColor: colors.border, margin: '16px 0' }} />

              {/* Fail-on level */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: colors.text, display: 'block', marginBottom: 8 }}>{isZh ? '阻断等级 (fail-on)' : 'Fail Level'}</Text>
                <Select value={failOn} onChange={setFailOn} style={{ width: '100%' }} size="large">
                  {FAIL_LEVELS.map(l => (
                    <Option key={l.value} value={l.value}>
                      <Space>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span>{l.label}</span>
                        <Text style={{ color: colors.textDim, fontSize: 11 }}> — {l.desc}</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Languages */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: colors.text, display: 'block', marginBottom: 8 }}>
                  {isZh ? '扫描语言' : 'Scan Languages'} <Text style={{ color: colors.textDim, fontSize: 11 }}>{isZh ? '（留空 = 自动检测）' : '(empty = auto-detect)'}</Text>
                </Text>
                <Select
                  mode="multiple" value={languages} onChange={setLanguages}
                  style={{ width: '100%' }}
                  placeholder={isZh ? '自动检测所有支持的语言' : 'Auto-detect all supported languages'}
                  allowClear
                >
                  {LANGUAGES.map(l => (
                    <Option key={l.value} value={l.value}>{l.label}</Option>
                  ))}
                </Select>
              </div>

              <Divider style={{ borderColor: colors.border, margin: '16px 0' }} />

              {/* Output options */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: colors.text, display: 'block', marginBottom: 12 }}>{isZh ? '输出选项' : 'Output Options'}</Text>
                <Space direction="vertical">
                  <Checkbox checked={generateReport} onChange={e => setGenerateReport(e.target.checked)}>
                    <Text style={{ color: colors.text }}>{isZh ? '生成 HTML 报告' : 'Generate HTML Report'}</Text>
                  </Checkbox>
                  <Checkbox checked={generateCBOM} onChange={e => setGenerateCBOM(e.target.checked)}>
                    <Text style={{ color: colors.text }}>{isZh ? '生成 CBOM (CycloneDX 1.6)' : 'Generate CBOM (CycloneDX 1.6)'}</Text>
                  </Checkbox>
                  <Checkbox checked={true} disabled>
                    <Text style={{ color: colors.textSecondary }}>{isZh ? '输出 SARIF 2.1.0 (默认)' : 'Output SARIF 2.1.0 (default)'}</Text>
                  </Checkbox>
                </Space>
              </div>

              <Button
                type="primary" size="large" block icon={<ThunderboltOutlined />}
                onClick={handleGenerate} loading={loading}
                style={{ height: 48, fontSize: 16, background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', border: 'none' }}
              >
                {isZh ? '生成 CI/CD 配置' : 'Generate CI/CD Config'}
              </Button>
            </ProCard>
          </motion.div>

          {/* Integration workflow */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <ProCard title={<span><ClockCircleOutlined style={{ marginRight: 8 }} />{isZh ? '集成工作流' : 'Integration Workflow'}</span>} bordered>
              <Steps
                direction="vertical" size="small"
                current={configResult ? 3 : 0}
                items={isZh ? [
                  { title: '选择 CI/CD 平台', description: '选择你的代码托管/CI 平台' },
                  { title: '配置扫描参数', description: '设置阻断等级、语言和输出格式' },
                  { title: '生成配置文件', description: '点击按钮生成对应的配置' },
                  { title: '复制到项目仓库', description: '将配置文件添加到项目根目录' },
                  { title: '提交并触发扫描', description: 'Push 到仓库后自动执行量子安全扫描' },
                ] : [
                  { title: 'Select CI/CD Platform', description: 'Choose your code hosting / CI platform' },
                  { title: 'Configure Parameters', description: 'Set fail level, languages, and output format' },
                  { title: 'Generate Config', description: 'Click the button to generate' },
                  { title: 'Copy to Repository', description: 'Add config file to project root' },
                  { title: 'Push & Trigger Scan', description: 'Push to repo to auto-run quantum security scan' },
                ]}
              />
            </ProCard>
          </motion.div>
        </Col>

        {/* Right: Generated Config & Preview */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            {/* Config Preview */}
            <ProCard
              title={
                <span>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  {configResult ? configResult.name + (isZh ? ' 配置' : ' Config') : (isZh ? '配置预览' : 'Config Preview')}
                  {configResult && (
                    <Tag style={{ marginLeft: 8, fontSize: 11 }} color="purple">
                      {configResult.filename}
                    </Tag>
                  )}
                </span>
              }
              bordered style={{ marginBottom: 24 }}
              extra={
                configResult && (
                  <Space>
                    <Tooltip title={isZh ? '复制到剪贴板' : 'Copy to clipboard'}>
                      <Button icon={<CopyOutlined />} onClick={handleCopy} size="small">{isZh ? '复制' : 'Copy'}</Button>
                    </Tooltip>
                    <Tooltip title={isZh ? '下载配置文件' : 'Download config file'}>
                      <Button icon={<DownloadOutlined />} onClick={handleDownload} size="small">{isZh ? '下载' : 'Download'}</Button>
                    </Tooltip>
                  </Space>
                )
              }
            >
              {configResult ? (
                <pre style={{
                  background: 'var(--qs-code-preview-bg)',
                  border: `1px solid var(--qs-border)`,
                  borderRadius: 8, padding: 20, margin: 0, maxHeight: 500, overflow: 'auto',
                  fontSize: 12, lineHeight: 1.6, color: 'var(--qs-code-preview-text)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  whiteSpace: 'pre-wrap',
                }}>
                  {configResult.config}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: colors.textDim }}>
                  <CodeOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                  <div>{isZh ? '选择平台并点击"生成"查看配置文件' : 'Select a platform and click "Generate" to preview config'}</div>
                </div>
              )}
            </ProCard>

            {/* Feature comparison */}
            <ProCard title={<span><ApiOutlined style={{ marginRight: 8 }} />{isZh ? '平台功能对比' : 'Platform Comparison'}</span>} bordered style={{ marginBottom: 24 }}>
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid var(--qs-border)` }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: colors.textSecondary }}>{isZh ? '功能' : 'Feature'}</th>
                      {PLATFORMS.map(p => (
                        <th key={p.key} style={{ padding: '10px 8px', textAlign: 'center', color: platform === p.key ? '#6C5CE7' : colors.textSecondary }}>
                          {p.icon} {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'SARIF', values: ['Code Scanning', 'SAST Report', 'Plugin', 'Artifact', 'Artifact'] },
                      { feature: isZh ? 'PR 检查' : 'PR Check', values: [isZh ? '原生' : 'Native', isZh ? '原生' : 'Native', isZh ? '插件' : 'Plugin', isZh ? '原生' : 'Native', isZh ? '原生' : 'Native'] },
                      { feature: isZh ? '定时扫描' : 'Scheduled', values: ['cron', 'schedules', 'cron', 'schedules', 'schedules'] },
                      { feature: 'CBOM', values: ['Artifact', 'Artifact', 'Archive', 'Artifact', 'Artifact'] },
                      { feature: isZh ? '阻断构建' : 'Fail-on', values: ['exit code', 'exit code', 'exit code', 'exit code', 'exit code'] },
                      { feature: isZh ? '并行扫描' : 'Parallel', values: ['matrix', 'parallel', 'parallel', 'strategy', 'parallel'] },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid var(--qs-border)` }}>
                        <td style={{ padding: '8px 12px', color: colors.text }}>{row.feature}</td>
                        {row.values.map((v, j) => (
                          <td key={j} style={{ padding: '8px', textAlign: 'center', color: colors.accent, fontSize: 11 }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ProCard>

            {/* CLI Usage Guide */}
            <ProCard title={<span><ThunderboltOutlined style={{ marginRight: 8 }} />{isZh ? 'CLI 命令参考' : 'CLI Command Reference'}</span>} bordered>
              <Collapse
                ghost
                items={[
                  {
                    key: 'scan',
                    label: <Text style={{ color: colors.text }}>quantumshield scan — {isZh ? '执行扫描' : 'Run Scan'}</Text>,
                    children: (
                      <pre style={{ background: 'var(--qs-code-preview-bg)', padding: 12, borderRadius: 6, color: 'var(--qs-code-preview-text)', fontSize: 12, margin: 0 }}>
{`# ${isZh ? '扫描当前目录' : 'Scan current directory'}
quantumshield scan .

# ${isZh ? '指定语言和输出格式' : 'Specify languages and output format'}
quantumshield scan . --languages python,java --format sarif

# ${isZh ? '设定阻断等级' : 'Set fail level'}
quantumshield scan . --fail-on critical

# ${isZh ? '排除测试文件' : 'Exclude test files'}
quantumshield scan . --exclude '**/test/**'`}
                      </pre>
                    ),
                  },
                  {
                    key: 'report',
                    label: <Text style={{ color: colors.text }}>quantumshield report — {isZh ? '生成报告' : 'Generate Report'}</Text>,
                    children: (
                      <pre style={{ background: 'var(--qs-code-preview-bg)', padding: 12, borderRadius: 6, color: 'var(--qs-code-preview-text)', fontSize: 12, margin: 0 }}>
{`# HTML ${isZh ? '合规报告' : 'compliance report'}
quantumshield report . --format html --output report.html

# CBOM (CycloneDX 1.6)
quantumshield report . --format cbom --output cbom.json

# SARIF 2.1.0
quantumshield report . --format sarif --output findings.sarif

# JSON ${isZh ? '完整报告' : 'full report'}
quantumshield report . --format json --output report.json`}
                      </pre>
                    ),
                  },
                  {
                    key: 'migrate',
                    label: <Text style={{ color: colors.text }}>quantumshield migrate — {isZh ? '生成迁移代码' : 'Generate Migration'}</Text>,
                    children: (
                      <pre style={{ background: 'var(--qs-code-preview-bg)', padding: 12, borderRadius: 6, color: 'var(--qs-code-preview-text)', fontSize: 12, margin: 0 }}>
{`# ${isZh ? '生成迁移代码（混合模式推荐）' : 'Generate migration code (hybrid mode recommended)'}
quantumshield migrate . --strategy hybrid

# ${isZh ? '纯 PQC 替换模式' : 'Pure PQC replacement'}
quantumshield migrate . --strategy pure-pqc

# ${isZh ? '密码学敏捷模式' : 'Crypto-agile mode'}
quantumshield migrate . --strategy crypto-agile

# ${isZh ? '只生成 diff 预览，不写入文件' : 'Dry run preview only'}
quantumshield migrate . --dry-run`}
                      </pre>
                    ),
                  },
                  {
                    key: 'test',
                    label: <Text style={{ color: colors.text }}>quantumshield test — {isZh ? '验证迁移' : 'Verify Migration'}</Text>,
                    children: (
                      <pre style={{ background: 'var(--qs-code-preview-bg)', padding: 12, borderRadius: 6, color: 'var(--qs-code-preview-text)', fontSize: 12, margin: 0 }}>
{`# ${isZh ? '运行迁移后的验证测试' : 'Run post-migration verification tests'}
quantumshield test ./migrated-code

# ${isZh ? '生成回滚脚本' : 'Generate rollback scripts'}
quantumshield test --generate-rollback

# ${isZh ? '对比迁移前后性能' : 'Benchmark before/after migration'}
quantumshield test --benchmark`}
                      </pre>
                    ),
                  },
                ]}
              />
            </ProCard>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
