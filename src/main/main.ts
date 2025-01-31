import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, screen, systemPreferences } from 'electron';
import * as path from 'path';
import { shortcuts } from '../config/shortcuts';

let mainWindow: BrowserWindow | null = null;
let selectionWindow: BrowserWindow | null = null;

function checkAccessibilityPermission() {
  if (process.platform === 'darwin') {
    const hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
    if (!hasPermission) {
      dialog.showMessageBox({
        type: 'info',
        title: '需要辅助功能权限',
        message: '翻译助手需要辅助功能权限才能使用全局快捷键和获取选中文本',
        detail: '请在系统偏好设置 > 安全性与隐私 > 隐私 > 辅助功能中授权此应用',
        buttons: ['去设置', '取消'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) {
          systemPreferences.isTrustedAccessibilityClient(true);
        }
      });
    }
    return hasPermission;
  }
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // 开发环境禁用同源策略
    },
  });

  // 在开发环境中加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000/src/renderer/');
    mainWindow.webContents.openDevTools();
  } else {
    // 在生产环境中加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 检查权限并注册快捷键
  if (checkAccessibilityPermission()) {
    registerGlobalShortcuts();
  }

  // 监听权限变化
  if (process.platform === 'darwin') {
    // 定期检查权限状态
    setInterval(() => {
      if (checkAccessibilityPermission()) {
        registerGlobalShortcuts();
      }
    }, 5000); // 每5秒检查一次
  }
}

function registerGlobalShortcuts() {
  // 先注销所有快捷键，防止重复注册
  globalShortcut.unregisterAll();

  // 划词翻译快捷键
  globalShortcut.register(shortcuts.translateSelection, () => {
    if (checkAccessibilityPermission()) {
      handleGlobalTranslation();
    }
  });

  // 切换窗口显示/隐藏快捷键
  globalShortcut.register(shortcuts.toggleWindow, () => {
    if (selectionWindow) {
      if (selectionWindow.isVisible()) {
        selectionWindow.hide();
      } else {
        selectionWindow.show();
      }
    }
  });

  // 固定/取消固定窗口快捷键
  globalShortcut.register(shortcuts.pinWindow, () => {
    if (selectionWindow) {
      selectionWindow.webContents.send('toggle-pin');
    }
  });
}

function handleGlobalTranslation() {
  // 获取当前选中的文本
  const selectedText = clipboard.readText('selection') || clipboard.readText();
  console.log('Selected text:', selectedText); // 添加调试日志
  
  if (selectedText.trim()) {
    if (!selectionWindow) {
      createSelectionWindow();
      // 等待窗口创建完成
      setTimeout(() => {
        sendTextToWindow(selectedText);
      }, 1000);
    } else {
      sendTextToWindow(selectedText);
    }
  }
}

function sendTextToWindow(text: string) {
  const mousePosition = screen.getCursorScreenPoint();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 确保窗口不会超出屏幕边界
  let x = mousePosition.x;
  let y = mousePosition.y;
  
  if (x + 400 > width) {
    x = width - 400;
  }
  if (y + 300 > height) {
    y = height - 300;
  }
  
  if (selectionWindow) {
    selectionWindow.setPosition(x, y);
    selectionWindow.show();
    selectionWindow.webContents.send('translate-selection', text);
  }
}

function createSelectionWindow() {
  if (selectionWindow) {
    selectionWindow.show();
    return;
  }

  selectionWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    selectionWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/selection.html`);
  } else {
    selectionWindow.loadFile(path.join(__dirname, '../selection.html'));
  }

  // 监听打开DevTools的请求
  ipcMain.on('open-dev-tools', () => {
    if (selectionWindow) {
      selectionWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // 监听窗口拖动
  ipcMain.on('start-window-drag', () => {
    if (selectionWindow) {
      selectionWindow.webContents.send('start-drag');
    }
  });

  selectionWindow.on('closed', () => {
    selectionWindow = null;
  });
}

// 确保应用程序准备就绪后再创建窗口
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理窗口拖动
ipcMain.on('start-window-drag', () => {
  if (selectionWindow) {
    selectionWindow.setMovable(true);
    // @ts-ignore
    selectionWindow.startWindowDrag();
  }
});

// 处理窗口固定/取消固定
ipcMain.on('pin-selection-window', (_event, isPinned) => {
  if (selectionWindow) {
    selectionWindow.setAlwaysOnTop(isPinned, 'floating');
    selectionWindow.setMovable(!isPinned);
  }
});

// 处理隐藏选择窗口的事件
ipcMain.on('hide-selection-window', () => {
  if (selectionWindow) {
    selectionWindow.hide();
  }
}); 