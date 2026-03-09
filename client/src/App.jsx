import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigProvider, App as AntApp, Tooltip, Badge, Dropdown, Space, Typography, Tag, message, notification, Switch } from 'antd';
import {
  DashboardOutlined, ScanOutlined, SwapOutlined, BookOutlined,
  AuditOutlined, ExperimentOutlined, SafetyOutlined, GithubOutlined,
  SettingOutlined, QuestionCircleOutlined, BellOutlined,
  DesktopOutlined, ThunderboltOutlined, LockOutlined, CloudOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
  InfoCircleOutlined, CheckCircleOutlined, DownloadOutlined,
  CodeOutlined, TranslationOutlined, SunOutlined, MoonOutlined,
} from '@ant-design/icons';
import { ProLayout, PageContainer, WaterMark } from '@ant-design/pro-components';
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
  initial:  { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate:  { opacity: 1, y: 0,  filter: 'blur(0px)' },
  exit:     { opacity: 0, y: -8, filter: 'blur(4px)' },
};
const pageTransition = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] };

export default function App() {
  const { isDark, toggleTheme, themeConfig, layoutToken, colors } = useTheme();
  const { lang, t, toggleLang } = useI18n();
  const [pathname, setPathname] = useState('/dashboard');
  const [scanResult, setScanResult] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [engineStatus, setEngineStatus] = useState('online');
  const [sysInfo, setSysInfo] = useState(null);

  /* ─── Route definitions (reactive to lang) ─── */
  const routeMap = useMemo(() => ({
    '/dashboard':  { name: t('nav.dashboard'), icon: <DashboardOutlined />, shortcut: '1' },
    '/scanner':    { name: t('nav.scanner'), icon: <ScanOutlined />, shortcut: '2' },
    '/migration':  { name: t('nav.migration'), icon: <SwapOutlined />, shortcut: '3' },
    '/compliance': { name: t('nav.compliance'), icon: <AuditOutlined />, shortcut: '4' },
    '/knowledge':  { name: t('nav.knowledge'), icon: <BookOutlined />, shortcut: '5' },
    '/downloads':  { name: t('nav.downloads'), icon: <DownloadOutlined />, shortcut: '6' },
    '/cicd':       { name: t('nav.cicd'), icon: <CodeOutlined />, shortcut: '7' },
  }), [t]);

  const proLayoutRoute = useMemo(() => ({
    path: '/',
    routes: Object.entries(routeMap).map(([path, { name, icon }]) => ({ path, name, icon })),
  }), [routeMap]);

  /* ─── Notification items ─── */
  const alertItems = useMemo(() => [
    { key:'1', label: <span style={{ color:'#ff4757' }}>{t('alert.critical_rsa')}</span> },
    { key:'2', label: <span style={{ color:'#ff6b35' }}>{t('alert.high_tls')}</span> },
    { key:'3', label: <span style={{ color:'#ffa502' }}>{t('alert.medium_sha')}</span> },
    { key:'4', label: <span style={{ color: colors.textDim }}>{t('alert.view_all')}</span> },
  ], [t, colors]);

  /* ─── Help items ─── */
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
  }, [sysInfo, t, routeMap, colors]);

  return (
    <ConfigProvider locale={lang === 'zh' ? zhCN : enUS} theme={themeConfig}>
      <AntApp>
        <WaterMark content="QuantumShield" fontColor={isDark ? "rgba(108,92,231,0.015)" : "rgba(108,92,231,0.025)"} fontSize={13} zIndex={0}>
          <ProLayout
            title="QuantumShield"
            logo={
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ExperimentOutlined style={{ fontSize: 20, color: '#6C5CE7', filter: 'drop-shadow(0 0 6px rgba(108,92,231,0.5))' }} />
              </motion.div>
            }
            route={proLayoutRoute}
            location={{ pathname }}
            fixSiderbar
            fixedHeader
            layout="mix"
            splitMenus={false}
            navTheme={isDark ? 'realDark' : 'light'}
            siderMenuType="group"
            collapsed={collapsed}
            onCollapse={setCollapsed}
            collapsedButtonRender={false}
            siderWidth={186}
            token={layoutToken}

            actionsRender={() => [
              /* Theme toggle */
              <Tooltip key="theme" title={isDark ? t('theme.light') : t('theme.dark')}>
                <div
                  onClick={toggleTheme}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {isDark ? <SunOutlined style={{ color: '#ffa502', fontSize: 15 }} /> : <MoonOutlined style={{ color: '#6C5CE7', fontSize: 15 }} />}
                </div>
              </Tooltip>,
              /* Language toggle */
              <Tooltip key="lang" title="中/EN (Alt+L)">
                <div
                  onClick={toggleLang}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: colors.textDim, fontSize: 12, fontWeight: 600 }}
                >
                  <TranslationOutlined style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 11 }}>{lang === 'zh' ? 'EN' : '中'}</span>
                </div>
              </Tooltip>,
              /* Status */
              <div key="status" className="app-status-bar">
                <Tooltip title={engineStatus === 'online' ? t('app.engine_online') : t('app.engine_offline')}>
                  <span className={`status-dot ${engineStatus === 'online' ? 'status-dot--ok' : 'status-dot--err'}`} />
                </Tooltip>
                <Text style={{ color: colors.textDim, fontSize: 11 }}>{timeStr}</Text>
              </div>,
              <Tooltip key="alerts" title={t('app.alerts')}>
                <Dropdown menu={{ items: alertItems }} placement="bottomRight">
                  <Badge count={3} size="small" offset={[-2, 2]}>
                    <BellOutlined style={{ color: colors.textDim, fontSize: 15, cursor: 'pointer' }} />
                  </Badge>
                </Dropdown>
              </Tooltip>,
              <Tag key="ver" style={{ color: colors.textDim, background: 'transparent', border: `1px solid ${colors.border}`, fontSize: 10, margin: '0 4px' }}>v2.2.0</Tag>,
              <Tooltip key="gh" title={t('app.github')}>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: colors.textDim, fontSize: 16 }}>
                  <GithubOutlined />
                </a>
              </Tooltip>,
              <Tooltip key="fullscreen" title={isFullscreen ? t('app.exit_fullscreen') : t('app.fullscreen')}>
                {isFullscreen
                  ? <FullscreenExitOutlined onClick={toggleFullscreen} style={{ color: colors.textDim, cursor: 'pointer' }} />
                  : <FullscreenOutlined onClick={toggleFullscreen} style={{ color: colors.textDim, cursor: 'pointer' }} />
                }
              </Tooltip>,
              <Dropdown key="help" menu={{ items: helpItems, onClick: handleHelpClick }} placement="bottomRight">
                <QuestionCircleOutlined style={{ color: colors.textDim, cursor: 'pointer' }} />
              </Dropdown>,
            ]}

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

            contentStyle={{ background: colors.bg, minHeight: '100vh', transition: 'background 0.3s', padding: 0 }}
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

            {/* ─── Bottom status bar ─── */}
            <div className="desktop-status-bar">
              <div className="desktop-status-bar__left">
                <DesktopOutlined style={{ fontSize: 11, marginRight: 6 }} />
                <span>QuantumShield Desktop v2.2</span>
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
                <span>{sysInfo ? `${sysInfo.languages} langs · ${sysInfo.rules} rules` : t('app.status_loading')}</span>
                <span className="desktop-status-bar__sep">|</span>
                <span>Alt+1~7 {t('app.quick_nav')}</span>
              </div>
              <div className="desktop-status-bar__right">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <GithubOutlined style={{ fontSize: 11, marginRight: 4 }} />
                  <span>GitHub</span>
                </a>
                <span className="desktop-status-bar__sep">|</span>
                <span>{t('app.nist_compliant')}</span>
                <span className="desktop-status-bar__sep">|</span>
                <ThunderboltOutlined style={{ fontSize: 11, marginRight: 4, color: '#2ed573' }} />
                <span style={{ color: '#2ed573' }}>{t('app.status_ready')}</span>
              </div>
            </div>
          </ProLayout>
        </WaterMark>
      </AntApp>
    </ConfigProvider>
  );
}
