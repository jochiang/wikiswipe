# WikiSwipe Implementation Plan

## Overview
Convert the prototype JSX into a full React/Vite application with real Transformers.js embeddings and a backend preloading service.

---

## Phase 1: Project Structure Setup

### 1.1 Initialize Vite + React Project
- Create Vite project with React template
- Configure for client-side Transformers.js (Web Workers support)
- Set up project structure:
  ```
  wikiswipe/
  ├── client/
  │   ├── src/
  │   │   ├── components/
  │   │   │   ├── ArticleCard.jsx
  │   │   │   ├── Header.jsx
  │   │   │   └── ModeIndicator.jsx
  │   │   ├── hooks/
  │   │   │   ├── useEngagementTracker.js
  │   │   │   └── useRecommendationEngine.js
  │   │   ├── services/
  │   │   │   ├── embeddings.js        # Transformers.js integration
  │   │   │   └── wikipedia.js         # Wikipedia API client
  │   │   ├── utils/
  │   │   │   └── similarity.js        # Cosine similarity
  │   │   ├── App.jsx
  │   │   ├── main.jsx
  │   │   └── styles.css
  │   ├── public/
  │   ├── index.html
  │   ├── vite.config.js
  │   └── package.json
  ├── server/
  │   ├── src/
  │   │   ├── preloader.js
  │   │   ├── embeddingCache.js
  │   │   └── index.js
  │   └── package.json
  └── package.json                      # Root workspace
  ```

### 1.2 Dependencies
**Client:**
- `react`, `react-dom`
- `@xenova/transformers` (Transformers.js with ONNX runtime)

**Server:**
- `express`
- `cors`
- `@xenova/transformers` (for server-side embedding generation)

---

## Phase 2: Transformers.js Integration

### 2.1 Client-Side Embedding Service (`client/src/services/embeddings.js`)
- Initialize pipeline with `Xenova/all-MiniLM-L6-v2`
- Lazy-load model on first use
- Configure browser caching for model files
- Implement `generateEmbedding(text)` function
- Add loading state management

### 2.2 Web Worker Setup (Optional Optimization)
- Move embedding generation to Web Worker to prevent UI blocking
- Create worker file for heavy computation
- Implement message passing for embedding requests

### 2.3 Embedding Cache
- Cache embeddings in memory during session
- Consider IndexedDB for persistence across sessions

---

## Phase 3: Backend Preloading Service

### 3.1 Express Server Setup (`server/src/index.js`)
- Create Express app with CORS
- Define API routes:
  - `GET /api/random` - Get random starting article
  - `GET /api/preload?title=X&engagement=Y` - Get next articles
  - `GET /api/article/:title` - Get specific article

### 3.2 Wikipedia API Integration (`server/src/preloader.js`)
- Implement `WikiPreloader` class:
  - `fetchArticleSummary(title)` - Get article from Wikipedia REST API
  - `getArticleLinks(title)` - Get linked articles
  - `preloadNextArticles(title, count)` - Fetch and embed batch

### 3.3 Server-Side Embedding Cache (`server/src/embeddingCache.js`)
- In-memory LRU cache for embeddings
- Generate embeddings server-side for preloaded articles
- Return pre-computed embeddings to client

### 3.4 Adaptive Sorting
- Implement exploration/exploitation ratio based on engagement score
- Sort preloaded articles by similarity with adaptive mixing

---

## Phase 4: Component Refactoring

### 4.1 Extract Components from Prototype
- `ArticleCard.jsx` - Swipe gestures, content display
- `Header.jsx` - Logo, stats display
- `ModeIndicator.jsx` - Current mode display

### 4.2 Refactor Hooks
- `useEngagementTracker.js` - Time + expansion tracking
- `useRecommendationEngine.js` - Connect to backend API + local embeddings

### 4.3 Update App.jsx
- Integrate real Wikipedia articles (replace sample data)
- Connect to backend preloader API
- Handle loading states for model initialization

---

## Phase 5: Testing & Verification

### 5.1 Unit Tests
- [ ] Cosine similarity function correctness
- [ ] Engagement score calculation
- [ ] Embedding generation produces 384-dim vectors

### 5.2 Integration Tests
- [ ] Wikipedia API fetches real articles
- [ ] Preloader returns valid article data
- [ ] Client receives and displays articles correctly

### 5.3 Manual Testing Checklist
- [ ] Model loads successfully (check console for ONNX loading)
- [ ] Embeddings generate without errors
- [ ] Swipe navigation works (touch + mouse + keyboard)
- [ ] Engagement tracking updates mode indicator
- [ ] Preloading fetches next articles before queue depletes
- [ ] Exploration/exploitation modes visibly differ in recommendations

### 5.4 Performance Tests
- [ ] Initial model load time < 5s on broadband
- [ ] Embedding generation < 100ms per article
- [ ] UI remains responsive during embedding generation

---

## Implementation Order

1. **Phase 1.1-1.2**: Set up Vite project structure and install dependencies
2. **Phase 2.1**: Implement Transformers.js embedding service
3. **Phase 4.1-4.2**: Extract and refactor components from prototype
4. **Phase 5.1**: Test embeddings work correctly
5. **Phase 3.1-3.4**: Build backend preloader service
6. **Phase 4.3**: Connect frontend to backend
7. **Phase 5.2-5.4**: Full integration and performance testing

---

## Success Criteria

1. ✅ Vite dev server runs without errors
2. ✅ `all-MiniLM-L6-v2` model loads in browser
3. ✅ Real Wikipedia articles display and are swipeable
4. ✅ Engagement tracking influences recommendation mode
5. ✅ Backend preloads articles ahead of user
6. ✅ Cosine similarity correctly ranks similar articles higher
