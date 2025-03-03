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
import { ipcRenderer } from 'electron';
import React, { useCallback, useEffect, useState } from 'react';

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

  // 检测语言的简单函数
  const detectLanguage = (text: string): 'zh' | 'en' => {
    // 使用正则表达式检测中文字符
    const zhPattern = /[\u4e00-\u9fa5]/;
    return zhPattern.test(text) ? 'zh' : 'en';
  };

  // 读取URL参数中的文本
  useEffect(() => {
    console.log('[前端] 组件挂载，检查URL参数');
    try {
      const params = new URLSearchParams(window.location.search);
      const textParam = params.get('text');
      
      if (textParam) {
        const decodedText = decodeURIComponent(textParam);
        console.log('[前端] 从URL参数获取到文本:', decodedText);
        
        // 检测语言
        const detectedLang = detectLanguage(decodedText);
        console.log('[前端] 检测到语言:', detectedLang);
        
        // 设置状态
        setSourceLang(detectedLang);
        setTargetLang(detectedLang === 'zh' ? 'en' : 'zh');
        setSourceText(decodedText);
        
        console.log('[前端] 已从URL参数设置文本和语言');
      } else {
        console.log('[前端] URL中没有文本参数');
      }
    } catch (error) {
      console.error('[前端] 处理URL参数出错:', error);
    }
  }, []);

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

  // 使用useCallback封装handleTranslate函数
  const handleTranslate = useCallback(async () => {
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
  }, [sourceText, model, sourceLang, targetLang]); // 明确列出依赖项

  // 监听来自主进程的翻译请求
  useEffect(() => {
    // 监听划词翻译事件
    const handleSelectionTranslate = (_event: any, selectedText: string) => {
      // 立即记录消息接收
      console.log('[IPC接收] 收到划词翻译消息');
      console.log('[前端] 收到翻译请求，文本:', selectedText ? (selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText) : '空');
      
      // 立即设置文本（简化逻辑，防止状态更新问题）
      if (selectedText && selectedText.trim()) {
        console.log('[前端] 文本有效，立即设置');
        const detectedLang = detectLanguage(selectedText);
        
        // 直接更新所有状态
        setSourceLang(detectedLang);
        setTargetLang(detectedLang === 'zh' ? 'en' : 'zh');
        setSourceText(selectedText);
        
        // 打印确认
        console.log('[前端] 状态已更新: 源语言=', detectedLang, '目标语言=', (detectedLang === 'zh' ? 'en' : 'zh'));
      } else {
        console.log('[前端] 收到的文本为空或只包含空白字符');
      }
    };
    
    // 添加手动复制通知处理函数
    const handleManualCopyNotification = () => {
      console.log('收到手动复制提示');
      alert('请先选择文本并手动复制 (Command+C)，然后再按翻译快捷键');
      // 回复主进程已显示通知
      ipcRenderer.send('show-manual-copy-notification-reply');
    };
    
    // 添加复制失败通知处理函数
    const handleCopyFailed = () => {
      console.log('收到复制失败提示');
      alert('无法复制选中文本，请手动复制后使用快捷键');
    };
    
    // 添加OCR通知处理函数
    const handleOCRNotification = () => {
      console.log('收到OCR功能通知');
      alert('正在通过OCR识别鼠标所在位置的文本...');
    };
    
    // 添加OCR失败通知处理函数
    const handleOCRFailedNotification = () => {
      console.log('收到OCR失败通知');
      alert('OCR文本识别失败，请尝试调整鼠标位置或使用快捷键手动复制文本。');
    };

    // 添加事件监听器
    ipcRenderer.on('translate-selection-to-main', handleSelectionTranslate);
    ipcRenderer.on('show-manual-copy-notification', handleManualCopyNotification);
    ipcRenderer.on('copy-failed', handleCopyFailed);
    ipcRenderer.on('show-ocr-notification', handleOCRNotification);
    ipcRenderer.on('show-ocr-failed-notification', handleOCRFailedNotification);

    // 组件卸载时移除事件监听器
    return () => {
      ipcRenderer.removeListener('translate-selection-to-main', handleSelectionTranslate);
      ipcRenderer.removeListener('show-manual-copy-notification', handleManualCopyNotification);
      ipcRenderer.removeListener('copy-failed', handleCopyFailed);
      ipcRenderer.removeListener('show-ocr-notification', handleOCRNotification);
      ipcRenderer.removeListener('show-ocr-failed-notification', handleOCRFailedNotification);
    };
  }, []); // 保持依赖数组为空
  
  // 当sourceText变化时自动翻译
  useEffect(() => {
    if (sourceText.trim()) {
      handleTranslate();
    }
  }, [sourceText, handleTranslate]);

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