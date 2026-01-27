// GitHub Search Service for Marketplace Source Suggestions

export type TrustLevel = 'verified' | 'high' | 'medium' | 'low';

export interface SuggestedSource {
  owner: string;
  repo: string;
  fullName: string;        // owner/repo
  description: string;
  stars: number;
  forks: number;
  lastUpdated: string;
  topics: string[];
  license: string | null;
  trustLevel: TrustLevel;
  language: string | null;
  url: string;
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

interface GitHubRepo {
  full_name: string;
  owner: {
    login: string;
  };
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
  license: {
    spdx_id: string;
  } | null;
  language: string | null;
}

// Verified organizations that are trusted
const VERIFIED_ORGS = [
  'anthropics',
  'modelcontextprotocol',
  'vercel',
  'openai',
  'microsoft',
  'google',
  'facebook',
  'meta',
];

// Pre-defined trusted sources that are always shown first
export const TRUSTED_SOURCES: SuggestedSource[] = [
  {
    owner: 'modelcontextprotocol',
    repo: 'servers',
    fullName: 'modelcontextprotocol/servers',
    description: 'Official MCP servers repository - Reference implementations',
    stars: 1000,
    forks: 200,
    lastUpdated: new Date().toISOString(),
    topics: ['mcp', 'model-context-protocol'],
    license: 'MIT',
    trustLevel: 'verified',
    language: 'TypeScript',
    url: 'https://github.com/modelcontextprotocol/servers',
  },
];

// Calculate trust level based on repo metrics
function calculateTrustLevel(repo: GitHubRepo): TrustLevel {
  // Check if it's a verified organization
  if (VERIFIED_ORGS.includes(repo.owner.login.toLowerCase())) {
    return 'verified';
  }

  let score = 0;

  // Stars scoring
  if (repo.stargazers_count > 1000) score += 3;
  else if (repo.stargazers_count > 100) score += 2;
  else if (repo.stargazers_count > 50) score += 1;

  // Forks scoring
  if (repo.forks_count > 100) score += 2;
  else if (repo.forks_count > 20) score += 1;

  // Has license
  if (repo.license) score += 1;

  // Has relevant topics
  const relevantTopics = ['mcp', 'claude', 'model-context-protocol', 'claude-code', 'anthropic'];
  if (repo.topics.some(t => relevantTopics.includes(t.toLowerCase()))) {
    score += 1;
  }

  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

// Convert GitHub API response to our SuggestedSource format
function toSuggestedSource(repo: GitHubRepo): SuggestedSource {
  return {
    owner: repo.owner.login,
    repo: repo.name,
    fullName: repo.full_name,
    description: repo.description || 'No description available',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    lastUpdated: repo.updated_at,
    topics: repo.topics,
    license: repo.license?.spdx_id || null,
    trustLevel: calculateTrustLevel(repo),
    language: repo.language,
    url: repo.html_url,
  };
}

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 6000; // 10 requests per minute = 6 seconds between requests

// Check if we can make a request (rate limiting)
function canMakeRequest(): boolean {
  return Date.now() - lastRequestTime >= MIN_REQUEST_INTERVAL;
}

// Search cache
const searchCache = new Map<string, { results: SuggestedSource[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Search for MCP-related repositories
export async function searchMCPSources(query: string): Promise<SuggestedSource[]> {
  const cacheKey = `mcp:${query}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  if (!canMakeRequest()) {
    // Return cached results if available, even if stale
    if (cached) return cached.results;
    return TRUSTED_SOURCES.filter(s =>
      s.fullName.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  try {
    lastRequestTime = Date.now();

    // Build search query for MCP servers
    const searchQuery = query
      ? `${query} mcp OR "model context protocol" in:name,description,readme stars:>10`
      : 'mcp OR "model context protocol" in:name,description stars:>50';

    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=15`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      console.error('[GitHubSearch] API error:', response.status, response.statusText);
      return cached?.results || TRUSTED_SOURCES;
    }

    const data: GitHubSearchResponse = await response.json();
    const results = data.items.map(toSuggestedSource);

    // Sort by trust level, then stars
    results.sort((a, b) => {
      const trustOrder = { verified: 0, high: 1, medium: 2, low: 3 };
      const trustDiff = trustOrder[a.trustLevel] - trustOrder[b.trustLevel];
      if (trustDiff !== 0) return trustDiff;
      return b.stars - a.stars;
    });

    // Cache results
    searchCache.set(cacheKey, { results, timestamp: Date.now() });

    return results;
  } catch (error) {
    console.error('[GitHubSearch] Error:', error);
    return cached?.results || TRUSTED_SOURCES;
  }
}

// Search for Claude skills repositories
export async function searchSkillSources(query: string): Promise<SuggestedSource[]> {
  const cacheKey = `skill:${query}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  if (!canMakeRequest()) {
    if (cached) return cached.results;
    return [];
  }

  try {
    lastRequestTime = Date.now();

    // Build search query for Claude skills
    const searchQuery = query
      ? `${query} claude skills OR "claude code" OR anthropic in:name,description stars:>5`
      : 'claude skills OR "claude code" in:name,description stars:>20';

    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=15`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      console.error('[GitHubSearch] API error:', response.status, response.statusText);
      return cached?.results || [];
    }

    const data: GitHubSearchResponse = await response.json();
    const results = data.items.map(toSuggestedSource);

    // Sort by trust level, then stars
    results.sort((a, b) => {
      const trustOrder = { verified: 0, high: 1, medium: 2, low: 3 };
      const trustDiff = trustOrder[a.trustLevel] - trustOrder[b.trustLevel];
      if (trustDiff !== 0) return trustDiff;
      return b.stars - a.stars;
    });

    // Cache results
    searchCache.set(cacheKey, { results, timestamp: Date.now() });

    return results;
  } catch (error) {
    console.error('[GitHubSearch] Error:', error);
    return cached?.results || [];
  }
}

// Get default suggestions (popular MCP sources)
export async function getDefaultSuggestions(): Promise<SuggestedSource[]> {
  // Always include trusted sources first
  const mcpResults = await searchMCPSources('');

  // Dedupe and prioritize trusted sources
  const seen = new Set<string>();
  const results: SuggestedSource[] = [];

  for (const source of TRUSTED_SOURCES) {
    if (!seen.has(source.fullName)) {
      seen.add(source.fullName);
      results.push(source);
    }
  }

  for (const source of mcpResults) {
    if (!seen.has(source.fullName)) {
      seen.add(source.fullName);
      results.push(source);
    }
  }

  return results.slice(0, 10);
}

// Trust level display configuration
export const TRUST_LEVEL_CONFIG: Record<TrustLevel, { label: string; color: string; icon: string }> = {
  verified: { label: 'Verified', color: 'var(--success)', icon: '✓' },
  high: { label: 'High Trust', color: 'var(--info)', icon: '★' },
  medium: { label: 'Medium', color: 'var(--warning)', icon: '◆' },
  low: { label: 'Unverified', color: 'var(--text-dim)', icon: '○' },
};
