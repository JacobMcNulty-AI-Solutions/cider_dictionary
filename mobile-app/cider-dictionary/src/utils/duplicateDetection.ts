// Intelligent Duplicate Detection Engine
// Advanced fuzzy matching with 80%+ confidence scoring for cider records

import { CiderMasterRecord } from '../types/cider';

// =============================================================================
// DUPLICATE DETECTION INTERFACES
// =============================================================================

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  hasSimilar: boolean;
  confidence: number; // 0-1 scale
  suggestion: string;
  existingCider?: CiderMasterRecord;
  similarCiders?: Array<{
    cider: CiderMasterRecord;
    confidence: number;
    reasons: string[];
  }>;
}

export interface FuzzyMatchResult {
  score: number; // 0-1 scale
  reasons: string[];
  matchedFields: string[];
}

// =============================================================================
// STRING SIMILARITY ALGORITHMS
// =============================================================================

class StringSimilarity {
  /**
   * Calculate Jaro-Winkler similarity (optimized for names)
   */
  static jaroWinkler(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    if (matchWindow <= 0) return s1 === s2 ? 1.0 : 0.0;

    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / s1.length + matches / s2.length +
                  (matches - transpositions / 2) / matches) / 3;

    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Calculate Levenshtein distance ratio
   */
  static levenshteinRatio(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1.length === 0) return s2.length === 0 ? 1 : 0;
    if (s2.length === 0) return 0;

    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(s1.length, s2.length);
    return (maxLen - matrix[s2.length][s1.length]) / maxLen;
  }

  /**
   * Calculate n-gram similarity
   */
  static nGramSimilarity(str1: string, str2: string, n: number = 2): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');

    if (s1.length < n || s2.length < n) {
      return s1 === s2 ? 1 : 0;
    }

    const ngrams1 = new Set<string>();
    const ngrams2 = new Set<string>();

    for (let i = 0; i <= s1.length - n; i++) {
      ngrams1.add(s1.substring(i, i + n));
    }

    for (let i = 0; i <= s2.length - n; i++) {
      ngrams2.add(s2.substring(i, i + n));
    }

    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return intersection.size / union.size;
  }

  /**
   * Combined similarity score using multiple algorithms
   */
  static combinedSimilarity(str1: string, str2: string): number {
    const jw = this.jaroWinkler(str1, str2);
    const lev = this.levenshteinRatio(str1, str2);
    const ngram = this.nGramSimilarity(str1, str2);

    // Weighted combination favoring Jaro-Winkler for names
    return (jw * 0.5) + (lev * 0.3) + (ngram * 0.2);
  }
}

// =============================================================================
// CIDER-SPECIFIC MATCHING LOGIC
// =============================================================================

export class CiderMatcher {
  private static readonly EXACT_MATCH_THRESHOLD = 0.95;
  private static readonly STRONG_MATCH_THRESHOLD = 0.85;
  private static readonly SIMILAR_MATCH_THRESHOLD = 0.7;

