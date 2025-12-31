# WikiSwipe

A TikTok-style Wikipedia discovery interface with adaptive AI-powered recommendations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   Swipe UI  │───▶│  Engagement  │───▶│  Recommendation │    │
│  │  (React)    │    │   Tracker    │    │     Engine      │    │
│  └─────────────┘    └──────────────┘    └────────┬────────┘    │
│                                                   │             │
│                     ┌─────────────────────────────▼──────┐      │
│                     │     Transformers.js Embeddings     │      │
│                     │     (all-MiniLM-L6-v2 / 384-dim)   │      │
│                     └────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │  Wikipedia  │───▶│   Preloader  │───▶│    Embedding    │    │
│  │     API     │    │   (4 pages)  │    │      Cache      │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Engagement Tracking

The system tracks two primary signals:
- **Time on page**: How long the user views each article
- **Expansion events**: Whether the user taps to read the full content

These combine into an engagement score (0-1):
```javascript
engagementScore = (timeComponent * 0.5) + (expandedBonus * 0.5)
```

### 2. Adaptive Recommendations

The recommendation engine adjusts based on engagement:

| Engagement Score | Strategy | Behavior |
|-----------------|----------|----------|
| > 0.6 (High) | Exploitation | Show similar content |
| < 0.4 (Low) | Exploration | Show diverse content |
| 0.4 - 0.6 | Balanced | Mix of both |

### 3. Embedding-Based Similarity

Each article is embedded into a 384-dimensional vector space. Similarity is computed via cosine similarity:

```javascript
similarity = (A · B) / (||A|| × ||B||)
```

## Production Integration

### Installing Transformers.js

```bash
npm install @xenova/transformers
```

### Replace the Mock Embedding Function

```javascript
import { pipeline, env } from '@xenova/transformers';

// Configure to use browser cache
env.useBrowserCache = true;
env.allowLocalModels = false;

let embeddingPipeline = null;

const getEmbedder = async () => {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embeddingPipeline;
};

const generateEmbedding = async (text) => {
  const embedder = await getEmbedder();
  const output = await embedder(text, { 
    pooling: 'mean', 
    normalize: true 
  });
  return Array.from(output.data);
};
```

### Backend Preloading Service

```javascript
// server/preloader.js
import { pipeline } from '@xenova/transformers';

class WikiPreloader {
  constructor() {
    this.embeddingCache = new Map();
    this.articleCache = new Map();
  }

  async fetchWikipediaArticle(title) {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    return response.json();
  }

  async preloadNextArticles(currentArticle, count = 4) {
    // Get linked articles from Wikipedia API
    const links = await this.getArticleLinks(currentArticle.title);
    
    // Fetch and embed each
    const articles = await Promise.all(
      links.slice(0, count).map(async (title) => {
        const article = await this.fetchWikipediaArticle(title);
        const embedding = await this.getOrCreateEmbedding(article);
        return { ...article, embedding };
      })
    );

    return articles;
  }

  async getArticleLinks(title) {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=links&pllimit=20&format=json&origin=*`
    );
    const data = await response.json();
    const pages = Object.values(data.query.pages);
    return pages[0]?.links?.map(l => l.title) || [];
  }
}
```

### API Endpoint

```javascript
// server/api.js
import express from 'express';
import { WikiPreloader } from './preloader.js';

const app = express();
const preloader = new WikiPreloader();

app.get('/api/preload', async (req, res) => {
  const { currentTitle, engagementScore } = req.query;
  
  const articles = await preloader.preloadNextArticles(
    { title: currentTitle },
    4
  );
  
  // Score by similarity to current article
  const currentEmbedding = await preloader.getOrCreateEmbedding(
    await preloader.fetchWikipediaArticle(currentTitle)
  );
  
  const scored = articles.map(article => ({
    ...article,
    similarity: cosineSimilarity(currentEmbedding, article.embedding)
  }));

  // Adaptive sorting based on engagement
  const explorationRatio = engagementScore > 0.6 ? 0.25 : 
                          engagementScore < 0.4 ? 0.75 : 0.5;
  
  res.json({
    articles: adaptiveSort(scored, explorationRatio)
  });
});
```

## User Flow

```
┌──────────────────┐
│   User opens     │
│    WikiSwipe     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Show first      │────▶│  Preload 4 next  │
│    article       │     │    articles      │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Track time &    │
│   expansions     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │  Swipe  │
    └────┬────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Calculate       │────▶│  Adjust explore/ │
│  engagement      │     │  exploit ratio   │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Score preloaded │
│  by similarity   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Select next     │
│  based on ratio  │
└────────┬─────────┘
         │
         └──────────────────▶ (repeat)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ↑ / k | Next article |
| ↓ / j | Previous article |
| Space / Enter | Expand/collapse |

## Configuration Options

```javascript
const CONFIG = {
  // Engagement thresholds
  HIGH_ENGAGEMENT_THRESHOLD: 0.6,
  LOW_ENGAGEMENT_THRESHOLD: 0.4,
  
  // Time tracking
  MAX_TIME_COMPONENT_MS: 5000,  // Time at which engagement maxes out
  
  // Preloading
  PRELOAD_COUNT: 4,
  PRELOAD_TRIGGER_REMAINING: 2, // Preload when N articles remain
  
  // Embeddings
  EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2',
  EMBEDDING_DIM: 384,
};
```

## Potential Enhancements

1. **Persistent user profiles** - Store embedding centroids of liked content
2. **Multi-armed bandit** - More sophisticated explore/exploit algorithm
3. **Reading velocity** - Track scroll speed as engagement signal
4. **Category diversity** - Ensure topic variety in recommendations
5. **Social signals** - Integrate trending/popular articles
6. **Offline mode** - Cache articles and embeddings in IndexedDB
