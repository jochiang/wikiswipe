import React from 'react';

export function Header({ stats, modelStatus }) {
  const getModeLabel = () => {
    if (stats.avgEngagement > 0.6) return 'Deep Dive';
    if (stats.avgEngagement < 0.4) return 'Exploring';
    return 'Balanced';
  };

  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">W</div>
        WikiSwipe
      </div>

      <div className="stats-bar">
        <div className="stat">
          <span>Viewed</span>
          <span className="stat-value">{stats.viewed}</span>
        </div>
        <div className="stat">
          <span>Mode</span>
          <span className="stat-value">{getModeLabel()}</span>
        </div>
      </div>

      <div className={`model-status ${modelStatus}`}>
        <div className="status-dot" />
        {modelStatus === 'loading' && 'Loading AI...'}
        {modelStatus === 'ready' && 'AI Ready'}
        {modelStatus === 'error' && 'AI Error'}
        {modelStatus === 'idle' && 'Initializing...'}
      </div>
    </header>
  );
}
