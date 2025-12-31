import { useState, useCallback, useRef, useEffect } from 'react';
import { generateEmbedding, preloadModel, isModelReady } from '../services/embeddings';
import { getArticleLinks, preloadArticles, getRandomArticle } from '../services/wikipedia';
import { cosineSimilarity } from '../utils/similarity';

const CONFIG = {
  PRELOAD_COUNT: 6, // Number of articles to preload
  PRELOAD_TRIGGER_REMAINING: 4, // Trigger preload when this many remain (earlier = smoother)
  MIN_CANDIDATES: 4 // Minimum candidates for selection
};

/**
 * Hook for managing article recommendations with embeddings
 */
export function useRecommendationEngine() {
  const [modelStatus, setModelStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [articleQueue, setArticleQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  // Cache embeddings by article title
  const embeddingsRef = useRef(new Map());
  const viewedTitlesRef = useRef(new Set());
  const preloadingRef = useRef(false);

  // Start loading model on mount
  useEffect(() => {
    async function initModel() {
      setModelStatus('loading');
      try {
        await preloadModel();
        setModelStatus('ready');
      } catch (error) {
        console.error('Failed to load embedding model:', error);
        setModelStatus('error');
      }
    }
    initModel();
  }, []);

  /**
   * Generate and cache embedding for an article
   */
  const getArticleEmbedding = useCallback(async (article) => {
    const key = article.title;
    if (embeddingsRef.current.has(key)) {
      return embeddingsRef.current.get(key);
    }

    const text = `${article.title}. ${article.summary || ''} ${article.content || ''}`;
    const embedding = await generateEmbedding(text);
    embeddingsRef.current.set(key, embedding);
    return embedding;
  }, []);

  /**
   * Initialize with a starting article
   */
  const initialize = useCallback(async () => {
    try {
      const startArticle = await getRandomArticle();
      viewedTitlesRef.current.add(startArticle.title);

      // Generate embedding for starting article
      if (isModelReady()) {
        startArticle.embedding = await getArticleEmbedding(startArticle);
      }

      setArticleQueue([startArticle]);
      setCurrentIndex(0);

      return startArticle;
    } catch (error) {
      console.error('Failed to initialize:', error);
      throw error;
    }
  }, [getArticleEmbedding]);

  /**
   * Select next articles based on exploration/exploitation ratio
   */
  const selectNextArticles = useCallback((candidates, currentEmbedding, explorationRatio) => {
    if (!currentEmbedding || candidates.length === 0) {
      return candidates.slice(0, CONFIG.PRELOAD_COUNT);
    }

    // Score all candidates by similarity
    const scored = candidates.map(article => ({
      article,
      similarity: article.embedding
        ? cosineSimilarity(currentEmbedding, article.embedding)
        : 0
    }));

    // Sort by similarity (highest first)
    scored.sort((a, b) => b.similarity - a.similarity);

    const numExplore = Math.floor(CONFIG.PRELOAD_COUNT * explorationRatio);
    const numExploit = CONFIG.PRELOAD_COUNT - numExplore;

    // Exploit: take most similar
    const exploitPicks = scored.slice(0, numExploit);

    // Explore: take from less similar half, randomized
    const exploreCandidates = scored.slice(Math.floor(scored.length / 2));
    const shuffled = exploreCandidates.sort(() => Math.random() - 0.5);
    const explorePicks = shuffled.slice(0, numExplore);

    // Combine and shuffle final selection
    const selected = [...exploitPicks, ...explorePicks]
      .map(s => s.article)
      .sort(() => Math.random() - 0.5);

    return selected;
  }, []);

  /**
   * Preload next batch of articles
   */
  const preloadNext = useCallback(async (currentArticle, explorationRatio = 0.5) => {
    if (preloadingRef.current || !currentArticle) return;
    preloadingRef.current = true;
    setIsPreloading(true);

    try {
      // Get linked articles from current page
      const linkedTitles = await getArticleLinks(currentArticle.title, 20);

      // Filter out already viewed and shuffle to avoid alphabetical bias
      const newTitles = linkedTitles
        .filter(t => !viewedTitlesRef.current.has(t))
        .sort(() => Math.random() - 0.5);

      // Inject random articles based on exploration ratio
      // High exploration = more random articles mixed in
      const numRandomToAdd = Math.max(
        CONFIG.MIN_CANDIDATES - newTitles.length, // At minimum, fill gaps
        Math.floor(explorationRatio * 4) // Add more randoms when exploring
      );

      if (numRandomToAdd > 0) {
        const randomArticles = await Promise.all(
          Array(numRandomToAdd)
            .fill(null)
            .map(() => getRandomArticle())
        );
        randomArticles.forEach(a => {
          if (!viewedTitlesRef.current.has(a.title)) {
            newTitles.push(a.title);
          }
        });
      }

      // Fetch article summaries
      const articles = await preloadArticles(newTitles.slice(0, 12));

      // Generate embeddings for candidates (in parallel)
      if (isModelReady()) {
        await Promise.all(
          articles.map(async (article) => {
            article.embedding = await getArticleEmbedding(article);
          })
        );
      }

      // Get current article embedding
      const currentEmbedding = currentArticle.embedding ||
        await getArticleEmbedding(currentArticle);

      // Select best articles based on exploration/exploitation
      const selected = selectNextArticles(articles, currentEmbedding, explorationRatio);

      // Mark as viewed and add to queue
      selected.forEach(a => viewedTitlesRef.current.add(a.title));
      setArticleQueue(prev => [...prev, ...selected]);

    } catch (error) {
      console.error('Preload failed:', error);
    } finally {
      preloadingRef.current = false;
      setIsPreloading(false);
    }
  }, [getArticleEmbedding, selectNextArticles]);

  /**
   * Move to next article
   */
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next < articleQueue.length) {
        return next;
      }
      return prev;
    });
  }, [articleQueue.length]);

  /**
   * Move to previous article
   */
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Get current article
   */
  const currentArticle = articleQueue[currentIndex] || null;

  /**
   * Check if should trigger preload
   */
  const shouldPreload = articleQueue.length - currentIndex <= CONFIG.PRELOAD_TRIGGER_REMAINING;

  return {
    modelStatus,
    articleQueue,
    currentIndex,
    currentArticle,
    isPreloading,
    shouldPreload,
    initialize,
    preloadNext,
    goToNext,
    goToPrevious,
    getArticleEmbedding
  };
}
