const { marked } = require('marked');
const matter = require('front-matter');

function countWords(text) {
    // 统计中文字符
    const cnWords = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 统计英文单词
    const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return cnWords + enWords;
}

function convertMarkdownToHtml(markdown) {
    const { attributes, body } = matter(markdown);
    const htmlContent = marked.parse(body);
    
    // 更新字数统计
    attributes.wordCount = countWords(body);
    
    return {
        metadata: attributes,
        content: htmlContent
    };
}

module.exports = {
    convertMarkdownToHtml,
    countWords
}; 