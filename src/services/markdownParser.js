const marked = require('marked');
const hljs = require('highlight.js');

// 配置 marked 选项
marked.setOptions({
    highlight: function (code, lang) {
        if (lang) {
            try {
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

/**
 * 解析 Markdown 内容为结构化数据
 * @param {string} markdownContent - 原始Markdown内容
 * @returns {Object} 解析后的Codelabs结构
 */
function parseMarkdownToCodelabs(markdownContent) {
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
                frontMatterStarted = true;
                inFrontMatter = true;
                continue;
            } else if (inFrontMatter) {
                inFrontMatter = false;
                // 解析 Front Matter
                const frontMatterLines = frontMatterContent.trim().split('\n');
                frontMatterLines.forEach(fmLine => {
                    const match = fmLine.match(/^(\w+):\s*(.+)$/);
                    if (match) {
                        let value = match[2].trim();
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        codelabs.metadata[match[1]] = value;
                    }
                });

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

module.exports = {
    parseMarkdownToCodelabs,
    marked
};
