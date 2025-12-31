import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for browser usage
env.useBrowserCache = true;
env.allowLocalModels = false;

// Singleton pipeline instance
let embeddingPipeline = null;
let isLoading = false;
let loadPromise = null;

// In-memory cache for embeddings
const embeddingCache = new Map();

/**
 * Initialize and get the embedding pipeline (lazy-loaded)
 * @returns {Promise<Pipeline>}
 */
async function getEmbedder() {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { progress_callback: (progress) => {
      if (progress.status === 'downloading') {
        console.log(`Downloading model: ${Math.round(progress.progress)}%`);
      }
    }}
  );

  embeddingPipeline = await loadPromise;
  isLoading = false;
  console.log('Embedding model loaded successfully');
  return embeddingPipeline;
}

/**
 * Generate embedding for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 384-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  // Check cache first
  const cacheKey = text.slice(0, 500); // Use first 500 chars as key
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  const embedder = await getEmbedder();

  // Truncate text to reasonable length for the model
  const truncatedText = text.slice(0, 512);

  const output = await embedder(truncatedText, {
    pooling: 'mean',
    normalize: true
  });

  const embedding = Array.from(output.data);

  // Cache the result
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

/**
 * Generate embeddings for multiple texts in parallel
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
  return Promise.all(texts.map(text => generateEmbedding(text)));
}

/**
 * Check if the model is ready
 * @returns {boolean}
 */
export function isModelReady() {
  return embeddingPipeline !== null;
}

/**
 * Check if the model is currently loading
 * @returns {boolean}
 */
export function isModelLoading() {
  return isLoading;
}

/**
 * Preload the model (call early to start download)
 * @returns {Promise<void>}
 */
export async function preloadModel() {
  await getEmbedder();
}

/**
 * Get cache statistics
 * @returns {{size: number}}
 */
export function getCacheStats() {
  return {
    size: embeddingCache.size
  };
}
