import React, { useState, useEffect, useCallback } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { Header } from './components/Header';
import { ModeIndicator } from './components/ModeIndicator';
import { useEngagementTracker } from './hooks/useEngagementTracker';
import { useRecommendationEngine } from './hooks/useRecommendationEngine';

export default function App() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState({ viewed: 0, avgEngagement: 0.5 });
  const [error, setError] = useState(null);

  const {
    startTracking,
    endTracking,
    getAverageEngagement,
    getExplorationRatio
  } = useEngagementTracker();

  const {
    modelStatus,
    currentArticle,
    currentIndex,
    articleQueue,
    isPreloading,
    shouldPreload,
    initialize,
    preloadNext,
    goToNext,
    goToPrevious
  } = useRecommendationEngine();

  // Initialize on mount
  useEffect(() => {
    async function init() {
      try {
        await initialize();
        setIsInitialized(true);
        setStats(prev => ({ ...prev, viewed: 1 }));
      } catch (err) {
        setError('Failed to load initial article. Please refresh.');
        console.error(err);
      }
    }
    init();
  }, [initialize]);

  // Start tracking when article changes
  useEffect(() => {
    if (currentArticle) {
      startTracking(currentArticle.title);
    }
  }, [currentArticle, startTracking]);

  // Trigger preload when needed
  useEffect(() => {
    if (shouldPreload && currentArticle && !isPreloading) {
      const ratio = getExplorationRatio();
      preloadNext(currentArticle, ratio);
    }
  }, [shouldPreload, currentArticle, isPreloading, preloadNext, getExplorationRatio]);

  const handleSwipe = useCallback((direction) => {
    if (direction === 'up') {
      // Record engagement before moving
      endTracking(currentArticle?.title, isExpanded);

      goToNext();
      setIsExpanded(false);
      setStats(prev => ({
        viewed: prev.viewed + 1,
        avgEngagement: getAverageEngagement()
      }));
    } else if (direction === 'down') {
      goToPrevious();
      setIsExpanded(false);
    }
  }, [currentArticle, isExpanded, endTracking, goToNext, goToPrevious, getAverageEngagement]);

  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handleSwipe('up');
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleSwipe('down');
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleExpand();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, handleExpand]);

  // Progress percentage
  const progress = articleQueue.length > 1
    ? (currentIndex / (articleQueue.length - 1)) * 100
    : 0;

  if (error) {
    return (
      <div className="app-container">
        <div className="error-state">
          <h1>Oops!</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header stats={stats} modelStatus={modelStatus} />

      <div className="feed-container">
        {!isInitialized ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Finding something interesting...</p>
          </div>
        ) : currentArticle ? (
          <ArticleCard
            article={currentArticle}
            isExpanded={isExpanded}
            onExpand={handleExpand}
            onSwipe={handleSwipe}
          />
        ) : (
          <div className="empty-state">
            <p>No more articles to show</p>
          </div>
        )}
      </div>

      <ModeIndicator
        avgEngagement={stats.avgEngagement}
        isPreloading={isPreloading}
      />

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
