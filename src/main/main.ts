import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, screen, systemPreferences } from 'electron';
import * as path from 'path';
import { shortcuts } from '../config/shortcuts';
import { captureScreenAtMouse, extractTextWithLlama } from './utils/ocr';
import { captureSelectedText } from './utils/textCapture';

// 全局变量与常量定义
let mainWindow: BrowserWindow | null = null;
let selectionWindow: BrowserWindow | null = null;
// OCR快捷键定义为常量，方便全局使用
const OCR_SHORTCUT = 'Control+Alt+O';

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
  console.log('窗口创建后检查权限并注册快捷键');
  if (checkAccessibilityPermission()) {
    console.log('权限检查通过，注册快捷键');
    registerGlobalShortcuts();
  } else {
    console.log('权限检查未通过，不注册快捷键');
  }

  // 监听窗口准备就绪事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('主窗口内容加载完成，检查快捷键注册状态');
    // 只有在快捷键未注册的情况下才重新注册
    if (!areShortcutsRegistered()) {
      console.log('快捷键未注册，进行注册');
      registerGlobalShortcuts();
    } else {
      console.log('快捷键已注册，无需重新注册');
    }
  });

  // 监听权限变化
  if (process.platform === 'darwin') {
    // 定期检查权限状态
    setInterval(() => {
      // 只有在快捷键未注册且有权限的情况下才注册
      if (!areShortcutsRegistered() && checkAccessibilityPermission()) {
        console.log('定期检查：快捷键未注册且有权限，进行注册');
        registerGlobalShortcuts();
      }
    }, 5000); // 每5秒检查一次
  }

  ipcMain.on('show-selection-window', () => {
    // 已有代码
  });
  
  // 添加手动复制通知处理程序
  ipcMain.on('show-manual-copy-notification-reply', () => {
    console.log('主进程收到手动复制通知确认');
  });
}

// OCR处理主函数
async function handleOCR() {
  console.log('开始OCR处理...');
  
  try {
    // 捕获鼠标位置的屏幕内容
    const imagePath = await captureScreenAtMouse();
    console.log('已捕获屏幕内容:', imagePath);
    
    // 使用Llama提取文本
    const extractedText = await extractTextWithLlama(imagePath);
    console.log('已提取文本:', extractedText);
    
    // 如果提取到文本，发送到主窗口
    if (extractedText && extractedText.trim()) {
      sendTextToMainWindow(extractedText.trim());
    } else {
      console.log('未提取到文本');
      showOCRFailedNotification();
    }
  } catch (error) {
    console.error('OCR处理出错:', error);
    showOCRFailedNotification();
  }
}

function showOCRFailedNotification() {
  if (mainWindow) {
    console.log('显示OCR失败提示');
    mainWindow.webContents.send('show-ocr-failed-notification');
  }
}

function registerGlobalShortcuts() {
  // 先注销所有快捷键，防止重复注册
  console.log('正在注册全局快捷键...');
  globalShortcut.unregisterAll();
  console.log('已注销所有现有快捷键');

  try {
    // 主要划词翻译快捷键
    console.log('注册主划词翻译快捷键:', shortcuts.translateSelection);
    const registered = globalShortcut.register(shortcuts.translateSelection, () => {
      console.log('触发划词翻译快捷键!');
      if (checkAccessibilityPermission()) {
        handleGlobalTranslation();
      } else {
        console.log('权限检查失败，无法执行划词翻译');
      }
    });
    
    console.log('主划词翻译快捷键注册' + (registered ? '成功' : '失败'));
    
    // 注册备用快捷键
    console.log('注册备用划词翻译快捷键:', shortcuts.translateSelectionAlt);
    const registeredAlt = globalShortcut.register(shortcuts.translateSelectionAlt, () => {
      console.log('触发备用划词翻译快捷键!');
      if (checkAccessibilityPermission()) {
        handleGlobalTranslation();
      } else {
        console.log('权限检查失败，无法执行划词翻译');
      }
    });
    
    console.log('备用划词翻译快捷键注册' + (registeredAlt ? '成功' : '失败'));
    
    // 注册OCR功能快捷键
    const registeredOCR = globalShortcut.register(OCR_SHORTCUT, () => {
      console.log('触发OCR快捷键!');
      if (checkAccessibilityPermission()) {
        handleOCR();
      } else {
        console.log('权限检查失败，无法执行OCR');
      }
    });
    
    console.log('OCR快捷键注册' + (registeredOCR ? '成功' : '失败'));
    
    // 检查快捷键是否已注册
    console.log('快捷键注册状态检查:', 
                shortcuts.translateSelection, globalShortcut.isRegistered(shortcuts.translateSelection) ? '已注册' : '未注册',
                shortcuts.translateSelectionAlt, globalShortcut.isRegistered(shortcuts.translateSelectionAlt) ? '已注册' : '未注册',
                OCR_SHORTCUT, globalShortcut.isRegistered(OCR_SHORTCUT) ? '已注册' : '未注册');

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
  } catch (error) {
    console.error('注册快捷键出错:', error);
  }
}

