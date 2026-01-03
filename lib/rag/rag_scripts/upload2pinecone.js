const OpenAI = require('openai');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { PineconeUtils, CONFIG: PINECONE_CONFIG } = require('../pinecone');

// 加载环境变量
require('dotenv').config();

// 常量配置
const CONFIG = {
  BATCH_SIZE: 5,
  BATCH_DELAY: 1000, // ms
  DEFAULT_TOP_K: 5,
  EMBEDDING_MODEL: 'text-embedding-v3',
  DEFAULT_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
};

// 环境变量验证
function validateEnvironment() {
  const required = [
    { key: 'QWEN_API_KEY', name: 'Qwen API Key' }
  ];
  
  for (const { key, name } of required) {
    if (!process.env[key]) {
      console.error(`❌ ${name} (${key}) is not set in environment variables.`);
      process.exit(1);
    }
  }
}

// 初始化服务
function initializeServices() {
  validateEnvironment();
  
  const openai = new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL: process.env.QWEN_BASE_URL || CONFIG.DEFAULT_BASE_URL,
  });
  
  // 初始化 Pinecone
  PineconeUtils.initialize();
  
  return { openai };
}

const { openai } = initializeServices();

/**
 * 生成文本的embedding向量
 * @param {string} text - 要进行embedding的文本
 * @returns {Promise<number[]>} - embedding向量
 */
async function generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
    }
    
    try {
        const response = await openai.embeddings.create({
            model: CONFIG.EMBEDDING_MODEL,
            input: text.trim(),
        });
        
        if (!response.data || !response.data[0] || !response.data[0].embedding) {
            throw new Error('Invalid embedding response format');
        }
        
        return response.data[0].embedding;
    } catch (error) {
        console.error(`❌ Error generating embedding for text (length: ${text.length}):`, error.message);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * 读取markdown文件内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} - 文件内容
 */
async function readMarkdownFile(filePath) {
    try {
        if (!fsSync.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        
        const content = await fs.readFile(filePath, 'utf8');
        
        if (!content.trim()) {
            console.warn(`⚠️ Warning: File is empty: ${filePath}`);
        }
        
        return content;
    } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error.message);
        throw new Error(`Failed to read file: ${error.message}`);
    }
}

/**
 * 通用的内容信息提取器
 */
class ContentExtractor {
    /**
     * 从markdown内容中提取产品ID
     * @param {string} content - markdown内容
     * @param {string} filename - 文件名
     * @returns {string} - 产品ID
     */
    static extractProductId(content, filename) {
        // 首先尝试从内容中提取Parent ASIN
        const parentAsinMatch = content.match(/\*\*Parent ASIN:\*\* ([A-Z0-9]+)/);
        if (parentAsinMatch) {
            return parentAsinMatch[1];
        }
        
        // 如果没有Parent ASIN，从文件名中提取
        const filenameMatch = filename.match(/product_([A-Z0-9]+)\.md/);
        if (filenameMatch) {
            return filenameMatch[1];
        }
        
        // 最后使用文件名（不含扩展名）
        return path.parse(filename).name;
    }
    
    /**
     * 从markdown内容中提取产品标题
     * @param {string} content - markdown内容
     * @returns {string} - 产品标题
     */
    static extractProductTitle(content) {
        const titleMatch = content.match(/^# (.+)$/m);
        return titleMatch ? titleMatch[1].trim() : 'Unknown Product';
    }
    
    /**
     * 从评论markdown内容中提取Parent ASIN
     * @param {string} content - markdown内容
     * @param {string} filename - 文件名
     * @returns {string} - Parent ASIN
     */
    static extractCommentParentAsin(content, filename) {
        // 从内容中提取Parent ASIN
        const parentAsinMatch = content.match(/\*\*Parent ASIN:\*\* ([A-Z0-9]+)/);
        if (parentAsinMatch) {
            return parentAsinMatch[1];
        }
        
        // 从文件名中提取
        const filenameMatch = filename.match(/comments_([A-Z0-9]+)/);
        if (filenameMatch) {
            return filenameMatch[1];
        }
        
        return 'unknown';
    }
    
    /**
     * 从评论markdown内容中提取批次信息
     * @param {string} content - markdown内容
     * @param {string} filename - 文件名
     * @returns {string} - 批次信息
     */
    static extractCommentBatch(content, filename) {
        // 从内容中提取批次信息
        const batchMatch = content.match(/\*\*Batch:\*\* (\d+)/);
        if (batchMatch) {
            return batchMatch[1];
        }
        
        // 从文件名中提取批次信息
        const filenameBatchMatch = filename.match(/_batch_(\d+)/);
        if (filenameBatchMatch) {
            return filenameBatchMatch[1];
        }
        
        return '1';
    }
    
    /**
     * 从评论markdown内容中提取评论数量
     * @param {string} content - markdown内容
     * @returns {number} - 评论数量
     */
    static extractCommentCount(content) {
        const countMatch = content.match(/\*\*Total Reviews in this batch:\*\* (\d+)/);
        return countMatch ? parseInt(countMatch[1], 10) : 0;
    }
}



/**
 * 通用批处理器
 */
class BatchProcessor {
    /**
     * 获取目录下的markdown文件
     * @param {string} dir - 目录路径
     * @returns {Promise<string[]>} - 文件列表
     */
    static async getMarkdownFiles(dir) {
        try {
            if (!fsSync.existsSync(dir)) {
                throw new Error(`Directory ${dir} does not exist`);
            }
            
            const files = await fs.readdir(dir);
            const markdownFiles = files.filter(file => file.endsWith('.md'));
            
            if (markdownFiles.length === 0) {
                console.warn('⚠️ No markdown files found in directory');
                return [];
            }
            
            console.log(`📁 Found ${markdownFiles.length} markdown files`);
            return markdownFiles;
        } catch (error) {
            console.error(`❌ Error reading directory ${dir}:`, error.message);
            throw error;
        }
    }
    
