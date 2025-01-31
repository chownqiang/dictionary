import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

interface OllamaModel {
  name: string;
  id: string;
  size: string;
  modified: string;
}

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh');
  const [targetLang, setTargetLang] = useState('en');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);

  // 获取可用模型列表
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      setModels(data.models || []);
      if (data.models && data.models.length > 0) {
        setModel(data.models[0].name);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setPulling(true);
    try {
      // 拉取模型
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newModel,
        }),
      });
      
      if (response.ok) {
        setModel(newModel);
      }
    } catch (error) {
      console.error('拉取模型失败:', error);
    } finally {
      setPulling(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText || !model) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: `You are a professional translator. Please translate the following text from ${sourceLang} to ${targetLang}. Only return the translated text, no explanations:\n\n${sourceText}`,
          stream: false,
        }),
      });

      const data = await response.json();
      setTranslatedText(data.response);
    } catch (error) {
      console.error('翻译错误:', error);
      setTranslatedText('翻译出错，请检查 Ollama 服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  const switchLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          翻译助手
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>选择模型</InputLabel>
            <Select
              value={model}
              label="选择模型"
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={pulling}
            >
              {models.map((m) => (
                <MenuItem key={m.id} value={m.name}>
                  {m.name} ({m.size})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <FormControl sx={{ width: '45%' }}>
              <InputLabel>源语言</InputLabel>
              <Select
                value={sourceLang}
                label="源语言"
                onChange={(e) => setSourceLang(e.target.value)}
              >
                <MenuItem value="zh">中文</MenuItem>
                <MenuItem value="en">英文</MenuItem>
              </Select>
            </FormControl>

            <Button onClick={switchLanguages}>
              <SwapHorizIcon />
            </Button>

            <FormControl sx={{ width: '45%' }}>
              <InputLabel>目标语言</InputLabel>
              <Select
                value={targetLang}
                label="目标语言"
                onChange={(e) => setTargetLang(e.target.value)}
              >
                <MenuItem value="zh">中文</MenuItem>
                <MenuItem value="en">英文</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            multiline
            rows={4}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            label="输入文本"
            variant="outlined"
          />

          <Button
            variant="contained"
            onClick={handleTranslate}
            disabled={!sourceText || loading || pulling || !model}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : '翻译'}
          </Button>

          <TextField
            multiline
            rows={4}
            value={translatedText}
            label="翻译结果"
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
          />
        </Box>

        {pulling && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>正在准备模型，请稍候...</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default App; 