function handleGlobalTranslation() {
  console.log('触发划词翻译快捷键...');
  
  if (process.platform === 'darwin') {
    console.log('macOS平台处理...');
    
    try {
      // 保存原始剪贴板内容，以便之后比较或恢复
      const originalClipboardText = clipboard.readText();
      console.log('原始剪贴板内容:', originalClipboardText ? (originalClipboardText.length > 50 ? originalClipboardText.substring(0, 50) + '...' : originalClipboardText) : '空');
      
      // 使用增强的文本捕获功能
      captureSelectedText()
        .then((selectedText: string) => {
          console.log('增强文本捕获结果:', selectedText ? (selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText) : '空');
          
          if (selectedText && selectedText.trim()) {
            // 检查主窗口是否存在
            if (!mainWindow) {
              console.log('主窗口不存在，创建新窗口并传递文本');
              // 使用正确的路径创建窗口
              let url = '';
              
              if (process.env.NODE_ENV === 'development') {
                // 开发环境使用本地开发服务器
                url = `http://localhost:3000?text=${encodeURIComponent(selectedText)}`;
              } else {
                // 生产环境使用file协议
                url = `file://${path.join(__dirname, '../renderer/index.html')}?text=${encodeURIComponent(selectedText)}`;
              }
              
              console.log('创建窗口并加载URL:', url);
              
              // 创建窗口并加载URL
              mainWindow = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                  nodeIntegration: true,
                  contextIsolation: false,
                  webSecurity: false,
                },
              });
              
              mainWindow.loadURL(url);
              
              // 开发环境中打开开发者工具
              if (process.env.NODE_ENV === 'development') {
                mainWindow.webContents.openDevTools();
              }
              
              mainWindow.on('closed', () => {
                mainWindow = null;
              });
            } else {
              console.log('主窗口已存在，使用URL传递参数');
              // 显示并聚焦窗口
              if (mainWindow.isMinimized()) {
                mainWindow.restore();
              }
              mainWindow.show();
              mainWindow.focus();
              
              // 加载带参数的URL
              let url = '';
              
              if (process.env.NODE_ENV === 'development') {
                // 开发环境使用本地开发服务器
                url = `http://localhost:3000/src/renderer/?text=${encodeURIComponent(selectedText)}`;
              } else {
                // 生产环境使用file协议
                url = `file://${path.join(__dirname, '../renderer/index.html')}?text=${encodeURIComponent(selectedText)}`;
              }
              
              console.log('主窗口重新加载URL:', url);
              mainWindow.loadURL(url);
            }
          } else {
            console.log('增强文本捕获未获取到文本，尝试备用方法...');
            
            // 尝试通过Menu API执行复制命令
            console.log('尝试使用Menu.sendActionToFirstResponder执行复制');
            Menu.sendActionToFirstResponder('copy:');
            
            // 等待复制完成
            setTimeout(() => {
              const newClipboardText = clipboard.readText();
              console.log('复制后剪贴板内容:', newClipboardText ? (newClipboardText.length > 50 ? newClipboardText.substring(0, 50) + '...' : newClipboardText) : '空');
              
              if (newClipboardText && newClipboardText.trim() && newClipboardText !== originalClipboardText) {
                // 剪贴板内容已变更，发送到主窗口翻译
                console.log('通过剪贴板获取到文本，发送到主窗口翻译');
                sendTextToMainWindow(newClipboardText);
              } else {
                console.log('所有文本捕获方法均失败');
                showManualCopyNotification();
              }
            }, 300);
          }
        })
        .catch((error: Error) => {
          console.error('增强文本捕获出错:', error);
          
          // 出错时使用备用方法
          console.log('文本捕获出错，尝试备用剪贴板方法');
          checkClipboardForTranslation(originalClipboardText);
        });
    } catch (error) {
      console.error('处理翻译请求出错:', error);
    }
  } else {
    // 非macOS平台
    console.log('非macOS平台处理...');
    const selectedText = clipboard.readText('selection') || clipboard.readText();
    console.log('Selected text:', selectedText ? selectedText.substring(0, 50) + '...' : '空');
    
    if (selectedText && selectedText.trim()) {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('translate-selection-to-main', selectedText);
      }
    } else {
      console.log('未找到选中的文本，尝试使用活跃窗口复制');
      
      const activeWindow = BrowserWindow.getFocusedWindow();
      if (activeWindow && activeWindow !== mainWindow) {
        console.log('从活跃窗口复制');
        activeWindow.webContents.copy();
        
        setTimeout(() => {
          const clipboardText = clipboard.readText();
          console.log('复制后剪贴板内容:', clipboardText ? clipboardText.substring(0, 50) + '...' : '空');
          
          if (clipboardText && clipboardText.trim()) {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              mainWindow.webContents.send('translate-selection-to-main', clipboardText);
            }
          } else {
            console.log('无法复制选中文本，请手动复制后使用快捷键');
          }
        }, 300);
      }
    }
  }
}

