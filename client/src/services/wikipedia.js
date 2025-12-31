const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKIPEDIA_ACTION_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch article summary from Wikipedia REST API
 * @param {string} title - Article title
 * @returns {Promise<object>} Article data with title, extract, thumbnail, etc.
 */
export async function fetchArticleSummary(title) {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  const response = await fetch(`${WIKIPEDIA_API_BASE}/page/summary/${encodedTitle}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${title}`);
  }

  const data = await response.json();

  return {
    title: data.title,
    summary: data.extract,
    content: data.extract, // REST API only gives summary, we'll use it as content
    thumbnail: data.thumbnail?.source || null,
    pageUrl: data.content_urls?.desktop?.page || null,
    pageId: data.pageid
  };
}

/**
 * Fetch full article extract (longer content)
 * @param {string} title - Article title
 * @returns {Promise<object>} Article with longer extract
 */
export async function fetchArticleExtract(title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts',
    exintro: '0', // Get full content, not just intro
    explaintext: '1', // Plain text, no HTML
    exsectionformat: 'plain',
    format: 'json',
    origin: '*'
  });

  const response = await fetch(`${WIKIPEDIA_ACTION_API}?${params}`);
  const data = await response.json();
  const pages = Object.values(data.query.pages);

  if (pages.length === 0 || pages[0].missing) {
    throw new Error(`Article not found: ${title}`);
  }

  const page = pages[0];
  return {
    title: page.title,
    content: page.extract || '',
    pageId: page.pageid
  };
}

/**
 * Get linked articles from a page
 * @param {string} title - Article title
 * @param {number} limit - Max number of links to return
 * @returns {Promise<string[]>} Array of linked article titles
 */
export async function getArticleLinks(title, limit = 20) {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'links',
    pllimit: limit.toString(),
    plnamespace: '0', // Main namespace only (articles)
    format: 'json',
    origin: '*'
  });

  const response = await fetch(`${WIKIPEDIA_ACTION_API}?${params}`);
  const data = await response.json();
  const pages = Object.values(data.query.pages);

  if (pages.length === 0 || !pages[0].links) {
    return [];
  }

  return pages[0].links
    .map(link => link.title)
    .filter(t => !t.includes(':')) // Filter out special pages
    .filter(t => t.length > 3); // Filter out very short titles
}

/**
 * Get a random article
 * @returns {Promise<object>} Random article summary
 */
export async function getRandomArticle() {
  const response = await fetch(`${WIKIPEDIA_API_BASE}/page/random/summary`);

  if (!response.ok) {
    throw new Error('Failed to fetch random article');
  }

  const data = await response.json();

  return {
    title: data.title,
    summary: data.extract,
    content: data.extract,
    thumbnail: data.thumbnail?.source || null,
    pageUrl: data.content_urls?.desktop?.page || null,
    pageId: data.pageid
  };
}

/**
 * Search for articles
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<string[]>} Array of matching article titles
 */
export async function searchArticles(query, limit = 10) {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: limit.toString(),
    namespace: '0',
    format: 'json',
    origin: '*'
  });

  const response = await fetch(`${WIKIPEDIA_ACTION_API}?${params}`);
  const data = await response.json();

  // OpenSearch returns [query, [titles], [descriptions], [urls]]
  return data[1] || [];
}

/**
 * Preload multiple articles in parallel
 * @param {string[]} titles - Array of article titles
 * @returns {Promise<object[]>} Array of article summaries
 */
export async function preloadArticles(titles) {
  const results = await Promise.allSettled(
    titles.map(title => fetchArticleSummary(title))
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
