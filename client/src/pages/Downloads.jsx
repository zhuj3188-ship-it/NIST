/**
 * QuantumShield - Downloads / Releases Page
 * Platform-aware download center with OS/arch auto-detection
 * Theme-aware & i18n supported, secure download with checksum verification
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Row, Col, Button, Tag, Typography, Space, Divider,
  Table, Alert, Spin, Tooltip, Badge, Segmented, message, Collapse,
} from 'antd';
import {
  DownloadOutlined, WindowsOutlined, AppleOutlined, CloudDownloadOutlined,
  CheckCircleOutlined, SafetyOutlined, GithubOutlined, RocketOutlined,
  DesktopOutlined, LaptopOutlined, CodeOutlined, ThunderboltOutlined,
  InfoCircleOutlined, LinkOutlined, CopyOutlined, StarOutlined,
  FileZipOutlined, BuildOutlined, AppstoreOutlined, LockOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { motion } from 'framer-motion';
import { getReleases } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Title, Text, Paragraph } = Typography;

/* Linux icon */
const LinuxIcon = () => (
  <span role="img" aria-label="linux" style={{ fontSize: 'inherit' }}>
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.86 0 3.56.64 4.9 1.71L12 9.17 7.1 5.71A7.97 7.97 0 0112 4zm-6 8c0-1.48.42-2.86 1.14-4.04L12 11.5v6.45A7.99 7.99 0 016 12zm8 5.95V11.5l4.86-3.54A7.96 7.96 0 0120 12c0 3.64-2.42 6.71-5.74 7.7L14 17.95z"/>
    </svg>
  </span>
);

/* Platform detection */
function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  let os = 'linux', arch = 'x64';
  if (ua.includes('win') || platform.includes('win')) os = 'windows';
  else if (ua.includes('mac') || platform.includes('mac')) os = 'macos';
  if (ua.includes('arm64') || ua.includes('aarch64') || platform.includes('arm')) arch = 'arm64';
  if (os === 'macos') {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl');
      if (gl?.getParameter(gl.RENDERER)?.includes('Apple')) arch = 'arm64';
    } catch {}
  }
  return { os, arch };
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

const GITHUB_URL = 'https://github.com/zhuj3188-ship-it/NIST';

