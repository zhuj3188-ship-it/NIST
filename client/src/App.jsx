import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ConfigProvider, App as AntApp, Tooltip, Badge, Dropdown, Space, Typography, Tag, message, notification } from 'antd';
import {
  DashboardOutlined, ScanOutlined, SwapOutlined, BookOutlined,
  AuditOutlined, ExperimentOutlined, SafetyOutlined, GithubOutlined,
  QuestionCircleOutlined, BellOutlined,
  DesktopOutlined, ThunderboltOutlined, LockOutlined, CloudOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
  InfoCircleOutlined, CheckCircleOutlined, DownloadOutlined,
  CodeOutlined, TranslationOutlined, SunOutlined, MoonOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { PageContainer, WaterMark } from '@ant-design/pro-components';
import { motion, AnimatePresence } from 'framer-motion';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import DashboardPage from './pages/Dashboard';
import ScannerPage from './pages/Scanner';
import MigrationPage from './pages/Migration';
import KnowledgePage from './pages/Knowledge';
import CompliancePage from './pages/Compliance';
import DownloadsPage from './pages/Downloads';
import CICDPage from './pages/CICD';
import { getHealthCheck, getSystemInfo } from './lib/api';
import { useTheme } from './contexts/ThemeContext';
import { useI18n } from './contexts/I18nContext';

const { Text } = Typography;

const GITHUB_URL = 'https://github.com/zhuj3188-ship-it/NIST';

/* ─── Page transition variants ─── */
const pageVariants = {
  initial:  { opacity: 0, y: 16, scale: 0.99 },
  animate:  { opacity: 1, y: 0,  scale: 1 },
  exit:     { opacity: 0, y: -10, scale: 0.99 },
};
const pageTransition = { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] };

