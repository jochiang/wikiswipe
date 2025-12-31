/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First embedding vector
 * @param {number[]} b - Second embedding vector
 * @returns {number} Similarity score between -1 and 1
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find top-k most similar items from candidates
 * @param {number[]} queryEmbedding - The embedding to compare against
 * @param {Array<{embedding: number[], ...}>} candidates - Array of items with embeddings
 * @param {number} k - Number of results to return
 * @returns {Array<{item: object, similarity: number}>}
 */
export function topKSimilar(queryEmbedding, candidates, k = 4) {
  const scored = candidates
    .filter(item => item.embedding)
    .map(item => ({
      item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, k);
}
