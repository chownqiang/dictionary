import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let selectionWindow: BrowserWindow | null = null;

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

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    createSelectionWindow();
  });
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
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // 开发环境禁用同源策略
    },
  });

  if (process.env.NODE_ENV === 'development') {
    selectionWindow.loadURL('http://localhost:3001/src/selection.html');
  } else {
    selectionWindow.loadFile(path.join(__dirname, '../renderer/selection.html'));
  }

  selectionWindow.on('closed', () => {
    selectionWindow = null;
  });

  // 获取选中的文本并显示翻译窗口
  const { clipboard } = require('electron');
  const selectedText = clipboard.readText('selection');
  if (selectedText) {
    const mousePosition = screen.getCursorScreenPoint();
    selectionWindow.setPosition(mousePosition.x, mousePosition.y);
    selectionWindow.show();
    selectionWindow.webContents.send('translate-selection', selectedText);
  }
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

// 处理隐藏选择窗口的事件
ipcMain.on('hide-selection-window', () => {
  if (selectionWindow) {
    selectionWindow.hide();
  }
}); 