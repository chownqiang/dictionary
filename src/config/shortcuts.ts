export const shortcuts = {
  // 主要划词翻译快捷键 - 所有平台统一使用Control+M
  // 在macOS上是按下⌃+M (Control+M)，而不是⌘+M (Command+M)
  translateSelection: 'Control+M',
  
  // 备用划词翻译快捷键 - 以防主快捷键不工作
  // 在macOS上是按下⌃+⌥+M (Control+Option+M)
  translateSelectionAlt: 'Control+Alt+M',
  
  // 其他快捷键
  toggleWindow: process.platform === 'darwin' ? 'Command+Shift+Space' : 'Control+Shift+Space',
  pinWindow: process.platform === 'darwin' ? 'Command+Shift+P' : 'Control+Shift+P',
};