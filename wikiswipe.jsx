import React, { useState, useEffect, useRef, useCallback } from 'react';

// Simulated embedding function - in production, this would use transformers.js
// with a model like 'Xenova/all-MiniLM-L6-v2'
const generateEmbedding = async (text) => {
  // Simulate embedding generation with a deterministic hash-based approach
  const hash = text.split('').reduce((acc, char, i) => {
    return acc + char.charCodeAt(0) * (i + 1);
  }, 0);
  
  // Generate a 384-dim pseudo-embedding (matching MiniLM output)
  const embedding = Array(384).fill(0).map((_, i) => 
    Math.sin(hash * (i + 1) * 0.001) * Math.cos(hash * (i + 1) * 0.0007)
  );
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
};

const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
};

// Sample Wikipedia-style articles for demo
const WIKI_ARTICLES = [
  {
    id: 1,
    title: "Bioluminescence",
    summary: "The production and emission of light by living organisms, a form of chemiluminescence.",
    content: `Bioluminescence is the production and emission of light by living organisms. It is a form of chemiluminescence. Bioluminescence occurs widely in marine vertebrates and invertebrates, as well as in some fungi, microorganisms including some bioluminescent bacteria, and terrestrial arthropods such as fireflies.

In some animals, the light is bacteriogenic, produced by symbiotic bacteria such as those from the genus Vibrio; in others, it is autogenic, produced by the animals themselves.

The principal chemical reaction in bioluminescence involves the light-emitting pigment luciferin and the enzyme luciferase. The luciferin reacts with oxygen to create light, and the luciferase acts as a catalyst to speed up the reaction.

Deep-sea creatures like anglerfish use bioluminescence to attract prey, while fireflies use it for mating signals. Some squid can even produce light to match the moonlight above them, effectively becoming invisible to predators below.`,
    image: "🌊",
    category: "Biology",
    linkedArticles: [2, 5, 8]
  },
  {
    id: 2,
    title: "Deep Sea Gigantism",
    summary: "The tendency for deep-sea dwelling animals to be larger than their shallower-water relatives.",
    content: `Deep-sea gigantism is the tendency for species of invertebrates and other deep-sea dwelling animals to be larger than their shallower-water relatives across a large taxonomic range.

Proposed explanations for this phenomenon include: scarcer resources at greater depths, greater pressure, colder temperatures causing a low metabolic rate, and lack of predators.

Famous examples include the giant isopod, giant squid, giant tube worm, and the Japanese spider crab. The giant squid can reach lengths of up to 13 meters (43 feet) and has the largest eyes in the animal kingdom.

Temperature plays a crucial role - cold water holds more dissolved oxygen, which may allow organisms to grow larger. The absence of light also means less predation pressure, potentially allowing organisms more time to grow.`,
    image: "🦑",
    category: "Marine Biology",
    linkedArticles: [1, 3, 7]
  },
  {
    id: 3,
    title: "Extremophiles",
    summary: "Organisms that thrive in physically or geochemically extreme conditions.",
    content: `An extremophile is an organism that is able to live in extreme environments, i.e., environments with conditions approaching the limits of life. These organisms have adapted to harsh conditions that would kill most life forms.

Types of extremophiles include:
• Thermophiles and hyperthermophiles (high temperature)
• Psychrophiles (low temperature)  
• Acidophiles and alkaliphiles (extreme pH)
• Halophiles (high salt concentration)
• Barophiles/Piezophiles (high pressure)

The discovery of extremophiles has expanded our understanding of the limits of life and has implications for astrobiology - the search for life on other planets. If life can survive in boiling hot springs or freezing Antarctic lakes, perhaps it could survive on Mars or Europa.

Enzymes from extremophiles, called extremozymes, have practical applications in biotechnology, including PCR (polymerase chain reaction) which uses heat-stable enzymes from Thermus aquaticus.`,
    image: "🦠",
    category: "Microbiology",
    linkedArticles: [2, 4, 6]
  },
  {
    id: 4,
    title: "Fermi Paradox",
    summary: "The apparent contradiction between the lack of evidence for extraterrestrial civilizations and high probability estimates for their existence.",
    content: `The Fermi paradox is the discrepancy between the lack of conclusive evidence of advanced extraterrestrial life and the apparently high likelihood of its existence.

Named after physicist Enrico Fermi, the paradox arose from a 1950 conversation where Fermi allegedly asked, "Where is everybody?"

Given the age of the universe (13.8 billion years), the number of stars with planets, and the relatively short time required for intelligent life to colonize a galaxy, many scientists expected evidence of alien civilizations by now.

Proposed solutions include:
• The Great Filter - some barrier prevents civilizations from becoming spacefaring
• Zoo hypothesis - aliens are watching but not interfering
• Rare Earth hypothesis - complex life is extraordinarily rare
• Dark forest theory - civilizations hide from each other for survival
• We are among the first advanced civilizations

The paradox continues to drive research in astrobiology and SETI (Search for Extraterrestrial Intelligence).`,
    image: "👽",
    category: "Astronomy",
    linkedArticles: [3, 5, 9]
  },
  {
    id: 5,
    title: "Quantum Entanglement",
    summary: "A quantum mechanical phenomenon in which particles become interconnected regardless of distance.",
    content: `Quantum entanglement is a phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle cannot be described independently.

When particles are entangled, measuring a property of one particle instantaneously affects the corresponding property of its entangled partner, regardless of the distance between them. Einstein famously called this "spooky action at a distance."

Key aspects:
• Entanglement does not allow faster-than-light communication
• The correlation between measurements is stronger than any classical correlation
• Entanglement is a key resource for quantum computing and quantum cryptography

Practical applications include quantum key distribution for secure communication, quantum teleportation of quantum states (not matter), and quantum computing algorithms that exploit entanglement for computational advantage.

The phenomenon has been experimentally verified countless times, most notably earning the 2022 Nobel Prize in Physics for Alain Aspect, John Clauser, and Anton Zeilinger.`,
    image: "⚛️",
    category: "Physics",
    linkedArticles: [4, 6, 10]
  },
  {
    id: 6,
    title: "CRISPR Gene Editing",
    summary: "A revolutionary technology that enables precise editing of DNA sequences in living organisms.",
    content: `CRISPR-Cas9 is a revolutionary gene-editing technology that allows scientists to modify DNA sequences with unprecedented precision. CRISPR stands for Clustered Regularly Interspaced Short Palindromic Repeats.

The system was adapted from a naturally occurring bacterial defense mechanism against viruses. Bacteria use CRISPR to store snippets of viral DNA, allowing them to recognize and destroy the same virus in future infections.

How it works:
• A guide RNA directs the Cas9 protein to a specific DNA sequence
• Cas9 acts like molecular scissors, cutting the DNA at that location
• The cell's repair machinery can then delete, replace, or insert DNA

Applications include treating genetic diseases, developing disease-resistant crops, creating disease models for research, and potential elimination of disease-carrying mosquitoes.

Jennifer Doudna and Emmanuelle Charpentier received the 2020 Nobel Prize in Chemistry for developing this technology, which has transformed biological research and medicine.`,
    image: "🧬",
    category: "Genetics",
    linkedArticles: [3, 5, 8]
  },
  {
    id: 7,
    title: "The Overview Effect",
    summary: "A cognitive shift in awareness reported by astronauts viewing Earth from space.",
    content: `The overview effect is a cognitive shift in awareness reported by some astronauts during spaceflight, often while viewing the Earth from outer space. It refers to the experience of seeing firsthand the reality of the Earth in space.

Astronauts describe feelings of awe, self-transcendence, and a profound understanding of the interconnection of all life. The effect can cause changes in the observer's concept of self, relationships with others, and attitude toward the environment.

Common elements reported:
• A sense of the planet's fragility
• The insignificance of political boundaries
• A compelling urge to protect the Earth
• Feelings of universal connection

Astronaut Edgar Mitchell described it as "an explosion of awareness" and a "sense of universal connectedness." Frank White coined the term in his 1987 book.

Research suggests the overview effect may be related to the psychological concept of "awe" and could have therapeutic applications. Virtual reality experiences are being developed to simulate the effect for Earth-bound individuals.`,
    image: "🌍",
    category: "Psychology",
    linkedArticles: [4, 9, 10]
  },
  {
    id: 8,
    title: "Tardigrades",
    summary: "Microscopic animals known for surviving extreme conditions including the vacuum of space.",
    content: `Tardigrades, also known as water bears or moss piglets, are microscopic animals capable of surviving some of the most extreme conditions in the universe. They typically range from 0.1 to 1.5 mm in length.

Survival capabilities include:
• Temperatures from -272°C to 150°C
• Pressures 6x greater than the deepest ocean trenches
• Ionizing radiation at doses hundreds of times higher than lethal for humans
• The vacuum of outer space
• Decades without water

When faced with extreme conditions, tardigrades enter a state called cryptobiosis, reducing their metabolic activity to nearly zero. They expel almost all water from their bodies and produce special proteins and sugars that protect their cells.

In 2019, an Israeli spacecraft carrying tardigrades crashed on the Moon, leading to speculation about whether any survived. Studies have confirmed they can survive short-term exposure to lunar-like conditions.

Despite their incredible resilience, tardigrades are not extremophiles in the traditional sense - they don't thrive in extreme conditions, they merely survive them.`,
    image: "🐻",
    category: "Biology",
    linkedArticles: [1, 3, 6]
  },
  {
    id: 9,
    title: "Emergence",
    summary: "Complex patterns and behaviors arising from relatively simple rules and interactions.",
    content: `Emergence refers to the process whereby larger entities, patterns, and regularities arise through interactions among smaller or simpler entities that themselves do not exhibit such properties.

Classic examples include:
• Consciousness arising from neurons
• Life arising from chemistry
• Flocking behavior in birds
• The economy arising from individual transactions
• Ant colonies demonstrating collective intelligence

Emergence is often described as "the whole is greater than the sum of its parts." A single neuron cannot think, but billions of neurons together produce consciousness. A single ant follows simple rules, but millions together build complex societies.

Types of emergence:
• Weak emergence - properties that can be simulated given complete knowledge of the parts
• Strong emergence - properties that cannot be predicted even with complete knowledge

The concept has profound implications for philosophy of mind, artificial intelligence, and complex systems science. It suggests that reductionism alone cannot explain all phenomena - some properties only exist at higher levels of organization.`,
    image: "🕸️",
    category: "Philosophy",
    linkedArticles: [4, 5, 10]
  },
  {
    id: 10,
    title: "The Ship of Theseus",
    summary: "A thought experiment questioning whether an object that has had all of its components replaced remains fundamentally the same object.",
    content: `The Ship of Theseus is a thought experiment about whether an object which has had all of its original components replaced remains fundamentally the same object.

The paradox originates from Plutarch's writings about the ship of the legendary hero Theseus. The Athenians preserved his ship, replacing rotting planks with new timber. Eventually, no original material remained.

Key questions:
• Is the fully restored ship still "the ship of Theseus"?
• If the original planks were reassembled, which would be the "real" ship?
• What constitutes the identity of an object?

The paradox extends to personal identity - every atom in your body is replaced over time. Are you the same person you were 10 years ago?

Modern applications include questions about:
• Restored vintage cars and antiques
• Gradually replaced computer parts
• Medical transplants and prosthetics
• Digital copies and backups
• AI continuity and consciousness

Various philosophers have proposed solutions based on spatiotemporal continuity, functional organization, or accepting that identity is not absolute but a matter of degree.`,
    image: "🚢",
    category: "Philosophy",
    linkedArticles: [7, 9, 5]
  }
];