    /**
     * 处理单个产品文件
     * @param {string} file - 文件名
     * @param {string} markdownDir - 目录路径
     * @returns {Promise<void>}
     */
    static async processSingleProduct(file, markdownDir) {
        try {
            const filePath = path.join(markdownDir, file);
            const content = await readMarkdownFile(filePath);
            
            const productId = ContentExtractor.extractProductId(content, file);
            const title = ContentExtractor.extractProductTitle(content);
            
            console.log(`🔄 Processing ${productId}...`);
            const embedding = await generateEmbedding(content);
            
            await PineconeUtils.uploadProduct(productId, title, content, embedding, {
                filename: file
            });
        } catch (error) {
            console.error(`❌ Failed to process product file ${file}:`, error.message);
            throw error;
        }
    }
    
    /**
     * 处理单个评论文件
     * @param {string} file - 文件名
     * @param {string} markdownDir - 目录路径
     * @returns {Promise<void>}
     */
    static async processSingleComment(file, markdownDir) {
        try {
            const filePath = path.join(markdownDir, file);
            const content = await readMarkdownFile(filePath);
            
            const parentAsin = ContentExtractor.extractCommentParentAsin(content, file);
            const batchInfo = ContentExtractor.extractCommentBatch(content, file);
            const reviewCount = ContentExtractor.extractCommentCount(content);
            
            console.log(`🔄 Processing comments ${parentAsin}_${batchInfo}...`);
            const embedding = await generateEmbedding(content);
            
            await PineconeUtils.uploadComments(parentAsin, batchInfo, content, embedding, {
                filename: file,
                reviewCount: reviewCount
            });
        } catch (error) {
            console.error(`❌ Failed to process comment file ${file}:`, error.message);
            throw error;
        }
    }
    
