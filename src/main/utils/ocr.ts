import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * 捕获鼠标位置周围的屏幕区域，并返回临时文件路径
 */
export async function captureScreenAtMouse(): Promise<string> {
  console.log('获取鼠标位置的屏幕内容...');
  
  // 临时文件路径
  const tempImagePath = path.join(os.tmpdir(), `ocr-capture-${Date.now()}.png`);
  
  return new Promise((resolve, reject) => {
    // 使用AppleScript获取鼠标位置
    const getMousePositionScript = `
      tell application "System Events"
        set mousePosition to (current location)
        return mousePosition
      end tell
    `;
    
    child_process.exec(`osascript -e '${getMousePositionScript}'`, (error, stdout) => {
      if (error) {
        console.error('获取鼠标位置失败:', error);
        reject(error);
        return;
      }
      
      // 解析鼠标位置，格式为 "x, y"
      const positionStr = stdout.trim();
      console.log('鼠标位置原始数据:', positionStr);
      
      const position = positionStr.split(', ');
      if (position.length !== 2) {
        console.error('无法解析鼠标位置:', positionStr);
        reject(new Error('无法解析鼠标位置'));
        return;
      }
      
      const x = parseInt(position[0]);
      const y = parseInt(position[1]);
      console.log(`鼠标位置: x=${x}, y=${y}`);
      
      // 计算截图区域 (鼠标周围300x200像素)
      const left = Math.max(0, x - 150);
      const top = Math.max(0, y - 100);
      const width = 300;
      const height = 200;
      
      // 使用screencapture命令截取区域
      const captureCommand = `screencapture -R"${left},${top},${width},${height}" -x "${tempImagePath}"`;
      console.log('执行截图命令:', captureCommand);
      
      child_process.exec(captureCommand, (error) => {
        if (error) {
          console.error('屏幕截图失败:', error);
          reject(error);
          return;
        }
        
        console.log(`屏幕截图已保存到: ${tempImagePath}`);
        resolve(tempImagePath);
      });
    });
  });
}

/**
 * 使用Llama 3.2 Vision模型从图像中提取文本
 */
export async function extractTextWithLlama(imagePath: string): Promise<string> {
  console.log('使用Llama 3.2 Vision模型提取文本...');
  
  return new Promise((resolve, reject) => {
    try {
      // 读取图像文件为Base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // 准备调用Ollama API的数据
      const requestData = {
        model: 'llama3.2-vision:11b',
        prompt: '请提取这张图片中的所有文本。只返回图片中的纯文本，不要添加任何解释或描述。',
        images: [base64Image],
        stream: false
      };
      
      // 将请求数据转换为JSON字符串
      const requestBody = JSON.stringify(requestData);
      
      // 使用curl调用Ollama API
      const curlCommand = `curl -s -X POST http://localhost:11434/api/generate -d '${requestBody.replace(/'/g, "'\\''")}'`;
      
      child_process.exec(curlCommand, (error, stdout) => {
        if (error) {
          console.error('调用Ollama API失败:', error);
          reject(error);
          return;
        }
        
        try {
          console.log('Ollama API返回结果');
          const response = JSON.parse(stdout);
          
          if (response && response.response) {
            console.log('提取的文本:', response.response);
            resolve(response.response);
          } else {
            console.error('无法从Ollama响应中提取文本:', stdout);
            reject(new Error('无法提取文本'));
          }
        } catch (parseError) {
          console.error('解析Ollama响应失败:', parseError, stdout);
          reject(parseError);
        }
        
        // 删除临时图像文件
        try {
          fs.unlinkSync(imagePath);
          console.log('已删除临时图像文件');
        } catch (unlinkError) {
          console.log('删除临时图像文件失败:', unlinkError);
        }
      });
    } catch (error) {
      console.error('处理图像或调用API时出错:', error);
      reject(error);
    }
  });
} 