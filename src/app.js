const express = require('express');
const path = require('path');
const db = require('./models/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 使用路由
app.use('/', routes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send('服务器内部错误');
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log('💡 请在浏览器中打开上述地址开始使用');
    console.log('🔧 管理界面: http://localhost:' + PORT + '/views');
});

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    try {
        await db.close();
        server.close(() => {
            console.log('服务器已关闭');
            process.exit(0);
        });
    } catch (err) {
        console.error('关闭过程中出错:', err);
        process.exit(1);
    }
});

module.exports = app;
