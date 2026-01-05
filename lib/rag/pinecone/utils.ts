import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载环境变量
dotenv.config();

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
  
  return { openai };
}

const { openai } = initializeServices();

/**
 * 生成文本的embedding向量
 * @param {string} text - 要进行embedding的文本
 * @returns {Promise<number[]>} - embedding向量
 */
async function generateEmbedding(text: string): Promise<number[]> {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error generating embedding for text (length: ${text.length}):`, errorMessage);
        throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }
}

export {
  // 生成 embedding
  generateEmbedding,    
}