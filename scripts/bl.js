const fs = require('fs');
const path = require('path');
const http = require('http');
const inquirer = require('inquirer');
const moment = require('moment');
const matter = require('front-matter');
const { convertMarkdownToHtml, countWords } = require('./convertMarkdown');

const POSTS_DIR = path.join(__dirname, '../posts/articles');
const TEMPLATE_PATH = path.join(__dirname, '../posts/template.md');
const CATEGORIES_PATH = path.join(__dirname, '../posts/categories.md');
const OUTPUT_DIR = path.join(__dirname, '..');

// 读取分类
function getCategories() {
    const content = fs.readFileSync(CATEGORIES_PATH, 'utf-8');
    return content
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.replace('- ', '').trim());
}

// 创建新博客
async function createNewPost() {
    const categories = getCategories();
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: '请输入博客标题：'
        },
        {
            type: 'list',
            name: 'category',
            message: '请选择博客分类：',
            choices: categories
        },
        {
            type: 'input',
            name: 'topImage',
            message: '请输入封面图片URL（可选）：'
        },
        {
            type: 'number',
            name: 'priority',
            message: '请输入优先级（1为普通，大于1为置顶）：',
            default: 1
        }
    ]);

     const date = moment().format('YYYY-MM-DD');
    //const date = moment().format('YYYY-MM-DD HH:mm:ss');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    
    const content = template
        .replace('${title}', answers.title)
        .replace(/\${date}/g, date)
        .replace('${category}', answers.category)
        .replace('${wordCount}', '0')
        .replace('topImage: ""', `topImage: "${answers.topImage || ''}"`);

    const fileName = `${date}-${answers.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    //const fileName = `${date.replace(/\s+/g, '_')}-${answers.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filePath = path.join(POSTS_DIR, fileName);
    
    fs.writeFileSync(filePath, content);
    console.log(`博客创建成功：${filePath}`);
}

// 生成文章列表
function generateArticleList() {
    const files = fs.readdirSync(POSTS_DIR);
    const articles = files
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
            const { attributes } = matter(content);

            // 如果没有 updated 字段，则默认为与 date 相同
            const updated = attributes.updated || attributes.date;
            return {
                title: attributes.title,
                date: attributes.date,
                updated: updated,
                category: attributes.category,
                priority: attributes.priority || 1,
                topImage: attributes.topImage || '/default-cover.jpg',
                fileName: file
            };
        })
        .sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            return new Date(b.date) - new Date(a.date);
        });

    return articles;
}

// 生成预览HTML
function generatePreviewHtml() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(path.join(OUTPUT_DIR, 'articles'))) {
        fs.mkdirSync(path.join(OUTPUT_DIR, 'articles'), { recursive: true });
    }

    const articles = generateArticleList();
    const articleListHtml = `
    <div class="layout-container">
        <div class="article-list">
            ${articles.map(article => {
                const daysAgo = moment().diff(moment(article.date), 'days'); // 计算天数差
                const daysAgoText = daysAgo === 0 ? '今天' : `${daysAgo}天前`; // 格式化显示内容
            
                return `
                    <div class="article-item">
                        <div class="article-cover">
                            <img src="${article.topImage}" alt="文章封面">
                        </div>
                        <div class="article-content">
                            <div class="article-header">
                                ${article.priority > 1 ? '<span class="top-tag">置顶</span>' : ''}
                                <h2 class="article-title">
                                    <a href="/articles/${encodeURIComponent(article.fileName.replace('.md', '.html'))}">${article.title}</a>
                                </h2>
                            </div>
                            <div class="article-meta">
                                <!--<span class="meta-item">
                                    <i class="icon-calendar"></i>
                                    创建于${moment(article.date).format('YYYY-MM-DD')}
                                </span>
                                <span class="meta-item">
                                    <i class="icon-refresh"></i>
                                    更新于 ${moment(article.updated).format('YYYY-MM-DD')}
                                </span>-->
                                <span class="meta-item">
                                    <i class="icon-tag"></i>
                                    ${article.category}
                                </span>
                            </div>
                            <div class="article-footer">
                                <span class="meta-item">
                                    <i class="icon-clock"></i>
                                    发布于 ${daysAgoText}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    </div>
