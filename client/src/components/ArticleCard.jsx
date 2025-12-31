import React, { useState, useRef } from 'react';

const MIN_SWIPE_DISTANCE = 50;

export function ArticleCard({ article, isExpanded, onExpand, onSwipe }) {
  const [touchStart, setTouchStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);

  if (!article) return null;

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientY);
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentY = e.targetTouches[0].clientY;
    const offset = currentY - touchStart;
    setDragOffset(offset);
    if (Math.abs(offset) > 10) {
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;

    if (Math.abs(dragOffset) > MIN_SWIPE_DISTANCE) {
      if (dragOffset < 0) {
        onSwipe('up');
      } else {
        onSwipe('down');
      }
    }

    setDragOffset(0);
    setTouchStart(null);
  };

  // Mouse support for desktop
  const handleMouseDown = (e) => {
    setTouchStart(e.clientY);
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (touchStart === null) return;
    const offset = e.clientY - touchStart;
    setDragOffset(offset);
    if (Math.abs(offset) > 10) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseUp = () => {
    if (touchStart === null) return;

    if (Math.abs(dragOffset) > MIN_SWIPE_DISTANCE) {
      if (dragOffset < 0) {
        onSwipe('up');
      } else {
        onSwipe('down');
      }
    }

    setDragOffset(0);
    setTouchStart(null);
  };

  const handleClick = () => {
    if (!isDraggingRef.current) {
      onExpand();
    }
  };

  // Truncate summary for collapsed view
  const MAX_COLLAPSED_LENGTH = 150;
  const fullText = article.summary || '';
  const needsTruncation = fullText.length > MAX_COLLAPSED_LENGTH;
  const truncatedText = needsTruncation
    ? fullText.slice(0, MAX_COLLAPSED_LENGTH).trim() + '...'
    : fullText;

  return (
    <div
      className="article-card"
      style={{
        transform: `translateY(${dragOffset * 0.5}px)`,
        opacity: 1 - Math.abs(dragOffset) / 500
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={touchStart !== null ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDragOffset(0);
        setTouchStart(null);
      }}
      onClick={handleClick}
    >
      {article.thumbnail && (
        <div className="card-thumbnail">
          <img src={article.thumbnail} alt="" />
        </div>
      )}

      <h1 className="card-title">{article.title}</h1>

      <p className="card-summary">
        {isExpanded ? fullText : truncatedText}
      </p>

      {isExpanded && article.pageUrl && (
        <div className="card-content">
          <a
            href={article.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="read-more-link"
            onClick={(e) => e.stopPropagation()}
          >
            Read full article on Wikipedia →
          </a>
        </div>
      )}

      <div className="card-hint">
        {isExpanded
          ? 'Tap to collapse • Swipe for next'
          : (needsTruncation ? 'Tap to read more • Swipe for next' : 'Swipe for next')}
      </div>

      <div className="swipe-indicator up">
        <span>↑</span>
      </div>
      <div className="swipe-indicator down">
        <span>↓</span>
      </div>
    </div>
  );
}