// Engagement tracker for adaptive recommendations
const useEngagementTracker = () => {
  const [engagementData, setEngagementData] = useState({});
  const startTimeRef = useRef(null);
  
  const startTracking = useCallback((articleId) => {
    startTimeRef.current = Date.now();
  }, []);
  
  const endTracking = useCallback((articleId, didExpand) => {
    if (startTimeRef.current) {
      const timeSpent = Date.now() - startTimeRef.current;
      setEngagementData(prev => ({
        ...prev,
        [articleId]: {
          timeSpent,
          expanded: didExpand,
          engagement: calculateEngagementScore(timeSpent, didExpand)
        }
      }));
    }
  }, []);
  
  const calculateEngagementScore = (timeSpent, didExpand) => {
    // Higher score = more engaged
    let score = 0;
    score += Math.min(timeSpent / 5000, 1) * 0.5; // Time component (max at 5s)
    score += didExpand ? 0.5 : 0; // Expansion component
    return score;
  };
  
  return { engagementData, startTracking, endTracking };
};

// Article Card Component
const ArticleCard = ({ article, isActive, onExpand, isExpanded, onSwipe }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const cardRef = useRef(null);
  
  const minSwipeDistance = 50;
  
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };
  
  const onTouchMove = (e) => {
    const currentY = e.targetTouches[0].clientY;
    setTouchEnd(currentY);
    if (touchStart && !isExpanded) {
      setDragOffset(currentY - touchStart);
    }
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;
    
    if (!isExpanded) {
      if (isUpSwipe) onSwipe('up');
      if (isDownSwipe) onSwipe('down');
    }
    
    setDragOffset(0);
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  // Mouse drag support for desktop
  const onMouseDown = (e) => {
    if (isExpanded) return;
    setTouchStart(e.clientY);
  };
  
  const onMouseMove = (e) => {
    if (touchStart && !isExpanded) {
      setDragOffset(e.clientY - touchStart);
    }
  };
  
  const onMouseUp = (e) => {
    if (!touchStart) return;
    const distance = touchStart - e.clientY;
    
    if (!isExpanded) {
      if (distance > minSwipeDistance) onSwipe('up');
      if (distance < -minSwipeDistance) onSwipe('down');
    }
    
    setDragOffset(0);
    setTouchStart(null);
  };
  
  return (
    <div
      ref={cardRef}
      className="article-card"
      style={{
        transform: `translateY(${dragOffset * 0.5}px)`,
        opacity: 1 - Math.abs(dragOffset) / 500
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={touchStart ? onMouseMove : undefined}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        setDragOffset(0);
        setTouchStart(null);
      }}
      onClick={() => !touchStart && onExpand()}
    >
      <div className="card-category">{article.category}</div>
      <div className="card-emoji">{article.image}</div>
      <h1 className="card-title">{article.title}</h1>
      <p className="card-summary">{article.summary}</p>
      
      {isExpanded && (
        <div className="card-content">
          {article.content.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      
      <div className="card-hint">
        {isExpanded ? 'Tap to collapse' : 'Tap to read • Swipe for more'}
      </div>
      
      <div className="swipe-indicator up">
        <span>↑</span>
      </div>
      <div className="swipe-indicator down">
        <span>↓</span>
      </div>
    </div>
  );
};

// Recommendation Engine
const useRecommendationEngine = () => {
  const [embeddings, setEmbeddings] = useState({});
  const [preloadedArticles, setPreloadedArticles] = useState([]);
  const engagementHistory = useRef([]);
  
  // Generate embeddings for all articles on mount
  useEffect(() => {
    const generateAllEmbeddings = async () => {
      const newEmbeddings = {};
      for (const article of WIKI_ARTICLES) {
        const text = `${article.title} ${article.summary} ${article.content}`;
        newEmbeddings[article.id] = await generateEmbedding(text);
      }
      setEmbeddings(newEmbeddings);
    };
    generateAllEmbeddings();
  }, []);
  
  const getNextArticles = useCallback((currentArticle, engagementScore, viewedIds) => {
    if (Object.keys(embeddings).length === 0) {
      // Fallback to linked articles if embeddings not ready
      return WIKI_ARTICLES.filter(a => 
        currentArticle.linkedArticles.includes(a.id) && !viewedIds.has(a.id)
      ).slice(0, 4);
    }
    
    const currentEmbedding = embeddings[currentArticle.id];
    
    // Calculate similarities for all unviewed articles
    const candidates = WIKI_ARTICLES
      .filter(a => !viewedIds.has(a.id) && a.id !== currentArticle.id)
      .map(article => ({
        article,
        similarity: cosineSimilarity(currentEmbedding, embeddings[article.id])
      }))
      .sort((a, b) => b.similarity - a.similarity);
    
    // Adaptive selection based on engagement
    // High engagement (>0.6) -> more similar content (exploitation)
    // Low engagement (<0.4) -> more diverse content (exploration)
    const explorationRatio = engagementScore > 0.6 ? 0.25 : 
                            engagementScore < 0.4 ? 0.75 : 0.5;
    
    const numExplore = Math.floor(4 * explorationRatio);
    const numExploit = 4 - numExplore;
    
    // Get most similar (exploit)
    const similar = candidates.slice(0, numExploit);
    
    // Get diverse (explore) - from the less similar half
    const diverse = candidates
      .slice(Math.floor(candidates.length / 2))
      .sort(() => Math.random() - 0.5)
      .slice(0, numExplore);
    
    return [...similar, ...diverse]
      .map(c => c.article)
      .sort(() => Math.random() - 0.5);
  }, [embeddings]);
  
  const recordEngagement = useCallback((articleId, score) => {
    engagementHistory.current.push({ articleId, score, timestamp: Date.now() });
  }, []);
  
  const getAverageEngagement = useCallback(() => {
    const recent = engagementHistory.current.slice(-5);
    if (recent.length === 0) return 0.5;
    return recent.reduce((sum, e) => sum + e.score, 0) / recent.length;
  }, []);
  
  return { getNextArticles, recordEngagement, getAverageEngagement, embeddings };
};

// Main App Component
export default function WikiSwipe() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewedArticles, setViewedArticles] = useState(new Set([1]));
  const [articleQueue, setArticleQueue] = useState([WIKI_ARTICLES[0]]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ viewed: 1, avgEngagement: 0.5 });
  
  const { engagementData, startTracking, endTracking } = useEngagementTracker();
  const { getNextArticles, recordEngagement, getAverageEngagement, embeddings } = useRecommendationEngine();
  
  const currentArticle = articleQueue[currentIndex];
  
  // Start tracking when article changes
  useEffect(() => {
    if (currentArticle) {
      startTracking(currentArticle.id);
    }
  }, [currentArticle, startTracking]);
  
  // Preload next articles when needed
  useEffect(() => {
    if (currentIndex >= articleQueue.length - 2 && Object.keys(embeddings).length > 0) {
      const avgEngagement = getAverageEngagement();
      const nextArticles = getNextArticles(currentArticle, avgEngagement, viewedArticles);
      
      if (nextArticles.length > 0) {
        setArticleQueue(prev => [...prev, ...nextArticles]);
        setViewedArticles(prev => {
          const newSet = new Set(prev);
          nextArticles.forEach(a => newSet.add(a.id));
          return newSet;
        });
      }
    }
  }, [currentIndex, articleQueue, embeddings, viewedArticles, currentArticle, getNextArticles, getAverageEngagement]);
  
  const handleSwipe = useCallback((direction) => {
    if (direction === 'up' && currentIndex < articleQueue.length - 1) {
      // Record engagement for current article
      const engagement = engagementData[currentArticle?.id];
      if (engagement) {
        recordEngagement(currentArticle.id, engagement.engagement);
      }
      
      setIsExpanded(false);
      endTracking(currentArticle.id, isExpanded);
      setCurrentIndex(prev => prev + 1);
      setStats(prev => ({
        viewed: prev.viewed + 1,
        avgEngagement: getAverageEngagement()
      }));
    } else if (direction === 'down' && currentIndex > 0) {
      setIsExpanded(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, articleQueue.length, currentArticle, engagementData, isExpanded, endTracking, recordEngagement, getAverageEngagement]);
  
  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'k') handleSwipe('up');
      if (e.key === 'ArrowDown' || e.key === 'j') handleSwipe('down');
      if (e.key === ' ' || e.key === 'Enter') handleExpand();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, handleExpand]);
  
  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .app-container {
          --bg-primary: #0a0a0b;
          --bg-card: #111113;
          --bg-elevated: #1a1a1d;
          --text-primary: #fafafa;
          --text-secondary: #888;
          --text-muted: #555;
          --accent: #e8ff47;
          --accent-dim: #b8cc3a;
          --border: #2a2a2d;
          
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }
        
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to bottom, var(--bg-primary) 60%, transparent);
        }
        
        .logo {
          font-family: 'Instrument Serif', serif;
          font-size: 24px;
          font-weight: 400;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .logo-icon {
          width: 32px;
          height: 32px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--bg-primary);
        }
        
        .stats-bar {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .stat-value {
          color: var(--accent);
          font-weight: 600;
        }
        
        .feed-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 20px 40px;
        }
        
        .article-card {
          width: 100%;
          max-width: 480px;
          min-height: 70vh;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
          user-select: none;
          position: relative;
          overflow: hidden;
        }
        
        .article-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: radial-gradient(ellipse at top, var(--bg-elevated) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .card-category {
          position: relative;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--accent);
          margin-bottom: 24px;
        }
        
        .card-emoji {
          position: relative;
          font-size: 64px;
          margin-bottom: 32px;
          filter: grayscale(0.1);
        }
        
        .card-title {
          position: relative;
          font-family: 'Instrument Serif', serif;
          font-size: 42px;
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
        }
        
        .card-summary {
          position: relative;
          font-size: 17px;
          line-height: 1.6;
          color: var(--text-secondary);
          flex-grow: 1;
        }
        
        .card-content {
          position: relative;
          margin-top: 32px;
          padding-top: 32px;
          border-top: 1px solid var(--border);
          animation: fadeIn 0.3s ease;
          max-height: 40vh;
          overflow-y: auto;
        }
        
        .card-content p {
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        
        .card-content::-webkit-scrollbar {
          width: 4px;
        }
        
        .card-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .card-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }
        
        .card-hint {
          position: relative;
          margin-top: 32px;
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        
        .swipe-indicator {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 20px;
          color: var(--text-muted);
          opacity: 0.3;
          transition: opacity 0.2s;
        }
        
        .swipe-indicator.up {
          top: 12px;
        }
        
        .swipe-indicator.down {
          bottom: 12px;
        }
        
        .article-card:hover .swipe-indicator {
          opacity: 0.6;
        }
        
        .progress-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--border);
        }
        
        .progress-fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.3s ease;
        }
        
        .mode-indicator {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .mode-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 2s ease infinite;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .embeddings-status {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 6px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 10px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .embeddings-ready {
          color: var(--accent);
        }
      `}</style>
      
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
            <span className="stat-value">
              {stats.avgEngagement > 0.6 ? 'Deep Dive' : 
               stats.avgEngagement < 0.4 ? 'Exploring' : 'Balanced'}
            </span>
          </div>
        </div>
      </header>
      
      <div className={`embeddings-status ${Object.keys(embeddings).length > 0 ? 'embeddings-ready' : ''}`}>
        <div className="mode-dot" style={{ 
          background: Object.keys(embeddings).length > 0 ? 'var(--accent)' : 'var(--text-muted)' 
        }} />
        {Object.keys(embeddings).length > 0 ? 'Embeddings Ready' : 'Loading Embeddings...'}
      </div>
      
      <div className="feed-container">
        {currentArticle && (
          <ArticleCard
            article={currentArticle}
            isActive={true}
            isExpanded={isExpanded}
            onExpand={handleExpand}
            onSwipe={handleSwipe}
          />
        )}
      </div>
      
      <div className="mode-indicator">
        <div className="mode-dot" />
        {stats.avgEngagement > 0.6 
          ? 'Finding similar topics...' 
          : stats.avgEngagement < 0.4 
          ? 'Exploring new areas...'
          : 'Balancing discovery...'}
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(currentIndex / Math.max(articleQueue.length - 1, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
