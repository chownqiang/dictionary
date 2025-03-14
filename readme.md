## 功能特性
* [x] 中->英 / 英->中 字典
  * [x] 可以切换中英文
  * [x] 根据语言自动切换 中/英 方向
* [x] 调用本地 ollama 模型 api 进行翻译
  * [x] 可以选模型
  * [x] 动态获取本地已安装的模型列表
  * [x] 自动拉取新选择的模型
* [x] 支持快捷键
  * [ ] 划词翻译 (Ctrl + m) - 自动将选中内容复制到主窗口并翻译
* [x] 帮助文档
  * [x] 作者 Jhon-semfoundry
  * [x] 版本号 1.0.0
  * [x] 快捷键说明
* [x] 支持悬浮
  * [x] 固定窗口
  * [x] 窗口拖动
  * [x] 智能位置调整

## 已实现功能
* 基于 Electron + React + TypeScript + Vite 的现代技术栈
* Material-UI 设计的美观界面
* 支持中英文双向翻译，可快速切换语言方向
* 集成 Ollama API，支持多种翻译模型
* 翻译过程中的加载状态提示
* 错误处理和用户友好的提示
* 全局快捷键支持
* 窗口拖动和固定功能
* 智能窗口位置调整

## 使用说明
1. 快捷键
   * `Ctrl + M`: 划词翻译 - 将选中的文本自动复制到主窗口并立即翻译

2. 窗口操作
   * 拖动标题栏可移动窗口
   * 点击图钉图标可固定窗口
   * 固定后窗口始终置顶且不可移动

3. 翻译功能
   * 自动检测输入文本语言
   * 自动切换翻译方向
   * 支持选择不同的翻译模型

## 关于
* 版本：1.0.0
* 作者：Jhon-semfoundry
* 许可：MIT License

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

## 后续计划
* 添加翻译历史记录
* 支持常用短语收藏
* 添加设置界面
* 支持自定义快捷键
* 优化翻译性能
* 支持更多翻译模型