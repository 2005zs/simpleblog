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
const PREVIEW_DIR = path.join(__dirname, '../dist');

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
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    
    const content = template
        .replace('${title}', answers.title)
        .replace(/\${date}/g, date)
        .replace('${category}', answers.category)
        .replace('${wordCount}', '0')
        .replace('topImage: ""', `topImage: "${answers.topImage || ''}"`);

    const fileName = `${date}-${answers.title.toLowerCase().replace(/\s+/g, '-')}.md`;
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
            return {
                title: attributes.title,
                date: attributes.date,
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
    // 清理并创建输出目录
    if (fs.existsSync(PREVIEW_DIR)) {
        fs.rmSync(PREVIEW_DIR, { recursive: true });
    }
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
    fs.mkdirSync(path.join(PREVIEW_DIR, 'articles'), { recursive: true });

    const articles = generateArticleList();
    const articleListHtml = articles.map(article => `
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
                    <span class="meta-item">
                        <i class="icon-calendar"></i>
                        ${moment(article.date).format('YYYY-MM-DD')}
                    </span>
                    <span class="meta-item">
                        <i class="icon-tag"></i>
                        ${article.category}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    const indexHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>博客预览</title>
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

                .article-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                }

                .article-cover {
                    width: 200px;
                    height: 150px;
                    overflow: hidden;
                }

                .article-cover img {
                    width: 100%;
                    height: 100%;
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
            </style>
        </head>
        <body>
            <h1>文章列表</h1>
            ${articleListHtml}
        </body>
        </html>
    `;

    fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), indexHtml);

    articles.forEach(article => {
        const mdContent = fs.readFileSync(path.join(POSTS_DIR, article.fileName), 'utf-8');
        const { metadata, content } = convertMarkdownToHtml(mdContent);
        
        const articleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
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
                </style>
            </head>
            <body>
                <a href="../index.html" class="back-to-list" title="返回文章列表"></a>
                <h1>${metadata.title}</h1>
                <div class="article-meta">
                    <div>发布日期：${metadata.date}</div>
                    <div>更新日期：${metadata.updated}</div>
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
            path.join(PREVIEW_DIR, 'articles', article.fileName.replace('.md', '.html')),
            articleHtml
        );
    });

    console.log(`预览文件已生成在 ${PREVIEW_DIR} 目录下`);
    console.log('请使用浏览器打开 preview/index.html 查看预览');

    // 如果有图片或其他资源，也需要复制
    const assetsDir = path.join(__dirname, '../assets');
    if (fs.existsSync(assetsDir)) {
        fs.cpSync(assetsDir, path.join(PREVIEW_DIR, 'assets'), { recursive: true });
    }
}

// 添加文件监听功能
function watchFiles(server) {
    const chokidar = require('chokidar');
    
    // 监听文章目录
    const watcher = chokidar.watch([
        path.join(POSTS_DIR, '**/*.md'),
        CATEGORIES_PATH
    ], {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });

    // 监听文件变化
    watcher.on('change', (path) => {
        console.log(`检测到文件变化: ${path}`);
        generatePreviewHtml();
        console.log('预览已更新');
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
        let filePath = path.join(PREVIEW_DIR, decodedUrl === '/' ? 'index.html' : decodedUrl);
        
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