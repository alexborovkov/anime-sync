import Service, { service } from '@ember/service';

/**
 * Mapping service for converting between Trakt and MAL IDs
 * Uses Trakt's search API to find anime by title
 * Caches successful mappings in IndexedDB
 */
export default class MappingService extends Service {
  @service cache;
  @service trakt;
  @service mal;

  /**
   * Get Trakt slug from MAL anime entry
   * Searches Trakt by title and matches based on title similarity and year
   * @param {object} malAnime - MAL anime entry with { id, title, start_year, alternative_titles }
   * @returns {Promise<string|null>} - Trakt slug or null if not found
   */
  async getTraktSlugFromMAL(malAnime) {
    if (!malAnime || !malAnime.title) {
      return null;
    }

    // Check cache first
    const cacheKey = `mal-${malAnime.id}`;
    const cached = await this.cache.get('animeMapping', cacheKey);
    if (cached && cached.traktSlug) {
      return cached.traktSlug;
    }

    try {
      // Search Trakt by title
      const searchTitle = malAnime.title;
      const traktResults = await this.trakt.searchShows(searchTitle, 'show');

      if (!traktResults || traktResults.length === 0) {
        return null;
      }

      // Find best match based on title similarity and year
      const bestMatch = this.findBestMatch(
        malAnime,
        traktResults,
        'mal-to-trakt',
      );

      if (bestMatch) {
        // Cache the mapping
        await this.cache.set(
          'animeMapping',
          {
            malId: cacheKey,
            traktSlug: bestMatch.show.ids.slug,
            title: bestMatch.show.title,
            year: bestMatch.show.year,
          },
          this.cache.CACHE_DURATION.mapping,
        );

        return bestMatch.show.ids.slug;
      }

      return null;
    } catch (error) {
      console.error('Error mapping MAL to Trakt:', error);
      return null;
    }
  }

  /**
   * Get MAL ID from Trakt show entry
   * Searches MAL by title and matches based on title similarity and year
   * @param {object} traktShow - Trakt show entry with { title, year, ids }
   * @returns {Promise<number|null>} - MAL ID or null if not found
   */
  async getMALIdFromTrakt(traktShow) {
    if (!traktShow || !traktShow.title) {
      return null;
    }

    // Check cache first
    const cacheKey = `trakt-${traktShow.ids.slug}`;
    const cached = await this.cache.get('animeMapping', cacheKey);
    if (cached && cached.malId) {
      return cached.malId;
    }

    try {
      // Search MAL by title
      const searchTitle = traktShow.title;
      const malResponse = await this.mal.searchAnime(searchTitle);
      const malResults = malResponse?.data || [];

      if (!malResults || malResults.length === 0) {
        return null;
      }

      // Find best match based on title similarity and year
      const bestMatch = this.findBestMatch(
        traktShow,
        malResults,
        'trakt-to-mal',
      );

      if (bestMatch) {
        const malId = bestMatch.node.id;

        // Cache the mapping
        await this.cache.set(
          'animeMapping',
          {
            malId: cacheKey,
            malId: malId,
            title: bestMatch.node.title,
            year: bestMatch.node.start_season?.year,
          },
          this.cache.CACHE_DURATION.mapping,
        );

        return malId;
      }

      return null;
    } catch (error) {
      console.error('Error mapping Trakt to MAL:', error);
      return null;
    }
  }

  /**
   * Find best match from search results
   * @param {object} source - Source anime entry
   * @param {Array} results - Search results
   * @param {string} direction - 'mal-to-trakt' or 'trakt-to-mal'
   * @returns {object|null} - Best matching result or null
   */
  findBestMatch(source, results, direction) {
    let bestMatch = null;
    let bestScore = 0;

    for (const result of results) {
      let score = 0;
      let targetTitle, targetYear;

      if (direction === 'mal-to-trakt') {
        targetTitle = result.show.title;
        targetYear = result.show.year;
      } else {
        targetTitle = result.node.title;
        targetYear = result.node.start_season?.year;
      }

      // Calculate title similarity
      const titleSimilarity = this.calculateSimilarity(source.title, targetTitle);
      score += titleSimilarity * 0.7; // 70% weight on title match

      // Year match bonus
      const sourceYear =
        direction === 'mal-to-trakt' ? source.start_season?.year : source.year;
      if (sourceYear && targetYear && sourceYear === targetYear) {
        score += 0.3; // 30% weight on year match
      }

      // Check alternative titles if available
      if (direction === 'mal-to-trakt' && source.alternative_titles) {
        const altTitles = Object.values(source.alternative_titles).flat();
        for (const altTitle of altTitles) {
          const altSimilarity = this.calculateSimilarity(altTitle, targetTitle);
          if (altSimilarity > titleSimilarity) {
            score = score - titleSimilarity * 0.7 + altSimilarity * 0.7;
            break;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    // Require at least 70% similarity to consider it a match
    return bestScore >= 0.7 ? bestMatch : null;
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    // Exact substring match gets high score
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.85;
    }

    // Levenshtein distance based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Clear all cached mappings
   * @returns {Promise<void>}
   */
  async clearMappings() {
    await this.cache.clearStore('animeMapping');
  }
}
