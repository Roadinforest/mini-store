import { prisma } from '@/db/prisma';
import { PineconeQuery, generateEmbedding } from '@/lib/rag/pinecone';
import { searchProductsByNameWithTS } from '@/lib/actions/product.actions';
import { rerankWithQwen } from './rerank';


const RRF_K = 60;

/**
 * 混合搜索服务
 * 结合 Vector Search (语义) 和 Text Search (关键词)，使用 RRF 算法融合排序
 */
export async function searchProducts(query: string) {
  // 1. 并行请求: 语义搜索 (Vector) + 全文检索 (TS)
  // Agent -->|调用| Tool -->|1. 并行请求| Parallel
  const [vectorResults, textResults] = await Promise.all([
    // VectorDB -->|Top 20| ResA
    PineconeQuery.queryByText(query, generateEmbedding, { topK: 20 }),
    // SQLDB -->|Top 20| ResB
    searchProductsByNameWithTS(query)
  ]);

  // 2. RRF 融合
  // ResA & ResB -->|2. RRF 融合| Fusion[融合算法]
  const rrfScores = new Map<string, number>();

  // 处理 Vector 结果 (ResA)
  if (vectorResults.matches) {
    vectorResults.matches.forEach((match, index) => {
      const rank = index + 1;
      const score = 1 / (RRF_K + rank); // RRF公式
      rrfScores.set(match.id, (rrfScores.get(match.id) || 0) + score);
    });
  }

  // 处理 Text 结果 (ResB)
  if (Array.isArray(textResults)) {
    textResults.forEach((item: any, index: number) => {
      const rank = index + 1;
      const score = 1 / (RRF_K + rank); // RRF公式
      rrfScores.set(item.id, (rrfScores.get(item.id) || 0) + score);
    });
  }

  // 3. 生成候选集
  // Fusion -->|Top 20| Candidates[候选集]
  const candidates = Array.from(rrfScores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // 取前20个进行重排序

  // 4. 获取完整产品信息准备重排序
  const productIds = candidates.map(c => c.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });

  // 这里的 validProducts 顺序可能不再与 candidates 一致 (数据库返回顺序不定)
  // 我们需要重新对齐，或者直接基于 validProducts 构建 documents
  // 为了保证 RRF 分数也能由 index 对应，我们先对其：
  const validCandidates = candidates
    .map(c => {
      const p = products.find(prod => prod.id === c.id);
      return p ? { ...p, rrfScore: c.score } : null;
    })
    .filter(item => item !== null) as any[];

  if (validCandidates.length === 0) return [];

  // 构建重排序文档列表
  const documents = validCandidates.map(p => 
    `${p.name} ${p.brand || ''} ${p.category || ''} ${p.description || ''}`.trim()
  );

  // 5. 调用 Reranker
  // Candidates -->|3. Rerank| Reranker[重排序模型]
  const rerankedScores = await rerankWithQwen(query, documents);

  let finalResults;

  if (rerankedScores && rerankedScores.length > 0) {
    // 根据 Rerank 分数重排
    finalResults = rerankedScores
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(res => {
        const product = validCandidates[res.index];
        return {
          ...product,
          _score: res.relevance_score
        };
      })
      .slice(0, 10); // Reranker -->|Top 10| Final
  } else {
    // 降级: 使用 RRF 结果
    console.warn("Rerank failed or returned empty, falling back to RRF scores");
    finalResults = validCandidates
      .slice(0, 10)
      .map(p => ({ ...p, _score: p.rrfScore }));
  }

  return finalResults;
}
