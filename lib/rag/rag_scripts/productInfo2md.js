/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// How to use:
// node comments2md.js <json-file-path> [output-directory]

/**
 * 将单个产品转换为Markdown格式
 * @param {Object} product - 产品对象
 * @returns {string} - markdown格式的产品信息
 */
function productToMarkdown(product) {
    if (!product) return '';
    
    return product.title;

    let markdownContent = '';
            
    // 添加产品标题作为主标题
    if (product.title) {
        markdownContent += `# ${product.title}\n\n`;
    }
    
    // 添加parent_asin信息（如果存在）
    if (product.parent_asin) {
        markdownContent += `**Parent ASIN:** ${product.parent_asin}\n\n`;
    }
    
    // Basic Info 段
    markdownContent += '## Basic Info\n\n';
    
    if (product.average_rating !== undefined && product.average_rating !== null) {
        markdownContent += `**Rating:** ${product.average_rating}`;
        if (product.rating_number) {
            markdownContent += ` (${product.rating_number} reviews)`;
        }
        markdownContent += '\n\n';
    }
    
    if (product.price !== undefined && product.price !== null) {
        markdownContent += `**Price:** $${product.price}\n\n`;
    } else {
        markdownContent += `**Price:** Not available\n\n`;
    }
            
    // Features 段
    if (product.features && product.features.length > 0) {
        markdownContent += '## Features\n\n';
        product.features.forEach(feature => {
            if (feature && feature.trim()) {
                markdownContent += `- ${feature}\n`;
            }
        });
        markdownContent += '\n';
    }
    
    // Details 段
    if (product.details && typeof product.details === 'object') {
        markdownContent += '## Product Details\n\n';
        
        Object.entries(product.details).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                // 处理复杂对象（如Best Sellers Rank）
                if (typeof value === 'object' && !Array.isArray(value)) {
                    markdownContent += `**${key}:**\n`;
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        markdownContent += `  - ${subKey}: ${subValue}\n`;
                    });
                } else {
                    markdownContent += `**${key}:** ${value}\n`;
                }
            }
        });
        markdownContent += '\n';
    }
            
    // Description 段（如果存在）
    if (product.description && product.description.length > 0) {
        markdownContent += '## Description\n\n';
        product.description.forEach(desc => {
            if (desc && desc.trim()) {
                markdownContent += `${desc}\n\n`;
            }
        });
    }
    
    // Category 段（如果存在）
    if (product.categories && product.categories.length > 0) {
        markdownContent += '## Categories\n\n';
        markdownContent += product.categories.join(' > ') + '\n\n';
    }
    
    return markdownContent;
}

/**
 * 生成安全的文件名
 * @param {Object} product - 产品对象
 * @param {number} index - 产品索引
 * @returns {string} - 安全的文件名
 */
function generateSafeFilename(product, index) {
    let filename = '';
    
    // 优先使用parent_asin
    if (product.parent_asin) {
        filename = `product_${product.parent_asin}`;
    }
    // 其次使用title（清理特殊字符）
    else if (product.title) {
        filename = product.title
            .replace(/[^a-zA-Z0-9\s-]/g, '') // 移除特殊字符
            .replace(/\s+/g, '_') // 空格替换为下划线
            .substring(0, 50); // 限制长度
        filename = `product_${filename}`;
    }
    // 最后使用索引
    else {
        filename = `product_${index + 1}`;
    }
    
    return `${filename}.md`;
}

/**
 * 将产品JSON数据转换为多个Markdown文件
 * @param {string} jsonFilePath - JSON文件路径
 * @returns {Array} - 包含markdown内容和文件名的数组
 */
function productsToMarkdown(jsonFilePath) {
    try {
        // 读取JSON文件
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        
        // 确保数据是数组
        const products = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const results = [];
        
        products.forEach((product, index) => {
            if (!product) return;
            
            const markdownContent = productToMarkdown(product);
            const filename = generateSafeFilename(product, index);
            
            results.push({
                content: markdownContent,
                filename: filename,
                product: product
            });
        });
        
        return results;
        
    } catch (error) {
        console.error('Error processing JSON file:', error);
        throw error;
    }
}

/**
 * 将JSON文件转换为多个MD文件
 * @param {string} jsonFilePath - 输入的JSON文件路径
 * @param {string} outputDir - 输出目录路径（可选）
 */
function convertJsonToMd(jsonFilePath, outputDir) {
    try {
        const results = productsToMarkdown(jsonFilePath);
        
        // 如果没有指定输出目录，则基于输入文件目录创建
        if (!outputDir) {
            const inputDir = path.dirname(jsonFilePath);
            const inputName = path.parse(jsonFilePath).name;
            outputDir = path.join(inputDir, `${inputName}_products_md`);
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
            console.log(`✅ Created: ${filename}`);
        });
        
        console.log(`\n🎉 Successfully converted ${results.length} products to MD files in: ${outputDir}`);
        return createdFiles;
        
    } catch (error) {
        console.error('❌ Error converting JSON to MD:', error);
        throw error;
    }
}

// 命令行支持
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node productInfo2md.js <json-file-path> [output-directory]');
        console.log('Example: node productInfo2md.js ./data/products.json ./output/products_md');
        process.exit(1);
    }
    
    const jsonFilePath = args[0];
    const outputDir = args[1];
    
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`❌ Error: File ${jsonFilePath} does not exist`);
        process.exit(1);
    }
    
    try {
        convertJsonToMd(jsonFilePath, outputDir);
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

export {
    productToMarkdown,
    productsToMarkdown,
    convertJsonToMd,
    generateSafeFilename
};
