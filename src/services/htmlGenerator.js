const { marked } = require('./markdownParser');

/**
 * 生成 Google Codelabs 风格的 HTML
 * @param {Object} codelabs - 解析后的Codelabs结构
 * @returns {string} 生成的HTML内容
 */
function generateCodelabsHTML(codelabs) {
    const stepsHTML = codelabs.steps.map((step, index) => {
        let stepContent = marked.parse(step.content);
        
        // 替换图片路径 + 添加简易Lightbox
        stepContent = stepContent.replace(
            /<img src="(\.\.\/img\/|\/img\/|.*?img\/)/g,
            '<img src="https://algs.tech/img/'
        );

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

        /* 确保图片不会溢出容器，并保持响应式 */
        .step-content img {
            max-width: 100%;  /* 限制图片最大宽度不超过父容器 */
            height: auto;     /* 高度自适应，保持宽高比 */
            display: block;   /* 避免图片下方出现间隙（inline 元素的默认行为） */
            margin: 15px auto; /* 上下边距 15px，水平居中 */
            border-radius: 6px; /* 可选：圆角效果 */
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 可选：轻微阴影 */
        }

        /* 针对大图的额外约束（避免过高的图片占用太多空间） */
        .step-content img[src*="img/"] {
            max-height: 400px; /* 限制最大高度 */
            object-fit: contain; /* 保持比例，完整显示图片 */
        }

        /* 移动端适配 */
        @media (max-width: 768px) {
            .step-content img {
                margin: 10px auto; /* 移动端减少边距 */
            }
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

module.exports = {
    generateCodelabsHTML
};
