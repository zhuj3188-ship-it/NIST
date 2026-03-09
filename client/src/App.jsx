import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigProvider, theme, App as AntApp, Tooltip, Badge, Dropdown, Space, Typography, Tag, message, notification } from 'antd';
import {
  DashboardOutlined, ScanOutlined, SwapOutlined, BookOutlined,
  AuditOutlined, ExperimentOutlined, SafetyOutlined, GithubOutlined,
  SettingOutlined, QuestionCircleOutlined, BellOutlined,
  DesktopOutlined, ThunderboltOutlined, LockOutlined, CloudOutlined,
  ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined,
  InfoCircleOutlined, CheckCircleOutlined, DownloadOutlined,
  CopyOutlined, AppleOutlined, WindowsOutlined, CodeOutlined,
} from '@ant-design/icons';
import { ProLayout, PageContainer, WaterMark } from '@ant-design/pro-components';
import { motion, AnimatePresence } from 'framer-motion';
import zhCN from 'antd/locale/zh_CN';
import DashboardPage from './pages/Dashboard';
import ScannerPage from './pages/Scanner';
import MigrationPage from './pages/Migration';
import KnowledgePage from './pages/Knowledge';
import CompliancePage from './pages/Compliance';
import { getHealthCheck, getSystemInfo } from './lib/api';

const { Text } = Typography;

/* ─── GitHub repository URL ─── */
const GITHUB_URL = 'https://github.com/zhuj3188-ship-it/NIST';

/* ─── Route definitions ─── */
const routeMap = {
  '/dashboard':  { name: '威胁仪表盘', icon: <DashboardOutlined />, shortcut: '1' },
  '/scanner':    { name: '代码扫描器', icon: <ScanOutlined />, shortcut: '2' },
  '/migration':  { name: '一键迁移',   icon: <SwapOutlined />, shortcut: '3' },
  '/compliance': { name: '合规中心',   icon: <AuditOutlined />, shortcut: '4' },
  '/knowledge':  { name: 'PQC 知识库', icon: <BookOutlined />, shortcut: '5' },
};
const proLayoutRoute = {
  path: '/',
  routes: Object.entries(routeMap).map(([path, { name, icon }]) => ({ path, name, icon })),
};

/* ─── Page transition variants ─── */
const pageVariants = {
  initial:  { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate:  { opacity: 1, y: 0,  filter: 'blur(0px)' },
  exit:     { opacity: 0, y: -8, filter: 'blur(4px)' },
};
const pageTransition = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] };

/* ─── Notification items ─── */
const alertItems = [
  { key:'1', label: <span style={{ color:'#ff4757' }}>CRITICAL: 发现 RSA-1024 密钥</span> },
  { key:'2', label: <span style={{ color:'#ff6b35' }}>HIGH: TLS 1.2 使用弱密码套件</span> },
  { key:'3', label: <span style={{ color:'#ffa502' }}>MEDIUM: SHA-1 签名待迁移</span> },
  { key:'4', label: <span style={{ color:'#888' }}>点击查看全部告警 →</span> },
];

/* ─── Help items ─── */
const helpItems = [
  { key: 'shortcuts', label: <span>键盘快捷键 <Tag style={{ float:'right', fontSize:10 }}>Alt+1~5</Tag></span> },
  { key: 'github', label: <span><GithubOutlined style={{ marginRight: 6 }} />GitHub 源码</span> },
  { key: 'docs', label: <span><BookOutlined style={{ marginRight: 6 }} />NIST PQC 标准文档</span> },
  { key: 'about', label: <span><InfoCircleOutlined style={{ marginRight: 6 }} />关于 QuantumShield</span> },
];

