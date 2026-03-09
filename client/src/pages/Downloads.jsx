/**
 * QuantumShield — Downloads / Releases Page
 * Platform-aware download center with OS/arch auto-detection
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Button, Tag, Typography, Space, Divider, Tabs,
  Table, Alert, Spin, Tooltip, Badge, Segmented, message, Collapse,
} from 'antd';
import {
  DownloadOutlined, WindowsOutlined, AppleOutlined, CloudDownloadOutlined,
  CheckCircleOutlined, SafetyOutlined, GithubOutlined, RocketOutlined,
  DesktopOutlined, LaptopOutlined, CodeOutlined, ThunderboltOutlined,
  InfoCircleOutlined, LinkOutlined, CopyOutlined, StarOutlined,
  FileZipOutlined, BuildOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { motion } from 'framer-motion';
import { getReleases } from '../lib/api';

const { Title, Text, Paragraph } = Typography;

/* ─── Linux icon (Ant Design doesn't have one) ─── */
const LinuxIcon = () => (
  <span role="img" aria-label="linux" style={{ fontSize: 'inherit' }}>
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.39.03.8-.066 1.109-.199.69-.135 1.572-.135 2.42-.602.85-.467 1.64-1.27 1.803-2.6.034-.199-.04-.611-.156-.869l-.009-.02c-.046-.468-.179-.93-.36-1.401-.068-.177-.145-.338-.215-.532-.046-.126-.09-.267-.09-.399 0-.026 0-.133.018-.2.126-.266.35-.466.313-.733-.026-.2-.126-.333-.26-.466a3.115 3.115 0 01-.26-.4 3.546 3.546 0 01-.31-.731l-.004-.028c-.106-.467-.266-1.068-.466-1.602l-.022-.058c-.267-.667-.535-1.333-.8-1.868-.3-.668-.434-1.468-.5-2.2-.065-.665-.033-1.268-.033-1.868 0-.36.005-.665-.033-.998-.106-.998-.467-2.066-1.234-2.733-.467-.4-1.066-.667-1.666-.867l-.033-.009C13.37.016 12.935 0 12.504 0zm.003 1.73c.312 0 .61.016.878.044.425.045.826.135 1.13.352.305.215.53.533.627.963.025.15.03.33.03.553v.003c0 .53-.03 1.064.033 1.795.065.76.231 1.626.6 2.395l.002.005c.268.535.533 1.198.8 1.862l.022.058c.2.535.35 1.098.456 1.535l.005.023c.085.331.205.665.364 1.003.079.17.173.336.276.502.103.165.232.367.3.535.057.14.086.27.09.4-.006.114-.014.193-.014.268 0 .265.065.532.135.729.075.2.158.398.22.53l.01.02c.164.43.278.862.316 1.29v.004c.07.41.033.665.013.805-.17 1.066-.773 1.667-1.467 2.065-.693.399-1.498.4-2.187.535h-.001c-.381.07-.728.266-1.073.465-.347.2-.619.334-.879.401-.53.133-1.266-.066-2.119-.5-.854-.434-1.87-.535-2.812-.735-.47-.065-.908-.2-1.164-.333-.228-.12-.292-.2-.307-.334.04-.298.205-.665.156-1.064-.056-.4-.156-.933-.156-.933l-.002-.013c-.068-.268-.088-.668-.028-1.003.06-.333.19-.599.337-.799.303-.399.443-.666.586-.932.141-.263.246-.464.362-.598l.002-.004c.1-.13.166-.27.166-.399 0-.08-.018-.16-.05-.233a1.723 1.723 0 01-.16-.797c-.14-.733.109-1.467.354-2.2l.002-.005c.559-1.68 1.769-3.372 2.576-4.333.81-.96 1.07-2.065 1.15-3.2l.002-.058c.065-1.465-.3-3.999 2.254-4.262a4.48 4.48 0 01.438-.02z"/>
    </svg>
  </span>
);

/* ─── Platform detection ─── */
function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  let os = 'linux';
  let arch = 'x64';

  if (ua.includes('win') || platform.includes('win')) os = 'windows';
  else if (ua.includes('mac') || platform.includes('mac')) os = 'macos';

  // Detect ARM
  if (ua.includes('arm64') || ua.includes('aarch64') || platform.includes('arm')) arch = 'arm64';
  // Apple Silicon detection
  if (os === 'macos' && (ua.includes('arm') || (typeof navigator.userAgentData?.platform === 'string'))) {
    // Modern macOS browsers on Apple Silicon
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      const renderer = gl?.getParameter(gl.RENDERER) || '';
      if (renderer.includes('Apple')) arch = 'arm64';
    } catch (e) {}
  }

  return { os, arch };
}

