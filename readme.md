## 故事
* [x] 中->英 / 英->中 字典
  * [x] 可以切换中英文
  * [ ] 根据语言自动切换 中/英 方向
* [x] 调用本地 ollama 模型 api 进行翻译
  * [x] 可以选模型
  * [x] 动态获取本地已安装的模型列表
  * [x] 自动拉取新选择的模型
* [ ] 支持快捷键
  * [ ] 划词翻译
* [ ] 支持悬浮
  * [ ] 固定窗口

## 已实现功能
* 基于 Electron + React + TypeScript + Vite 的现代技术栈
* Material-UI 设计的美观界面
* 支持中英文双向翻译，可快速切换语言方向
* 集成 Ollama API，支持多种翻译模型
* 翻译过程中的加载状态提示
* 错误处理和用户友好的提示

## 待开发功能
* 划词翻译功能
* 窗口悬浮和固定功能
* 快捷键支持
* 翻译历史记录
* 常用短语收藏

## 软件架构
* 基于 Electron 的跨平台客户端
* 前端：React + TypeScript + Material-UI
* 构建工具：Vite + Electron Builder
* 翻译引擎：本地 Ollama API

## 开发说明
1. 安装依赖
```bash
npm install
```

2. 开发模式
```bash
npm run dev
```

3. 打包应用
```bash
npm run build
```

## 使用要求
* 需要本地安装 Ollama
* 需要至少安装一个支持的语言模型