    /**
     * 批量处理文件
     * @param {string[]} files - 文件列表
     * @param {Function} processor - 处理函数
     * @param {string} markdownDir - 目录路径
     * @param {number} batchSize - 批处理大小
     */
    static async processBatch(files, processor, markdownDir, batchSize = CONFIG.BATCH_SIZE) {
        const totalBatches = Math.ceil(files.length / batchSize);
        const stats = { success: 0, failed: 0 };
        
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            
            console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
            
            const results = await Promise.allSettled(
                batch.map(file => processor(file, markdownDir))
            );
            
            // 统计结果
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    stats.success++;
                } else {
                    stats.failed++;
                    console.error(`❌ Batch ${batchNum}, file ${batch[index]}: ${result.reason.message}`);
                }
            });
            
            // 批次间延迟
            if (i + batchSize < files.length) {
                console.log(`⏳ Waiting ${CONFIG.BATCH_DELAY}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
            }
        }
        
        return stats;
    }
}

/**
 * 批量处理产品markdown文件并上传到Pinecone
 * @param {string} markdownDir - markdown文件目录
 * @param {number} batchSize - 批处理大小
 */
async function processAndUploadProducts(markdownDir, batchSize = CONFIG.BATCH_SIZE) {
    try {
        console.log('🚀 Starting product upload process...');
        
        const files = await BatchProcessor.getMarkdownFiles(markdownDir);
        if (files.length === 0) return;
        
        const stats = await BatchProcessor.processBatch(
            files, 
            BatchProcessor.processSingleProduct, 
            markdownDir, 
            batchSize
        );
        
        console.log(`\n🎉 Product upload completed!`);
        console.log(`✅ Success: ${stats.success}, ❌ Failed: ${stats.failed}`);
        
    } catch (error) {
        console.error('❌ Error processing products:', error.message);
        throw error;
    }
}

/**
 * 批量处理评论markdown文件并上传到Pinecone
 * @param {string} markdownDir - markdown文件目录
 * @param {number} batchSize - 批处理大小
 */
async function processAndUploadComments(markdownDir, batchSize = CONFIG.BATCH_SIZE) {
    try {
        console.log('🚀 Starting comments upload process...');
        
        const files = await BatchProcessor.getMarkdownFiles(markdownDir);
        if (files.length === 0) return;
        
        const stats = await BatchProcessor.processBatch(
            files, 
            BatchProcessor.processSingleComment, 
            markdownDir, 
            batchSize
        );
        
        console.log(`\n🎉 Comments upload completed!`);
        console.log(`✅ Success: ${stats.success}, ❌ Failed: ${stats.failed}`);
        
    } catch (error) {
        console.error('❌ Error processing comments:', error.message);
        throw error;
    }
}

/**
 * 查询Pinecone中的产品
 * @param {string} queryText - 查询文本
 * @param {number} topK - 返回结果数量
 * @param {Object} filter - 查询过滤器
 * @returns {Promise<Object>} - 查询结果
 */
async function queryProducts(queryText, topK = CONFIG.DEFAULT_TOP_K, filter = {}) {
    try {
        if (!queryText || typeof queryText !== 'string') {
            throw new Error('Invalid query text');
        }
        
        return await PineconeUtils.queryByText(queryText, generateEmbedding, {
            topK: Math.min(topK, 100), // Pinecone限制
            filter,
            includeValues: false,
            includeMetadata: true
        });
    } catch (error) {
        console.error('❌ Error querying products:', error.message);
        throw error;
    }
}

/**
 * CLI命令处理器
 */
class CLIHandler {
    static showUsage() {
        console.log('📖 Usage:');
        console.log('  Upload Products:  node upload2pinecone.js uploadProducts <markdown-directory> [batch-size]');
        console.log('  Upload Comments:  node upload2pinecone.js uploadComments <markdown-directory> [batch-size]');
        console.log('  Query Products:   node upload2pinecone.js query <query-text> [top-k]');
        console.log('');
        console.log('📝 Examples:');
        console.log('  node upload2pinecone.js uploadProducts ./products_md 3');
        console.log('  node upload2pinecone.js uploadComments ./comments_md 5');
        console.log('  node upload2pinecone.js query "phone case" 10');
        console.log('');
        console.log('⚙️  Default batch size: 5, Default top-k: 5');
    }
    
    static async handleUploadProducts(args) {
        if (args.length < 2) {
            console.error('❌ Please provide markdown directory path');
            process.exit(1);
        }
        
        const markdownDir = args[1];
        const batchSize = args[2] ? parseInt(args[2], 10) : CONFIG.BATCH_SIZE;
        
        if (isNaN(batchSize) || batchSize < 1) {
            console.error('❌ Invalid batch size. Must be a positive integer.');
            process.exit(1);
        }
        
        return processAndUploadProducts(markdownDir, batchSize);
    }
    
    static async handleUploadComments(args) {
        if (args.length < 2) {
            console.error('❌ Please provide comments markdown directory path');
            process.exit(1);
        }
        
        const markdownDir = args[1];
        const batchSize = args[2] ? parseInt(args[2], 10) : CONFIG.BATCH_SIZE;
        
        if (isNaN(batchSize) || batchSize < 1) {
            console.error('❌ Invalid batch size. Must be a positive integer.');
        }
        
        return processAndUploadComments(markdownDir, batchSize);
    }
    
    static async handleQuery(args) {
        if (args.length < 2) {
            console.error('❌ Please provide query text');
            process.exit(1);
        }
        
        const queryText = args[1];
        const topK = args[2] ? parseInt(args[2], 10) : CONFIG.DEFAULT_TOP_K;
        
        if (isNaN(topK) || topK < 1) {
            console.error('❌ Invalid top-k value. Must be a positive integer.');
            process.exit(1);
        }
        
        const results = await queryProducts(queryText, topK);
        
        PineconeUtils.formatResults(results, true, 500);
    }
}

// 命令行支持
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        CLIHandler.showUsage();
        process.exit(1);
    }
    
    const command = args[0];
    const handlers = {
        'uploadProducts': CLIHandler.handleUploadProducts,
        'uploadComments': CLIHandler.handleUploadComments,
        'query': CLIHandler.handleQuery
    };
    
    const handler = handlers[command];
    if (!handler) {
        console.error(`❌ Unknown command: ${command}`);
        console.log('\nAvailable commands: uploadProducts, uploadComments, query');
        process.exit(1);
    }
    
    // 执行命令
    handler(args)
        .then(() => {
            console.log('\n🎉 Operation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Operation failed:', error.message);
            process.exit(1);
        });
}

// 导出模块
module.exports = {
    // 核心函数
    generateEmbedding,
    processAndUploadProducts,
    processAndUploadComments,
    queryProducts,
    
    // 工具类
    ContentExtractor,
    BatchProcessor,
    CLIHandler,
    
    // Pinecone 功能（来自抽象模块）
    PineconeUtils,
    
    // 配置
    CONFIG,
    
    // 向后兼容的函数别名
    uploadProductToPinecone: PineconeUtils.uploadProduct,
    uploadCommentsToPinecone: PineconeUtils.uploadComments,
    extractCommentParentAsin: ContentExtractor.extractCommentParentAsin,
    extractCommentBatch: ContentExtractor.extractCommentBatch,
    extractCommentCount: ContentExtractor.extractCommentCount
};