/* ─── Platform config ─── */
const PLATFORM_CONFIG = {
  windows: {
    label: 'Windows',
    icon: <WindowsOutlined />,
    color: '#0078D4',
    gradient: 'linear-gradient(135deg, #0078D4 0%, #00BCF2 100%)',
    description: 'Windows 10/11',
    archOptions: [
      { value: 'x64', label: 'x64 (Intel/AMD)', desc: '大多数电脑' },
      { value: 'arm64', label: 'ARM64', desc: 'Surface Pro X 等' },
    ],
    typeLabels: {
      installer: { label: 'NSIS 安装器', icon: <BuildOutlined />, desc: '推荐 - 标准安装', tag: '推荐' },
      portable: { label: '便携版', icon: <LaptopOutlined />, desc: '免安装直接运行' },
      zip: { label: 'ZIP 压缩包', icon: <FileZipOutlined />, desc: '解压即用' },
    },
  },
  macos: {
    label: 'macOS',
    icon: <AppleOutlined />,
    color: '#999',
    gradient: 'linear-gradient(135deg, #333 0%, #666 100%)',
    description: 'macOS 11+',
    archOptions: [
      { value: 'arm64', label: 'Apple Silicon (M1/M2/M3/M4)', desc: '2020年后的 Mac' },
      { value: 'x64', label: 'Intel', desc: '2020年前的 Mac' },
    ],
    typeLabels: {
      dmg: { label: 'DMG 镜像', icon: <AppstoreOutlined />, desc: '推荐 - 拖拽安装', tag: '推荐' },
      zip: { label: 'ZIP 压缩包', icon: <FileZipOutlined />, desc: '解压即用' },
    },
  },
  linux: {
    label: 'Linux',
    icon: <LinuxIcon />,
    color: '#FCC624',
    gradient: 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)',
    description: 'Ubuntu, Fedora, Arch...',
    archOptions: [
      { value: 'x64', label: 'x86_64', desc: '大多数 PC/服务器' },
      { value: 'arm64', label: 'ARM64/aarch64', desc: '树莓派, ARM 服务器' },
    ],
    typeLabels: {
      appimage: { label: 'AppImage', icon: <RocketOutlined />, desc: '推荐 - 通用 Linux', tag: '推荐' },
      deb: { label: 'DEB 包', icon: <BuildOutlined />, desc: 'Ubuntu / Debian' },
      rpm: { label: 'RPM 包', icon: <BuildOutlined />, desc: 'Fedora / RHEL / CentOS' },
      snap: { label: 'Snap 包', icon: <AppstoreOutlined />, desc: 'Snap Store' },
      'tar.gz': { label: 'tar.gz', icon: <FileZipOutlined />, desc: '通用压缩包' },
    },
  },
};

const GITHUB_URL = 'https://github.com/zhuj3188-ship-it/NIST';

