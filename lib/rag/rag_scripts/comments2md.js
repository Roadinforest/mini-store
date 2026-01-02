const fs = require('fs');
const path = require('path');

// How to use:
// node comments2md.js <json-file-path> [output-directory]

/**
 * 将时间戳转换为可读日期
 * @param {number} timestamp - Unix时间戳
 * @returns {string} - 格式化的日期字符串
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * 将评论数组按parent_asin分组
 * @param {Array} comments - 评论数组
 * @returns {Object} - 按parent_asin分组的评论对象
 */
function groupCommentsByParentAsin(comments) {
    return comments.reduce((groups, comment) => {
        const parentAsin = comment.parent_asin || 'unknown';
        if (!groups[parentAsin]) {
            groups[parentAsin] = [];
        }
        groups[parentAsin].push(comment);
        return groups;
    }, {});
}

/**
 * 将单个评论转换为markdown格式
 * @param {Object} comment - 评论对象
 * @param {number} index - 评论索引
 * @returns {string} - markdown格式的评论
 */
function commentToMarkdown(comment, index) {
    let markdown = `### Review ${index + 1}\n\n`;
    
    // 基本信息
    if (comment.rating) {
        markdown += `**Rating:** ${'⭐'.repeat(comment.rating)} (${comment.rating}/5)\n\n`;
    }
    
    if (comment.title) {
        markdown += `**Title:** ${comment.title}\n\n`;
    }
    
    if (comment.text && comment.text.trim()) {
        markdown += `**Review Text:**\n${comment.text}\n\n`;
    }
    
    // 附加信息
    const additionalInfo = [];
    
    if (comment.verified_purchase !== undefined) {
        additionalInfo.push(`Verified Purchase: ${comment.verified_purchase ? 'Yes' : 'No'}`);
    }
    
    if (comment.helpful_vote && comment.helpful_vote > 0) {
        additionalInfo.push(`Helpful Votes: ${comment.helpful_vote}`);
    }
    
    if (comment.timestamp) {
        additionalInfo.push(`Date: ${formatTimestamp(comment.timestamp)}`);
    }
    
    if (additionalInfo.length > 0) {
        markdown += `**Additional Info:** ${additionalInfo.join(' | ')}\n\n`;
    }
    
    // 图片信息
    if (comment.images && comment.images.length > 0) {
        markdown += `**Images:** ${comment.images.length} image(s) attached\n\n`;
    }
    
    return markdown;
}

/**
 * 将评论组转换为markdown格式
 * @param {Array} comments - 评论数组
 * @param {string} parentAsin - 父产品ASIN
 * @param {number} batchIndex - 批次索引
 * @returns {string} - markdown格式的评论组
 */
function commentsToMarkdown(comments, parentAsin, batchIndex = 0) {
    let markdown = `# Product Reviews\n\n`;
    markdown += `**Parent ASIN:** ${parentAsin}\n`;
    
    if (batchIndex > 0) {
        markdown += `**Batch:** ${batchIndex + 1}\n`;
    }
    
    markdown += `**Total Reviews in this batch:** ${comments.length}\n\n`;
    
    // 统计评分分布
    const ratingStats = {};
    comments.forEach(comment => {
        if (comment.rating) {
            ratingStats[comment.rating] = (ratingStats[comment.rating] || 0) + 1;
        }
    });
    
    if (Object.keys(ratingStats).length > 0) {
        markdown += `## Rating Distribution\n\n`;
        for (let rating = 5; rating >= 1; rating--) {
            if (ratingStats[rating]) {
                markdown += `${'⭐'.repeat(rating)} (${rating}): ${ratingStats[rating]} reviews\n`;
            }
        }
        markdown += '\n---\n\n';
    }
    
    // 添加所有评论
    markdown += `## Individual Reviews\n\n`;
    comments.forEach((comment, index) => {
        markdown += commentToMarkdown(comment, index);
        if (index < comments.length - 1) {
            markdown += '---\n\n';
        }
    });
    
    return markdown;
}

/**
 * 将评论JSON数据转换为Markdown格式用于RAG
 * @param {string} jsonFilePath - JSON文件路径
 * @returns {Array} - 包含markdown内容和文件名的数组
 */
function comments2md(jsonFilePath) {
    try {
        // 读取JSON文件
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        
        // 确保数据是数组
        const comments = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        // 按parent_asin分组
        const groupedComments = groupCommentsByParentAsin(comments);
        
        const results = [];
        
        // 处理每个parent_asin组
        Object.entries(groupedComments).forEach(([parentAsin, commentsGroup]) => {
            console.log(`Processing ${commentsGroup.length} comments for parent_asin: ${parentAsin}`);
            
            if (commentsGroup.length <= 5) {
                // 少于等于5个评论，直接生成一个文件
                const markdown = commentsToMarkdown(commentsGroup, parentAsin);
                results.push({
                    content: markdown,
                    filename: `comments_${parentAsin}.md`
                });
            } else {
                // 超过5个评论，每5个一批
                for (let i = 0; i < commentsGroup.length; i += 5) {
                    const batch = commentsGroup.slice(i, i + 5);
                    const batchIndex = Math.floor(i / 5);
                    const markdown = commentsToMarkdown(batch, parentAsin, batchIndex);
                    
                    results.push({
                        content: markdown,
                        filename: `comments_${parentAsin}_batch_${batchIndex + 1}.md`
                    });
                }
            }
        });
        
        return results;
        
    } catch (error) {
        console.error('Error processing JSON file:', error);
        throw error;
    }
}

/**
 * 将评论JSON文件转换为多个MD文件
 * @param {string} jsonFilePath - 输入的JSON文件路径
 * @param {string} outputDir - 输出目录路径（可选）
 */
function convertCommentsToMd(jsonFilePath, outputDir) {
    try {
        const results = comments2md(jsonFilePath);
        
        // 如果没有指定输出目录，则基于输入文件目录创建
        if (!outputDir) {
            const inputDir = path.dirname(jsonFilePath);
            const inputName = path.parse(jsonFilePath).name;
            outputDir = path.join(inputDir, `${inputName}_comments_md`);
        }
        
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入所有MD文件
        const createdFiles = [];
        results.forEach(({ content, filename }) => {
            const outputPath = path.join(outputDir, filename);
            fs.writeFileSync(outputPath, content, 'utf8');
            createdFiles.push(outputPath);
            console.log(`✅ Created: ${outputPath}`);
        });
        
        console.log(`\n🎉 Successfully converted comments to ${createdFiles.length} MD files in: ${outputDir}`);
        return createdFiles;
        
    } catch (error) {
        console.error('❌ Error converting comments to MD:', error);
        throw error;
    }
}

// 命令行支持
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node comments2md.js <json-file-path> [output-directory]');
        console.log('Example: node comments2md.js ./comments/reviews.json ./output/comments_md');
        process.exit(1);
    }
    
    const jsonFilePath = args[0];
    const outputDir = args[1];
    
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`❌ Error: File ${jsonFilePath} does not exist`);
        process.exit(1);
    }
    
    try {
        convertCommentsToMd(jsonFilePath, outputDir);
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

module.exports = {
    comments2md,
    convertCommentsToMd,
    groupCommentsByParentAsin,
    commentsToMarkdown
};
