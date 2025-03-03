import * as child_process from 'child_process';

/**
 * 使用增强的AppleScript捕获当前选中的文本
 * 基于用户提供的AppleScriptObjC方法实现
 */
export async function captureSelectedText(): Promise<string> {
  console.log('[文本捕获] 开始使用增强AppleScript捕获选中文本...');
  
  // 增强版AppleScript，尝试多种方法获取选中文本
  const enhancedScript = `
    on run
      set debug_log to ""
      set selectedText to ""
      
      -- 步骤1: 获取当前活跃的应用
      set debug_log to debug_log & "步骤1: 获取当前活跃应用\\n"
      tell application "System Events"
        try
          set frontApp to name of first application process whose frontmost is true
          set debug_log to debug_log & "活跃应用: " & frontApp & "\\n"
        on error errMsg
          set debug_log to debug_log & "获取活跃应用失败: " & errMsg & "\\n"
          set frontApp to "Unknown"
        end try
      end tell
      
      -- 步骤2: 尝试使用AXSelectedText属性获取文本
      set debug_log to debug_log & "步骤2: 尝试使用AXSelectedText获取文本\\n"
      try
        tell application "System Events"
          tell process frontApp
            set uiElements to UI elements of window 1
            set debug_log to debug_log & "找到UI元素数量: " & (count of uiElements) & "\\n"
            
            try
              set selectedText to value of attribute "AXSelectedText" of window 1
              set debug_log to debug_log & "通过窗口AXSelectedText获取文本成功\\n"
            on error
              set debug_log to debug_log & "窗口AXSelectedText获取失败,尝试查找文本区域\\n"
              
              try
                -- 尝试找到文本区域元素
                repeat with elem in uiElements
                  if role of elem is "AXTextArea" or role of elem is "AXTextField" then
                    try
                      set selectedText to value of attribute "AXSelectedText" of elem
                      if selectedText is not "" then
                        set debug_log to debug_log & "从" & (role of elem) & "获取到文本\\n"
                        exit repeat
                      end if
                    end try
                  end if
                end repeat
              on error
                set debug_log to debug_log & "遍历UI元素失败\\n"
              end try
            end try
          end tell
        end tell
      on error errMsg
        set debug_log to debug_log & "AXSelectedText方法失败: " & errMsg & "\\n"
      end try
      
      -- 步骤3: 如果上述方法失败,尝试直接向应用请求selection
      if selectedText is "" then
        set debug_log to debug_log & "步骤3: 尝试使用应用的selection属性\\n"
        try
          tell application frontApp
            set selectedText to get the selection as text
            set debug_log to debug_log & "通过应用selection属性获取成功\\n"
          end tell
        on error errMsg
          set debug_log to debug_log & "应用selection属性失败: " & errMsg & "\\n"
        end try
      end if
      
      -- 步骤4: 如果前面的方法都失败,尝试模拟复制操作
      if selectedText is "" then
        set debug_log to debug_log & "步骤4: 尝试模拟复制操作\\n"
        try
          -- 保存原始剪贴板
          set originalClipboard to do shell script "pbpaste"
          set debug_log to debug_log & "原始剪贴板已保存\\n"
          
          -- 执行复制操作
          tell application "System Events"
            keystroke "c" using command down
            delay 0.5
          end tell
          
          -- 获取新剪贴板内容
          set newClipboard to do shell script "pbpaste"
          
          if newClipboard is not equal to originalClipboard then
            set selectedText to newClipboard
            set debug_log to debug_log & "通过模拟复制获取文本成功\\n"
          else
            set debug_log to debug_log & "模拟复制未获取到新内容\\n"
          end if
        on error errMsg
          set debug_log to debug_log & "模拟复制操作失败: " & errMsg & "\\n"
        end try
      end if
      
      -- 返回结果和调试信息
      return {selectedText, debug_log}
    end run
  `;
  
  return new Promise((resolve, reject) => {
    console.log('[文本捕获] 执行AppleScript...');
    
    child_process.exec(`osascript -e '${enhancedScript}'`, (error, stdout, stderr) => {
      if (error) {
        console.error('[文本捕获] AppleScript执行错误:', error);
        console.error('[文本捕获] 错误详情:', stderr);
        reject(error);
        return;
      }
      
      try {
        console.log('[文本捕获] AppleScript原始输出:', stdout);
        
        // 解析AppleScript返回的结果
        // AppleScript返回格式可能是 {selectedText, debug_log}
        const output = stdout.trim();
        
        // 处理返回的数组格式 (可能像 "text, debug log")
        const parts = output.split(', ');
        const capturedText = parts[0].replace(/^"(.*)"$/, '$1'); // 去除引号
        
        // 如果有调试信息，也输出
        if (parts.length > 1) {
          console.log('[文本捕获] AppleScript调试日志:');
          console.log(parts.slice(1).join(', ').replace(/^"(.*)"$/, '$1'));
        }
        
        console.log('[文本捕获] 捕获的文本:', capturedText || '(无文本)');
        resolve(capturedText);
      } catch (parseError) {
        console.error('[文本捕获] 解析AppleScript输出失败:', parseError);
        console.log('[文本捕获] 将尝试直接使用原始输出');
        resolve(stdout.trim());
      }
    });
  });
} 