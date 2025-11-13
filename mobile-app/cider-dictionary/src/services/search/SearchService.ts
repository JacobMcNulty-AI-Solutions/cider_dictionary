// Advanced Search Service - Phase 4
// Implements fuzzy matching, multi-field filtering, and intelligent caching

import { CiderMasterRecord } from '../../types/cider';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SearchFilters {
  ratingRange: [number, number];
  abvRange: [number, number];
  priceRange: [number, number];
  tasteTags: string[];
  traditionalStyles: string[];
  venues: string[];
  characteristics: {
    sweetness: string[];
    carbonation: string[];
    clarity: string[];
    color: string[];
  };
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  hasPhoto: boolean | null;
  hasNotes: boolean | null;
  hasExperiences: boolean | null;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  sortBy: 'name' | 'brand' | 'rating' | 'abv' | 'price' | 'dateAdded' | 'relevance';
  sortDirection: 'asc' | 'desc';
}

export interface SearchResult {
  cider: CiderMasterRecord;
  relevanceScore: number;
  matchedFields: Array<{
    field: string;
    matchType: 'exact' | 'partial' | 'fuzzy';
    snippet: string;
  }>;
}

interface SearchIndex {
  textIndex: Map<string, Set<string>>;
  brandIndex: Map<string, Set<string>>;
  tagIndex: Map<string, Set<string>>;
  styleIndex: Map<string, Set<string>>;
  ratingIndex: Map<number, Set<string>>;
  lastUpdated: number;
}

interface CachedSearchResult {
  queryHash: string;
  results: SearchResult[];
  timestamp: number;
  ttl: number;
  hitCount: number;
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

export class SearchService {
  private static instance: SearchService;
  private searchIndex: SearchIndex | null = null;
  private allCiders: Map<string, CiderMasterRecord> = new Map();
  private resultCache: Map<string, CachedSearchResult> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 60000; // 1 minute

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // ============================================================================
  // INDEX BUILDING
  // ============================================================================

  buildSearchIndex(ciders: CiderMasterRecord[]): void {
    console.log(`Building search index for ${ciders.length} ciders...`);
    const startTime = Date.now();

    this.searchIndex = {
      textIndex: new Map(),
      brandIndex: new Map(),
      tagIndex: new Map(),
      styleIndex: new Map(),
      ratingIndex: new Map(),
      lastUpdated: Date.now(),
    };

    // Clear and rebuild cider map
    this.allCiders.clear();

    for (const cider of ciders) {
      this.allCiders.set(cider.id, cider);

      // Text indexing (name + brand + notes)
      const text = [
        cider.name,
        cider.brand,
        cider.notes || '',
      ].join(' ');

      const tokens = this.tokenizeText(text);
      for (const token of tokens) {
        if (!this.searchIndex.textIndex.has(token)) {
          this.searchIndex.textIndex.set(token, new Set());
        }
        this.searchIndex.textIndex.get(token)!.add(cider.id);
      }

      // Brand indexing
      const normalizedBrand = this.normalizeBrand(cider.brand);
      if (!this.searchIndex.brandIndex.has(normalizedBrand)) {
        this.searchIndex.brandIndex.set(normalizedBrand, new Set());
      }
      this.searchIndex.brandIndex.get(normalizedBrand)!.add(cider.id);

      // Tag indexing
      if (cider.tasteTags) {
        for (const tag of cider.tasteTags) {
          const normalizedTag = tag.toLowerCase();
          if (!this.searchIndex.tagIndex.has(normalizedTag)) {
            this.searchIndex.tagIndex.set(normalizedTag, new Set());
          }
          this.searchIndex.tagIndex.get(normalizedTag)!.add(cider.id);
        }
      }

      // Style indexing
      if (cider.traditionalStyle) {
        const normalizedStyle = cider.traditionalStyle.toLowerCase();
        if (!this.searchIndex.styleIndex.has(normalizedStyle)) {
          this.searchIndex.styleIndex.set(normalizedStyle, new Set());
        }
        this.searchIndex.styleIndex.get(normalizedStyle)!.add(cider.id);
      }

      // Rating indexing
      const rating = cider.overallRating;
      if (!this.searchIndex.ratingIndex.has(rating)) {
        this.searchIndex.ratingIndex.set(rating, new Set());
      }
      this.searchIndex.ratingIndex.get(rating)!.add(cider.id);
    }

    const duration = Date.now() - startTime;
    console.log(`Search index built in ${duration}ms`);
    console.log(`Index stats: ${this.searchIndex.textIndex.size} tokens, ${this.searchIndex.brandIndex.size} brands`);
  }

  // ============================================================================
  // ADVANCED SEARCH
  // ============================================================================

  performAdvancedSearch(searchState: SearchState): SearchResult[] {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(searchState);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`Search cache hit! (${Date.now() - startTime}ms)`);
      return cached;
    }

    // Ensure index exists
    if (!this.searchIndex) {
      console.warn('Search index not built, building now...');
      this.buildSearchIndex(Array.from(this.allCiders.values()));
    }

