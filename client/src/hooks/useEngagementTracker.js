import { useState, useCallback, useRef } from 'react';

const CONFIG = {
  MAX_TIME_COMPONENT_MS: 5000, // Time at which engagement maxes out
  TIME_WEIGHT: 0.5,
  EXPANSION_WEIGHT: 0.5
};

/**
 * Hook to track user engagement with articles
 * Tracks time spent viewing and whether content was expanded
 */
export function useEngagementTracker() {
  const [engagementData, setEngagementData] = useState({});
  const startTimeRef = useRef(null);
  const currentArticleIdRef = useRef(null);

  /**
   * Start tracking engagement for an article
   * @param {string|number} articleId
   */
  const startTracking = useCallback((articleId) => {
    startTimeRef.current = Date.now();
    currentArticleIdRef.current = articleId;
  }, []);

  /**
   * Calculate engagement score from time and expansion
   * @param {number} timeSpent - Time in ms
   * @param {boolean} didExpand - Whether user expanded content
   * @returns {number} Score between 0 and 1
   */
  const calculateEngagementScore = useCallback((timeSpent, didExpand) => {
    const timeComponent = Math.min(timeSpent / CONFIG.MAX_TIME_COMPONENT_MS, 1);
    const expandComponent = didExpand ? 1 : 0;

    return (timeComponent * CONFIG.TIME_WEIGHT) + (expandComponent * CONFIG.EXPANSION_WEIGHT);
  }, []);

  /**
   * End tracking and record engagement
   * @param {string|number} articleId
   * @param {boolean} didExpand - Whether user expanded the content
   * @returns {object} The recorded engagement data
   */
  const endTracking = useCallback((articleId, didExpand) => {
    if (!startTimeRef.current) {
      return null;
    }

    const timeSpent = Date.now() - startTimeRef.current;
    const engagement = calculateEngagementScore(timeSpent, didExpand);

    const data = {
      timeSpent,
      expanded: didExpand,
      engagement,
      timestamp: Date.now()
    };

    setEngagementData(prev => ({
      ...prev,
      [articleId]: data
    }));

    startTimeRef.current = null;
    currentArticleIdRef.current = null;

    return data;
  }, [calculateEngagementScore]);

  /**
   * Get average engagement from recent articles
   * @param {number} recentCount - Number of recent articles to average
   * @returns {number} Average engagement score
   */
  const getAverageEngagement = useCallback((recentCount = 5) => {
    const entries = Object.values(engagementData);
    if (entries.length === 0) return 0.5; // Default to balanced

    const recent = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, recentCount);

    const sum = recent.reduce((acc, entry) => acc + entry.engagement, 0);
    return sum / recent.length;
  }, [engagementData]);

  /**
   * Get recommendation mode based on engagement
   * @returns {'exploration' | 'exploitation' | 'balanced'}
   */
  const getRecommendationMode = useCallback(() => {
    const avg = getAverageEngagement();
    if (avg > 0.6) return 'exploitation';
    if (avg < 0.4) return 'exploration';
    return 'balanced';
  }, [getAverageEngagement]);

  /**
   * Get exploration ratio for recommendation algorithm
   * @returns {number} Ratio between 0 and 1 (higher = more exploration)
   */
  const getExplorationRatio = useCallback(() => {
    const avg = getAverageEngagement();
    if (avg > 0.6) return 0.25; // High engagement -> exploit (less exploration)
    if (avg < 0.4) return 0.75; // Low engagement -> explore more
    return 0.5; // Balanced
  }, [getAverageEngagement]);

  return {
    engagementData,
    startTracking,
    endTracking,
    getAverageEngagement,
    getRecommendationMode,
    getExplorationRatio
  };
}
