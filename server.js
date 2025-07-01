const express = require('express');
const axios = require('axios');
const marked = require('marked');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 SQLite 数据库
const db = new sqlite3.Database('./db/codelabs.db');

// 创建表
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS codelabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT UNIQUE NOT NULL,
    converted_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 生成唯一的转换ID
function generateConvertedId (url) {
    return crypto.createHash('sha256').update(url + Date.now()).digest('hex').substring(0, 12);
}

// 存储内容到数据库
function storeToDatabase (originalUrl, convertedId, title, content) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO codelabs (original_url, converted_id, title, content, accessed_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [originalUrl, convertedId, title, content],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// 从数据库获取内容
function getFromDatabase (originalUrl) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM codelabs WHERE original_url = ?`,
            [originalUrl],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

// 通过转换ID获取内容
function getByConvertedId (convertedId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM codelabs WHERE converted_id = ?`,
            [convertedId],
            (err, row) => {
                if (err) reject(err);
                else {
                    // 更新访问时间
                    if (row) {
                        db.run(`UPDATE codelabs SET accessed_at = CURRENT_TIMESTAMP WHERE converted_id = ?`, [convertedId]);
                    }
                    resolve(row);
                }
            }
        );
    });
}

// 设置静态文件目录
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置 marked 选项
marked.setOptions({
    highlight: function (code, lang) {
        if (lang) {
            try {
                const hljs = require('highlight.js');
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                return code;
            }
        }
        return code;
    },
    breaks: true,
    gfm: true
});