    // PHASE 1: Get candidate ciders (text search)
    let candidateIds = this.getCandidatesFromQuery(searchState.query);

    // If no query, start with all ciders
    if (!searchState.query || candidateIds.size === 0) {
      candidateIds = new Set(this.allCiders.keys());
    }

    // PHASE 2: Apply filters
    const filteredCandidates = this.applyFilters(candidateIds, searchState.filters);

    // PHASE 3: Calculate relevance scores
    const results = this.calculateRelevanceScores(
      filteredCandidates,
      searchState.query
    );

    // PHASE 4: Sort results
    const sortedResults = this.sortResults(results, searchState.sortBy, searchState.sortDirection);

    // Cache results
    this.cacheResults(cacheKey, sortedResults);

    const duration = Date.now() - startTime;
    console.log(`Search completed in ${duration}ms (${sortedResults.length} results)`);

    return sortedResults;
  }

  // ============================================================================
  // CANDIDATE RETRIEVAL
  // ============================================================================

  private getCandidatesFromQuery(query: string): Set<string> {
    if (!query || !this.searchIndex) {
      return new Set();
    }

    const tokens = this.tokenizeText(query);
    const candidateSets: Set<string>[] = [];

    for (const token of tokens) {
      // Exact match from index
      if (this.searchIndex.textIndex.has(token)) {
        candidateSets.push(this.searchIndex.textIndex.get(token)!);
      }

      // Fuzzy match (simple Levenshtein-based)
      const fuzzyMatches = this.fuzzySearchToken(token);
      for (const matchedToken of fuzzyMatches) {
        if (this.searchIndex.textIndex.has(matchedToken)) {
          candidateSets.push(this.searchIndex.textIndex.get(matchedToken)!);
        }
      }
    }

    // Union all candidate sets
    if (candidateSets.length === 0) {
      return new Set();
    }

    const allCandidates = new Set<string>();
    for (const set of candidateSets) {
      for (const id of set) {
        allCandidates.add(id);
      }
    }

    return allCandidates;
  }

  // ============================================================================
  // FILTERING
  // ============================================================================

  private applyFilters(candidateIds: Set<string>, filters: SearchFilters): CiderMasterRecord[] {
    const candidates: CiderMasterRecord[] = [];

    for (const id of candidateIds) {
      const cider = this.allCiders.get(id);
      if (!cider) continue;

      // Rating filter
      if (cider.overallRating < filters.ratingRange[0] ||
          cider.overallRating > filters.ratingRange[1]) {
        continue;
      }

      // ABV filter
      if (cider.abv && (cider.abv < filters.abvRange[0] || cider.abv > filters.abvRange[1])) {
        continue;
      }

      // Taste tags filter
      if (filters.tasteTags.length > 0) {
        const hasMatchingTags = filters.tasteTags.some(tag =>
          cider.tasteTags?.some(ciderTag =>
            ciderTag.toLowerCase() === tag.toLowerCase()
          )
        );
        if (!hasMatchingTags) continue;
      }

      // Traditional style filter
      if (filters.traditionalStyles.length > 0) {
        const hasMatchingStyle = filters.traditionalStyles.some(style =>
          cider.traditionalStyle?.toLowerCase() === style.toLowerCase()
        );
        if (!hasMatchingStyle) continue;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const ciderDate = new Date(cider.createdAt);
        if (filters.dateRange.start && ciderDate < filters.dateRange.start) continue;
        if (filters.dateRange.end && ciderDate > filters.dateRange.end) continue;
      }

      // Photo filter
      if (filters.hasPhoto !== null) {
        const hasPhoto = !!cider.photo;
        if (hasPhoto !== filters.hasPhoto) continue;
      }

      // Notes filter
      if (filters.hasNotes !== null) {
        const hasNotes = !!cider.notes && cider.notes.length > 0;
        if (hasNotes !== filters.hasNotes) continue;
      }

      // Passed all filters
      candidates.push(cider);
    }

    return candidates;
  }

  // ============================================================================
  // RELEVANCE SCORING
  // ============================================================================

  private calculateRelevanceScores(candidates: CiderMasterRecord[], query: string): SearchResult[] {
    if (!query) {
      // No query, all candidates have equal relevance
      return candidates.map(cider => ({
        cider,
        relevanceScore: 1.0,
        matchedFields: [],
      }));
    }

    const queryTokens = this.tokenizeText(query);
    const results: SearchResult[] = [];

    for (const cider of candidates) {
      let score = 0;
      const matchedFields: SearchResult['matchedFields'] = [];

      // Name matching (highest weight)
      const nameTokens = this.tokenizeText(cider.name);
      const nameMatches = this.countTokenMatches(queryTokens, nameTokens);
      if (nameMatches > 0) {
        score += nameMatches * 10;
        matchedFields.push({
          field: 'name',
          matchType: nameMatches === queryTokens.length ? 'exact' : 'partial',
          snippet: cider.name,
        });
      }

      // Brand matching (high weight)
      const brandTokens = this.tokenizeText(cider.brand);
      const brandMatches = this.countTokenMatches(queryTokens, brandTokens);
      if (brandMatches > 0) {
        score += brandMatches * 5;
        matchedFields.push({
          field: 'brand',
          matchType: brandMatches === queryTokens.length ? 'exact' : 'partial',
          snippet: cider.brand,
        });
      }

      // Notes matching (low weight)
      if (cider.notes) {
        const notesTokens = this.tokenizeText(cider.notes);
        const notesMatches = this.countTokenMatches(queryTokens, notesTokens);
        if (notesMatches > 0) {
          score += notesMatches * 2;
          matchedFields.push({
            field: 'notes',
            matchType: 'partial',
            snippet: this.extractSnippet(cider.notes, queryTokens),
          });
        }
      }

      // Tag matching (medium weight)
      if (cider.tasteTags) {
        for (const tag of cider.tasteTags) {
          const tagTokens = this.tokenizeText(tag);
          const tagMatches = this.countTokenMatches(queryTokens, tagTokens);
          if (tagMatches > 0) {
            score += tagMatches * 3;
            matchedFields.push({
              field: 'tasteTags',
              matchType: 'exact',
              snippet: tag,
            });
          }
        }
      }

      if (score > 0) {
        results.push({
          cider,
          relevanceScore: score,
          matchedFields,
        });
      }
    }

    return results;
  }

  // ============================================================================
  // SORTING
  // ============================================================================

  private sortResults(
    results: SearchResult[],
    sortBy: SearchState['sortBy'],
    direction: 'asc' | 'desc'
  ): SearchResult[] {
    const sorted = [...results];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'name':
          comparison = a.cider.name.localeCompare(b.cider.name);
          break;
        case 'brand':
          comparison = a.cider.brand.localeCompare(b.cider.brand);
          break;
        case 'rating':
          comparison = a.cider.overallRating - b.cider.overallRating;
          break;
        case 'abv':
          comparison = (a.cider.abv || 0) - (b.cider.abv || 0);
          break;
        case 'dateAdded':
          comparison = new Date(a.cider.createdAt).getTime() - new Date(b.cider.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });

    return sorted;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private tokenizeText(text: string): string[] {
    const normalized = text.toLowerCase().trim();
    const cleaned = normalized.replace(/[^\w\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(t => t.length >= 2);
    return tokens;
  }

  private normalizeBrand(brand: string): string {
    return brand
      .toLowerCase()
      .trim()
      .replace(/\s+(cider|cidery|co|ltd|limited)$/i, '')
      .replace(/\s+/g, ' ');
  }

  private fuzzySearchToken(token: string): string[] {
    if (!this.searchIndex) return [];

    const matches: string[] = [];
    const maxDistance = Math.max(1, Math.floor(token.length / 4)); // 25% tolerance

    for (const indexToken of this.searchIndex.textIndex.keys()) {
      if (this.levenshteinDistance(token, indexToken) <= maxDistance) {
        matches.push(indexToken);
      }
    }

    return matches;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private countTokenMatches(queryTokens: string[], targetTokens: string[]): number {
    let matches = 0;
    for (const queryToken of queryTokens) {
      if (targetTokens.includes(queryToken)) {
        matches++;
      }
    }
    return matches;
  }

  private extractSnippet(text: string, tokens: string[], maxLength: number = 100): string {
    const lowerText = text.toLowerCase();
    for (const token of tokens) {
      const index = lowerText.indexOf(token);
      if (index !== -1) {
        const start = Math.max(0, index - 20);
        const end = Math.min(text.length, index + token.length + 20);
        let snippet = text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        return snippet;
      }
    }
    return text.substring(0, maxLength);
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  private generateCacheKey(searchState: SearchState): string {
    return JSON.stringify({
      query: searchState.query,
      filters: searchState.filters,
      sortBy: searchState.sortBy,
      sortDirection: searchState.sortDirection,
    });
  }

  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.resultCache.get(key);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.resultCache.delete(key);
      return null;
    }

    cached.hitCount++;
    return cached.results;
  }

  private cacheResults(key: string, results: SearchResult[]): void {
    // Limit cache size
    if (this.resultCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }

    this.resultCache.set(key, {
      queryHash: key,
      results,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
      hitCount: 0,
    });
  }

  clearCache(): void {
    this.resultCache.clear();
  }

  // ============================================================================
  // DEFAULT FILTERS
  // ============================================================================

  static getDefaultFilters(): SearchFilters {
    return {
      ratingRange: [1, 10],
      abvRange: [0, 20],
      priceRange: [0, 100],
      tasteTags: [],
      traditionalStyles: [],
      venues: [],
      characteristics: {
        sweetness: [],
        carbonation: [],
        clarity: [],
        color: [],
      },
      dateRange: {
        start: null,
        end: null,
      },
      hasPhoto: null,
      hasNotes: null,
      hasExperiences: null,
    };
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