  /**
   * Normalize cider name for better matching
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(cider|apple|orchard)\b/g, '') // Remove common words
      .trim();
  }

  /**
   * Normalize brand name for better matching
   */
  private static normalizeBrand(brand: string): string {
    return brand
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\b(brewery|cidery|co|company|ltd|limited)\b/g, '')
      .trim();
  }

  /**
   * Calculate match score between two ciders
   */
  static calculateMatchScore(cider1: Partial<CiderMasterRecord>, cider2: CiderMasterRecord): FuzzyMatchResult {
    const result: FuzzyMatchResult = {
      score: 0,
      reasons: [],
      matchedFields: []
    };

    let totalWeight = 0;
    let weightedScore = 0;

    // Name matching (40% weight)
    if (cider1.name && cider2.name) {
      const normalizedName1 = this.normalizeName(cider1.name);
      const normalizedName2 = this.normalizeName(cider2.name);
      const nameScore = StringSimilarity.combinedSimilarity(normalizedName1, normalizedName2);

      const nameWeight = 0.4;
      weightedScore += nameScore * nameWeight;
      totalWeight += nameWeight;

      if (nameScore > this.EXACT_MATCH_THRESHOLD) {
        result.reasons.push('Names are nearly identical');
        result.matchedFields.push('name');
      } else if (nameScore > this.STRONG_MATCH_THRESHOLD) {
        result.reasons.push('Names are very similar');
        result.matchedFields.push('name');
      } else if (nameScore > this.SIMILAR_MATCH_THRESHOLD) {
        result.reasons.push('Names have some similarity');
      }
    }

    // Brand matching (30% weight)
    if (cider1.brand && cider2.brand) {
      const normalizedBrand1 = this.normalizeBrand(cider1.brand);
      const normalizedBrand2 = this.normalizeBrand(cider2.brand);
      const brandScore = StringSimilarity.combinedSimilarity(normalizedBrand1, normalizedBrand2);

      const brandWeight = 0.3;
      weightedScore += brandScore * brandWeight;
      totalWeight += brandWeight;

      if (brandScore > this.EXACT_MATCH_THRESHOLD) {
        result.reasons.push('Same brand');
        result.matchedFields.push('brand');
      } else if (brandScore > this.STRONG_MATCH_THRESHOLD) {
        result.reasons.push('Very similar brand');
        result.matchedFields.push('brand');
      }
    }

    // ABV matching (20% weight)
    if (cider1.abv !== undefined && cider2.abv !== undefined) {
      const abvDifference = Math.abs(cider1.abv - cider2.abv);
      let abvScore = 0;

      if (abvDifference === 0) {
        abvScore = 1.0;
        result.reasons.push('Identical ABV');
        result.matchedFields.push('abv');
      } else if (abvDifference <= 0.5) {
        abvScore = 0.8;
        result.reasons.push('Very similar ABV');
      } else if (abvDifference <= 1.0) {
        abvScore = 0.6;
        result.reasons.push('Similar ABV');
      } else if (abvDifference <= 2.0) {
        abvScore = 0.3;
      }

      const abvWeight = 0.2;
      weightedScore += abvScore * abvWeight;
      totalWeight += abvWeight;
    }

    // Container type bonus (10% weight)
    if (cider1.containerType && cider2.containerType) {
      if (cider1.containerType === cider2.containerType) {
        const containerWeight = 0.1;
        weightedScore += 1.0 * containerWeight;
        totalWeight += containerWeight;
        result.reasons.push('Same container type');
        result.matchedFields.push('containerType');
      }
    }

    result.score = totalWeight > 0 ? weightedScore / totalWeight : 0;

    return result;
  }

  /**
   * Find potential duplicates in a collection
   */
  static findPotentialDuplicates(
    newCider: Partial<CiderMasterRecord>,
    existingCiders: CiderMasterRecord[]
  ): Array<{ cider: CiderMasterRecord; match: FuzzyMatchResult }> {
    const potentialDuplicates: Array<{ cider: CiderMasterRecord; match: FuzzyMatchResult }> = [];

    for (const existingCider of existingCiders) {
      const matchResult = this.calculateMatchScore(newCider, existingCider);

      if (matchResult.score >= this.SIMILAR_MATCH_THRESHOLD) {
        potentialDuplicates.push({
          cider: existingCider,
          match: matchResult
        });
      }
    }

    // Sort by confidence score (highest first)
    return potentialDuplicates.sort((a, b) => b.match.score - a.match.score);
  }
}

// =============================================================================
// MAIN DUPLICATE DETECTION ENGINE
// =============================================================================

export class DuplicateDetectionEngine {
  private static readonly DUPLICATE_THRESHOLD = 0.85;
  private static readonly SIMILAR_THRESHOLD = 0.7;

  /**
   * Perform comprehensive duplicate check
   */
  static async performDuplicateCheck(
    name: string,
    brand: string,
    abv?: number,
    containerType?: string,
    existingCiders?: CiderMasterRecord[]
  ): Promise<DuplicateDetectionResult> {
    // If no existing ciders provided, we'd normally fetch from database
    // For now, using the provided array or empty array
    const ciders = existingCiders || [];

    const newCider: Partial<CiderMasterRecord> = {
      name: name.trim(),
      brand: brand.trim(),
      abv,
      containerType: containerType as any
    };

    const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, ciders);

