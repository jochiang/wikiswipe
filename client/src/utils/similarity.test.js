import { describe, it, expect } from 'vitest';
import { cosineSimilarity, topKSimilar } from './similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
  });

  it('handles normalized vectors correctly', () => {
    // Two vectors at 45 degrees
    const a = [1, 0];
    const b = [Math.SQRT1_2, Math.SQRT1_2];
    expect(cosineSimilarity(a, b)).toBeCloseTo(Math.SQRT1_2);
  });

  it('returns 0 for null or mismatched inputs', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], null)).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe('topKSimilar', () => {
  const query = [1, 0, 0];
  const candidates = [
    { id: 1, embedding: [1, 0, 0] },       // similarity 1
    { id: 2, embedding: [0.9, 0.1, 0] },   // high similarity
    { id: 3, embedding: [0, 1, 0] },       // similarity 0
    { id: 4, embedding: [-1, 0, 0] },      // similarity -1
    { id: 5, embedding: [0.5, 0.5, 0] },   // medium similarity
  ];

  it('returns top k most similar items', () => {
    const results = topKSimilar(query, candidates, 2);
    expect(results).toHaveLength(2);
    expect(results[0].item.id).toBe(1);
    expect(results[0].similarity).toBeCloseTo(1);
  });

  it('sorts by similarity descending', () => {
    const results = topKSimilar(query, candidates, 3);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
  });

  it('filters out items without embeddings', () => {
    const candidatesWithMissing = [
      ...candidates,
      { id: 6, embedding: null },
      { id: 7 } // no embedding property
    ];
    const results = topKSimilar(query, candidatesWithMissing, 10);
    expect(results).toHaveLength(5); // Only 5 have embeddings
  });
});
