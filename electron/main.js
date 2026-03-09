/**
 * QuantumShield — Electron Main Process v2.0
 * Cross-platform desktop application (Windows / Linux / macOS)
 * Features: auto-start server, tray icon, native menus, folder scanning, OS-specific UX
 */
const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
let tray;
const SERVER_PORT = 3001;
const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';
const GITHUB_URL = 'https://github.com/zhuj3188-ship-it/NIST';

/* ─── Start the Express backend server ─── */
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server', 'index.js');
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, PORT: SERVER_PORT, NODE_ENV: 'production' },
      silent: true,
    });

    serverProcess.stdout?.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg.trim());
      if (msg.includes('running') || msg.includes('listening') || msg.includes('QuantumShield')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });

    serverProcess.on('error', (err) => {
      console.error('[Server] Failed to start:', err);
      reject(err);
    });

    // Fallback resolve after 3 seconds
    setTimeout(resolve, 3000);
  });
}

/* ─── Create the main application window ─── */
function createWindow() {
  const iconPath = path.join(__dirname, 'icons', IS_WIN ? 'icon.ico' : 'icon.png');
  const hasIcon = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'QuantumShield — Post-Quantum Cryptography Migration Platform',
    icon: hasIcon ? iconPath : undefined,
    backgroundColor: '#060612',
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'default',
    // Windows: custom frame for modern look
    ...(IS_WIN ? { frame: true, thickFrame: true } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
    },
    show: false,
  });

  // Load the app
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  // Show window when ready with fade-in effect
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window close — minimize to tray on macOS, quit on others
  mainWindow.on('close', (e) => {
    if (IS_MAC && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle drag-drop files into the window
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
}

/* ─── System Tray ─── */
function createTray() {
  const trayIconPath = path.join(__dirname, 'icons', 'tray.png');
  if (!fs.existsSync(trayIconPath)) return; // Skip if no tray icon

  try {
    const icon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('QuantumShield — PQC Migration Platform');

    const contextMenu = Menu.buildFromTemplate([
      { label: '显示 QuantumShield', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      { label: '扫描演示项目', click: () => { mainWindow?.show(); mainWindow?.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'1'}))"); } },
      { type: 'separator' },
      { label: 'GitHub 仓库', click: () => shell.openExternal(GITHUB_URL) },
      { type: 'separator' },
      { label: '退出', click: () => { app.isQuitting = true; app.quit(); } },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (err) {
    console.log('[Tray] Skipping tray icon:', err.message);
  }
}

/* ─── Application menu ─── */
function createMenu() {
  const template = [
    ...(IS_MAC ? [{
      label: 'QuantumShield',
      submenu: [
        { role: 'about', label: '关于 QuantumShield' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件夹扫描...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: '选择要扫描的项目文件夹',
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.executeJavaScript(
                `window.postMessage({ type: 'open-folder', path: '${result.filePaths[0].replace(/\\/g, '\\\\')}' }, '*')`
              );
            }
          },
        },
        {
          label: '打开文件扫描...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile', 'multiSelections'],
              title: '选择要扫描的代码文件',
              filters: [
                { name: '代码文件', extensions: ['py','js','ts','jsx','tsx','java','go','c','cpp','h','rs','cs','php','rb','kt','swift'] },
                { name: '配置文件', extensions: ['conf','cfg','yaml','yml','toml','xml','pem','crt','key','env','properties','ini'] },
                { name: '依赖文件', extensions: ['txt','json','lock','mod','sum','gradle','toml'] },
                { name: '所有文件', extensions: ['*'] },
              ],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.executeJavaScript(
                `window.postMessage({ type: 'open-files', paths: ${JSON.stringify(result.filePaths)} }, '*')`
              );
            }
          },
        },
        { type: 'separator' },
        {
          label: '导出扫描报告...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.executeJavaScript(
              "window.postMessage({ type: 'export-report' }, '*')"
            );
          },
        },
        { type: 'separator' },
        IS_MAC ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '导航',
      submenu: [
        { label: '威胁仪表盘', accelerator: 'Alt+1', click: () => mainWindow.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'1'}))") },
        { label: '代码扫描器', accelerator: 'Alt+2', click: () => mainWindow.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'2'}))") },
        { label: '一键迁移', accelerator: 'Alt+3', click: () => mainWindow.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'3'}))") },
        { label: '合规中心', accelerator: 'Alt+4', click: () => mainWindow.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'4'}))") },
        { label: 'PQC 知识库', accelerator: 'Alt+5', click: () => mainWindow.webContents.executeJavaScript("document.dispatchEvent(new KeyboardEvent('keydown', {altKey:true, key:'5'}))") },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: 'GitHub 仓库',
          click: () => shell.openExternal(GITHUB_URL),
        },
        {
          label: 'NIST PQC 标准',
          click: () => shell.openExternal('https://csrc.nist.gov/projects/post-quantum-cryptography'),
        },
        { type: 'separator' },
        {
          label: '键盘快捷键',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '键盘快捷键',
              message: 'QuantumShield 快捷键',
              detail: [
                'Alt+1  威胁仪表盘',
                'Alt+2  代码扫描器',
                'Alt+3  一键迁移',
                'Alt+4  合规中心',
                'Alt+5  PQC 知识库',
                'Alt+F  全屏模式',
                `${IS_MAC ? 'Cmd' : 'Ctrl'}+O  打开文件夹`,
                `${IS_MAC ? 'Cmd' : 'Ctrl'}+Shift+O  打开文件`,
                `${IS_MAC ? 'Cmd' : 'Ctrl'}+E  导出报告`,
              ].join('\n'),
            });
          },
        },
        { type: 'separator' },
        {
          label: '系统信息',
          click: () => {
            const info = [
              `Platform: ${process.platform} (${process.arch})`,
              `Electron: ${process.versions.electron}`,
              `Node.js: ${process.versions.node}`,
              `Chrome: ${process.versions.chrome}`,
              `V8: ${process.versions.v8}`,
            ].join('\n');
            dialog.showMessageBox(mainWindow, { type: 'info', title: '系统信息', message: info });
          },
        },
        {
          label: '关于 QuantumShield',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 QuantumShield',
              message: 'QuantumShield v2.0.0',
              detail: '企业级后量子密码学迁移平台\n\n支持 Python · Java · Go · JavaScript · C/C++ · Rust · C# · PHP · Ruby · Kotlin · Swift\n200+ 扫描规则 | NIST FIPS 203/204/205\n\n© 2024-2026 QuantumShield',
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ─── App lifecycle ─── */
app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (e) {
    console.error('Failed to start server, continuing anyway:', e);
  }

  createWindow();
  createMenu();
  createTray();

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!IS_MAC) {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
  if (tray) {
    tray.destroy();
  }
});

// Handle certificate errors for localhost
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith(`http://localhost:${SERVER_PORT}`)) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Handle second instance — focus existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
