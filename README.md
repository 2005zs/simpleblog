# SimpleBlog

一个简单的 Markdown 博客框架，支持部署到 GitHub Pages和cloudflare pages。

## 特性
- 🚀 零配置，快速开始
- 📝 支持 Markdown 写作
- 🎨 优雅的暗色主题
- 📱 响应式设计
- 🔍 实时预览
- 📌 文章置顶功能
- 🏷️ 文章分类
- 🖼️ 支持文章封面
- 🚀 可部署到 GitHub Pages或cloudflare pages


### Markdown 支持
支持标准 Markdown 语法，包括：
- 标题（H1-H6）
- 列表（有序和无序）
- 链接和图片
- 代码块（支持语法高亮）
- 引用
- 表格
- 等等...

### 文章分类管理
在 `posts/categories.md` 文件中管理博客分类： 


## 主要命令
- `npm run new`: 创建新文章
- `npm run preview`: 启动本地预览服务器
- `npm run build`: 构建静态文件（用于部署）

## 自定义主题
您可以通过修改 `scripts/bl.js` 中的 HTML 模板和 CSS 样式来自定义博客主题：
- 首页样式：搜索 `const indexHtml`
- 文章页样式：搜索 `const articleHtml`

## 快速开始

### 克隆项目
```bash
git clone https://github.com/2005zs/simpleblog.git
```
```bash
git clone git@github.com:2005zs/simpleblog.git//https不通的时候，用ssh来clone
```
### 进入项目目录
```bash
cd simpleblog
```
### 安装依赖
```bash
npm ci
```
### 创建新文章
```bash
npm run new
```
### 本地预览（自动打开默认浏览器）
```bash
npm run preview
```

## 部署到github的pages
#### 1.请将仓库命名为username.github.io
#### 2.请到`Actions`->`Pages`->`Static HTML`,然后`config`，然后会帮你生成static.yaml，然后点击`Run workflow`，然后会自动部署到github pages，成功后访问name.github.io即可

## 部署到cloudflare
#### cloudflare账户链接github
在`构建设置`中输入`构建命令`
```bash
node scripts/bl.js build
```
保存部署即可


## 常见问题

### 1.需要在预览状态下对博客进行修改后才会自动更改`更新时间`

### 2. 如何置顶文章？
将文章前置信息中的 `priority` 设置为大于 1 的数值。

### 3. 如何添加文章封面？
在文章前置信息中的 `topImage` 字段填入图片 URL。

## 贡献指南
欢迎提交 Issue 和 Pull Request！

## 作者
[banlanzs](https://github.com/banlanzs)