function checkClipboardForTranslation(originalText: string): void {
  const newClipboardText = clipboard.readText();
  console.log('当前剪贴板内容:', newClipboardText ? (newClipboardText.length > 50 ? newClipboardText.substring(0, 50) + '...' : newClipboardText) : '空');
  
  if (newClipboardText && newClipboardText.trim() && newClipboardText !== originalText) {
    console.log('剪贴板内容已更新，发送到主窗口进行翻译');
    sendTextToMainWindow(newClipboardText);
  } else {
    console.log('未找到新的选中文本，提示用户手动复制');
    showManualCopyNotification();
  }
}

function sendTextToMainWindow(text: string): void {
  console.log('[文本传递] 准备向主窗口发送文本:', text ? (text.length > 50 ? text.substring(0, 50) + '...' : text) : '空');
  
  if (!text || !text.trim()) {
    console.error('[文本传递] 错误：试图发送空文本到主窗口');
    return;
  }
  
  if (mainWindow) {
    try {
      console.log('[文本传递] 主窗口存在，尝试显示并聚焦');
      
      // 确保窗口可见且处于活跃状态
      if (mainWindow.isMinimized()) {
        console.log('[文本传递] 主窗口被最小化，尝试恢复');
        mainWindow.restore();
      }
      
      mainWindow.show();
      mainWindow.focus();
      
      // 使用备选方法：通过显式URL参数传递文本
      try {
        console.log('[文本传递] 尝试使用URL参数传递文本');
        
        // 编码文本以便在URL中使用
        const encodedText = encodeURIComponent(text);
        
        // 在当前窗口中加载带有文本参数的URL
        const url = process.env.NODE_ENV === 'development' 
          ? `http://localhost:3000/src/renderer/?text=${encodedText}` 
          : `file://${path.join(__dirname, '../renderer/index.html')}?text=${encodedText}`;
        
        console.log('[文本传递] 重新加载窗口，带有文本参数:', url);
        mainWindow.loadURL(url);
        
        // 同时尝试原来的IPC方法
        setTimeout(() => {
          console.log('[文本传递] 确保窗口已激活，准备发送IPC消息');
          console.log('[文本传递] 向主窗口发送IPC消息：translate-selection-to-main');
          mainWindow?.webContents.send('translate-selection-to-main', text);
          console.log('[文本传递] IPC消息已发送');
        }, 1000);
      } catch (error) {
        console.error('[文本传递] URL传递文本失败，回退到IPC方法:', error);
        
        // 如果URL方法失败，使用原来的IPC方法
        setTimeout(() => {
          console.log('[文本传递] 确保窗口已激活，准备发送IPC消息');
          console.log('[文本传递] 向主窗口发送IPC消息：translate-selection-to-main');
          mainWindow?.webContents.send('translate-selection-to-main', text);
          console.log('[文本传递] IPC消息已发送');
        }, 300);
      }
    } catch (error) {
      console.error('[文本传递] 发送消息失败:', error);
    }
  } else {
    console.error('[文本传递] 错误：主窗口不存在，无法发送文本');
  }
}

function showManualCopyNotification() {
  if (mainWindow) {
    console.log('显示手动复制提示');
    mainWindow.webContents.send('show-manual-copy-notification');
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

// 添加一个函数来检查所有快捷键是否已注册
function areShortcutsRegistered() {
  const mainRegistered = globalShortcut.isRegistered(shortcuts.translateSelection);
  const altRegistered = globalShortcut.isRegistered(shortcuts.translateSelectionAlt);
  const ocrRegistered = globalShortcut.isRegistered(OCR_SHORTCUT);
  
  console.log('快捷键注册状态检查:', 
    shortcuts.translateSelection, mainRegistered ? '已注册' : '未注册',
    shortcuts.translateSelectionAlt, altRegistered ? '已注册' : '未注册',
    OCR_SHORTCUT, ocrRegistered ? '已注册' : '未注册'
  );
  
  return mainRegistered && altRegistered && ocrRegistered;
} 