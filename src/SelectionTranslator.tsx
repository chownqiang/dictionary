import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    CircularProgress,
    IconButton,
    Paper,
    Typography,
} from '@mui/material';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

// 简单的语言检测函数
const detectLanguage = (text: string): 'zh' | 'en' => {
  // 使用正则表达式检测中文字符
  const zhPattern = /[\u4e00-\u9fa5]/;
  return zhPattern.test(text) ? 'zh' : 'en';
};

const SelectionTranslator: React.FC = () => {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<'zh' | 'en'>('zh');

  useEffect(() => {
    const handleTranslate = async (_: any, selectedText: string) => {
      setText(selectedText);
      const detectedLang = detectLanguage(selectedText);
      setSourceLanguage(detectedLang);
      await translateText(selectedText, detectedLang);
    };

    ipcRenderer.on('translate-selection', handleTranslate);

    return () => {
      ipcRenderer.removeListener('translate-selection', handleTranslate);
    };
  }, []);

  const translateText = async (text: string, sourceLang: 'zh' | 'en') => {
    setLoading(true);
    try {
      const prompt = sourceLang === 'zh' 
        ? `将以下中文翻译成英文：\n\n${text}`
        : `将以下英文翻译成中文：\n\n${text}`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5-coder',
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

  const handleClose = () => {
    ipcRenderer.send('hide-selection-window');
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
        cursor: 'default',
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
      >
        <Typography variant="subtitle2">
          {sourceLanguage === 'zh' ? '中 → 英' : '英 → 中'}
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
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
      </Box>
    </Paper>
  );
};

export default SelectionTranslator; 