/* ─── Theme token ─── */
const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6C5CE7',
    borderRadius: 10,
    colorBgContainer: '#111128',
    colorBgLayout: '#080818',
    colorBgElevated: '#16163a',
    colorBorder: '#1e1e45',
    colorBorderSecondary: '#161636',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 13,
  },
  components: {
    Card:     { colorBgContainer: '#0d0d24' },
    Table:    { colorBgContainer: 'transparent', headerBg: '#0a0a20' },
    Collapse: { headerBg: '#0d0d24', contentBg: '#080818' },
    Tabs:     { cardBg: '#0d0d24' },
    Menu:     { darkItemBg: 'transparent' },
    Alert:    { borderRadiusLG: 12 },
    Tag:      { borderRadiusSM: 6 },
  },
};

/* ─── ProLayout token ─── */
const layoutToken = {
  sider: {
    colorMenuBackground: '#0a0a1e',
    colorTextMenu: '#6b6b8d',
    colorTextMenuSelected: '#fff',
    colorBgMenuItemSelected: 'rgba(108,92,231,0.18)',
    colorTextMenuActive: '#a29bfe',
    colorMenuItemDivider: '#161636',
    paddingBlockLayoutMenu: 6,
    paddingInlineLayoutMenu: 16,
  },
  header: {
    colorBgHeader: 'rgba(10,10,30,0.85)',
    colorTextMenu: '#6b6b8d',
    colorTextMenuSelected: '#fff',
    colorBgMenuItemSelected: 'transparent',
    heightLayoutHeader: 52,
  },
  pageContainer: {
    paddingBlockPageContainerContent: 20,
    paddingInlinePageContainerContent: 20,
  },
};