`;

    

    const indexHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <!--设置 viewport 属性来实现响应式设计并禁用缩放操作-->
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>简约博客</title>
            <link rel="icon" href="https://images-r2.banlanzs.tech/file/1735481524438_banlan1.jpg" type="image/jpeg"> <!-- 使用外部图片 -->
             <!-- 引入 Font Awesome 图标库 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root {
                    --custom-bg-image: none;  /* 在这里设置自定义背景图片，例如: url('/path/to/image.jpg') */
                }
                
                body { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px;
                    background: #1a1a1a;
                    color: #e0e0e0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    min-height: 100vh;
                    position: relative;
                }

                /* 背景纹理 */
                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: 
                        var(--custom-bg-image),
                        linear-gradient(to bottom, #1a1a1a 0%, #2a2a2a 100%),
                        repeating-linear-gradient(45deg, #222 0, #222 1px, transparent 0, transparent 50%);
                    background-blend-mode: overlay;
                    background-size: cover, 100% 100%, 30px 30px;
                    opacity: 0.8;
                    z-index: -1;
                }

                .article-item {
                    display: flex;
                    margin-bottom: 20px;
                    background: rgba(40, 40, 40, 0.9);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: transform 0.2s;
                    backdrop-filter: blur(5px);
                }

                .layout-container {
    display: flex;               /* 使用 flex 布局 */
    flex-direction: row;         /* 横向排列 */
    gap: 20px;                   /* 左右区域的间距 */
    max-width: 1200px;           /* 页面内容的最大宽度 */
    margin: 0 auto;              /* 居中显示 */
    padding: 20px;               /* 外边距 */
}

.article-list {
    flex: 2;                     /* 左侧占 2/3 宽度 */
    display: flex;
    flex-direction: column;
    gap: 20px;                   /* 每个文章间的间距 */
}

.sidebar {
    flex: 1;                     /* 右侧占 1/3 宽度 */
    background-color: #f8f8f8;   /* 背景颜色 */
    padding: 20px;               /* 内边距 */
    border-radius: 8px;          /* 圆角 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 阴影效果 */
}

.article-item {
    display: flex;
    flex-direction: row;
    gap: 15px;                   /* 每篇文章内部封面和内容的间距 */
    background-color: #fff;      /* 背景颜色 */
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* 阴影 */
}

.article-cover img {
    max-width: 120px;            /* 图片最大宽度 */
    border-radius: 6px;          /* 图片圆角 */
}

.article-content {
    flex: 1;
}

.sidebar h3 {
    margin-bottom: 10px;
    color: #333;
    font-weight: bold;
}

.sidebar ul {
    list-style: none;            /* 去掉列表符号 */
    padding: 0;
}

.sidebar ul li a {
    text-decoration: none;       /* 去掉下划线 */
    color: #007bff;
    transition: color 0.3s;
}

.sidebar ul li a:hover {
    color: #0056b3;              /* 悬停时颜色 */
}

                body { 
    max-width: 100%; /* 改为适配屏幕宽度 */
    margin: 0 auto; 
    padding: 20px; 
    box-sizing: border-box; /* 包括 padding 和 border */
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    min-height: 100vh;
    position: relative;
}

/* 使用 flexbox 和百分比宽度适配布局 */
.article-item {
    display: flex;
    flex-direction: column; /* 默认单列布局，适合小屏幕 */
    margin-bottom: 20px;
    background: rgba(40, 40, 40, 0.9);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.2s;
    backdrop-filter: blur(5px);
}

/* 针对较大屏幕进行优化 */
@media (min-width: 768px) {
    .article-item {
        flex-direction: row; /* 改为两列布局 */
    }
    .article-cover {
        width: 75%; /* 左侧图片区域占比 */
        height: 80%; /* 保持自适应 */
    }
    .article-content {
        flex: 1;
        padding: 15px;
    }
}

/* 调整标题与内容 */
.article-title {
    font-size: 1em; /* 默认字体大小 */
}

@media (min-width: 768px) {
    .article-title {
        font-size: 1.2em; /* 增大标题字体 */
    }
}

/* 图片样式优化 */
.article-cover img {
    width: 100%;
    height: auto;
    object-fit: cover;
}

/* 适配小屏按钮样式 */
.back-to-list {
    top: 10px; /* 更贴近顶部 */
    left: 10px;
    width: 35px; /* 缩小尺寸 */
    height: 35px;
}

/* 调整代码块布局 */
.code-block-wrapper pre {
    padding: 10px; /* 减少边距 */
}

@media (min-width: 768px) {
    .code-block-wrapper pre {
        padding: 15px; /* 保持桌面版适配 */
    }
}


                .article-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                }

                .article-cover {
                    width: 300px;
                    height: auto;
                    overflow: hidden;
                }

                .article-cover img {
                    width: 100%;
                    height: auto;
                    object-fit: cover;
                }

                .article-content {
                    flex: 1;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                }

                .article-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .top-tag {
                    background: #ff4d4f;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                }

                .article-title {
                    margin: 0;
                    font-size: 1.2em;
                }

                .article-title a {
                    color: #e0e0e0;
                    text-decoration: none;
                }

                .article-title a:hover {
                    color: #1890ff;
                }

                .article-meta {
                    margin-top: 10px;
                    color: #888;
                    font-size: 0.9em;
                }

                .meta-item {
                    margin-right: 15px;
                }

                .meta-item i {
                    margin-right: 5px;
                }

                h1 {
                    color: #fff;
                    border-bottom: 2px solid #1890ff;
                    padding-bottom: 10px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }

                /* 返回顶部按钮样式 */
.back-to-top {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #1890ff;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    text-align: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s, transform 0.2s;
    z-index: 1000;
    display: none; /* 默认隐藏 */
}

.back-to-top:hover {
    background-color: #0056b3;
    transform: scale(1.1);
}

.back-to-top:active {
    transform: scale(1);
}

                /* 导航栏样式 */
nav {
    position: fixed; /* 固定位置 */
    top: 20px;
    right: 20px;
    display: flex;
    gap: 10px;
    z-index: 1000; /* 确保导航栏在最上层 */
}

nav a {
    color: #e0e0e0;
    text-decoration: none;
    font-size: 0.9em;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    transition: background 0.3s, color 0.3s;
    display: flex;
    align-items: center;
    gap: 5px;
}

nav a:hover {
    background: #1890ff;
    color: #fff;
    border-color: #1890ff;
}

/* 图标样式 */
nav a i {
    font-size: 1.2em;
}
            </style>
        </head>
        <body>
        <!-- 导航栏 -->
<nav>
    <a href="https://github.com/banlanzs" target="_blank">
        <i class="fab fa-github"></i> GitHub
    </a>
    <a href="https://hexo.banlan.nyc.mn" target="_blank">
        <i class="fas fa-blog"></i> 博客
    </a>
</nav>

<!-- 返回顶部按钮 -->
<a href="#" class="back-to-top" title="返回顶部">↑</a>
<script>
    // 获取返回顶部按钮
    const backToTopButton = document.querySelector('.back-to-top');
    // 当页面加载时默认隐藏按钮
    backToTopButton.style.display = 'none';

    // 当用户滚动一定距离后显示返回顶部按钮
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    // 点击返回顶部按钮时，平滑滚动到页面顶部
    backToTopButton.addEventListener('click', (e) => {
        e.preventDefault();  // 阻止默认行为
        window.scrollTo({
            top: 0,
            behavior: 'smooth'  // 平滑滚动
        });
    });
</script>


            <h1>文章列表</h1>
            ${articleListHtml}
        </body>
        </html>
    `;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);

    articles.forEach(article => {
        const mdContent = fs.readFileSync(path.join(POSTS_DIR, article.fileName), 'utf-8');
        const { metadata, content } = convertMarkdownToHtml(mdContent);
        
        const articleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <!--设置 viewport 属性来实现响应式设计并禁用缩放操作-->
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>${metadata.title}</title>
                <style>
                    :root {
                        --custom-bg-image: none;  /* 在这里设置自定义背景图片，例如: url('/path/to/image.jpg') */
                    }
                    
                    body { 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        position: relative;
                        background: #1a1a1a;
                        color: #e0e0e0;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        min-height: 100vh;
                    }

                    /* 背景纹理 */
                    body::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: 
                            var(--custom-bg-image),
                            linear-gradient(to bottom, #1a1a1a 0%, #2a2a2a 100%),
                            repeating-linear-gradient(45deg, #222 0, #222 1px, transparent 0, transparent 50%);
                        background-blend-mode: overlay;
                        background-size: cover, 100% 100%, 30px 30px;
                        opacity: 0.8;
                        z-index: -1;
                    }

                    .article-meta { 
                        color: #888; 
                        margin-bottom: 20px; 
                    }

                    /* 其他样式保持不变... */
                    .back-to-list {
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        width: 40px;
                        height: 40px;
                        background: #fff;
                        border: 1px solid #ddd;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.3s;
                        text-decoration: none;
                    }
                    
                    .back-to-list:hover {
                        background: #f5f5f5;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                    
                    .back-to-list::before {
                        content: "←";
                        color: #666;
                        font-size: 20px;
                        font-weight: bold;
                    }

                    /* 图片样式 */
                    .article-content img {
                        max-width: 100%;  /* 与正文等宽 */
                        height: auto;    /* 保持图片比例 */
                        display: block;  /* 块级显示 */
                        margin: 1em 0;   /* 上下间距1em */
                        cursor: pointer; /* 鼠标变为手型 */
                    }
                    
                    /* 图片预览遮罩层 */
                    .image-preview-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.9);
                        z-index: 1000;
                        cursor: zoom-out;
                    }
                    
                    /* 预览图片样式 */
                    .image-preview-overlay img {
                        max-width: 90%;
                        max-height: 90vh;
                        margin: auto;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        border: 2px solid #fff;
                        box-shadow: 0 0 20px rgba(0,0,0,0.5);
                    }
                    
                    /* 代码块容器样式 */
                    .code-block-wrapper {
                        position: relative;
                        background: #1e1e1e;  /* VS Code 暗色主题背景色 */
                        border-radius: 6px;
                        margin: 1em 0;
                    }

                    /* 代码块头部样式 */
                    .code-block-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 15px;
                        background: #323232;
                        border-top-left-radius: 6px;
                        border-top-right-radius: 6px;
                        color: #fff;
                        font-family: monospace;
                    }

                    /* 代码块内容样式 */
                    .code-block-wrapper pre {
                        margin: 0;
                        padding: 15px;
                        overflow-x: auto;
                        background: transparent;
                    }

                    .code-block-wrapper pre code {
                        color: #d4d4d4;  /* VS Code 默认文本颜色 */
                        font-family: monospace;
                    }

                    /* 复制按钮样式 */
                    .copy-button {
                        background: transparent;
                        border: 1px solid #ffffff40;
                        color: #fff;
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    }

                    .copy-button:hover {
                        background: #ffffff20;
                    }

                    .copy-button.copied {
                        background: #28a745;
                        border-color: #28a745;
                    }
                    /* 手机屏幕适配 */
@media (max-width: 768px) {
    body {
        padding: 10px;
    }

    .article-content {
        font-size: 0.9em; /* 缩小字体 */
    }

    .article-content img {
        margin: 0.5em 0; /* 缩小图片间距 */
    }

    .code-block-wrapper pre {
        padding: 5px; /* 缩小代码块内边距 */
    }

    .back-to-list {
        width: 30px; /* 缩小返回按钮 */
        height: 30px;
        top: 10px;
        left: 10px;
    }
    .layout-container {
        flex-direction: column; /* 改为单列布局 */
    }

    .sidebar {
        order: -1; /* 将右侧区域移动到上方 */
        margin-bottom: 20px; /* 增加间距 */
    }
}

/* 响应式视频容器 */
.video-container {
    position: relative;
    width: 100% !important; /* 强制使用100%宽度 */
    max-width: 100% !important; /* 确保不会超出父容器 */
    padding-bottom: 56.25%; /* 16:9 宽高比 */
    margin: 2em auto; /* 上下间距并居中 */
    overflow: hidden;
    box-sizing: border-box; /* 确保padding计算在宽度内 */
}

/* 响应式视频容器 */
.video-container {
    position: relative;
    width: 100% !important; /* 强制使用100%宽度 */
    max-width: 100% !important; /* 确保不会超出父容器 */
    padding-bottom: 56.25%; /* 16:9 宽高比 */
    margin: 2em auto; /* 上下间距并居中 */
    overflow: hidden !important;
    box-sizing: border-box !important; /* 确保padding计算在宽度内 */
}

/* 嵌入视频样式 */
.video-container iframe,
.video-container embed,
.video-container object {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 120% !important;
    border: none;
}

/* 确保文章内容中的所有iframe都被正确约束 */
.article-content iframe {
    max-width: 100%;
    width: 100%;
    margin: 1em 0;
}

/* 移动端特定样式 */
@media (max-width: 768px) {
    .video-container {
        width: 100vw !important;
        left: 50%;
        transform: translateX(-50%);
        margin-left: -10px; /* 抵消父元素的padding */
        margin-right: -10px;
        max-width: 100vw !important;
    }
    
    .article-content {
        overflow-x: hidden !important; /* 防止水平滚动 */
        width: 100% !important;
    }
    
    body {
        overflow-x: hidden !important; /* 防止body层级的水平滚动 */
        width: 100% !important;
    }
}

/* 返回顶部按钮样式 */
.back-to-top {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #1890ff;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    text-align: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s, transform 0.2s;
    z-index: 1000;
    display: none; /* 默认隐藏 */
}

.back-to-top:hover {
    background-color: #0056b3;
    transform: scale(1.1);
}

.back-to-top:active {
    transform: scale(1);
}

                </style>
            </head>
            <body>
                <a href="../index.html" class="back-to-list" title="返回文章列表"></a>
                <h1>${metadata.title}</h1>
                <div class="article-meta">
                    <!--<div>发布日期：${metadata.date}</div>-->
                    <!--<div>更新日期：${metadata.updated}</div>-->
                    <!--上面的自动给我加了8:00的时分秒，虽然想改，但是不会，自己改了之后导致创建博客失败，就算了，只显示年月日了-->
                    <div>发布日期：${moment(metadata.date).format('YYYY-MM-DD')}</div>
                    <div>更新日期：${moment(metadata.updated).format('YYYY-MM-DD')}</div>

                    <div>分类：${metadata.category}</div>
                    <div>字数：${metadata.wordCount}</div>
                </div>
                <div class="article-content">
                    ${content}
                </div>
                
                <!-- 添加图片预览遮罩层 -->
                <div class="image-preview-overlay">
                    <img src="" alt="预览图片">
                </div>

                <!-- 返回顶部按钮 -->
<a href="#" class="back-to-top" title="返回顶部">↑</a>
<script>
    // 获取返回顶部按钮
    const backToTopButton = document.querySelector('.back-to-top');
    // 当页面加载时默认隐藏按钮
    backToTopButton.style.display = 'none';

    // 当用户滚动一定距离后显示返回顶部按钮
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    // 点击返回顶部按钮时，平滑滚动到页面顶部
    backToTopButton.addEventListener('click', (e) => {
        e.preventDefault();  // 阻止默认行为
        window.scrollTo({
            top: 0,
            behavior: 'smooth'  // 平滑滚动
        });
    });
</script>

                <script>
                // 处理代码块
                document.querySelectorAll('pre').forEach((block, index) => {
                    // 获取代码语言（如果有的话）
                    const code = block.querySelector('code');
                    const language = code ? code.className.replace('language-', '') : 'plaintext';
                    
                    // 创建包装容器
                    const wrapper = document.createElement('div');
                    wrapper.className = 'code-block-wrapper';
                    
                    // 创建头部
                    const header = document.createElement('div');
                    header.className = 'code-block-header';
                    
                    // 添加语言标签
                    const langLabel = document.createElement('span');
                    langLabel.textContent = language.toUpperCase();
                    header.appendChild(langLabel);
                    
                    // 创建复制按钮
                    const button = document.createElement('button');
                    button.className = 'copy-button';
                    button.textContent = '复制';
                    
                    // 添加点击事件
                    button.addEventListener('click', async () => {
                        const code = block.querySelector('code')?.textContent || block.textContent;
                        try {
                            await navigator.clipboard.writeText(code.trim());
                            button.textContent = '已复制！';
                            button.classList.add('copied');
                            
                            setTimeout(() => {
                                button.textContent = '复制';
                                button.classList.remove('copied');
                            }, 2000);
                        } catch (err) {
                            console.error('复制失败:', err);
                            button.textContent = '复制失败';
                            button.style.background = '#dc3545';
                        }
                    });
                    
                    header.appendChild(button);
                    
                    // 将原始代码块包装在新容器中
                    block.parentNode.insertBefore(wrapper, block);
                    wrapper.appendChild(header);
                    wrapper.appendChild(block);
                });

                // 添加图片点击预览功能
                document.querySelectorAll('.article-content img').forEach(img => {
                    img.addEventListener('click', function() {
                        const overlay = document.querySelector('.image-preview-overlay');
                        const previewImg = overlay.querySelector('img');
                        
                        // 设置预览图片的源
                        previewImg.src = this.src;
                        
                        // 显示遮罩层
                        overlay.style.display = 'block';
                        
                        // 禁止页面滚动
                        document.body.style.overflow = 'hidden';
                    });
                });

                // 点击遮罩层关闭预览
                document.querySelector('.image-preview-overlay').addEventListener('click', function(e) {
                    if (e.target === this || e.target.tagName === 'IMG') {
                        this.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                });

                // 添加 ESC 键关闭预览
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        const overlay = document.querySelector('.image-preview-overlay');
                        overlay.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                });
                </script>
            </body>
            </html>
        `;

        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'articles', article.fileName.replace('.md', '.html')),
            articleHtml
        );
    });

    console.log(`预览文件已生成在 ${OUTPUT_DIR} 目录下`);
    console.log('请使用浏览器打开 index.html 查看预览');
}

// // 添加文件监听功能
// function watchFiles(server) {
//     const chokidar = require('chokidar');
//     const matter = require('gray-matter');
    
//     // 监听文章目录
//     const watcher = chokidar.watch([
//         path.join(POSTS_DIR, '**/*.md'),
//         CATEGORIES_PATH
//     ], {
//         ignored: /(^|[\/\\])\../,
//         persistent: true
//     });

//     // 监听文件变化
//     watcher.on('change', (path) => {
//         console.log(`检测到文件变化: ${path}`);
//         const content = fs.readFileSync(path, 'utf-8');
//     const { attributes, body } = matter(content);
    
//     // 更新 updated 字段为当前时间
//     attributes.updated = moment().format('YYYY-MM-DD');

//     // 重新生成带有 updated 字段的文件
//     const newContent = matter.stringify(body, attributes);
//     fs.writeFileSync(path, newContent);

//     // 重新生成预览
//         generatePreviewHtml();
//         console.log('预览已更新');
//     });

//     // 当服务器关闭时停止监听
//     server.on('close', () => {
//         watcher.close();
//     });
// }
// 添加文件监听功能
function watchFiles(server) {
    const chokidar = require('chokidar');
    const matter = require('gray-matter');

    // 监听文章目录
    const watcher = chokidar.watch([
        path.join(POSTS_DIR, '**/*.md'),
        CATEGORIES_PATH
    ], {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });

    // 监听文件变化
    watcher.on('change', (filePath) => {
        console.log(`检测到文件变化: ${filePath}`);

        try {
            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);

            // 确保 parsed.data 是一个对象
            const attributes = parsed.data || {};

            // 更新 updated 字段为当前时间
            attributes.updated = moment().format('YYYY-MM-DD HH:mm:ss');

            // 重新生成带有 updated 字段的文件
            const newContent = matter.stringify(parsed.content, attributes);
            fs.writeFileSync(filePath, newContent);

            // 重新生成预览
            generatePreviewHtml();
            console.log('预览已更新');
        } catch (error) {
            console.error(`处理文件时出错: ${error.message}`);
        }
    });

    // 当服务器关闭时停止监听
    server.on('close', () => {
        watcher.close();
    });
}


// 添加启动预览服务器的函数
function startPreviewServer() {
    generatePreviewHtml();
    
    const server = http.createServer((req, res) => {
        // 解码 URL，处理中文路径
        const decodedUrl = decodeURIComponent(req.url);
        let filePath = path.join(OUTPUT_DIR, decodedUrl === '/' ? 'index.html' : decodedUrl);
        
        // 处理文件路径
        if (!path.extname(filePath)) {
            filePath += '.html';
        }

        // 输出请求路径，用于调试
        console.log('请求路径:', filePath);

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            console.log('文件不存在:', filePath);
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }

        // 读取请求的文件
        fs.readFile(filePath, (err, content) => {
            if (err) {
                console.error('读取文件错误:', err);
                res.writeHead(500);
                res.end('Internal Server Error');
                return;
            }

            // 设置Content-Type
            const ext = path.extname(filePath);
            const contentType = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif'
            }[ext] || 'text/plain';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });

    const PORT = 3000;
    server.listen(PORT, () => {
        const previewUrl = `http://localhost:${PORT}`;
        console.log(`预览服务器已启动，请访问：${previewUrl}`);
        const open = (process.platform === 'win32') ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
        require('child_process').exec(`${open} ${previewUrl}`);
        
        // 启动文件监听
        watchFiles(server);
        console.log('文件监听已启动，修改文件后将自动更新预览');
    });

    // 监听Ctrl+C退出
    process.on('SIGINT', () => {
        server.close(() => {
            console.log('\n预览服务器已关闭');
            process.exit(0);
        });
    });
}

// 修改命令行入口部分
const command = process.argv[2];

switch (command) {
    case 'new':
        createNewPost();
        break;
    case 'preview':
        startPreviewServer();
        break;
    case 'build':
        generatePreviewHtml();
        console.log('构建完成！');
        break;
    default:
        console.log('可用命令：new, preview, build');
        break;
} 