    if (potentialDuplicates.length === 0) {
      return {
        isDuplicate: false,
        hasSimilar: false,
        confidence: 0,
        suggestion: 'No similar ciders found.',
        similarCiders: []
      };
    }

    const bestMatch = potentialDuplicates[0];
    const confidence = bestMatch.match.score;

    let isDuplicate = false;
    let hasSimilar = false;
    let suggestion = '';

    if (confidence >= this.DUPLICATE_THRESHOLD) {
      isDuplicate = true;
      suggestion = `This appears to be a duplicate of "${bestMatch.cider.name}" by ${bestMatch.cider.brand}. ` +
                  `Confidence: ${Math.round(confidence * 100)}%. ` +
                  `Reasons: ${bestMatch.match.reasons.join(', ')}.`;
    } else if (confidence >= this.SIMILAR_THRESHOLD) {
      hasSimilar = true;
      suggestion = `This is similar to "${bestMatch.cider.name}" by ${bestMatch.cider.brand}. ` +
                  `Confidence: ${Math.round(confidence * 100)}%. ` +
                  `You may want to verify this is a different cider.`;
    }

    return {
      isDuplicate,
      hasSimilar,
      confidence,
      suggestion,
      existingCider: bestMatch.cider,
      similarCiders: potentialDuplicates.slice(0, 3).map(dup => ({
        cider: dup.cider,
        confidence: dup.match.score,
        reasons: dup.match.reasons
      }))
    };
  }

  /**
   * Quick duplicate check for real-time feedback (optimized for performance)
   */
  static async quickDuplicateCheck(
    name: string,
    brand: string,
    existingCiders: CiderMasterRecord[]
  ): Promise<{ isDuplicate: boolean; confidence: number; message?: string }> {
    if (!name.trim() || !brand.trim()) {
      return { isDuplicate: false, confidence: 0 };
    }

    // Quick pre-filter for exact matches
    const exactMatches = existingCiders.filter(cider =>
      cider.name.toLowerCase().trim() === name.toLowerCase().trim() &&
      cider.brand.toLowerCase().trim() === brand.toLowerCase().trim()
    );

    if (exactMatches.length > 0) {
      return {
        isDuplicate: true,
        confidence: 1.0,
        message: 'Exact match found in collection'
      };
    }

    // Quick fuzzy check on first 10 results (performance optimization)
    const quickCheck = existingCiders.slice(0, 10);
    const result = await this.performDuplicateCheck(name, brand, undefined, undefined, quickCheck);

    return {
      isDuplicate: result.isDuplicate,
      confidence: result.confidence,
      message: result.isDuplicate ? result.suggestion : undefined
    };
  }

  /**
   * Get suggestions for similar cider names (autocomplete helper)
   */
  static getSimilarCiderNames(partialName: string, existingCiders: CiderMasterRecord[]): string[] {
    if (partialName.length < 2) return [];

    const suggestions: Array<{ name: string; score: number }> = [];

    for (const cider of existingCiders) {
      const similarity = StringSimilarity.jaroWinkler(partialName, cider.name);
      if (similarity > 0.3) {
        suggestions.push({ name: cider.name, score: similarity });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.name);
  }

  /**
   * Get suggestions for similar brand names
   */
  static getSimilarBrandNames(partialBrand: string, existingCiders: CiderMasterRecord[]): string[] {
    if (partialBrand.length < 2) return [];

    const uniqueBrands = [...new Set(existingCiders.map(c => c.brand))];
    const suggestions: Array<{ brand: string; score: number }> = [];

    for (const brand of uniqueBrands) {
      const similarity = StringSimilarity.jaroWinkler(partialBrand, brand);
      if (similarity > 0.3) {
        suggestions.push({ brand, score: similarity });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.brand);
  }
}