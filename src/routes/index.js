const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { parseMarkdownToCodelabs } = require('../services/markdownParser');
const { generateCodelabsHTML } = require('../services/htmlGenerator');
const { generateConvertedId } = require('../utils/helpers');
const axios = require('axios');

/**
 * 转换逻辑函数
 * @param {string} url - Markdown文件URL
 * @param {Object} res - Express响应对象
 */
async function convertMarkdown(url, res) {
    try {
        const requiredPrefix = 'https://raw.githubusercontent.com/phyuany/algs.tech/refs/heads/main/_posts/';

        if (!url) {
            return res.status(400).send('请提供 Markdown 文件 URL');
        }

        if (!url.startsWith(requiredPrefix)) {
            return res.status(400).send(`URL必须以${requiredPrefix}开头`);
        }

        // 首先检查数据库缓存
        const cached = await db.getFromDatabase(url);
        if (cached) {
            console.log('从缓存获取内容:', cached.title);
            // 更新访问时间
            await db.getByConvertedId(cached.converted_id);

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
        await db.storeToDatabase(url, convertedId, codelabs.title, html);

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
}

// 主路由 - 显示输入表单和直接转换链接
router.get('/', (req, res) => {
    const { url } = req.query;
    
    // 如果有URL参数，直接跳转到转换
    if (url) {
        return res.redirect(`/convert?url=${encodeURIComponent(url)}`);
    }
    
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

// POST 转换路由
router.post('/convert', async (req, res) => {
    const { url } = req.body;
    await convertMarkdown(url, res);
});

// GET 转换路由
router.get('/convert', async (req, res) => {
    const { url } = req.query;
    await convertMarkdown(url, res);
});

// 查看转换后的内容
router.get('/view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const content = await db.getByConvertedId(id);

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
router.get('/views', (req, res) => {
    db.getAllRecords().then(rows => {
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
    }).catch(err => {
        res.status(500).send('数据库错误: ' + err.message);
    });
});

module.exports = router;
