/**
 * QuantumShield - Downloads / Releases Page
 * Platform-aware download center with OS/arch auto-detection
 * Theme-aware & i18n supported, secure download with checksum verification
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Row, Col, Button, Tag, Typography, Space,
  Table, Alert, Tooltip, Badge, Segmented, message, Collapse,
} from 'antd';
import {
  DownloadOutlined, WindowsOutlined, AppleOutlined, CloudDownloadOutlined,
  CheckCircleOutlined, SafetyOutlined, GithubOutlined, RocketOutlined,
  DesktopOutlined, LaptopOutlined, ThunderboltOutlined,
  InfoCircleOutlined, LinkOutlined, CopyOutlined, StarOutlined,
  FileZipOutlined, BuildOutlined, AppstoreOutlined, LockOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { motion } from 'framer-motion';
import { getReleases } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const { Title, Text } = Typography;

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

      {/* Build info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
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
