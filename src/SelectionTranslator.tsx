import { Brightness4, Brightness7 } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
    Box,
    CircularProgress,
    IconButton,
    Paper,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { useTheme as useCustomTheme } from './contexts/ThemeContext';

// 简单的语言检测函数
const detectLanguage = (text: string): 'zh' | 'en' => {
  // 使用正则表达式检测中文字符
  const zhPattern = /[\u4e00-\u9fa5]/;
  return zhPattern.test(text) ? 'zh' : 'en';
};

const SelectionTranslator: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<'zh' | 'en'>('en');
  const [model, setModel] = useState('llama3.2-vision:11b');
  const [logs, setLogs] = useState<string[]>([]);  // 添加日志状态
  const DEBUG = true;  // 默认开启调试模式

  // 修改调试日志函数
  const debug = (...args: any[]) => {
    if (DEBUG) {
      const logMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${logMessage}`]);
    }
  };

  // 清除日志
  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    const handleTranslate = (_: any, selectedText: string) => {
      if (!selectedText.trim()) return;

      // 1. 先检测语言
      const detectedLang = detectLanguage(selectedText);
      debug('新文本:', selectedText);
      debug('检测到的语言:', detectedLang);

      // 2. 更新文本和翻译方向
      setText(selectedText);
      setTranslation('');  // 清空旧的翻译结果
      
      // 3. 根据检测到的语言设置正确的翻译方向
      if (detectedLang === 'zh' && sourceLanguage === 'zh') {
        // 如果检测到中文，但当前方向是中译英，不需要切换
        translate(selectedText);
      } else if (detectedLang === 'en' && sourceLanguage === 'en') {
        // 如果检测到英文，但当前方向是英译中，不需要切换
        translate(selectedText);
      } else {
        // 需要切换翻译方向
        setSourceLanguage(detectedLang);
        // 翻译会由 useEffect([text, sourceLanguage]) 触发
      }
    };

    const handleTogglePin = () => {
      setIsPinned(prev => {
        const newPinned = !prev;
        ipcRenderer.send('pin-selection-window', newPinned);
        return newPinned;
      });
    };

    ipcRenderer.on('translate-selection', handleTranslate);
    ipcRenderer.on('toggle-pin', handleTogglePin);

    return () => {
      ipcRenderer.removeListener('translate-selection', handleTranslate);
      ipcRenderer.removeListener('toggle-pin', handleTogglePin);
    };
  }, [sourceLanguage]);

  // 监听文本和翻译方向变化，自动翻译
  useEffect(() => {
    if (text) {
      translate(text);
    }
  }, [text, sourceLanguage]);

  // 手动切换翻译方向
  const toggleLanguage = () => {
    setSourceLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  // 独立的翻译函数
  const translate = async (textToTranslate: string) => {
    if (!textToTranslate) return;
    
    setLoading(true);
    try {
      const prompt = sourceLanguage === 'zh' 
        ? `Translate the following Chinese text to English. Only return the translation:\n\n${textToTranslate}`
        : `Translate the following English text to Chinese. Only return the translation:\n\n${textToTranslate}`;
      
      debug('翻译文本:', textToTranslate);
      debug('当前翻译方向:', sourceLanguage === 'zh' ? '中 → 英' : '英 → 中');
      debug('发送到Ollama的提示:', prompt);

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      const data = await response.json();
      debug('Ollama返回的翻译结果:', data.response);
      setTranslation(data.response);
    } catch (error) {
      console.error('翻译错误:', error);
      setTranslation('翻译出错，请检查 Ollama 服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    ipcRenderer.send('hide-selection-window');
  };

  const handlePin = () => {
    setIsPinned(!isPinned);
    ipcRenderer.send('pin-selection-window', !isPinned);
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinned) {
      ipcRenderer.send('start-window-drag');
    }
  };

  const handleOpenDevTools = () => {
    ipcRenderer.send('open-dev-tools');
  };

  return (
    <Paper
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: isPinned ? 'default' : 'move',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          bgcolor: 'primary.main',
          color: 'white',
        }}
        onMouseDown={handleDragStart}
      >
        <Typography 
          variant="subtitle2" 
          onClick={toggleLanguage}
          sx={{ cursor: 'pointer' }}
        >
          {sourceLanguage === 'zh' ? '中 → 英' : '英 → 中'}
        </Typography>
        <Box>
          <Tooltip title="切换主题">
            <IconButton size="small" onClick={toggleTheme} sx={{ color: 'white', mr: 1 }}>
              {isDarkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          <Tooltip title="调试工具">
            <IconButton size="small" onClick={handleOpenDevTools} sx={{ color: 'white', mr: 1 }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={handlePin} sx={{ color: 'white', mr: 1 }}>
            {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
          </IconButton>
          <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Typography variant="body2" gutterBottom>
          {text}
        </Typography>
        <Box sx={{ my: 1, height: '1px', bgcolor: 'divider' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {translation}
          </Typography>
        )}

        {/* 添加调试日志区域 */}
        {DEBUG && (
          <>
            <Box sx={{ my: 2, height: '1px', bgcolor: 'divider' }} />
            <Box sx={{ 
              mt: 2, 
              p: 1, 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
              borderRadius: 1,
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  调试日志
                </Typography>
                <Typography 
                  variant="caption" 
                  color="primary" 
                  sx={{ cursor: 'pointer' }}
                  onClick={clearLogs}
                >
                  清除日志
                </Typography>
              </Box>
              {logs.map((log, index) => (
                <Typography 
                  key={index} 
                  variant="caption" 
                  component="div" 
                  sx={{ 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {log}
                </Typography>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default SelectionTranslator; 