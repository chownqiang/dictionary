import { Brightness4, Brightness7, ColorLens } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
    Box,
    CircularProgress,
    IconButton,
    Paper,
    Snackbar,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';
import { useTheme as useCustomTheme } from './contexts/ThemeContext';

const DEFAULT_MODEL = 'llama3.2-vision:11b';

// 简单的语言检测函数
const detectLanguage = (text: string): 'zh' | 'en' => {
  // 使用正则表达式检测中文字符
  const zhPattern = /[\u4e00-\u9fa5]/;
  return zhPattern.test(text) ? 'zh' : 'en';
};

interface Model {
  name: string;
  modified_at: string;
  size: number;
}

const SelectionTranslator: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme, themeMode } = useCustomTheme();
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<'zh' | 'en'>('en');
  const [model, setModel] = useState('');
  const [logs, setLogs] = useState<string[]>([]);  // 添加日志状态
  const DEBUG = true;  // 默认开启调试模式
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 获取可用模型并设置默认模型
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          const defaultModel = data.models.find((m: Model) => m.name === DEFAULT_MODEL);
          setModel(defaultModel ? defaultModel.name : data.models[0].name);
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
        debug('获取模型列表失败:', error);
      }
    };

    fetchModels();
  }, []);

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

  const handleSpeak = (text: string, isSourceText: boolean = false) => {
    if (!text) return;
    
    // 停止当前正在播放的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // 根据文本类型和翻译方向设置发音语言
    if (isSourceText) {
      utterance.lang = sourceLanguage === 'zh' ? 'zh-CN' : 'en-US';
    } else {
      utterance.lang = sourceLanguage === 'zh' ? 'en-US' : 'zh-CN';
    }
    // 设置语速
    utterance.rate = 1.0;
    // 设置音量
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async (text: string, type: '原文' | '译文') => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage(`${type}已复制到剪贴板`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('复制失败:', err);
      setSnackbarMessage('复制失败');
      setSnackbarOpen(true);
    }
  };

  // 根据当前主题返回适当的图标
  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Brightness4 />;
      case 'dark':
        return <Brightness7 />;
      case 'purple':
        return <ColorLens />;
      default:
        return <Brightness4 />;
    }
  };

  // 将译文内容作为原文，并切换翻译方向
  const swapTextAndTranslation = () => {
    if (translation) {
      setText(translation);
      setTranslation('');
      // 切换翻译方向
      setSourceLanguage(prev => prev === 'zh' ? 'en' : 'zh');
    }
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
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <span>{sourceLanguage === 'zh' ? '中文' : '英文'}</span>
          <SwapHorizIcon fontSize="small" sx={{ mx: 0.5 }} />
          <span>{sourceLanguage === 'zh' ? '英文' : '中文'}</span>
        </Typography>
        <Box>
          <Tooltip title="切换主题">
            <IconButton 
              size="small" 
              onClick={toggleTheme} 
              sx={{ 
                color: 'white', 
                mr: 1,
                ...(themeMode === 'purple' && {
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)'
                  }
                })
              }}
            >
              {getThemeIcon()}
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            原文
          </Typography>
          {text && (
            <>
              <Tooltip title="复制原文">
                <IconButton 
                  size="small" 
                  onClick={() => handleCopy(text, '原文')}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="朗读原文">
                <IconButton 
                  size="small" 
                  onClick={() => handleSpeak(text, true)}
                  color="primary"
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
        <Typography 
          variant="body2" 
          sx={{
            whiteSpace: 'pre-wrap',
            bgcolor: themeMode === 'purple' 
              ? (isDarkMode ? '#382952' : '#f5f0fa')  
              : (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
            p: 2,
            borderRadius: 1,
            color: themeMode === 'purple'
              ? (isDarkMode ? '#e1d9eb' : '#382952')
              : 'inherit'
          }}
        >
          {text}
        </Typography>
        <Box sx={{ my: 2, height: '1px', bgcolor: 'divider' }} />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  译文
                </Typography>
                <Tooltip title="将译文设为原文">
                  <IconButton 
                    size="small" 
                    onClick={swapTextAndTranslation}
                    disabled={!translation}
                    color="primary"
                    sx={{ ml: 1 }}
                  >
                    <SwapVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {translation && (
                <Box>
                  <Tooltip title="复制译文">
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopy(translation, '译文')}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="朗读译文">
                    <IconButton 
                      size="small" 
                      onClick={() => handleSpeak(translation)}
                      color="primary"
                    >
                      <VolumeUpIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
            <Typography 
              variant="body2" 
              sx={{
                whiteSpace: 'pre-wrap',
                bgcolor: themeMode === 'purple' 
                  ? (isDarkMode ? '#382952' : '#f5f0fa')  
                  : (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
                p: 2,
                borderRadius: 1,
                color: themeMode === 'purple'
                  ? (isDarkMode ? '#e1d9eb' : '#382952')
                  : 'text.secondary'
              }}
            >
              {translation}
            </Typography>
          </Box>
        )}

        {/* 添加调试日志区域 */}
        {DEBUG && (
          <>
            <Box sx={{ my: 2, height: '1px', bgcolor: 'divider' }} />
            <Box sx={{ 
              mt: 2, 
              p: 1, 
              bgcolor: themeMode === 'purple'
                ? (isDarkMode ? '#2d1f3d' : '#f5f0fa')
                : (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
};

export default SelectionTranslator; 