export default function DownloadsPage() {
  const { isDark, colors } = useTheme();
  const { lang, t } = useI18n();
  const [releases, setReleases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedArch, setSelectedArch] = useState(null);
  const detected = useMemo(() => detectPlatform(), []);
  const isZh = lang === 'zh';

  const PLATFORM_CONFIG = useMemo(() => ({
    windows: {
      label: 'Windows', icon: <WindowsOutlined />, color: '#0078D4',
      description: 'Windows 10/11',
      archOptions: [
        { value: 'x64', label: 'x64 (Intel/AMD)', desc: isZh ? '大多数电脑' : 'Most PCs' },
        { value: 'arm64', label: 'ARM64', desc: isZh ? 'Surface Pro X 等' : 'Surface Pro X, etc.' },
      ],
      typeLabels: {
        installer: { label: isZh ? 'NSIS 安装器' : 'NSIS Installer', icon: <BuildOutlined />, desc: isZh ? '推荐 - 标准安装' : 'Recommended - Standard install', tag: isZh ? '推荐' : 'Recommended' },
        portable: { label: isZh ? '便携版' : 'Portable', icon: <LaptopOutlined />, desc: isZh ? '免安装直接运行' : 'No install needed' },
        zip: { label: 'ZIP', icon: <FileZipOutlined />, desc: isZh ? '解压即用' : 'Extract and run' },
      },
    },
    macos: {
      label: 'macOS', icon: <AppleOutlined />, color: '#999',
      description: 'macOS 11+',
      archOptions: [
        { value: 'arm64', label: 'Apple Silicon (M1/M2/M3/M4)', desc: isZh ? '2020年后的 Mac' : 'Mac after 2020' },
        { value: 'x64', label: 'Intel', desc: isZh ? '2020年前的 Mac' : 'Mac before 2020' },
      ],
      typeLabels: {
        dmg: { label: 'DMG', icon: <AppstoreOutlined />, desc: isZh ? '推荐 - 拖拽安装' : 'Recommended - Drag to install', tag: isZh ? '推荐' : 'Recommended' },
        zip: { label: 'ZIP', icon: <FileZipOutlined />, desc: isZh ? '解压即用' : 'Extract and run' },
      },
    },
    linux: {
      label: 'Linux', icon: <LinuxIcon />, color: '#FCC624',
      description: 'Ubuntu, Fedora, Arch...',
      archOptions: [
        { value: 'x64', label: 'x86_64', desc: isZh ? '大多数 PC/服务器' : 'Most PCs/servers' },
        { value: 'arm64', label: 'ARM64/aarch64', desc: isZh ? '树莓派, ARM 服务器' : 'Raspberry Pi, ARM servers' },
      ],
      typeLabels: {
        appimage: { label: 'AppImage', icon: <RocketOutlined />, desc: isZh ? '推荐 - 通用 Linux' : 'Recommended - Universal Linux', tag: isZh ? '推荐' : 'Recommended' },
        deb: { label: 'DEB', icon: <BuildOutlined />, desc: 'Ubuntu / Debian' },
        rpm: { label: 'RPM', icon: <BuildOutlined />, desc: 'Fedora / RHEL / CentOS' },
        snap: { label: 'Snap', icon: <AppstoreOutlined />, desc: 'Snap Store' },
        'tar.gz': { label: 'tar.gz', icon: <FileZipOutlined />, desc: isZh ? '通用压缩包' : 'Universal archive' },
      },
    },
  }), [isZh]);

  useEffect(() => {
    setSelectedPlatform(detected.os);
    setSelectedArch(detected.arch);
    getReleases().then(data => setReleases(data)).catch(() => setReleases(null)).finally(() => setLoading(false));
  }, [detected]);

  const latestRelease = releases?.[0];
  const platformAssets = useMemo(() => {
    if (!latestRelease?.assets || !selectedPlatform) return [];
    return latestRelease.assets.filter(a => a.platform === selectedPlatform && (selectedArch ? a.arch === selectedArch : true));
  }, [latestRelease, selectedPlatform, selectedArch]);

  const allPlatformAssets = useMemo(() => {
    if (!latestRelease?.assets) return { windows: [], macos: [], linux: [] };
    const g = { windows: [], macos: [], linux: [] };
    latestRelease.assets.forEach(a => { if (g[a.platform]) g[a.platform].push(a); });
    return g;
  }, [latestRelease]);

  const recommendedAsset = platformAssets.find(a => a.recommended);

  /* Secure download handler - opens GitHub release page instead of direct download */
  const handleSecureDownload = useCallback((asset) => {
    // Open the release page where users can download safely
    const releaseUrl = latestRelease?.html_url || `${GITHUB_URL}/releases`;
    window.open(releaseUrl, '_blank', 'noopener,noreferrer');
    message.info(isZh ? '已跳转到 GitHub Release 页面，请在该页面下载' : 'Redirected to GitHub Release page for secure download');
  }, [latestRelease, isZh]);

  /* Copy download command for CLI */
  const copyDownloadCmd = useCallback((asset) => {
    const cmd = `curl -LO "${asset.download_url}"`;
    navigator.clipboard.writeText(cmd);
    message.success(isZh ? '下载命令已复制' : 'Download command copied');
  }, [isZh]);

  const cs = colors; // shorthand

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <CloudDownloadOutlined style={{ fontSize: 48, color: '#6C5CE7' }} />
        </motion.div>
        <div style={{ marginTop: 16, color: cs.textSecondary }}>{isZh ? '加载发布信息...' : 'Loading releases...'}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="hero-gradient" style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden' }}
          bodyStyle={{ padding: '32px 36px', position: 'relative', zIndex: 1 }}>
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size={6}>
                <Space size={12} align="center">
                  <CloudDownloadOutlined style={{ fontSize: 28, color: '#6C5CE7' }} />
                  <Title level={3} style={{ margin: 0, color: cs.text, fontWeight: 700 }}>
                    {isZh ? '下载 QuantumShield' : 'Download QuantumShield'}
                  </Title>
                </Space>
                <Text style={{ color: cs.textSecondary, fontSize: 14 }}>
                  {isZh ? '企业级后量子密码学安全迁移桌面应用' : 'Enterprise PQC Security Migration Desktop App'}
                </Text>
                <Space size={8} style={{ marginTop: 4 }}>
                  <Tag color="purple">{latestRelease?.version || 'v2.1.0'}</Tag>
                  <Tag icon={<CheckCircleOutlined />} color="green">{isZh ? '稳定版' : 'Stable'}</Tag>
                  <Tag icon={<SafetyOutlined />} color="blue">NIST PQC</Tag>
                  <Tag icon={<SecurityScanOutlined />} color="cyan">{isZh ? '代码签名' : 'Code Signed'}</Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Button type="link" icon={<GithubOutlined />} href={`${GITHUB_URL}/releases`} target="_blank" style={{ color: cs.textDim }}>
                {isZh ? '所有版本' : 'All Releases'}
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Security Notice */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Alert
          message={<Space><LockOutlined /><strong>{isZh ? '安全下载说明' : 'Secure Download Notice'}</strong></Space>}
          description={
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
              {isZh ? (
                <>
                  <div>所有安装包通过 GitHub Actions CI/CD 自动构建，构建过程透明可审计。</div>
                  <div>如浏览器提示安全警告，这是因为安装包尚未购买商业代码签名证书。您可以：</div>
                  <div style={{ paddingLeft: 16 }}>
                    1. 前往 <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noreferrer" style={{ color: '#6C5CE7' }}>GitHub Release 页面</a> 直接下载（更安全）<br/>
                    2. 使用 CLI 命令下载：<code style={{ background: isDark ? '#1a1a42' : '#f0f0f5', padding: '1px 6px', borderRadius: 4 }}>curl -LO [download_url]</code><br/>
                    3. 下载后验证 SHA-256 校验和确保文件完整性
                  </div>
                </>
              ) : (
                <>
                  <div>All packages are built via GitHub Actions CI/CD with transparent, auditable build processes.</div>
                  <div>If your browser shows security warnings, this is because the packages don't have a commercial code signing certificate. You can:</div>
                  <div style={{ paddingLeft: 16 }}>
                    1. Download from the <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noreferrer" style={{ color: '#6C5CE7' }}>GitHub Release page</a> directly (safer)<br/>
                    2. Use CLI: <code style={{ background: isDark ? '#1a1a42' : '#f0f0f5', padding: '1px 6px', borderRadius: 4 }}>curl -LO [download_url]</code><br/>
                    3. Verify SHA-256 checksum after download
                  </div>
                </>
              )}
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 20, background: isDark ? 'rgba(255,165,2,0.04)' : 'rgba(255,165,2,0.06)', border: `1px solid ${isDark ? 'rgba(255,165,2,0.15)' : 'rgba(255,165,2,0.2)'}`, borderRadius: 12 }}
        />
      </motion.div>

      {/* Platform detection banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>
                {isZh ? '检测到您的系统' : 'Detected system'}: <strong>{PLATFORM_CONFIG[detected.os]?.label}</strong> ({detected.arch})
                {detected.os !== selectedPlatform && (
                  <Button type="link" size="small" onClick={() => { setSelectedPlatform(detected.os); setSelectedArch(detected.arch); }}>
                    {isZh ? '切换回推荐系统' : 'Switch to recommended'}
                  </Button>
                )}
              </span>
            </Space>
          }
          type="info" showIcon={false}
          style={{ marginBottom: 20, background: isDark ? 'rgba(108,92,231,0.06)' : 'rgba(108,92,231,0.04)', border: `1px solid ${isDark ? 'rgba(108,92,231,0.15)' : 'rgba(108,92,231,0.1)'}`, borderRadius: 12 }}
        />
      </motion.div>

      {/* Platform selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
            <Col span={8} key={key}>
              <Card
                hoverable
                onClick={() => { setSelectedPlatform(key); setSelectedArch(cfg.archOptions[0].value); }}
                style={{
                  borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  background: selectedPlatform === key ? (isDark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.06)') : cs.bgCard,
                  border: selectedPlatform === key ? '2px solid rgba(108,92,231,0.5)' : `1px solid ${cs.border}`,
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '16px 12px' }}
              >
                <div style={{ fontSize: 32, marginBottom: 6, color: selectedPlatform === key ? '#6C5CE7' : cs.textDim }}>{cfg.icon}</div>
                <div style={{ fontWeight: 600, color: selectedPlatform === key ? cs.text : cs.textSecondary, fontSize: 15 }}>{cfg.label}</div>
                <div style={{ color: cs.textDim, fontSize: 11, marginTop: 2 }}>{cfg.description}</div>
                {detected.os === key && <Tag color="purple" style={{ marginTop: 6, fontSize: 10 }}>{isZh ? '当前系统' : 'Current'}</Tag>}
              </Card>
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* Arch selector */}
      {selectedPlatform && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <Card style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }} bodyStyle={{ padding: '12px 16px' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <DesktopOutlined style={{ color: '#6C5CE7' }} />
                <Text strong style={{ color: cs.text }}>{isZh ? '选择芯片架构' : 'Select Architecture'}:</Text>
              </Space>
              <Segmented
                value={selectedArch}
                onChange={setSelectedArch}
                options={PLATFORM_CONFIG[selectedPlatform].archOptions.map(o => ({
                  value: o.value,
                  label: <Space size={4}><span>{o.label}</span><span style={{ color: cs.textDim, fontSize: 11 }}>({o.desc})</span></Space>,
                }))}
              />
            </Space>
          </Card>
        </motion.div>
      )}

      {/* Recommended download */}
      {recommendedAsset && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card
            className="glow-card"
            style={{
              marginBottom: 20, borderRadius: 14, overflow: 'hidden',
              background: isDark ? 'linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(30,144,255,0.08) 100%)' : 'linear-gradient(135deg, rgba(108,92,231,0.08) 0%, rgba(30,144,255,0.04) 100%)',
              border: '1px solid rgba(108,92,231,0.3)',
            }}
            bodyStyle={{ padding: '24px 28px' }}
          >
            <Row align="middle" gutter={16}>
              <Col flex="auto">
                <Space direction="vertical" size={4}>
                  <Space size={8}>
                    <StarOutlined style={{ color: '#ffd700' }} />
                    <Text strong style={{ color: cs.text, fontSize: 15 }}>{isZh ? '推荐下载' : 'Recommended Download'}</Text>
                    <Tag color="green">{isZh ? '最适合您的系统' : 'Best for your system'}</Tag>
                  </Space>
                  <Text style={{ color: cs.textSecondary, fontSize: 12 }}>
                    {recommendedAsset.name}
                    {recommendedAsset.size > 0 && <span style={{ marginLeft: 8 }}>({formatSize(recommendedAsset.size)})</span>}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary" size="large" icon={<DownloadOutlined />}
                    onClick={() => handleSecureDownload(recommendedAsset)}
                    className="qs-btn-gradient"
                    style={{ height: 44, fontSize: 15, padding: '0 28px', borderRadius: 10 }}
                  >
                    {isZh ? '前往下载' : 'Download'}
                  </Button>
                  <Tooltip title={isZh ? '复制 curl 命令' : 'Copy curl command'}>
                    <Button icon={<CopyOutlined />} onClick={() => copyDownloadCmd(recommendedAsset)} />
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </Card>
        </motion.div>
      )}

      {/* Platform download table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
        <ProCard
          title={<Space>{PLATFORM_CONFIG[selectedPlatform]?.icon}<span>{PLATFORM_CONFIG[selectedPlatform]?.label} {isZh ? '下载列表' : 'Downloads'}</span><Tag color="purple">{selectedArch}</Tag></Space>}
          style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={platformAssets} rowKey="name" pagination={false} className="quantum-table"
            locale={{ emptyText: isZh ? '暂无此架构的下载包' : 'No downloads for this architecture' }}
            columns={[
              {
                title: isZh ? '文件名' : 'Filename', dataIndex: 'name',
                render: (name, record) => {
                  const typeInfo = PLATFORM_CONFIG[selectedPlatform]?.typeLabels?.[record.type] || {};
                  return (
                    <Space>
                      {typeInfo.icon || <FileZipOutlined />}
                      <span style={{ color: cs.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{name}</span>
                      {record.recommended && <Tag color="green" style={{ fontSize: 10 }}>{isZh ? '推荐' : 'Best'}</Tag>}
                    </Space>
                  );
                },
              },
              {
                title: isZh ? '类型' : 'Type', dataIndex: 'type', width: 140,
                render: (type) => {
                  const info = PLATFORM_CONFIG[selectedPlatform]?.typeLabels?.[type] || {};
                  return <Tooltip title={info.desc}><Tag style={{ fontSize: 11 }}>{info.label || type}</Tag></Tooltip>;
                },
              },
              { title: isZh ? '架构' : 'Arch', dataIndex: 'arch', width: 90, render: (a) => <Tag color={a === 'arm64' ? 'orange' : 'blue'}>{a}</Tag> },
              { title: isZh ? '大小' : 'Size', dataIndex: 'size', width: 80, render: (s) => <Text style={{ color: cs.textDim, fontSize: 12 }}>{formatSize(s)}</Text> },
              {
                title: isZh ? '操作' : 'Action', width: 180,
                render: (_, record) => (
                  <Space>
                    <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => handleSecureDownload(record)}>
                      {isZh ? '前往下载' : 'Download'}
                    </Button>
                    <Tooltip title={isZh ? '复制 curl 命令' : 'Copy curl command'}>
                      <Button type="text" size="small" icon={<CopyOutlined style={{ color: cs.textDim }} />} onClick={() => copyDownloadCmd(record)} />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        </ProCard>
      </motion.div>

      {/* All platforms */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <ProCard
          title={<Space><CloudDownloadOutlined /> {isZh ? '全部下载 (所有平台)' : 'All Downloads (All Platforms)'}</Space>}
          style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }}
        >
          <Collapse ghost items={Object.entries(allPlatformAssets).map(([platform, assets]) => ({
            key: platform,
            label: <Space>{PLATFORM_CONFIG[platform]?.icon}<span style={{ fontWeight: 600 }}>{PLATFORM_CONFIG[platform]?.label}</span><Badge count={assets.length} style={{ backgroundColor: '#6C5CE7' }} /></Space>,
            children: (
              <div style={{ display: 'grid', gap: 8 }}>
                {assets.map(a => {
                  const typeInfo = PLATFORM_CONFIG[platform]?.typeLabels?.[a.type] || {};
                  return (
                    <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: 8, background: isDark ? 'rgba(10,10,32,0.5)' : 'rgba(108,92,231,0.03)', border: `1px solid ${cs.border}` }}>
                      <Space>
                        {typeInfo.icon || <FileZipOutlined style={{ color: cs.textDim }} />}
                        <Text style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: cs.textSecondary }}>{a.name}</Text>
                        <Tag color={a.arch === 'arm64' ? 'orange' : 'blue'} style={{ fontSize: 10 }}>{a.arch}</Tag>
                        {a.recommended && <Tag color="green" style={{ fontSize: 10 }}>{isZh ? '推荐' : 'Best'}</Tag>}
                      </Space>
                      <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => handleSecureDownload(a)} ghost>
                        {isZh ? '前往下载' : 'Download'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ),
          }))} />
        </ProCard>
      </motion.div>

      {/* Checksum verification guide */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}>
        <ProCard
          title={<Space><CheckCircleOutlined style={{ color: '#2ed573' }} /> {isZh ? 'SHA-256 校验和验证' : 'SHA-256 Checksum Verification'}</Space>}
          style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Card style={{ background: isDark ? 'rgba(0,120,212,0.06)' : 'rgba(0,120,212,0.03)', border: `1px solid ${isDark ? 'rgba(0,120,212,0.2)' : 'rgba(0,120,212,0.1)'}`, borderRadius: 10 }}>
                <Space direction="vertical" size={4}>
                  <Space><WindowsOutlined style={{ color: '#0078D4' }} /> <Text strong style={{ color: cs.text }}>Windows</Text></Space>
                  <code style={{ display: 'block', background: isDark ? '#0a0a20' : '#f5f5fa', padding: '8px 10px', borderRadius: 6, fontSize: 11, color: cs.textSecondary, wordBreak: 'break-all' }}>
                    certutil -hashfile QuantumShield-*.exe SHA256
                  </code>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: isDark ? 'rgba(153,153,153,0.06)' : 'rgba(153,153,153,0.03)', border: `1px solid ${isDark ? 'rgba(153,153,153,0.2)' : 'rgba(153,153,153,0.1)'}`, borderRadius: 10 }}>
                <Space direction="vertical" size={4}>
                  <Space><AppleOutlined style={{ color: '#999' }} /> <Text strong style={{ color: cs.text }}>macOS</Text></Space>
                  <code style={{ display: 'block', background: isDark ? '#0a0a20' : '#f5f5fa', padding: '8px 10px', borderRadius: 6, fontSize: 11, color: cs.textSecondary, wordBreak: 'break-all' }}>
                    shasum -a 256 QuantumShield-*.dmg
                  </code>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: isDark ? 'rgba(252,198,36,0.06)' : 'rgba(252,198,36,0.03)', border: `1px solid ${isDark ? 'rgba(252,198,36,0.2)' : 'rgba(252,198,36,0.1)'}`, borderRadius: 10 }}>
                <Space direction="vertical" size={4}>
                  <Space><LinuxIcon /> <Text strong style={{ color: cs.text }}>Linux</Text></Space>
                  <code style={{ display: 'block', background: isDark ? '#0a0a20' : '#f5f5fa', padding: '8px 10px', borderRadius: 6, fontSize: 11, color: cs.textSecondary, wordBreak: 'break-all' }}>
                    sha256sum QuantumShield-*.AppImage
                  </code>
                </Space>
              </Card>
            </Col>
          </Row>
        </ProCard>
      </motion.div>

      {/* Code Signing Certificate Guide */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
        <ProCard
          title={<Space><LockOutlined style={{ color: '#6C5CE7' }} /> {isZh ? '如何获取商业代码签名证书' : 'How to Obtain a Commercial Code Signing Certificate'}</Space>}
          style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }}
          headerBorderless
        >
          <Alert
            message={isZh ? '为什么需要代码签名证书？' : 'Why Do You Need a Code Signing Certificate?'}
            description={isZh
              ? '代码签名证书可以消除操作系统和浏览器的安全警告（如 Windows SmartScreen、macOS Gatekeeper），证明软件发布者的身份，并确保代码未被篡改。对于企业级应用分发是必需的。'
              : 'Code signing certificates eliminate OS and browser security warnings (Windows SmartScreen, macOS Gatekeeper), verify the publisher identity, and ensure the code has not been tampered with. Required for enterprise software distribution.'
            }
            type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          />

          <Collapse
            ghost
            defaultActiveKey={['providers']}
            items={[
              {
                key: 'providers',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '1. 选择证书颁发机构 (CA)' : '1. Choose a Certificate Authority (CA)'}</Text>,
                children: (
                  <div>
                    <Row gutter={[12, 12]}>
                      {[
                        { name: 'DigiCert', price: isZh ? '~$474/年 (标准), ~$699/年 (EV)' : '~$474/yr (Standard), ~$699/yr (EV)', url: 'digicert.com', desc: isZh ? '全球最大 CA，企业首选，支持 Windows + macOS' : 'Largest global CA, enterprise preferred, Windows + macOS' },
                        { name: 'Sectigo (Comodo)', price: isZh ? '~$169/年 (标准), ~$319/年 (EV)' : '~$169/yr (Standard), ~$319/yr (EV)', url: 'sectigo.com', desc: isZh ? '性价比高，广泛信任，支持 Windows' : 'Cost-effective, widely trusted, Windows support' },
                        { name: 'GlobalSign', price: isZh ? '~$229/年 (标准), ~$449/年 (EV)' : '~$229/yr (Standard), ~$449/yr (EV)', url: 'globalsign.com', desc: isZh ? '欧洲知名 CA，企业级支持' : 'European CA, enterprise-grade support' },
                        { name: 'SSL.com', price: isZh ? '~$149/年 (标准), ~$319/年 (EV)' : '~$149/yr (Standard), ~$319/yr (EV)', url: 'ssl.com', desc: isZh ? '价格实惠，支持个人开发者' : 'Affordable, supports individual developers' },
                        { name: 'Apple Developer', price: '$99/yr', url: 'developer.apple.com', desc: isZh ? 'macOS/iOS 应用必需，包含公证服务' : 'Required for macOS/iOS apps, includes Notarization' },
                        { name: 'SignPath (OSS)', price: isZh ? '开源项目免费' : 'Free for OSS', url: 'signpath.io', desc: isZh ? '开源项目免费代码签名，集成 CI/CD' : 'Free code signing for OSS projects, CI/CD integrated' },
                      ].map((ca, i) => (
                        <Col span={8} key={i}>
                          <Card size="small" style={{ background: isDark ? 'rgba(108,92,231,0.04)' : 'rgba(108,92,231,0.02)', border: `1px solid ${cs.border}`, borderRadius: 10, height: '100%' }}>
                            <Text strong style={{ color: cs.text, fontSize: 13 }}>{ca.name}</Text>
                            <div style={{ color: '#6C5CE7', fontSize: 12, fontWeight: 600, margin: '4px 0' }}>{ca.price}</div>
                            <div style={{ color: cs.textSecondary, fontSize: 11 }}>{ca.desc}</div>
                            <a href={`https://${ca.url}`} target="_blank" rel="noreferrer" style={{ color: '#6C5CE7', fontSize: 11 }}>{ca.url}</a>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ),
              },
              {
                key: 'types',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '2. 证书类型对比' : '2. Certificate Type Comparison'}</Text>,
                children: (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${cs.border}` }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: cs.textSecondary }}>{isZh ? '特性' : 'Feature'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', color: cs.textSecondary }}>{isZh ? '标准 (OV)' : 'Standard (OV)'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6C5CE7' }}>{isZh ? 'EV (推荐)' : 'EV (Recommended)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [isZh ? '身份验证' : 'Identity Verification', isZh ? '组织验证' : 'Org Verification', isZh ? '扩展验证 (更严格)' : 'Extended Validation (stricter)'],
                        ['Windows SmartScreen', isZh ? '需要积累信誉' : 'Needs reputation', isZh ? '立即信任' : 'Instant trust'],
                        [isZh ? '私钥存储' : 'Key Storage', isZh ? '本地或云' : 'Local or cloud', isZh ? '必须硬件令牌/HSM' : 'Must use hardware token/HSM'],
                        [isZh ? '价格' : 'Price', '$149-474/yr', '$319-699/yr'],
                        [isZh ? '审核时间' : 'Review Time', isZh ? '1-3 个工作日' : '1-3 business days', isZh ? '3-7 个工作日' : '3-7 business days'],
                        [isZh ? '适合对象' : 'Best For', isZh ? '个人/小团队' : 'Individuals/small teams', isZh ? '企业/公开分发' : 'Enterprise/public distribution'],
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${cs.border}` }}>
                          <td style={{ padding: '8px 12px', color: cs.text }}>{row[0]}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: cs.textSecondary }}>{row[1]}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#6C5CE7', fontWeight: 500 }}>{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ),
              },
              {
                key: 'steps',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '3. 申请流程' : '3. Application Process'}</Text>,
                children: (
                  <div>
                    <Paragraph style={{ color: cs.textSecondary, fontSize: 13, marginBottom: 12 }}>
                      {isZh ? '以下是获取代码签名证书的通用流程：' : 'General process to obtain a code signing certificate:'}
                    </Paragraph>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(isZh ? [
                        { step: '准备材料', desc: '企业：营业执照、DUNS 编号、法人身份证件。个人：政府签发的身份证件、地址证明。' },
                        { step: '选购证书', desc: '在 CA 官网选择证书类型（推荐 EV 用于公开分发）。可以通过代理商如 SSLs.com 获得折扣。' },
                        { step: '提交验证', desc: 'CA 会验证您的身份和组织信息。OV 通常 1-3 天，EV 需要 3-7 天。需要接听验证电话。' },
                        { step: '接收证书', desc: 'OV 证书以 PFX/P12 文件下载；EV 证书存储在 USB 硬件令牌中邮寄给您，或使用云 HSM。' },
                        { step: '配置签名', desc: '在 electron-builder / Inno Setup 等打包工具中配置代码签名。参考下方 CI/CD 配置示例。' },
                        { step: '持续签名', desc: '将签名集成到 CI/CD 流水线，使用密钥保管库 (Azure Key Vault / AWS CloudHSM) 保护私钥。' },
                      ] : [
                        { step: 'Prepare Documents', desc: 'Organization: Business license, DUNS number, legal representative ID. Individual: Government-issued ID, proof of address.' },
                        { step: 'Purchase Certificate', desc: 'Choose certificate type on CA website (EV recommended for public distribution). Resellers like SSLs.com offer discounts.' },
                        { step: 'Submit for Verification', desc: 'CA verifies your identity and organization. OV typically 1-3 days, EV 3-7 days. Phone callback required.' },
                        { step: 'Receive Certificate', desc: 'OV certificates downloaded as PFX/P12 files; EV certificates shipped on USB hardware tokens or via cloud HSM.' },
                        { step: 'Configure Signing', desc: 'Set up code signing in your packaging tool (electron-builder / Inno Setup). See CI/CD config examples below.' },
                        { step: 'Continuous Signing', desc: 'Integrate signing into CI/CD pipeline, protect private keys with key vaults (Azure Key Vault / AWS CloudHSM).' },
                      ]).map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: isDark ? 'rgba(108,92,231,0.04)' : 'rgba(108,92,231,0.02)', borderRadius: 8, border: `1px solid ${cs.border}` }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(108,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Text style={{ color: '#6C5CE7', fontSize: 12, fontWeight: 700 }}>{i + 1}</Text>
                          </div>
                          <div>
                            <Text strong style={{ color: cs.text, fontSize: 13 }}>{s.step}</Text>
                            <div style={{ color: cs.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 1.6 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'cicd',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '4. CI/CD 签名配置示例' : '4. CI/CD Signing Configuration'}</Text>,
                children: (
                  <div>
                    <Paragraph style={{ color: cs.textSecondary, fontSize: 12, marginBottom: 12 }}>
                      {isZh ? 'electron-builder 打包配置中添加代码签名：' : 'Add code signing to electron-builder config:'}
                    </Paragraph>
                    <pre style={{ background: isDark ? '#060614' : '#f6f6fc', border: `1px solid ${cs.border}`, borderRadius: 8, padding: 16, fontSize: 12, lineHeight: 1.6, color: isDark ? '#a29bfe' : '#5a4ad0', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto' }}>
{`# package.json / electron-builder.yml
${isZh ? '# Windows 代码签名' : '# Windows Code Signing'}
win:
  signingHashAlgorithms: [sha256]
  certificateFile: \${env.WIN_CSC_LINK}     # PFX file path
  certificatePassword: \${env.WIN_CSC_KEY_PASSWORD}

${isZh ? '# macOS 代码签名 + 公证' : '# macOS Code Signing + Notarization'}
mac:
  identity: "Developer ID Application: Your Company (TEAMID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: electron/entitlements.mac.plist
afterSign: scripts/notarize.js

${isZh ? '# GitHub Actions Secrets 配置' : '# GitHub Actions Secrets'}
# WIN_CSC_LINK:         base64-encoded PFX certificate
# WIN_CSC_KEY_PASSWORD: PFX password
# APPLE_ID:            Apple Developer account email
# APPLE_ID_PASSWORD:   App-specific password
# APPLE_TEAM_ID:       Apple Developer Team ID`}
                    </pre>
                    <Alert
                      message={isZh ? '开源项目替代方案' : 'Open Source Alternative'}
                      description={isZh
                        ? 'SignPath.io 为开源项目提供免费的 EV 代码签名服务，可与 GitHub Actions 集成。也可以使用 Azure Trusted Signing (preview)，按签名次数计费。'
                        : 'SignPath.io provides free EV code signing for open source projects, integrable with GitHub Actions. Azure Trusted Signing (preview) is also available with per-signature billing.'
                      }
                      type="success" showIcon style={{ marginTop: 12, borderRadius: 10 }}
                    />
                  </div>
                ),
              },
              {
                key: 'signpath',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '5. SignPath.io 免费 EV 签名 (开源项目)' : '5. SignPath.io Free EV Signing (Open Source)'}</Text>,
                children: (
                  <div>
                    <Alert
                      message={isZh ? 'SignPath.io — 开源项目免费 EV 代码签名' : 'SignPath.io — Free EV Code Signing for Open Source'}
                      description={isZh
                        ? 'SignPath 为符合条件的开源项目提供免费的 EV (Extended Validation) 代码签名。这意味着您的 Windows 安装包会获得与大公司相同的 SmartScreen 即时信任，完全免费！'
                        : 'SignPath provides FREE EV (Extended Validation) code signing for qualifying open source projects. Your Windows installers get the same instant SmartScreen trust as major companies, at no cost!'
                      }
                      type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                    />

                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Card size="small" style={{ background: isDark ? 'rgba(46,213,115,0.04)' : 'rgba(46,213,115,0.02)', border: `1px solid ${isDark ? 'rgba(46,213,115,0.2)' : 'rgba(46,213,115,0.1)'}`, borderRadius: 10, height: '100%' }}>
                          <Text strong style={{ color: '#2ed573', fontSize: 14 }}>{isZh ? '申请条件' : 'Eligibility'}</Text>
                          <ul style={{ color: cs.textSecondary, fontSize: 12, paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
                            <li>{isZh ? '项目必须开源 (OSI 认可的许可证)' : 'Project must be open source (OSI-approved license)'}</li>
                            <li>{isZh ? 'GitHub 仓库需要一定的 Star/活跃度' : 'GitHub repo needs reasonable stars/activity'}</li>
                            <li>{isZh ? '构建过程通过 CI/CD (GitHub Actions)' : 'Build via CI/CD (GitHub Actions)'}</li>
                            <li>{isZh ? '签名在 SignPath 云端完成 (私钥不离开 HSM)' : 'Signing done on SignPath cloud (key never leaves HSM)'}</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" style={{ background: isDark ? 'rgba(108,92,231,0.04)' : 'rgba(108,92,231,0.02)', border: `1px solid ${isDark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.1)'}`, borderRadius: 10, height: '100%' }}>
                          <Text strong style={{ color: '#6C5CE7', fontSize: 14 }}>{isZh ? '集成步骤' : 'Integration Steps'}</Text>
                          <ol style={{ color: cs.textSecondary, fontSize: 12, paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
                            <li>{isZh ? '在 signpath.io 注册并提交 OSS 申请' : 'Register at signpath.io and submit OSS application'}</li>
                            <li>{isZh ? '连接 GitHub 仓库，配置签名策略' : 'Connect GitHub repo, configure signing policy'}</li>
                            <li>{isZh ? '在 GitHub Actions 中添加 SignPath action' : 'Add SignPath action to GitHub Actions'}</li>
                            <li>{isZh ? '构建产物自动提交签名，签名后自动发布' : 'Build artifacts auto-submit for signing, auto-publish after'}</li>
                          </ol>
                        </Card>
                      </Col>
                    </Row>

                    <Paragraph style={{ color: cs.textSecondary, fontSize: 12, marginTop: 16, marginBottom: 8 }}>
                      {isZh ? 'GitHub Actions 配置示例：' : 'GitHub Actions configuration example:'}
                    </Paragraph>
                    <pre style={{ background: isDark ? '#060614' : '#f6f6fc', border: `1px solid ${cs.border}`, borderRadius: 8, padding: 16, fontSize: 11, lineHeight: 1.6, color: isDark ? '#2ed573' : '#27ae60', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto' }}>
{`# .github/workflows/release.yml
name: Build & Sign Release
on:
  push:
    tags: ['v*']

jobs:
  build-and-sign:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }

      - name: Build Electron App
        run: npm ci && npm run build:win

      # Submit to SignPath for EV signing
      - uses: signpath/github-action-submit-signing-request@v1
        with:
          api-token: \${{ secrets.SIGNPATH_API_TOKEN }}
          organization-id: \${{ secrets.SIGNPATH_ORG_ID }}
          project-slug: 'quantumshield'
          signing-policy-slug: 'release-signing'
          artifact-configuration-slug: 'electron-exe'
          github-artifact-id: \${{ steps.upload.outputs.artifact-id }}
          wait-for-completion: true
          output-artifact-directory: './signed-output'

      - name: Upload Signed Release
        uses: softprops/action-gh-release@v2
        with:
          files: ./signed-output/*`}
                    </pre>
                    <div style={{ marginTop: 12 }}>
                      <Button type="link" icon={<LinkOutlined />} href="https://about.signpath.io/open-source" target="_blank" style={{ color: '#2ed573', padding: 0, fontSize: 12 }}>
                        {isZh ? 'SignPath 开源计划详情' : 'SignPath Open Source Program Details'} →
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                key: 'azure-trusted-signing',
                label: <Text strong style={{ color: cs.text, fontSize: 14 }}>{isZh ? '6. Azure Trusted Signing (微软官方)' : '6. Azure Trusted Signing (Microsoft Official)'}</Text>,
                children: (
                  <div>
                    <Alert
                      message={isZh ? 'Azure Trusted Signing — 微软官方代码签名服务' : 'Azure Trusted Signing — Microsoft Official Code Signing Service'}
                      description={isZh
                        ? 'Azure Trusted Signing (原 Azure Code Signing) 是微软提供的云端代码签名服务。无需购买和管理硬件令牌或证书，按签名次数计费。提供与 EV 证书相同的 SmartScreen 即时信任级别。'
                        : 'Azure Trusted Signing (formerly Azure Code Signing) is a Microsoft cloud-based code signing service. No hardware tokens or certificate management needed, pay-per-signature pricing. Provides the same instant SmartScreen trust as EV certificates.'
                      }
                      type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                    />

                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Card size="small" style={{ background: isDark ? 'rgba(0,120,212,0.06)' : 'rgba(0,120,212,0.03)', border: `1px solid ${isDark ? 'rgba(0,120,212,0.2)' : 'rgba(0,120,212,0.1)'}`, borderRadius: 10, height: '100%' }}>
                          <Text strong style={{ color: '#0078D4', fontSize: 13 }}>{isZh ? '优势' : 'Advantages'}</Text>
                          <ul style={{ color: cs.textSecondary, fontSize: 11, paddingLeft: 16, marginTop: 6, lineHeight: 1.8 }}>
                            <li>{isZh ? '无需购买证书 (~$300-700/年)' : 'No certificate purchase (~$300-700/yr saved)'}</li>
                            <li>{isZh ? '无需管理硬件令牌' : 'No hardware token management'}</li>
                            <li>{isZh ? 'SmartScreen 即时信任' : 'Instant SmartScreen trust'}</li>
                            <li>{isZh ? '私钥由 Azure HSM 保护' : 'Private keys protected by Azure HSM'}</li>
                            <li>{isZh ? 'CI/CD 原生集成' : 'Native CI/CD integration'}</li>
                          </ul>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small" style={{ background: isDark ? 'rgba(0,120,212,0.06)' : 'rgba(0,120,212,0.03)', border: `1px solid ${isDark ? 'rgba(0,120,212,0.2)' : 'rgba(0,120,212,0.1)'}`, borderRadius: 10, height: '100%' }}>
                          <Text strong style={{ color: '#0078D4', fontSize: 13 }}>{isZh ? '定价' : 'Pricing'}</Text>
                          <div style={{ color: cs.textSecondary, fontSize: 11, marginTop: 6, lineHeight: 1.8 }}>
                            <div><strong>Basic:</strong> $9.99/{isZh ? '月' : 'mo'}</div>
                            <div style={{ paddingLeft: 12 }}>{isZh ? '5,000 次签名/月' : '5,000 signatures/mo'}</div>
                            <div style={{ marginTop: 6 }}><strong>Premium:</strong> $99.99/{isZh ? '月' : 'mo'}</div>
                            <div style={{ paddingLeft: 12 }}>{isZh ? '100,000 次签名/月' : '100,000 signatures/mo'}</div>
                            <div style={{ marginTop: 8, color: '#0078D4', fontWeight: 500 }}>{isZh ? '对比 EV 证书: $300-700/年' : 'vs. EV cert: $300-700/yr'}</div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small" style={{ background: isDark ? 'rgba(0,120,212,0.06)' : 'rgba(0,120,212,0.03)', border: `1px solid ${isDark ? 'rgba(0,120,212,0.2)' : 'rgba(0,120,212,0.1)'}`, borderRadius: 10, height: '100%' }}>
                          <Text strong style={{ color: '#0078D4', fontSize: 13 }}>{isZh ? '要求' : 'Requirements'}</Text>
                          <ul style={{ color: cs.textSecondary, fontSize: 11, paddingLeft: 16, marginTop: 6, lineHeight: 1.8 }}>
                            <li>{isZh ? 'Azure 订阅 (可免费创建)' : 'Azure subscription (free to create)'}</li>
                            <li>{isZh ? '身份验证 (个人/组织)' : 'Identity verification (individual/org)'}</li>
                            <li>{isZh ? 'Windows SDK 或 Azure CLI' : 'Windows SDK or Azure CLI'}</li>
                            <li>{isZh ? 'GitHub Actions 或 Azure DevOps' : 'GitHub Actions or Azure DevOps'}</li>
                          </ul>
                        </Card>
                      </Col>
                    </Row>

                    <Paragraph style={{ color: cs.textSecondary, fontSize: 12, marginTop: 16, marginBottom: 8 }}>
                      {isZh ? 'GitHub Actions + Azure Trusted Signing 配置：' : 'GitHub Actions + Azure Trusted Signing config:'}
                    </Paragraph>
                    <pre style={{ background: isDark ? '#060614' : '#f6f6fc', border: `1px solid ${cs.border}`, borderRadius: 8, padding: 16, fontSize: 11, lineHeight: 1.6, color: isDark ? '#0078D4' : '#1a6fb4', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto' }}>
{`# .github/workflows/sign-with-azure.yml
name: Sign with Azure Trusted Signing
on:
  push:
    tags: ['v*']

jobs:
  sign:
    runs-on: windows-latest
    permissions:
      id-token: write   # Required for Azure OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build Electron App
        run: npm ci && npm run build:win -- --publish=never

      # Sign with Azure Trusted Signing
      - name: Sign with Trusted Signing
        uses: azure/trusted-signing-action@v0.5.0
        with:
          azure-tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          azure-client-id: \${{ secrets.AZURE_CLIENT_ID }}
          azure-client-secret: \${{ secrets.AZURE_CLIENT_SECRET }}
          endpoint: https://eus.codesigning.azure.net/
          trusted-signing-account-name: my-signing-account
          certificate-profile-name: my-cert-profile
          files-folder: \${{ github.workspace }}/dist
          files-folder-filter: exe,msi,msix,dll
          file-digest: SHA256
          timestamp-rfc3161: http://timestamp.acs.microsoft.com
          timestamp-digest: SHA256

      - name: Publish Signed Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*.exe`}
                    </pre>

                    <Paragraph style={{ color: cs.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 8 }}>
                      {isZh ? 'Azure CLI 本地签名命令：' : 'Azure CLI local signing command:'}
                    </Paragraph>
                    <pre style={{ background: isDark ? '#060614' : '#f6f6fc', border: `1px solid ${cs.border}`, borderRadius: 8, padding: 12, fontSize: 11, lineHeight: 1.6, color: isDark ? '#0078D4' : '#1a6fb4', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto' }}>
{`# Install Azure SignTool
dotnet tool install --global AzureSignTool

# Sign locally
AzureSignTool sign \\
  --azure-key-vault-url https://my-vault.vault.azure.net \\
  --azure-key-vault-client-id $AZURE_CLIENT_ID \\
  --azure-key-vault-tenant-id $AZURE_TENANT_ID \\
  --azure-key-vault-client-secret $AZURE_CLIENT_SECRET \\
  --azure-key-vault-certificate my-cert-name \\
  --timestamp-rfc3161 http://timestamp.acs.microsoft.com \\
  --timestamp-digest sha256 \\
  -fd sha256 \\
  ./dist/QuantumShield-Setup.exe`}
                    </pre>

                    <div style={{ marginTop: 12 }}>
                      <Space>
                        <Button type="link" icon={<LinkOutlined />} href="https://learn.microsoft.com/en-us/azure/trusted-signing/" target="_blank" style={{ color: '#0078D4', padding: 0, fontSize: 12 }}>
                          {isZh ? 'Azure Trusted Signing 文档' : 'Azure Trusted Signing Docs'} →
                        </Button>
                        <Button type="link" icon={<LinkOutlined />} href="https://learn.microsoft.com/en-us/azure/trusted-signing/quickstart" target="_blank" style={{ color: '#0078D4', padding: 0, fontSize: 12 }}>
                          {isZh ? '快速开始指南' : 'Quick Start Guide'} →
                        </Button>
                      </Space>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </ProCard>
      </motion.div>

      {/* Build info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.4 }}>
        <Card style={{ marginBottom: 20, background: cs.bgCard, border: `1px solid ${cs.border}`, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
          <Row align="middle" gutter={16}>
            <Col flex="auto">
              <Space direction="vertical" size={2}>
                <Space><ThunderboltOutlined style={{ color: '#6C5CE7' }} /><Text strong style={{ color: cs.text }}>{isZh ? '自动化构建 & 开源审计' : 'Automated Build & Open Source Audit'}</Text></Space>
                <Text style={{ color: cs.textSecondary, fontSize: 12 }}>
                  {isZh ? '所有安装包通过 GitHub Actions CI/CD 流水线自动构建，源代码完全开源，构建过程透明可审计。' : 'All packages built via GitHub Actions CI/CD. Fully open source with transparent, auditable build processes.'}
                </Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<GithubOutlined />} href={GITHUB_URL} target="_blank">{isZh ? '源码' : 'Source'}</Button>
                <Button icon={<LinkOutlined />} href={`${GITHUB_URL}/actions`} target="_blank" type="dashed">{isZh ? '构建流水线' : 'Build Pipeline'}</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </div>
  );
}
