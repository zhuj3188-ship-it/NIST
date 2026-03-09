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

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/* ---- Platform configs ---- */
const PLATFORMS = [
  { key: 'github', name: 'GitHub Actions', icon: <GithubOutlined />, color: '#fff', desc: 'GitHub 工作流集成，支持 SARIF 上传到 Code Scanning' },
  { key: 'gitlab', name: 'GitLab CI', icon: <GitlabOutlined />, color: '#FC6D26', desc: 'GitLab CI/CD 管道集成，支持 SAST 报告' },
  { key: 'jenkins', name: 'Jenkins', icon: <SettingOutlined />, color: '#D24939', desc: 'Jenkins Pipeline 集成，支持 SARIF 插件' },
  { key: 'azure', name: 'Azure DevOps', icon: <CloudOutlined />, color: '#0078D7', desc: 'Azure Pipelines 集成，支持构建产物发布' },
  { key: 'bitbucket', name: 'Bitbucket', icon: <BranchesOutlined />, color: '#0052CC', desc: 'Bitbucket Pipelines 集成，支持定时扫描' },
];

const LANGUAGES = [
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'Go', value: 'go' },
  { label: 'JavaScript/TS', value: 'javascript' },
  { label: 'C/C++', value: 'c' },
  { label: 'Rust', value: 'rust' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Swift', value: 'swift' },
];

const FAIL_LEVELS = [
  { value: 'critical', label: '仅严重', desc: '仅在发现 CRITICAL 级别问题时阻断构建', color: '#ff4757' },
  { value: 'high', label: '高及以上', desc: '在发现 HIGH 或 CRITICAL 级别问题时阻断', color: '#ff6b35' },
  { value: 'medium', label: '中等及以上', desc: '在发现 MEDIUM 及以上级别问题时阻断', color: '#ffa502' },
  { value: 'none', label: '仅报告', desc: '不阻断构建，仅生成报告', color: '#2ed573' },
];