export default function App() {
  const [pathname, setPathname] = useState('/dashboard');
  const [scanResult, setScanResult] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [engineStatus, setEngineStatus] = useState('online');
  const [sysInfo, setSysInfo] = useState(null);

  // Clock tick for status bar
  useEffect(() => {
    const t = setInterval(() => setTick(d => d + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Check engine health and system info on mount
  useEffect(() => {
    getHealthCheck()
      .then(() => setEngineStatus('online'))
      .catch(() => setEngineStatus('offline'));
    getSystemInfo()
      .then(info => setSysInfo(info))
      .catch(() => {});
  }, []);

  // Keyboard shortcuts: Alt+1~5 for page navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const paths = Object.keys(routeMap);
        const idx = parseInt(e.key) - 1;
        if (paths[idx]) setPathname(paths[idx]);
      }
      // Alt+F for fullscreen toggle
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);

  const navigate = useCallback((key) => setPathname('/' + key), []);

  const renderPage = useMemo(() => {
    const props = { onNavigate: navigate, setScanResult, scanResult };
    switch (pathname) {
      case '/dashboard':  return <DashboardPage {...props} />;
      case '/scanner':    return <ScannerPage {...props} />;
      case '/migration':  return <MigrationPage {...props} />;
      case '/compliance': return <CompliancePage {...props} />;
      case '/knowledge':  return <KnowledgePage />;
      default:            return <DashboardPage {...props} />;
    }
  }, [pathname, scanResult, navigate]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const handleHelpClick = useCallback(({ key }) => {
    switch (key) {
      case 'github': window.open(GITHUB_URL, '_blank'); break;
      case 'docs': window.open('https://csrc.nist.gov/projects/post-quantum-cryptography', '_blank'); break;
      case 'shortcuts':
        notification.info({
          message: '键盘快捷键',
          description: (
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              <div><Tag>Alt+1</Tag> 威胁仪表盘</div>
              <div><Tag>Alt+2</Tag> 代码扫描器</div>
              <div><Tag>Alt+3</Tag> 一键迁移</div>
              <div><Tag>Alt+4</Tag> 合规中心</div>
              <div><Tag>Alt+5</Tag> PQC 知识库</div>
              <div><Tag>Alt+F</Tag> 全屏模式</div>
            </div>
          ),
          placement: 'topRight',
          duration: 8,
        });
        break;
      case 'about':
        notification.info({
          message: 'QuantumShield v2.0.0',
          description: (
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
              <p>企业级后量子密码学迁移平台</p>
              <p>支持 11 种编程语言 · 200+ 扫描规则</p>
              <p>NIST FIPS 203/204/205 标准</p>
              {sysInfo && (
                <div style={{ marginTop: 8, color: '#7a7a9e' }}>
                  <div>Platform: {sysInfo.platform} ({sysInfo.arch})</div>
                  <div>Node: {sysInfo.node} · Rules: {sysInfo.rules}</div>
                  <div>Memory: {sysInfo.memory_mb}MB · Uptime: {sysInfo.uptime}s</div>
                </div>
              )}
            </div>
          ),
          placement: 'topRight',
          duration: 10,
        });
        break;
    }
  }, [sysInfo]);

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntApp>
        <WaterMark content="QuantumShield" fontColor="rgba(108,92,231,0.015)" fontSize={13} zIndex={0}>
          <ProLayout
            title="QuantumShield"
            logo={
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ExperimentOutlined style={{ fontSize: 24, color: '#6C5CE7', filter: 'drop-shadow(0 0 8px rgba(108,92,231,0.6))' }} />
              </motion.div>
            }
            route={proLayoutRoute}
            location={{ pathname }}
            fixSiderbar
            fixedHeader
            layout="mix"
            splitMenus={false}
            navTheme="realDark"
            siderMenuType="group"
            collapsed={collapsed}
            onCollapse={setCollapsed}
            token={layoutToken}

            /* ─── Top-right actions ─── */
            actionsRender={() => [
              /* Status bar items */
              <div key="status" className="app-status-bar">
                <Tooltip title={engineStatus === 'online' ? '引擎运行正常' : '引擎离线'}>
                  <span className={`status-dot ${engineStatus === 'online' ? 'status-dot--ok' : 'status-dot--err'}`} />
                </Tooltip>
                <Text style={{ color: '#3d3d5c', fontSize: 11 }}>{timeStr}</Text>
              </div>,
              <Tooltip key="alerts" title="安全告警">
                <Dropdown menu={{ items: alertItems }} placement="bottomRight">
                  <Badge count={3} size="small" offset={[-2, 2]}>
                    <BellOutlined style={{ color: '#5a5a7a', fontSize: 15, cursor: 'pointer' }} />
                  </Badge>
                </Dropdown>
              </Tooltip>,
              <Tag key="ver" style={{ color: '#3d3d5c', background: 'transparent', border: '1px solid #1e1e3e', fontSize: 10, margin: '0 4px' }}>v2.0.0</Tag>,
              <Tooltip key="gh" title="GitHub 项目仓库">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: '#4a4a6a', fontSize: 16 }}>
                  <GithubOutlined />
                </a>
              </Tooltip>,
              <Tooltip key="fullscreen" title={isFullscreen ? '退出全屏 (Alt+F)' : '全屏模式 (Alt+F)'}>
                {isFullscreen
                  ? <FullscreenExitOutlined onClick={toggleFullscreen} style={{ color: '#4a4a6a', cursor: 'pointer' }} />
                  : <FullscreenOutlined onClick={toggleFullscreen} style={{ color: '#4a4a6a', cursor: 'pointer' }} />
                }
              </Tooltip>,
              <Dropdown key="help" menu={{ items: helpItems, onClick: handleHelpClick }} placement="bottomRight">
                <QuestionCircleOutlined style={{ color: '#4a4a6a', cursor: 'pointer' }} />
              </Dropdown>,
              <Tooltip key="settings" title="系统设置">
                <SettingOutlined style={{ color: '#4a4a6a', cursor: 'pointer' }} />
              </Tooltip>,
            ]}

            /* ─── Header content: PQC standard badges ─── */
            headerContentRender={() => (
              <div className="header-badges">
                <SafetyOutlined style={{ color: '#6C5CE7', fontSize: 12, opacity: 0.7 }} />
                <span className="header-badge-text">ML-KEM</span>
                <span className="header-badge-sep">·</span>
                <span className="header-badge-text">ML-DSA</span>
                <span className="header-badge-sep">·</span>
                <span className="header-badge-text">SLH-DSA</span>
                <span className="header-badge-sep">·</span>
                <span className="header-badge-text">SHA-3</span>
                <span className="header-badge-sep">·</span>
                <span className="header-badge-text">AES-256</span>
              </div>
            )}

            /* ─── Sidebar menu item ─── */
            menuItemRender={(item, dom) => {
              const route = routeMap[item.path];
              return (
                <Tooltip title={route?.shortcut ? `Alt+${route.shortcut}` : ''} placement="right" mouseEnterDelay={0.5}>
                  <div
                    onClick={() => setPathname(item.path || '/dashboard')}
                    className={`sidebar-menu-item ${pathname === item.path ? 'sidebar-menu-item--active' : ''}`}
                  >
                    {dom}
                  </div>
                </Tooltip>
              );
            }}

            /* ─── Sidebar footer ─── */
            menuFooterRender={(props) => {
              if (props?.collapsed) return (
                <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                  <LockOutlined style={{ color: '#6C5CE7', fontSize: 14, opacity: 0.5 }} />
                </div>
              );
              return (
                <div className="sidebar-footer">
                  <div className="sidebar-footer__divider" />
                  <div className="sidebar-footer__standards">
                    <LockOutlined style={{ color: '#6C5CE7', fontSize: 11, marginRight: 6 }} />
                    <span>FIPS 203 / 204 / 205</span>
                  </div>
                  <div className="sidebar-footer__copy">&copy; {now.getFullYear()} QuantumShield</div>
                </div>
              );
            }}

            /* ─── Content area ─── */
            contentStyle={{ background: '#080818', minHeight: '100vh' }}
          >
            <PageContainer
              header={{ title: null, breadcrumb: {} }}
              style={{ background: 'transparent' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  {renderPage}
                </motion.div>
              </AnimatePresence>
            </PageContainer>

            {/* ─── Bottom status bar (desktop style) ─── */}
            <div className="desktop-status-bar">
              <div className="desktop-status-bar__left">
                <DesktopOutlined style={{ fontSize: 11, marginRight: 6 }} />
                <span>QuantumShield Desktop v2.0</span>
                <span className="desktop-status-bar__sep">|</span>
                {engineStatus === 'online' ? (
                  <>
                    <CheckCircleOutlined style={{ fontSize: 11, marginRight: 4, color: '#2ed573' }} />
                    <span style={{ color: '#2ed573' }}>Engine Online</span>
                  </>
                ) : (
                  <>
                    <CloudOutlined style={{ fontSize: 11, marginRight: 4, color: '#ff4757' }} />
                    <span style={{ color: '#ff4757' }}>Engine Offline</span>
                  </>
                )}
                <span className="desktop-status-bar__sep">|</span>
                <span style={{ color: '#4a4a6e' }}>{sysInfo ? `${sysInfo.languages} langs · ${sysInfo.rules} rules` : 'Loading...'}</span>
                <span className="desktop-status-bar__sep">|</span>
                <span style={{ color: '#4a4a6e' }}>Alt+1~5 快捷导航</span>
              </div>
              <div className="desktop-status-bar__right">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: '#4a4a6e', textDecoration: 'none' }}>
                  <GithubOutlined style={{ fontSize: 11, marginRight: 4 }} />
                  <span>GitHub</span>
                </a>
                <span className="desktop-status-bar__sep">|</span>
                <span>NIST PQC Compliant</span>
                <span className="desktop-status-bar__sep">|</span>
                <ThunderboltOutlined style={{ fontSize: 11, marginRight: 4, color: '#2ed573' }} />
                <span style={{ color: '#2ed573' }}>Ready</span>
              </div>
            </div>
          </ProLayout>
        </WaterMark>
      </AntApp>
    </ConfigProvider>
  );
}
