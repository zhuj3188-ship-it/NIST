/**
 * Theme Context — Light / Dark mode support
 * Manages theme state and provides Ant Design theme configs.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { theme } from 'antd';

const ThemeContext = createContext();

/* ─── Dark Theme Config ─── */
const darkTheme = {
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

/* ─── Light Theme Config ─── */
const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#6C5CE7',
    borderRadius: 10,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5fa',
    colorBgElevated: '#ffffff',
    colorBorder: '#e8e8f0',
    colorBorderSecondary: '#f0f0f5',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 13,
  },
  components: {
    Card:     { colorBgContainer: '#ffffff' },
    Table:    { colorBgContainer: '#ffffff', headerBg: '#fafafe' },
    Collapse: { headerBg: '#fafafe', contentBg: '#ffffff' },
    Tabs:     { cardBg: '#ffffff' },
    Menu:     {},
    Alert:    { borderRadiusLG: 12 },
    Tag:      { borderRadiusSM: 6 },
  },
};

/* ─── Layout tokens ─── */
const darkLayoutToken = {
  sider: {
    colorMenuBackground: '#0a0a1e',
    colorTextMenu: '#6b6b8d',
    colorTextMenuSelected: '#fff',
    colorBgMenuItemSelected: 'rgba(108,92,231,0.18)',
    colorTextMenuActive: '#a29bfe',
    colorMenuItemDivider: '#161636',
    paddingBlockLayoutMenu: 4,
    paddingInlineLayoutMenu: 8,
  },
  header: {
    colorBgHeader: 'rgba(10,10,30,0.85)',
    colorTextMenu: '#6b6b8d',
    colorTextMenuSelected: '#fff',
    colorBgMenuItemSelected: 'transparent',
    heightLayoutHeader: 48,
  },
  pageContainer: {
    paddingBlockPageContainerContent: 12,
    paddingInlinePageContainerContent: 16,
  },
};

const lightLayoutToken = {
  sider: {
    colorMenuBackground: '#ffffff',
    colorTextMenu: '#666680',
    colorTextMenuSelected: '#1a1a2e',
    colorBgMenuItemSelected: 'transparent',
    colorBgMenuItemHover: 'transparent',
    colorTextMenuActive: '#6C5CE7',
    colorMenuItemDivider: '#f0f0f5',
    paddingBlockLayoutMenu: 4,
    paddingInlineLayoutMenu: 8,
  },
  header: {
    colorBgHeader: 'rgba(255,255,255,0.95)',
    colorTextMenu: '#666680',
    colorTextMenuSelected: '#1a1a2e',
    colorBgMenuItemSelected: 'transparent',
    colorBgMenuItemHover: 'transparent',
    heightLayoutHeader: 48,
  },
  pageContainer: {
    paddingBlockPageContainerContent: 12,
    paddingInlinePageContainerContent: 16,
  },
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('qs-theme');
      if (saved) return saved === 'dark';
    } catch {}
    return true; // Default to dark
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem('qs-theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  }, []);

  // Apply CSS class to root element for CSS variable switching
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const value = useMemo(() => ({
    isDark,
    toggleTheme,
    themeConfig: isDark ? darkTheme : lightTheme,
    layoutToken: isDark ? darkLayoutToken : lightLayoutToken,
    // Semantic color helpers for inline styles
    colors: isDark ? {
      bg: '#080818',
      bgCard: '#0d0d28',
      bgElevated: '#111138',
      bgCode: '#060614',
      border: '#1a1a42',
      borderLight: '#222255',
      text: '#e4e4f0',
      textSecondary: '#7a7a9e',
      textDim: '#4a4a6e',
      accent: '#6C5CE7',
      accentLight: '#a29bfe',
    } : {
      bg: '#f5f5fa',
      bgCard: '#ffffff',
      bgElevated: '#ffffff',
      bgCode: '#f8f8fc',
      border: '#e8e8f0',
      borderLight: '#d8d8e8',
      text: '#1a1a2e',
      textSecondary: '#555570',
      textDim: '#888898',
      accent: '#6C5CE7',
      accentLight: '#a29bfe',
    },
  }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
