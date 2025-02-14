import { Brightness4, Brightness7 } from '@mui/icons-material';
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

const App: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<'zh' | 'en'>('zh');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      setModels(data.models);
      if (data.models.length > 0) {
        setSelectedModel(data.models[0].name);
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
    const detectedLang = detectLanguage(text);
    setSourceLanguage(detectedLang);

    // 清除之前的定时器
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // 设置新的定时器，在用户停止输入500ms后触发翻译
    if (text.trim()) {
      const newTimeout = setTimeout(() => {
        handleTranslate(text);
      }, 500);
      setTypingTimeout(newTimeout);
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          翻译助手
        </Typography>
        <IconButton onClick={toggleTheme} color="inherit">
          {isDarkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
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

        <Typography variant="subtitle1" gutterBottom>
          {sourceLanguage === 'zh' ? '中文 → 英文' : '英文 → 中文'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            原文
          </Typography>
          {inputText && (
            <Tooltip title="朗读原文">
              <IconButton 
                size="small" 
                onClick={() => handleSpeak(inputText, true)}
                color="primary"
              >
                <VolumeUpIcon />
              </IconButton>
            </Tooltip>
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
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleTranslate()}
            disabled={loading || !inputText.trim()}
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
                <Tooltip title="朗读译文">
                  <IconButton 
                    size="small" 
                    onClick={() => handleSpeak(translation)}
                    color="primary"
                  >
                    <VolumeUpIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography
              variant="body1"
              sx={{
                minHeight: '100px',
                whiteSpace: 'pre-wrap',
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                p: 2,
                borderRadius: 1,
              }}
            >
              {translation}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default App; 