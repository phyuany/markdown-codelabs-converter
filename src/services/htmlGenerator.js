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

        /* 移动端菜单按钮 */
        .mobile-menu-btn {
            display: none;
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 18px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            transform: scale(1);
        }

        .mobile-menu-btn:hover {
            background: #1565c0;
        }

        /* 侧边栏打开时按钮变为关闭按钮 */
        .mobile-menu-btn.close {
            left: 270px; /* 移动到侧边栏右侧 */
            background: #f44336; /* 红色背景表示关闭 */
            transform: rotate(90deg); /* 旋转动画 */
        }

        .mobile-menu-btn.close:hover {
            background: #d32f2f;
        }

        /* 移动端遮罩层 */
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        }

        @media (max-width: 768px) {
            .mobile-menu-btn {
                display: block;
            }
            
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s;
                z-index: 1000;
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .sidebar-overlay.show {
                display: block;
            }
            
            .main-content {
                margin-left: 0;
                width: 100%;
            }
            
            .step {
                width: 100%;
                max-width: 100%;
            }
            
            .step-header, .step-content, .step-navigation {
                padding: 20px 15px;
            }
            
            .step-content {
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .step-content pre {
                overflow-x: auto;
                max-width: 100%;
            }
            
            .step-content table {
                font-size: 0.9em;
                overflow-x: auto;
                display: block;
                white-space: nowrap;
            }
            
            .progress-bar {
                left: 0;
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

        /* 图片放大模态框 */
        .image-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 2000;
            cursor: zoom-out;
        }

        .image-modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-image {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            transition: transform 0.2s ease;
            cursor: grab;
        }

        .modal-image:active {
            cursor: grabbing;
        }

        .modal-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            z-index: 2001;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .modal-close:hover {
            background: rgba(0, 0, 0, 0.8);
        }

        /* 移动端优化 */
        @media (max-width: 768px) {
            .modal-close {
                top: 10px;
                right: 15px;
                font-size: 30px;
                width: 50px;
                height: 50px;
            }
        }
    </style>
</head>
<body>
    <button class="mobile-menu-btn" id="mobileMenuBtn" onclick="toggleSidebar()">
        <span id="menuIcon">☰</span>
    </button>
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
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
    <!-- 图片放大模态框 -->
    <div class="image-modal" id="imageModal">
        <span class="modal-close" id="modalClose">&times;</span>
        <img class="modal-image" id="modalImage" src="" alt="">
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

        // 移动端侧边栏控制
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const menuBtn = document.getElementById('mobileMenuBtn');
            const menuIcon = document.getElementById('menuIcon');
            
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                closeSidebar();
            } else {
                // 打开侧边栏
                sidebar.classList.add('open');
                overlay.classList.add('show');
                
                // 按钮变为关闭状态
                menuBtn.classList.add('close');
                menuIcon.textContent = '✕';
            }
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const menuBtn = document.getElementById('mobileMenuBtn');
            const menuIcon = document.getElementById('menuIcon');
            
            // 关闭侧边栏
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            
            // 按钮恢复为菜单状态
            menuBtn.classList.remove('close');
            menuIcon.textContent = '☰';
        }

        // 点击侧边栏项目后自动关闭（移动端）
        function goToStep(stepNumber) {
            showStep(stepNumber);
            // 移动端自动关闭侧边栏
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        }

        // 点击侧边栏项目后自动关闭（移动端）
        function goToStep(stepNumber) {
            showStep(stepNumber);
            // 移动端自动关闭侧边栏
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        }

        // 图片放大功能
        class ImageModal {
            constructor() {
                this.modal = document.getElementById('imageModal');
                this.modalImage = document.getElementById('modalImage');
                this.closeBtn = document.getElementById('modalClose');
                this.scale = 1;
                this.isDragging = false;
                this.startX = 0;
                this.startY = 0;
                this.translateX = 0;
                this.translateY = 0;
                
                this.init();
            }
            
            init() {
                // 点击关闭
                this.closeBtn.addEventListener('click', () => this.close());
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.close();
                });
                
                // ESC键关闭
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                        this.close();
                    }
                });
                
                // PC端鼠标滚轮缩放
                this.modalImage.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    this.scale *= delta;
                    this.scale = Math.max(0.5, Math.min(5, this.scale));
                    this.updateTransform();
                });
                
                // 拖拽功能
                this.modalImage.addEventListener('mousedown', (e) => this.startDrag(e));
                document.addEventListener('mousemove', (e) => this.drag(e));
                document.addEventListener('mouseup', () => this.endDrag());
                
                // 移动端触摸事件
                this.modalImage.addEventListener('touchstart', (e) => this.handleTouchStart(e));
                this.modalImage.addEventListener('touchmove', (e) => this.handleTouchMove(e));
                this.modalImage.addEventListener('touchend', (e) => this.handleTouchEnd(e));
                
                // 双击重置
                this.modalImage.addEventListener('dblclick', () => this.reset());
                
                // 为所有图片添加点击事件
                this.addClickListeners();
            }
            
            addClickListeners() {
                // 使用事件委托，监听动态添加的图片
                document.addEventListener('click', (e) => {
                    if (e.target.tagName === 'IMG' && e.target.closest('.step-content')) {
                        this.open(e.target.src, e.target.alt);
                    }
                });
            }
            
            open(src, alt) {
                this.modalImage.src = src;
                this.modalImage.alt = alt;
                this.modal.classList.add('show');
                this.reset();
                document.body.style.overflow = 'hidden';
            }
            
            close() {
                this.modal.classList.remove('show');
                document.body.style.overflow = '';
                this.reset();
            }
            
            reset() {
                this.scale = 1;
                this.translateX = 0;
                this.translateY = 0;
                this.updateTransform();
            }
            
            updateTransform() {
                const x = this.translateX || 0;
                const y = this.translateY || 0;
                const s = this.scale || 1;
                
                const transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + s + ')';
                this.modalImage.style.transform = transform;
            }
            
            // 鼠标拖拽
            startDrag(e) {
                this.isDragging = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
            }
            
            drag(e) {
                if (!this.isDragging) return;
                e.preventDefault();
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                this.updateTransform();
            }
            
            endDrag() {
                this.isDragging = false;
            }
            
            // 移动端触摸处理
            handleTouchStart(e) {
                this.touches = e.touches;
                if (e.touches.length === 1) {
                    // 单指拖拽
                    this.startDrag({
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY
                    });
                } else if (e.touches.length === 2) {
                    // 双指缩放
                    this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
                    this.initialScale = this.scale;
                }
            }
            
            handleTouchMove(e) {
                e.preventDefault();
                
                if (e.touches.length === 1 && this.isDragging) {
                    // 单指拖拽
                    this.drag({
                        preventDefault: () => {},
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY
                    });
                } else if (e.touches.length === 2) {
                    // 双指缩放
                    const distance = this.getDistance(e.touches[0], e.touches[1]);
                    const scaleChange = distance / this.initialDistance;
                    this.scale = this.initialScale * scaleChange;
                    this.scale = Math.max(0.5, Math.min(5, this.scale));
                    this.updateTransform();
                }
            }
            
            handleTouchEnd(e) {
                if (e.touches.length === 0) {
                    this.endDrag();
                }
            }
            
            getDistance(touch1, touch2) {
                const dx = touch1.clientX - touch2.clientX;
                const dy = touch1.clientY - touch2.clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }
        }

        // 初始化图片模态框
        const imageModal = new ImageModal();
        
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
