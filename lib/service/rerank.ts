export interface RerankResult {
  index: number;
  relevance_score: number;
}

/**
 * 使用 Qwen3 Rerank 模型对文档进行重排序
 * @param query 查询字符串
 * @param documents 文档列表
 * @returns 重排序结果或 null
 */
export async function rerankWithQwen(query: string, documents: string[]): Promise<RerankResult[] | null> {
  try {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) throw new Error("QWEN_API_KEY not found");

    // 直接使用 fetch 调用 DashScope Rerank API
    console.log("🔍 调用 Qwen Rerank API", process.env.QWEN_BASE_URL);
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3-rerank",
        input: {
          query,
          documents
        },
        parameters: {
          top_n: Math.min(documents.length, 10)
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Rerank API Error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    
    // 处理错误响应
    if (data.code && data.message) {
      console.error("Rerank API Error:", data.code, data.message);
      return null;
    }
    
    if (!data || !data.output || !data.output.results) {
      console.error("Rerank response invalid:", data);
      return null;
    }

    console.log("✅ Rerank successful");
    console.log(data.output.results);

    return data.output.results as RerankResult[];

  } catch (error) {
    console.error("❌ Rerank Service Error:", error);
    return null;
  }
}