// 解析 Markdown 内容为结构化数据
function parseMarkdownToCodelabs (markdownContent) {
    const lines = markdownContent.split('\n');
    const codelabs = {
        title: '',
        metadata: {},
        steps: []
    };

    let currentStep = null;
    let inFrontMatter = false;
    let frontMatterContent = '';
    let frontMatterStarted = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 处理 Front Matter
        if (line.trim() === '---') {
            if (!frontMatterStarted) {
                // 第一个 ---，开始 front matter
                frontMatterStarted = true;
                inFrontMatter = true;
                continue;
            } else if (inFrontMatter) {
                // 第二个 ---，结束 front matter
                inFrontMatter = false;
                // 解析 Front Matter
                const frontMatterLines = frontMatterContent.trim().split('\n');
                frontMatterLines.forEach(fmLine => {
                    const match = fmLine.match(/^(\w+):\s*(.+)$/);
                    if (match) {
                        let value = match[2].trim();
                        // 移除可能的引号
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        codelabs.metadata[match[1]] = value;
                    }
                });

                // 从 front matter 中获取标题
                if (codelabs.metadata.title) {
                    codelabs.title = codelabs.metadata.title;
                }
                continue;
            }
        }

        if (inFrontMatter) {
            frontMatterContent += line + '\n';
            continue;
        }

        // 主标题 (# 开头) - 如果 front matter 中没有标题才使用
        if (line.match(/^#\s+/) && !codelabs.title) {
            codelabs.title = line.replace(/^#\s+/, '').trim();
        }

        // 二级标题作为步骤 (## 开头)
        else if (line.match(/^##\s+/)) {
            if (currentStep) {
                codelabs.steps.push(currentStep);
            }

            currentStep = {
                title: line.replace(/^##\s+/, '').trim(),
                content: '',
                duration: 5 // 默认 5 分钟
            };
        }

        // 其他内容添加到当前步骤
        else if (currentStep) {
            currentStep.content += line + '\n';
        }
    }

    // 添加最后一个步骤
    if (currentStep) {
        codelabs.steps.push(currentStep);
    }

    return codelabs;
}

// 生成 Google Codelabs 风格的 HTML
function generateCodelabsHTML (codelabs) {
    const stepsHTML = codelabs.steps.map((step, index) => {
        const stepContent = marked.parse(step.content);

        return `
      <div class="step" data-step="${index + 1}" ${index === 0 ? 'style="display: block;"' : 'style="display: none;"'}>
        <div class="step-header">
          <h2>${step.title}</h2>
          <div class="step-meta">
            <span class="duration">⏱️ ${step.duration} 分钟</span>
            <span class="step-number">步骤 ${index + 1} / ${codelabs.steps.length}</span>
          </div>
        </div>
        <div class="step-content">
          ${stepContent}
        </div>
        <div class="step-navigation">
          ${index > 0 ? '<button class="nav-btn prev-btn" onclick="previousStep()">上一步</button>' : ''}
          ${index < codelabs.steps.length - 1 ? '<button class="nav-btn next-btn" onclick="nextStep()">下一步</button>' : '<button class="nav-btn complete-btn" onclick="completeLab()">完成</button>'}
        </div>
      </div>
    `;
    }).join('');

    const sidebarHTML = codelabs.steps.map((step, index) => {
        return `
      <div class="sidebar-item ${index === 0 ? 'active' : ''}" onclick="goToStep(${index + 1})">
        <div class="step-indicator">${index + 1}</div>
        <div class="step-title">${step.title}</div>
      </div>
    `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${codelabs.title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 300px;
            background: #fff;
            border-right: 1px solid #e0e0e0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }
        
        .sidebar-header {
            padding: 20px;
            background: #1976d2;
            color: white;
        }
        
        .sidebar-header h1 {
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        
        .sidebar-meta {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .sidebar-item {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .sidebar-item:hover {
            background: #f5f5f5;
        }
        
        .sidebar-item.active {
            background: #e3f2fd;
            border-right: 3px solid #1976d2;
        }
        
        .step-indicator {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .sidebar-item.active .step-indicator {
            background: #1976d2;
            color: white;
        }
        
        .step-title {
            flex: 1;
            font-size: 0.95em;
        }
        
        .main-content {
            flex: 1;
            margin-left: 300px;
            padding: 0;
        }
        
        .step {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .step-header {
            background: linear-gradient(135deg, #1976d2, #1565c0);
            color: white;
            padding: 40px;
        }
        
        .step-header h2 {
            font-size: 2em;
            margin-bottom: 15px;
        }
        
        .step-meta {
            display: flex;
            gap: 20px;
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .step-content {
            padding: 40px;
            font-size: 1.1em;
            line-height: 1.8;
        }
        
        .step-content h1, .step-content h2, .step-content h3 {
            margin-top: 30px;
            margin-bottom: 15px;
            color: #1976d2;
        }
        
        .step-content h1 { font-size: 1.8em; }
        .step-content h2 { font-size: 1.5em; }
        .step-content h3 { font-size: 1.3em; }
        
        .step-content p {
            margin-bottom: 15px;
        }
        
        .step-content ul, .step-content ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        .step-content li {
            margin-bottom: 8px;
        }
        
        .step-content pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            overflow-x: auto;
            font-size: 0.95em;
        }
        
        .step-content code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        
        .step-content pre code {
            background: none;
            padding: 0;
        }
        
        .step-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .step-content th, .step-content td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        
        .step-content th {
            background: #f8f9fa;
            font-weight: bold;
        }
        
        .step-content blockquote {
            border-left: 4px solid #1976d2;
            background: #f8f9fa;
            padding: 15px 20px;
            margin: 20px 0;
            font-style: italic;
        }
        
        .step-navigation {
            padding: 30px 40px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            background: #fafafa;
        }
        
        .nav-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .prev-btn {
            background: #fff;
            color: #1976d2;
            border: 2px solid #1976d2;
        }
        
        .prev-btn:hover {
            background: #1976d2;
            color: white;
        }
        
        .next-btn, .complete-btn {
            background: #1976d2;
            color: white;
        }
        
        .next-btn:hover, .complete-btn:hover {
            background: #1565c0;
            transform: translateY(-1px);
        }
        
        .progress-bar {
            position: fixed;
            top: 0;
            left: 300px;
            right: 0;
            height: 4px;
            background: #e0e0e0;
            z-index: 1000;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #1976d2, #42a5f5);
            transition: width 0.3s ease;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s;
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .step-header, .step-content, .step-navigation {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
    </div>
    
    <div class="container">
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1>${codelabs.title}</h1>
                <div class="sidebar-meta">
                    ${codelabs.metadata.date ? `📅 ${codelabs.metadata.date}` : ''}
                    ${codelabs.metadata.categories ? `<br>🏷️ ${codelabs.metadata.categories}` : ''}
                </div>
            </div>
            ${sidebarHTML}
        </div>
        
        <div class="main-content">
            ${stepsHTML}
        </div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
        let currentStep = 1;
        const totalSteps = ${codelabs.steps.length};
        
        function updateProgress() {
            const progress = (currentStep / totalSteps) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
        }
        
        function showStep(stepNumber) {
            // 隐藏所有步骤
            document.querySelectorAll('.step').forEach(step => {
                step.style.display = 'none';
            });
            
            // 显示当前步骤
            const targetStep = document.querySelector('[data-step="' + stepNumber + '"]');
            if (targetStep) {
                targetStep.style.display = 'block';
                window.scrollTo(0, 0);
            }
            
            // 更新侧边栏
            document.querySelectorAll('.sidebar-item').forEach((item, index) => {
                item.classList.toggle('active', index === stepNumber - 1);
            });
            
            currentStep = stepNumber;
            updateProgress();
        }
        
        function nextStep() {
            if (currentStep < totalSteps) {
                showStep(currentStep + 1);
            }
        }
        
        function previousStep() {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        }
        
        function goToStep(stepNumber) {
            showStep(stepNumber);
        }
        
        function completeLab() {
            alert('🎉 恭喜完成所有步骤！');
        }
        
        // 初始化
        updateProgress();
        hljs.highlightAll();
        
        // 键盘导航
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                e.preventDefault();
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousStep();
            }
        });
    </script>
</body>
</html>
  `;
}

// 主路由 - 显示输入表单
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown to Codelabs Converter</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1976d2;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input[type="url"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="url"]:focus {
            outline: none;
            border-color: #1976d2;
        }
        button {
            width: 100%;
            padding: 15px;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover {
            background: #1565c0;
        }
        .example {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
        }
        .example strong {
            color: #1976d2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Markdown to Codelabs</h1>
        <form action="/convert" method="POST">
            <div class="form-group">
                <label for="url">Markdown 文件 URL:</label>
                <input type="url" id="url" name="url" placeholder="https://raw.githubusercontent.com/..." required>
            </div>
            <button type="submit">🚀 转换为 Codelabs</button>
        </form>
        
        <div class="example">
            <strong>示例 URL:</strong><br>
            https://raw.githubusercontent.com/phyuany/algs.tech/refs/heads/main/_posts/2025-07-01-database_install-postgresql-on-debian-using-apt.md
        </div>
    </div>
</body>
</html>
  `);
});

// 转换路由
app.post('/convert', async (req, res) => {
    try {
        const { url } = req.body;
        const requiredPrefix = 'https://raw.githubusercontent.com/phyuany/algs.tech/refs/heads/main/_posts/';

        if (!url) {
            return res.status(400).send('请提供 Markdown 文件 URL');
        }

        if (!url.startsWith(requiredPrefix)) {
            return res.status(400).send(`URL必须以${requiredPrefix}开头`);
        }

        // 首先检查数据库缓存
        const cached = await getFromDatabase(url);
        if (cached) {
            console.log('从缓存获取内容:', cached.title);
            // 更新访问时间
            db.run(`UPDATE codelabs SET accessed_at = CURRENT_TIMESTAMP WHERE original_url = ?`, [url]);

            // 重定向到转换后的URL
            return res.redirect(`/view/${cached.converted_id}`);
        }

        console.log('缓存中未找到，开始获取和转换...');

        // 获取 Markdown 内容
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MarkdownCodelabsConverter/1.0)'
            }
        });

        const markdownContent = response.data;

        // 解析为 Codelabs 结构
        const codelabs = parseMarkdownToCodelabs(markdownContent);

        if (codelabs.steps.length === 0) {
            return res.status(400).send('未找到有效的步骤内容（需要 ## 标题）');
        }

        // 生成 HTML
        const html = generateCodelabsHTML(codelabs);

        // 生成唯一ID并存储到数据库
        const convertedId = generateConvertedId(url);
        await storeToDatabase(url, convertedId, codelabs.title, html);

        console.log('内容已缓存:', codelabs.title, 'ID:', convertedId);

        // 重定向到转换后的URL
        res.redirect(`/view/${convertedId}`);

    } catch (error) {
        console.error('转换错误:', error);

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            res.status(400).send('无法访问提供的 URL，请检查网址是否正确');
        } else if (error.response && error.response.status === 404) {
            res.status(404).send('找不到指定的 Markdown 文件');
        } else {
            res.status(500).send('转换过程中出现错误: ' + error.message);
        }
    }
});

// 查看转换后的内容
app.get('/view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const content = await getByConvertedId(id);

        if (!content) {
            return res.status(404).send(`
        <div style="text-align: center; padding: 50px; font-family: Arial;">
          <h2>❌ 内容未找到</h2>
          <p>转换ID "${id}" 对应的内容不存在或已过期</p>
          <a href="/" style="color: #1976d2;">返回首页</a>
        </div>
      `);
        }

        res.send(content.content);

    } catch (error) {
        console.error('获取内容错误:', error);
        res.status(500).send('获取内容时出现错误: ' + error.message);
    }
});

// 管理界面 - 查看所有转换记录
app.get('/views', (req, res) => {
    db.all(`SELECT * FROM codelabs ORDER BY created_at DESC LIMIT 50`, (err, rows) => {
        if (err) {
            return res.status(500).send('数据库错误: ' + err.message);
        }

        const tableRows = rows.map(row => `
      <tr>
        <td><a href="/view/${row.converted_id}" target="_blank">${row.title}</a></td>
        <td><a href="${row.original_url}" target="_blank">${row.original_url.substring(0, 50)}...</a></td>
        <td><code>${row.converted_id}</code></td>
        <td>${new Date(row.created_at).toLocaleString()}</td>
        <td>${new Date(row.accessed_at).toLocaleString()}</td>
      </tr>
    `).join('');

        res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理界面 - Codelabs Converter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        a { color: #1976d2; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { display: flex; justify-content: space-between; align-items: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Codelabs 转换记录</h1>
        <a href="/">← 返回首页</a>
    </div>
    
    <p>共有 <strong>${rows.length}</strong> 条转换记录</p>
    
    <table>
        <thead>
            <tr>
                <th>标题</th>
                <th>原始URL</th>
                <th>转换ID</th>
                <th>创建时间</th>
                <th>最后访问</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
</body>
</html>
    `);
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log('💡 请在浏览器中打开上述地址开始使用');
    console.log('🔧 管理界面: http://localhost:' + PORT + '/views');
});

// 优雅关闭数据库连接
process.on('SIGINT', () => {
    console.log('\n正在关闭数据库连接...');
    db.close((err) => {
        if (err) {
            console.error('关闭数据库时出错:', err.message);
        } else {
            console.log('数据库连接已关闭');
        }
        process.exit(0);
    });
});

module.exports = app;
