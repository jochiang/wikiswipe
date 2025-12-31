import React from 'react';

export function ModeIndicator({ avgEngagement, isPreloading }) {
  const getMessage = () => {
    if (isPreloading) return 'Loading next articles...';
    if (avgEngagement > 0.6) return 'Finding similar topics...';
    if (avgEngagement < 0.4) return 'Exploring new areas...';
    return 'Balancing discovery...';
  };

  return (
    <div className="mode-indicator">
      <div className={`mode-dot ${isPreloading ? 'loading' : ''}`} />
      {getMessage()}
    </div>
  );
}