export default function CICDPage() {
  const [platform, setPlatform] = useState('github');
  const [failOn, setFailOn] = useState('critical');
  const [languages, setLanguages] = useState([]);
  const [generateReport, setGenerateReport] = useState(true);
  const [generateCBOM, setGenerateCBOM] = useState(true);
  const [configResult, setConfigResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateCIConfig(platform, failOn, languages, generateReport);
      setConfigResult(result);
      message.success('CI/CD 配置已生成');
    } catch (err) {
      message.error('生成失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [platform, failOn, languages, generateReport]);

  const handleCopy = useCallback(() => {
    if (configResult?.config) {
      navigator.clipboard.writeText(configResult.config).then(() => {
        message.success('已复制到剪贴板');
      }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = configResult.config;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        message.success('已复制到剪贴板');
      });
    }
  }, [configResult]);

  const handleDownload = useCallback(() => {
    if (configResult?.config && configResult?.filename) {
      const blob = new Blob([configResult.config], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = configResult.filename.replace(/\//g, '-').replace(/^\./, '');
      a.click();
      URL.revokeObjectURL(url);
      message.success('文件已下载');
    }
  }, [configResult]);

  const currentPlatform = PLATFORMS.find(p => p.key === platform);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <RocketOutlined style={{ color: '#6C5CE7' }} />
            CI/CD 集成中心
          </Title>
          <Text style={{ color: '#7a7a9e', fontSize: 14 }}>
            一键生成 CI/CD 集成配置，将量子安全扫描集成到你的开发流程中
          </Text>
          <div style={{ marginTop: 12 }}>
            <Tag color="purple">quantumshield/action@v1</Tag>
            <Tag color="blue">SARIF 2.1.0</Tag>
            <Tag color="cyan">CycloneDX 1.6</Tag>
            <Tag color="green">自动化扫描</Tag>
          </div>
        </div>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Left: Configuration Panel */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <ProCard title={<span><SettingOutlined style={{ marginRight: 8 }} />配置选项</span>} bordered style={{ marginBottom: 24 }}>
              {/* Platform selector */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#ccc', display: 'block', marginBottom: 8 }}>CI/CD 平台</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {PLATFORMS.map(p => (
                    <div
                      key={p.key}
                      onClick={() => setPlatform(p.key)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: `1px solid ${platform === p.key ? '#6C5CE7' : '#1e1e45'}`,
                        background: platform === p.key ? 'rgba(108,92,231,0.12)' : '#0d0d24',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 20, color: p.color, marginBottom: 4 }}>{p.icon}</div>
                      <Text style={{ color: platform === p.key ? '#fff' : '#7a7a9e', fontSize: 12 }}>{p.name}</Text>
                    </div>
                  ))}
                </div>
                <Text style={{ color: '#5a5a7a', fontSize: 11, display: 'block', marginTop: 6 }}>{currentPlatform?.desc}</Text>
              </div>

              <Divider style={{ borderColor: '#1e1e45', margin: '16px 0' }} />

              {/* Fail-on level */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#ccc', display: 'block', marginBottom: 8 }}>阻断等级 (fail-on)</Text>
                <Select value={failOn} onChange={setFailOn} style={{ width: '100%' }} size="large">
                  {FAIL_LEVELS.map(l => (
                    <Option key={l.value} value={l.value}>
                      <Space>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span>{l.label}</span>
                        <Text style={{ color: '#5a5a7a', fontSize: 11 }}> — {l.desc}</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Languages */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#ccc', display: 'block', marginBottom: 8 }}>
                  扫描语言 <Text style={{ color: '#5a5a7a', fontSize: 11 }}>（留空 = 自动检测）</Text>
                </Text>
                <Select
                  mode="multiple"
                  value={languages}
                  onChange={setLanguages}
                  style={{ width: '100%' }}
                  placeholder="自动检测所有支持的语言"
                  allowClear
                >
                  {LANGUAGES.map(l => (
                    <Option key={l.value} value={l.value}>{l.label}</Option>
                  ))}
                </Select>
              </div>

              <Divider style={{ borderColor: '#1e1e45', margin: '16px 0' }} />

              {/* Output options */}
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ color: '#ccc', display: 'block', marginBottom: 12 }}>输出选项</Text>
                <Space direction="vertical">
                  <Checkbox checked={generateReport} onChange={e => setGenerateReport(e.target.checked)}>
                    <Text style={{ color: '#ccc' }}>生成 HTML 报告</Text>
                  </Checkbox>
                  <Checkbox checked={generateCBOM} onChange={e => setGenerateCBOM(e.target.checked)}>
                    <Text style={{ color: '#ccc' }}>生成 CBOM (CycloneDX 1.6)</Text>
                  </Checkbox>
                  <Checkbox checked={true} disabled>
                    <Text style={{ color: '#7a7a9e' }}>输出 SARIF 2.1.0 (默认)</Text>
                  </Checkbox>
                </Space>
              </div>

              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                onClick={handleGenerate}
                loading={loading}
                style={{ height: 48, fontSize: 16, background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', border: 'none' }}
              >
                生成 CI/CD 配置
              </Button>
            </ProCard>
          </motion.div>

          {/* Integration workflow */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <ProCard title={<span><ClockCircleOutlined style={{ marginRight: 8 }} />集成工作流</span>} bordered>
              <Steps
                direction="vertical"
                size="small"
                current={configResult ? 3 : 0}
                items={[
                  { title: '选择 CI/CD 平台', description: '选择你的代码托管/CI 平台' },
                  { title: '配置扫描参数', description: '设置阻断等级、语言和输出格式' },
                  { title: '生成配置文件', description: '点击按钮生成对应的配置' },
                  { title: '复制到项目仓库', description: '将配置文件添加到项目根目录' },
                  { title: '提交并触发扫描', description: 'Push 到仓库后自动执行量子安全扫描' },
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
                  {configResult ? configResult.name + ' 配置' : '配置预览'}
                  {configResult && (
                    <Tag style={{ marginLeft: 8, fontSize: 11 }} color="purple">
                      {configResult.filename}
                    </Tag>
                  )}
                </span>
              }
              bordered
              style={{ marginBottom: 24 }}
              extra={
                configResult && (
                  <Space>
                    <Tooltip title="复制到剪贴板">
                      <Button icon={<CopyOutlined />} onClick={handleCopy} size="small">复制</Button>
                    </Tooltip>
                    <Tooltip title="下载配置文件">
                      <Button icon={<DownloadOutlined />} onClick={handleDownload} size="small">下载</Button>
                    </Tooltip>
                  </Space>
                )
              }
            >
              {configResult ? (
                <pre style={{
                  background: '#060612',
                  border: '1px solid #1a1a42',
                  borderRadius: 8,
                  padding: 20,
                  margin: 0,
                  maxHeight: 500,
                  overflow: 'auto',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: '#a29bfe',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  whiteSpace: 'pre-wrap',
                }}>
                  {configResult.config}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: '#4a4a6e' }}>
                  <CodeOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                  <div>选择平台并点击"生成"查看配置文件</div>
                </div>
              )}
            </ProCard>

            {/* Feature comparison */}
            <ProCard title={<span><ApiOutlined style={{ marginRight: 8 }} />平台功能对比</span>} bordered style={{ marginBottom: 24 }}>
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e45' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#7a7a9e' }}>功能</th>
                      {PLATFORMS.map(p => (
                        <th key={p.key} style={{ padding: '10px 8px', textAlign: 'center', color: platform === p.key ? '#6C5CE7' : '#7a7a9e' }}>
                          {p.icon} {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'SARIF 上传', values: ['Code Scanning', 'SAST 报告', '插件', '产物', '产物'] },
                      { feature: 'PR 检查', values: ['原生', '原生', '插件', '原生', '原生'] },
                      { feature: '定时扫描', values: ['cron', 'schedules', 'cron', 'schedules', 'schedules'] },
                      { feature: 'CBOM 输出', values: ['Artifact', 'Artifact', 'Archive', 'Artifact', 'Artifact'] },
                      { feature: 'fail-on 阻断', values: ['exit code', 'exit code', 'exit code', 'exit code', 'exit code'] },
                      { feature: '并行扫描', values: ['matrix', 'parallel', 'parallel', 'strategy', 'parallel'] },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(26,26,66,0.5)' }}>
                        <td style={{ padding: '8px 12px', color: '#ccc' }}>{row.feature}</td>
                        {row.values.map((v, j) => (
                          <td key={j} style={{ padding: '8px', textAlign: 'center', color: '#a29bfe', fontSize: 11 }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ProCard>

            {/* CLI Usage Guide */}
            <ProCard title={<span><ThunderboltOutlined style={{ marginRight: 8 }} />CLI 命令参考</span>} bordered>
              <Collapse
                ghost
                items={[
                  {
                    key: 'scan',
                    label: <Text style={{ color: '#ccc' }}>quantumshield scan — 执行扫描</Text>,
                    children: (
                      <pre style={{ background: '#060612', padding: 12, borderRadius: 6, color: '#a29bfe', fontSize: 12, margin: 0 }}>
{`# 扫描当前目录
quantumshield scan .

# 指定语言和输出格式
quantumshield scan . --languages python,java --format sarif

# 设定阻断等级
quantumshield scan . --fail-on critical

# 排除测试文件
quantumshield scan . --exclude '**/test/**'`}
                      </pre>
                    ),
                  },
                  {
                    key: 'report',
                    label: <Text style={{ color: '#ccc' }}>quantumshield report — 生成报告</Text>,
                    children: (
                      <pre style={{ background: '#060612', padding: 12, borderRadius: 6, color: '#a29bfe', fontSize: 12, margin: 0 }}>
{`# HTML 合规报告
quantumshield report . --format html --output report.html

# CBOM (CycloneDX 1.6)
quantumshield report . --format cbom --output cbom.json

# SARIF 2.1.0
quantumshield report . --format sarif --output findings.sarif

# JSON 完整报告
quantumshield report . --format json --output report.json`}
                      </pre>
                    ),
                  },
                  {
                    key: 'migrate',
                    label: <Text style={{ color: '#ccc' }}>quantumshield migrate — 生成迁移代码</Text>,
                    children: (
                      <pre style={{ background: '#060612', padding: 12, borderRadius: 6, color: '#a29bfe', fontSize: 12, margin: 0 }}>
{`# 生成迁移代码（混合模式推荐）
quantumshield migrate . --strategy hybrid

# 纯 PQC 替换模式
quantumshield migrate . --strategy pure-pqc

# 密码学敏捷模式
quantumshield migrate . --strategy crypto-agile

# 只生成 diff 预览，不写入文件
quantumshield migrate . --dry-run`}
                      </pre>
                    ),
                  },
                  {
                    key: 'test',
                    label: <Text style={{ color: '#ccc' }}>quantumshield test — 验证迁移</Text>,
                    children: (
                      <pre style={{ background: '#060612', padding: 12, borderRadius: 6, color: '#a29bfe', fontSize: 12, margin: 0 }}>
{`# 运行迁移后的验证测试
quantumshield test ./migrated-code

# 生成回滚脚本
quantumshield test --generate-rollback

# 对比迁移前后性能
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
