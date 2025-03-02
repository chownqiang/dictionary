import { Brightness4, Brightness7, ColorLens } from '@mui/icons-material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';

interface Model {
  name: string;
  modified_at: string;
  size: number;
}

const DEFAULT_MODEL = 'llama3.2-vision:11b';

const App: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme, themeMode } = useCustomTheme();
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<'zh' | 'en'>('zh');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      setModels(data.models);
      
      // 设置默认模型
      if (data.models && data.models.length > 0) {
        const defaultModel = data.models.find((m: Model) => m.name === DEFAULT_MODEL);
        setSelectedModel(defaultModel ? defaultModel.name : data.models[0].name);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const detectLanguage = (text: string): 'zh' | 'en' => {
    const zhPattern = /[\u4e00-\u9fa5]/;
    return zhPattern.test(text) ? 'zh' : 'en';
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setInputText(text);
    
    if (text.trim()) {
      // 检测语言并适当设置
      const detectedLang = detectLanguage(text);
      if (detectedLang !== sourceLanguage) {
        setSourceLanguage(detectedLang);
      }

      // 清除之前的定时器
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // 设置新的定时器，在用户停止输入500ms后触发翻译
      const newTimeout = setTimeout(() => {
        handleTranslate(text);
      }, 500);
      setTypingTimeout(newTimeout);
    } else {
      // 如果文本为空，清空翻译结果
      setTranslation('');
    }
  };

  const handleTranslate = async (textToTranslate: string = inputText) => {
    if (!textToTranslate.trim()) return;

    setLoading(true);
    try {
      const prompt = sourceLanguage === 'zh'
        ? `将以下中文翻译成英文：\n\n${textToTranslate}`
        : `将以下英文翻译成中文：\n\n${textToTranslate}`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: `You are a professional translator. ${prompt}. Only return the translated text, no explanations.`,
          stream: false,
        }),
      });

      const data = await response.json();
      setTranslation(data.response);
    } catch (error) {
      console.error('翻译错误:', error);
      setTranslation('翻译出错，请检查 Ollama 服务是否运行');
    } finally {
      setLoading(false);
    }
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

  const toggleLanguage = () => {
    setSourceLanguage(prev => prev === 'zh' ? 'en' : 'zh');
    // 清空翻译结果
    setTranslation('');
  };

  // 将译文内容作为原文，并切换翻译方向
  const swapTextAndTranslation = () => {
    if (translation) {
      setInputText(translation);
      setTranslation('');
      // 切换翻译方向
      setSourceLanguage(prev => prev === 'zh' ? 'en' : 'zh');
      // 如果有定时器，清除它
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          翻译助手
        </Typography>
        <Tooltip title="切换主题模式">
          <IconButton onClick={toggleTheme} color="inherit">
            {getThemeIcon()}
          </IconButton>
        </Tooltip>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>选择模型</InputLabel>
          <Select
            value={selectedModel}
            label="选择模型"
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.map((model) => (
              <MenuItem key={model.name} value={model.name}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center', 
          mb: 2,
          pb: 1,
          borderBottom: themeMode === 'purple' 
            ? `1px solid ${isDarkMode ? '#523f70' : '#b8a6d9'}`
            : '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            {sourceLanguage === 'zh' ? '中文' : '英文'}
          </Typography>
          <Tooltip title="切换翻译方向">
            <IconButton 
              size="small" 
              onClick={toggleLanguage}
              color="primary"
              sx={{
                mx: 1,
                ...(themeMode === 'purple' && {
                  color: isDarkMode ? '#8a63cc' : '#6a4d93',
                })
              }}
            >
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            {sourceLanguage === 'zh' ? '英文' : '中文'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            原文
          </Typography>
          {inputText && (
            <>
              <Tooltip title="复制原文">
                <IconButton 
                  size="small" 
                  onClick={() => handleCopy(inputText, '原文')}
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="朗读原文">
                <IconButton 
                  size="small" 
                  onClick={() => handleSpeak(inputText, true)}
                  color="primary"
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          value={inputText}
          onChange={handleInputChange}
          placeholder="请输入要翻译的文本"
          variant="outlined"
          sx={{ 
            mb: 2,
            ...(themeMode === 'purple' && {
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkMode ? '#523f70' : '#b8a6d9',
                },
                '&:hover fieldset': {
                  borderColor: isDarkMode ? '#6a4d93' : '#8a63cc',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDarkMode ? '#8a63cc' : '#6a4d93',
                },
                '& textarea': {
                  color: isDarkMode ? '#e1d9eb' : '#382952',
                },
                backgroundColor: isDarkMode ? '#382952' : '#f5f0fa',
              }
            })
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Button
            variant="outlined"
            onClick={swapTextAndTranslation}
            disabled={!translation}
            startIcon={<SwapVertIcon />}
            sx={{
              ...(themeMode === 'purple' && {
                borderColor: isDarkMode ? '#8a63cc' : '#6a4d93',
                color: isDarkMode ? '#8a63cc' : '#6a4d93',
                '&:hover': {
                  borderColor: isDarkMode ? '#9d74e0' : '#7e5ba7',
                  backgroundColor: 'rgba(138, 99, 204, 0.04)',
                },
              })
            }}
          >
            译文转为原文
          </Button>
          <Button
            variant="contained"
            onClick={() => handleTranslate()}
            disabled={loading || !inputText.trim()}
            sx={{
              ...(themeMode === 'purple' && {
                backgroundColor: isDarkMode ? '#8a63cc' : '#6a4d93',
                '&:hover': {
                  backgroundColor: isDarkMode ? '#9d74e0' : '#7e5ba7',
                },
              })
            }}
          >
            立即翻译
          </Button>
        </Box>

        <Box sx={{ my: 2, height: '1px', bgcolor: 'divider' }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                译文
              </Typography>
              {translation && (
                <>
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
                </>
              )}
            </Box>
            <Typography
              variant="body1"
              sx={{
                minHeight: '100px',
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
              {translation}
            </Typography>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default App; 