/* ─── Format file size ─── */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function DownloadsPage() {
  const [releases, setReleases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedArch, setSelectedArch] = useState(null);
  const detected = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    setSelectedPlatform(detected.os);
    setSelectedArch(detected.arch);
    getReleases()
      .then(data => setReleases(data))
      .catch(() => setReleases(null))
      .finally(() => setLoading(false));
  }, [detected]);

  const latestRelease = releases?.[0];
  const platformAssets = useMemo(() => {
    if (!latestRelease?.assets || !selectedPlatform) return [];
    return latestRelease.assets.filter(a =>
      a.platform === selectedPlatform &&
      (selectedArch ? a.arch === selectedArch : true)
    );
  }, [latestRelease, selectedPlatform, selectedArch]);

  const allPlatformAssets = useMemo(() => {
    if (!latestRelease?.assets) return { windows: [], macos: [], linux: [] };
    const grouped = { windows: [], macos: [], linux: [] };
    latestRelease.assets.forEach(a => {
      if (grouped[a.platform]) grouped[a.platform].push(a);
    });
    return grouped;
  }, [latestRelease]);

  const recommendedAsset = platformAssets.find(a => a.recommended);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <CloudDownloadOutlined style={{ fontSize: 48, color: '#6C5CE7' }} />
        </motion.div>
        <div style={{ marginTop: 16, color: '#7a7a9e' }}>Loading releases...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ─── Hero Section ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card
          className="hero-gradient"
          style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden' }}
          bodyStyle={{ padding: '40px 48px', position: 'relative', zIndex: 1 }}
        >
          <Row gutter={24} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size={8}>
                <Space size={12} align="center">
                  <CloudDownloadOutlined style={{ fontSize: 32, color: '#6C5CE7' }} />
                  <Title level={2} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>
                    下载 QuantumShield
                  </Title>
                </Space>
                <Text style={{ color: '#7a7a9e', fontSize: 15 }}>
                  选择您的操作系统和芯片架构，下载适配的安装包
                </Text>
                <Space size={8} style={{ marginTop: 8 }}>
                  <Tag color="purple">{latestRelease?.version || 'v2.1.0'}</Tag>
                  <Tag icon={<CheckCircleOutlined />} color="green">稳定版</Tag>
                  <Tag icon={<SafetyOutlined />} color="blue">NIST PQC</Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" align="end" size={4}>
                <Button
                  type="link"
                  icon={<GithubOutlined />}
                  href={`${GITHUB_URL}/releases`}
                  target="_blank"
                  style={{ color: '#7a7a9e' }}
                >
                  查看所有版本
                </Button>
                <Text style={{ color: '#4a4a6e', fontSize: 11 }}>
                  发布时间: {latestRelease?.published_at ? new Date(latestRelease.published_at).toLocaleDateString('zh-CN') : '--'}
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ─── Auto-detected platform banner ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>
                检测到您的系统: <strong>{PLATFORM_CONFIG[detected.os]?.label}</strong> ({detected.arch})
                {detected.os !== selectedPlatform && (
                  <Button type="link" size="small" onClick={() => { setSelectedPlatform(detected.os); setSelectedArch(detected.arch); }}>
                    切换回推荐系统
                  </Button>
                )}
              </span>
            </Space>
          }
          type="info"
          showIcon={false}
          style={{
            marginBottom: 24, background: 'rgba(108,92,231,0.06)',
            border: '1px solid rgba(108,92,231,0.15)', borderRadius: 12
          }}
        />
      </motion.div>

      {/* ─── Platform selector ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
            <Col span={8} key={key}>
              <Card
                hoverable
                onClick={() => { setSelectedPlatform(key); setSelectedArch(cfg.archOptions[0].value); }}
                style={{
                  borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  background: selectedPlatform === key ? 'rgba(108,92,231,0.12)' : '#0d0d28',
                  border: selectedPlatform === key ? '2px solid rgba(108,92,231,0.5)' : '1px solid #1a1a42',
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '20px 16px' }}
              >
                <div style={{ fontSize: 36, marginBottom: 8, color: selectedPlatform === key ? '#6C5CE7' : '#4a4a6e' }}>
                  {cfg.icon}
                </div>
                <div style={{ fontWeight: 600, color: selectedPlatform === key ? '#fff' : '#7a7a9e', fontSize: 16 }}>
                  {cfg.label}
                </div>
                <div style={{ color: '#4a4a6e', fontSize: 12, marginTop: 4 }}>{cfg.description}</div>
                {detected.os === key && (
                  <Tag color="purple" style={{ marginTop: 8, fontSize: 10 }}>当前系统</Tag>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* ─── Architecture selector ─── */}
      {selectedPlatform && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <Card
            style={{ marginBottom: 24, background: '#0d0d28', border: '1px solid #1a1a42', borderRadius: 12 }}
            bodyStyle={{ padding: 16 }}
          >
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <DesktopOutlined style={{ color: '#6C5CE7' }} />
                <Text strong style={{ color: '#e4e4f0' }}>选择芯片架构:</Text>
              </Space>
              <Segmented
                value={selectedArch}
                onChange={setSelectedArch}
                options={PLATFORM_CONFIG[selectedPlatform].archOptions.map(o => ({
                  value: o.value,
                  label: (
                    <Space size={4}>
                      <span>{o.label}</span>
                      <span style={{ color: '#4a4a6e', fontSize: 11 }}>({o.desc})</span>
                      {detected.os === selectedPlatform && detected.arch === o.value && (
                        <Tag color="green" style={{ fontSize: 9, lineHeight: '16px', padding: '0 4px' }}>已检测</Tag>
                      )}
                    </Space>
                  ),
                }))}
              />
            </Space>
          </Card>
        </motion.div>
      )}

      {/* ─── Recommended quick download ─── */}
      {recommendedAsset && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card
            className="glow-card"
            style={{
              marginBottom: 24, borderRadius: 16, overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(30,144,255,0.08) 100%)',
              border: '1px solid rgba(108,92,231,0.3)',
            }}
            bodyStyle={{ padding: '28px 32px' }}
          >
            <Row align="middle" gutter={24}>
              <Col flex="auto">
                <Space direction="vertical" size={4}>
                  <Space size={8}>
                    <StarOutlined style={{ color: '#ffd700' }} />
                    <Text strong style={{ color: '#fff', fontSize: 16 }}>推荐下载</Text>
                    <Tag color="green">最适合您的系统</Tag>
                  </Space>
                  <Text style={{ color: '#7a7a9e' }}>
                    {recommendedAsset.name}
                    {recommendedAsset.size > 0 && <span style={{ marginLeft: 8 }}>({formatSize(recommendedAsset.size)})</span>}
                  </Text>
                </Space>
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  href={recommendedAsset.download_url}
                  target="_blank"
                  className="qs-btn-gradient"
                  style={{ height: 48, fontSize: 16, padding: '0 32px', borderRadius: 10 }}
                >
                  立即下载
                </Button>
              </Col>
            </Row>
          </Card>
        </motion.div>
      )}

      {/* ─── All downloads for selected platform ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
        <ProCard
          title={
            <Space>
              {PLATFORM_CONFIG[selectedPlatform]?.icon}
              <span>{PLATFORM_CONFIG[selectedPlatform]?.label} 下载列表</span>
              <Tag color="purple">{selectedArch}</Tag>
            </Space>
          }
          style={{ marginBottom: 24, background: '#0d0d28', border: '1px solid #1a1a42', borderRadius: 12 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={platformAssets}
            rowKey="name"
            pagination={false}
            className="quantum-table"
            locale={{ emptyText: '暂无此架构的下载包' }}
            columns={[
              {
                title: '文件名',
                dataIndex: 'name',
                render: (name, record) => {
                  const typeInfo = PLATFORM_CONFIG[selectedPlatform]?.typeLabels?.[record.type] || {};
                  return (
                    <Space>
                      {typeInfo.icon || <FileZipOutlined />}
                      <span style={{ color: '#e4e4f0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{name}</span>
                      {record.recommended && <Tag color="green" style={{ fontSize: 10 }}>推荐</Tag>}
                    </Space>
                  );
                },
              },
              {
                title: '类型',
                dataIndex: 'type',
                width: 160,
                render: (type) => {
                  const info = PLATFORM_CONFIG[selectedPlatform]?.typeLabels?.[type] || {};
                  return (
                    <Tooltip title={info.desc}>
                      <Tag style={{ fontSize: 11 }}>{info.label || type}</Tag>
                    </Tooltip>
                  );
                },
              },
              {
                title: '架构',
                dataIndex: 'arch',
                width: 100,
                render: (arch) => <Tag color={arch === 'arm64' ? 'orange' : 'blue'}>{arch}</Tag>,
              },
              {
                title: '大小',
                dataIndex: 'size',
                width: 100,
                render: (size) => <Text style={{ color: '#4a4a6e', fontSize: 12 }}>{formatSize(size)}</Text>,
              },
              {
                title: '下载次数',
                dataIndex: 'download_count',
                width: 100,
                render: (count) => <Text style={{ color: '#4a4a6e', fontSize: 12 }}>{count || '--'}</Text>,
              },
              {
                title: '操作',
                width: 120,
                render: (_, record) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<DownloadOutlined />}
                      href={record.download_url}
                      target="_blank"
                    >
                      下载
                    </Button>
                    <Tooltip title="复制链接">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined style={{ color: '#4a4a6e' }} />}
                        onClick={() => {
                          navigator.clipboard.writeText(record.download_url);
                          message.success('下载链接已复制');
                        }}
                      />
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        </ProCard>
      </motion.div>

      {/* ─── All platforms overview ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <ProCard
          title={<Space><CloudDownloadOutlined /> 全部下载 (所有平台/架构)</Space>}
          style={{ marginBottom: 24, background: '#0d0d28', border: '1px solid #1a1a42', borderRadius: 12 }}
        >
          <Collapse
            ghost
            items={Object.entries(allPlatformAssets).map(([platform, assets]) => ({
              key: platform,
              label: (
                <Space>
                  {PLATFORM_CONFIG[platform]?.icon}
                  <span style={{ fontWeight: 600 }}>{PLATFORM_CONFIG[platform]?.label}</span>
                  <Badge count={assets.length} style={{ backgroundColor: '#6C5CE7' }} />
                </Space>
              ),
              children: (
                <div style={{ display: 'grid', gap: 8 }}>
                  {assets.map(a => {
                    const typeInfo = PLATFORM_CONFIG[platform]?.typeLabels?.[a.type] || {};
                    return (
                      <div
                        key={a.name}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 16px', borderRadius: 8,
                          background: 'rgba(10,10,32,0.5)', border: '1px solid #1a1a42',
                        }}
                      >
                        <Space>
                          {typeInfo.icon || <FileZipOutlined style={{ color: '#4a4a6e' }} />}
                          <Text style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#ccc' }}>
                            {a.name}
                          </Text>
                          <Tag color={a.arch === 'arm64' ? 'orange' : 'blue'} style={{ fontSize: 10 }}>{a.arch}</Tag>
                          {a.recommended && <Tag color="green" style={{ fontSize: 10 }}>推荐</Tag>}
                        </Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          href={a.download_url}
                          target="_blank"
                          ghost
                        >
                          下载
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ),
            }))}
          />
        </ProCard>
      </motion.div>

      {/* ─── How to choose guide ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}>
        <ProCard
          title={<Space><InfoCircleOutlined /> 如何选择正确的版本？</Space>}
          style={{ marginBottom: 24, background: '#0d0d28', border: '1px solid #1a1a42', borderRadius: 12 }}
        >
          <Row gutter={24}>
            <Col span={8}>
              <Card style={{ background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)', borderRadius: 10 }}>
                <Space direction="vertical" size={8}>
                  <Space><WindowsOutlined style={{ color: '#0078D4', fontSize: 20 }} /> <Text strong style={{ color: '#e4e4f0' }}>Windows</Text></Space>
                  <div style={{ fontSize: 12, color: '#7a7a9e', lineHeight: 2 }}>
                    <div><Tag color="blue">x64</Tag> 大多数电脑 (Intel/AMD 处理器)</div>
                    <div><Tag color="orange">ARM64</Tag> Surface Pro X、Snapdragon 笔记本</div>
                    <div style={{ marginTop: 8, color: '#4a4a6e' }}>
                      不确定？运行 <code style={{ background: '#1a1a42', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>systeminfo</code> 查看"系统类型"
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: 'rgba(153,153,153,0.06)', border: '1px solid rgba(153,153,153,0.2)', borderRadius: 10 }}>
                <Space direction="vertical" size={8}>
                  <Space><AppleOutlined style={{ color: '#999', fontSize: 20 }} /> <Text strong style={{ color: '#e4e4f0' }}>macOS</Text></Space>
                  <div style={{ fontSize: 12, color: '#7a7a9e', lineHeight: 2 }}>
                    <div><Tag color="orange">ARM64</Tag> M1/M2/M3/M4 芯片 (2020年后)</div>
                    <div><Tag color="blue">x64</Tag> Intel 芯片 (2020年前)</div>
                    <div style={{ marginTop: 8, color: '#4a4a6e' }}>
                      点击左上角  &gt; "关于本机" 查看芯片类型
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card style={{ background: 'rgba(252,198,36,0.06)', border: '1px solid rgba(252,198,36,0.2)', borderRadius: 10 }}>
                <Space direction="vertical" size={8}>
                  <Space><LinuxIcon style={{ color: '#FCC624', fontSize: 20 }} /> <Text strong style={{ color: '#e4e4f0' }}>Linux</Text></Space>
                  <div style={{ fontSize: 12, color: '#7a7a9e', lineHeight: 2 }}>
                    <div><Tag color="blue">x64</Tag> 大多数 PC 和服务器</div>
                    <div><Tag color="orange">ARM64</Tag> 树莓派、ARM 服务器</div>
                    <div style={{ marginTop: 8, color: '#4a4a6e' }}>
                      终端运行 <code style={{ background: '#1a1a42', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>uname -m</code>
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </ProCard>
      </motion.div>

      {/* ─── CI/CD info & GitHub link ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
        <Card
          style={{ marginBottom: 24, background: '#0d0d28', border: '1px solid #1a1a42', borderRadius: 12 }}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <Row align="middle" gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#6C5CE7' }} />
                  <Text strong style={{ color: '#e4e4f0' }}>自动化构建</Text>
                </Space>
                <Text style={{ color: '#7a7a9e', fontSize: 12 }}>
                  所有安装包通过 GitHub Actions CI/CD 流水线自动构建，确保代码来源可信、构建过程透明可审计。
                </Text>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<GithubOutlined />} href={GITHUB_URL} target="_blank">
                  查看源码
                </Button>
                <Button icon={<LinkOutlined />} href={`${GITHUB_URL}/actions`} target="_blank" type="dashed">
                  查看构建流水线
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </div>
  );
}
