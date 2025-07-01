# Markdown to Codelabs Converter

一个将 Markdown 文件转换为 Google Codelabs 风格网页的 Web 应用程序。

## 功能特点

- 🎨 **美观的界面**: 模仿 Google Codelabs 的设计风格
- 📱 **响应式设计**: 支持桌面端和移动端
- 🔄 **实时转换**: 输入 Markdown URL 即可实时转换
- 💾 **智能缓存**: 使用 SQLite 数据库缓存转换结果，提升访问速度
- 🔗 **永久链接**: 每个转换后的内容都有唯一的访问链接
- 🎯 **步骤导航**: 支持侧边栏导航和键盘快捷键
- 💻 **代码高亮**: 自动识别和高亮代码块
- 📊 **进度跟踪**: 显示学习进度条
- 🛠️ **管理界面**: 查看所有转换记录和访问统计

## 安装和使用

### 1. 克隆或下载项目

```bash
git clone <your-repo-url>
cd markdown-codelabs-converter
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 4. 打开浏览器

访问 `http://localhost:3000` 即可使用。

## 使用方法

1. 在首页输入 Markdown 文件的 URL（支持 GitHub raw 链接等）
2. 点击"转换为 Codelabs"按钮
3. 系统会自动解析 Markdown 并生成 Codelabs 风格的网页
4. 转换完成后会重定向到一个永久的访问链接（如 `/view/abc123def456`）
5. 相同的 URL 再次转换会直接从缓存获取，无需重新处理

## 管理功能

- 访问 `http://localhost:3000/admin` 查看所有转换记录
- 可以看到原始URL、转换ID、创建时间、访问统计等信息

## Markdown 格式要求

为了获得最佳效果，你的 Markdown 文件应该遵循以下结构：

```markdown
---
title: 教程标题
date: 2025-07-01
categories: [分类]
tags: [标签1, 标签2]
---

# 主标题

## 步骤1：第一个步骤

这里是第一个步骤的内容...

### 子标题

更多内容...

```bash
代码示例
```

## 步骤2：第二个步骤

这里是第二个步骤的内容...

## 步骤3：最后一个步骤

完成所有步骤！

```

## 支持的功能

- ✅ Front Matter 元数据解析（自动读取 title 字段作为标题）
- ✅ 多级标题（## 作为步骤分割）
- ✅ 代码块语法高亮
- ✅ 表格支持
- ✅ 列表和引用
- ✅ 图片和链接
- ✅ 步骤间导航
- ✅ 键盘快捷键（左右箭头键、空格键）
- ✅ SQLite 数据库缓存
- ✅ 唯一永久链接生成
- ✅ 访问统计和管理界面

## 示例 URL

你可以使用以下示例 URL 测试：

```
<https://raw.githubusercontent.com/phyuany/algs.tech/refs/heads/main/_posts/2025-07-01-database_install-postgresql-on-debian-using-apt.md>

```

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3 (本地存储)
- **Markdown 解析**: Marked.js
- **代码高亮**: Highlight.js
- **HTTP 请求**: Axios
- **前端**: 原生 HTML/CSS/JavaScript

## 部署

### 本地部署

直接运行 `npm start` 即可。

### 云端部署（推荐）

可以部署到以下平台：

1. **Vercel** (推荐)
2. **Netlify**
3. **Railway**
4. **Heroku**

部署时请确保：
- Node.js 版本 >= 14.0.0
- 端口配置使用 `process.env.PORT`

## 自定义

### 修改样式

编辑 `server.js` 中的 CSS 部分，可以自定义：
- 颜色主题
- 字体设置  
- 布局样式
- 动画效果

### 添加新功能

在 `parseMarkdownToCodelabs` 函数中可以添加更多 Markdown 解析逻辑。

## 故障排除

### 常见问题

1. **无法访问 URL**
   - 确保 URL 是公开可访问的
   - 检查网络连接
   - 验证 URL 格式是否正确

2. **步骤显示不正确**
   - 确保使用 `##` 作为步骤标题
   - 检查 Markdown 格式是否正确

3. **代码高亮不工作**
   - 确保代码块使用正确的语言标识
   - 检查是否有网络访问 CDN

### 日志调试

服务器会在控制台输出详细的错误信息，有助于调试问题。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