export default function App() {
  const { isDark, toggleTheme, themeConfig, colors } = useTheme();
  const { lang, t, toggleLang } = useI18n();
  const [pathname, setPathname] = useState('/dashboard');
  const [scanResult, setScanResult] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [tick, setTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [engineStatus, setEngineStatus] = useState('online');
  const [sysInfo, setSysInfo] = useState(null);
  const sidebarRef = useRef(null);
  const hoverTimeout = useRef(null);

  /* ─── Route definitions ─── */
  const routeMap = useMemo(() => ({
    '/dashboard':  { name: t('nav.dashboard'), icon: <DashboardOutlined />, shortcut: '1' },
    '/scanner':    { name: t('nav.scanner'), icon: <ScanOutlined />, shortcut: '2' },
    '/migration':  { name: t('nav.migration'), icon: <SwapOutlined />, shortcut: '3' },
    '/compliance': { name: t('nav.compliance'), icon: <AuditOutlined />, shortcut: '4' },
    '/knowledge':  { name: t('nav.knowledge'), icon: <BookOutlined />, shortcut: '5' },
    '/downloads':  { name: t('nav.downloads'), icon: <DownloadOutlined />, shortcut: '6' },
    '/cicd':       { name: t('nav.cicd'), icon: <CodeOutlined />, shortcut: '7' },
  }), [t]);

  /* ─── Notification items ─── */
  const alertItems = useMemo(() => [
    { key:'1', label: <span style={{ color:'#ff4757' }}>{t('alert.critical_rsa')}</span> },
    { key:'2', label: <span style={{ color:'#ff6b35' }}>{t('alert.high_tls')}</span> },
    { key:'3', label: <span style={{ color:'#ffa502' }}>{t('alert.medium_sha')}</span> },
    { key:'4', label: <span style={{ color: colors.textDim }}>{t('alert.view_all')}</span> },
  ], [t, colors]);

  const helpItems = useMemo(() => [
    { key: 'shortcuts', label: <span>{t('app.shortcuts')} <Tag style={{ float:'right', fontSize:10 }}>Alt+1~7</Tag></span> },
    { key: 'github', label: <span><GithubOutlined style={{ marginRight: 6 }} />{t('app.github')}</span> },
    { key: 'docs', label: <span><BookOutlined style={{ marginRight: 6 }} />{t('app.docs')}</span> },
    { key: 'about', label: <span><InfoCircleOutlined style={{ marginRight: 6 }} />{t('app.about')}</span> },
  ], [t]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTick(d => d + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Check engine health
  useEffect(() => {
    getHealthCheck().then(() => setEngineStatus('online')).catch(() => setEngineStatus('offline'));
    getSystemInfo().then(info => setSysInfo(info)).catch(() => {});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        const paths = Object.keys(routeMap);
        const idx = parseInt(e.key) - 1;
        if (paths[idx]) setPathname(paths[idx]);
      }
      if (e.altKey && e.key === 'f') { e.preventDefault(); toggleFullscreen(); }
      if (e.altKey && e.key === 't') { e.preventDefault(); toggleTheme(); }
      if (e.altKey && e.key === 'l') { e.preventDefault(); toggleLang(); }
      if (e.altKey && e.key === 'b') { e.preventDefault(); setSidebarPinned(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [routeMap, toggleTheme, toggleLang]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);

  const navigate = useCallback((key) => setPathname('/' + key), []);

  /* ─── Sidebar hover logic ─── */
  const isExpanded = sidebarPinned || sidebarExpanded;

  const handleSidebarEnter = useCallback(() => {
    if (sidebarPinned) return;
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setSidebarExpanded(true), 150);
  }, [sidebarPinned]);

  const handleSidebarLeave = useCallback(() => {
    if (sidebarPinned) return;
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setSidebarExpanded(false), 300);
  }, [sidebarPinned]);

  const renderPage = useMemo(() => {
    const props = { onNavigate: navigate, setScanResult, scanResult };
    switch (pathname) {
      case '/dashboard':  return <DashboardPage {...props} />;
      case '/scanner':    return <ScannerPage {...props} />;
      case '/migration':  return <MigrationPage {...props} />;
      case '/compliance': return <CompliancePage {...props} />;
      case '/knowledge':  return <KnowledgePage />;
      case '/downloads':  return <DownloadsPage />;
      case '/cicd':       return <CICDPage />;
      default:            return <DashboardPage {...props} />;
    }
  }, [pathname, scanResult, navigate]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const handleHelpClick = useCallback(({ key }) => {
    switch (key) {
      case 'github': window.open(GITHUB_URL, '_blank'); break;
      case 'docs': window.open('https://csrc.nist.gov/projects/post-quantum-cryptography', '_blank'); break;
      case 'shortcuts':
        notification.info({
          message: t('app.shortcuts'),
          description: (
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              {Object.entries(routeMap).map(([, r]) => (
                <div key={r.shortcut}><Tag>Alt+{r.shortcut}</Tag> {r.name}</div>
              ))}
              <div><Tag>Alt+F</Tag> {t('app.fullscreen')}</div>
              <div><Tag>Alt+T</Tag> {t('theme.dark')}/{t('theme.light')}</div>
              <div><Tag>Alt+L</Tag> 中/EN</div>
              <div><Tag>Alt+B</Tag> {lang === 'zh' ? '固定侧边栏' : 'Pin sidebar'}</div>
            </div>
          ),
          placement: 'topRight',
          duration: 8,
        });
        break;
      case 'about':
        notification.info({
          message: 'QuantumShield v2.2.0',
          description: (
            <div style={{ fontSize: 12, lineHeight: 1.8 }}>
              <p>{t('app.about_desc')}</p>
              <p>{t('app.about_rules')}</p>
              <p>{t('app.about_nist')}</p>
              {sysInfo && (
                <div style={{ marginTop: 8, color: colors.textSecondary }}>
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
  }, [sysInfo, t, routeMap, colors, lang]);

  const siderBg = isDark ? '#0a0a1e' : '#ffffff';
  const headerBg = isDark ? 'rgba(10,10,30,0.92)' : '#ffffff';

  return (
    <ConfigProvider locale={lang === 'zh' ? zhCN : enUS} theme={themeConfig}>
      <AntApp>
        <WaterMark content="QuantumShield" fontColor={isDark ? "rgba(108,92,231,0.015)" : "rgba(108,92,231,0.025)"} fontSize={13} zIndex={0}>
          <div className="qs-layout">
            {/* ═══ CUSTOM SIDEBAR ═══ */}
            <motion.aside
              ref={sidebarRef}
              className={`qs-sidebar ${isExpanded ? 'qs-sidebar--expanded' : ''} ${sidebarPinned ? 'qs-sidebar--pinned' : ''}`}
              onMouseEnter={handleSidebarEnter}
              onMouseLeave={handleSidebarLeave}
              animate={{ width: isExpanded ? 200 : 56 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ background: siderBg }}
            >
              {/* Logo */}
              <div className="qs-sidebar__logo">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ExperimentOutlined style={{ fontSize: 20, color: '#6C5CE7', filter: 'drop-shadow(0 0 6px rgba(108,92,231,0.5))' }} />
                </motion.div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="qs-sidebar__title"
                    >
                      QuantumShield
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Nav items */}
              <nav className="qs-sidebar__nav">
                {Object.entries(routeMap).map(([path, route]) => {
                  const isActive = pathname === path;
                  return (
                    <Tooltip key={path} title={!isExpanded ? route.name : ''} placement="right" mouseEnterDelay={0.3}>
                      <motion.div
                        className={`qs-nav-item ${isActive ? 'qs-nav-item--active' : ''}`}
                        onClick={() => setPathname(path)}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isActive && (
                          <motion.div
                            className="qs-nav-item__indicator"
                            layoutId="sidebarIndicator"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className="qs-nav-item__icon">{route.icon}</span>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.span
                              className="qs-nav-item__label"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2, delay: 0.05 }}
                            >
                              {route.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.span
                              className="qs-nav-item__shortcut"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.4 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              {route.shortcut}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Tooltip>
                  );
                })}
              </nav>

              {/* Sidebar footer */}
              <div className="qs-sidebar__footer">
                <Tooltip title={sidebarPinned ? (lang==='zh'?'取消固定':'Unpin') : (lang==='zh'?'固定侧边栏':'Pin sidebar')} placement="right">
                  <motion.div
                    className="qs-sidebar__pin"
                    onClick={() => setSidebarPinned(p => !p)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {sidebarPinned
                      ? <MenuFoldOutlined style={{ fontSize: 14, color: '#6C5CE7' }} />
                      : <MenuUnfoldOutlined style={{ fontSize: 14, color: colors.textDim }} />
                    }
                  </motion.div>
                </Tooltip>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="qs-sidebar__footer-text"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <LockOutlined style={{ color: '#6C5CE7', fontSize: 10, marginRight: 4 }} />
                      <span>FIPS 203/204/205</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>

            {/* ═══ MAIN AREA ═══ */}
            <div className="qs-main" style={{ marginLeft: sidebarPinned ? 200 : 56 }}>
              {/* Header */}
              <header className="qs-header" style={{ background: headerBg, left: sidebarPinned ? 200 : 56 }}>
                <div className="qs-header__left">
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
                </div>
                <div className="qs-header__right">
                  <Tooltip title={isDark ? t('theme.light') : t('theme.dark')}>
                    <motion.div className="qs-header-action" onClick={toggleTheme} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      {isDark ? <SunOutlined style={{ color: '#ffa502', fontSize: 15 }} /> : <MoonOutlined style={{ color: '#6C5CE7', fontSize: 15 }} />}
                    </motion.div>
                  </Tooltip>
                  <Tooltip title="中/EN (Alt+L)">
                    <motion.div className="qs-header-action" onClick={toggleLang} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <TranslationOutlined style={{ fontSize: 14, color: colors.textDim }} />
                      <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 2, fontWeight: 600 }}>{lang === 'zh' ? 'EN' : '中'}</span>
                    </motion.div>
                  </Tooltip>
                  <div className="app-status-bar">
                    <Tooltip title={engineStatus === 'online' ? t('app.engine_online') : t('app.engine_offline')}>
                      <span className={`status-dot ${engineStatus === 'online' ? 'status-dot--ok' : 'status-dot--err'}`} />
                    </Tooltip>
                    <Text style={{ color: colors.textDim, fontSize: 11 }}>{timeStr}</Text>
                  </div>
                  <Tooltip title={t('app.alerts')}>
                    <Dropdown menu={{ items: alertItems }} placement="bottomRight">
                      <Badge count={3} size="small" offset={[-2, 2]}>
                        <BellOutlined style={{ color: colors.textDim, fontSize: 15, cursor: 'pointer' }} />
                      </Badge>
                    </Dropdown>
                  </Tooltip>
                  <Tag style={{ color: colors.textDim, background: 'transparent', border: `1px solid ${colors.border}`, fontSize: 10 }}>v2.2.0</Tag>
                  <Tooltip title={t('app.github')}>
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: colors.textDim, fontSize: 16, display: 'flex' }}>
                      <GithubOutlined />
                    </a>
                  </Tooltip>
                  <Tooltip title={isFullscreen ? t('app.exit_fullscreen') : t('app.fullscreen')}>
                    <motion.div className="qs-header-action" onClick={toggleFullscreen} whileHover={{ scale: 1.1 }}>
                      {isFullscreen ? <FullscreenExitOutlined style={{ color: colors.textDim }} /> : <FullscreenOutlined style={{ color: colors.textDim }} />}
                    </motion.div>
                  </Tooltip>
                  <Dropdown menu={{ items: helpItems, onClick: handleHelpClick }} placement="bottomRight">
                    <QuestionCircleOutlined style={{ color: colors.textDim, cursor: 'pointer' }} />
                  </Dropdown>
                </div>
              </header>

              {/* Content */}
              <main className="qs-content" style={{ background: colors.bg }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={pageTransition}
                    style={{ minHeight: 'calc(100vh - 80px)' }}
                  >
                    {renderPage}
                  </motion.div>
                </AnimatePresence>
              </main>

              {/* Bottom status bar */}
              <div className="desktop-status-bar" style={{ left: sidebarPinned ? 200 : 56 }}>
                <div className="desktop-status-bar__left">
                  <DesktopOutlined style={{ fontSize: 11, marginRight: 6 }} />
                  <span>QuantumShield v2.2</span>
                  <span className="desktop-status-bar__sep">|</span>
                  {engineStatus === 'online' ? (
                    <><CheckCircleOutlined style={{ fontSize: 11, marginRight: 4, color: '#2ed573' }} /><span style={{ color: '#2ed573' }}>Online</span></>
                  ) : (
                    <><CloudOutlined style={{ fontSize: 11, marginRight: 4, color: '#ff4757' }} /><span style={{ color: '#ff4757' }}>Offline</span></>
                  )}
                  <span className="desktop-status-bar__sep">|</span>
                  <span>{sysInfo ? `${sysInfo.languages} langs · ${sysInfo.rules} rules` : t('app.status_loading')}</span>
                </div>
                <div className="desktop-status-bar__right">
                  <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <GithubOutlined style={{ fontSize: 11, marginRight: 4 }} /><span>GitHub</span>
                  </a>
                  <span className="desktop-status-bar__sep">|</span>
                  <ThunderboltOutlined style={{ fontSize: 11, marginRight: 4, color: '#2ed573' }} />
                  <span style={{ color: '#2ed573' }}>{t('app.status_ready')}</span>
                </div>
              </div>
            </div>
          </div>
        </WaterMark>
      </AntApp>
    </ConfigProvider>
  );
}
