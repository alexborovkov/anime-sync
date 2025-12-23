import Service, { service } from '@ember/service';
import config from 'trakt-mal-sync/config/environment';
import { idsMoeLimiter } from 'trakt-mal-sync/utils/rate-limiter';

/**
 * Mapping service for converting between Trakt and MAL IDs
 * Uses ids.moe API for direct ID lookups with fallback to title search
 * Caches successful mappings in IndexedDB
 */
export default class MappingService extends Service {
  @service cache;
  @service trakt;
  @service mal;

  /**
   * Get Trakt slug from MAL anime entry
   * Uses ids.moe API for direct ID lookup, falls back to title search
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
      // Try ids.moe API first
      let traktSlug = null;

      if (config.APP.IDS_MOE_API_KEY && malAnime.id) {
        const externalIds = await this.getExternalIdsFromIdsMoe('myanimelist', malAnime.id);

        // ids.moe returns Trakt ID directly
        if (externalIds && externalIds.trakt) {
          try {
            const show = await this.trakt.getShow(externalIds.trakt);
            if (show && show.ids) {
              traktSlug = show.ids.slug;
            }
          } catch (error) {
            console.error('Error getting Trakt show details:', error);
          }
        }
      }

      // If ids.moe didn't find a mapping, fall back to title search
      if (!traktSlug) {
        traktSlug = await this.getTraktSlugByTitleSearch(malAnime);
      }

      // Cache the mapping if found
      if (traktSlug) {
        await this.cache.set(
          'animeMapping',
          {
            id: cacheKey,  // Use cacheKey as the id
            malId: malAnime.id,
            traktId: traktSlug,
            title: malAnime.title,
          },
          this.cache.CACHE_DURATION.mapping,
        );
      }

      return traktSlug;
    } catch (error) {
      console.error('Error mapping MAL to Trakt:', error);
      return null;
    }
  }

  /**
   * Get external IDs from ids.moe API
   * @param {string} sourceType - Source ID type (myanimelist, thetvdb, themoviedb, imdb, trakt)
   * @param {number|string} sourceId - Source ID value
   * @returns {Promise<object|null>} - Object with external IDs or null if not found
   */
  async getExternalIdsFromIdsMoe(sourceType, sourceId) {
    if (!config.APP.IDS_MOE_API_KEY) {
      return null;
    }

    try {
      // ids.moe endpoint format: /ids/{id}?platform={platform} (rate limited)
      const url = `${config.APP.IDS_MOE_API_BASE_URL}/ids/${sourceId}?platform=${sourceType}`;
      const response = await idsMoeLimiter.throttle(async () => {
        return fetch(url, {
          headers: {
            'Authorization': `Bearer ${config.APP.IDS_MOE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching from ids.moe (${sourceType}:${sourceId}):`, error);
      return null;
    }
  }

  /**
   * Get Trakt slug by searching Trakt API by title (fallback method)
   * @param {object} malAnime - MAL anime entry
   * @returns {Promise<string|null>} - Trakt slug or null if not found
   */
  async getTraktSlugByTitleSearch(malAnime) {
    try {
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

      return bestMatch ? bestMatch.show.ids.slug : null;
    } catch (error) {
      console.error('Error searching Trakt by title:', error);
      return null;
    }
  }

  /**
   * Get MAL ID from Trakt show entry
   * Uses ids.moe API for direct ID lookup, falls back to title search
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
      let malId = null;

      // Try ids.moe search by title first
      if (config.APP.IDS_MOE_API_KEY && traktShow.title) {
        malId = await this.searchIdsMoeByTitle(traktShow.title);
      }

      // If ids.moe didn't find a match, fall back to MAL title search
      if (!malId) {
        malId = await this.getMalIdByTitleSearch(traktShow);
      }

      // Cache the mapping if found
      if (malId) {
        await this.cache.set(
          'animeMapping',
          {
            id: cacheKey,  // Use cacheKey as the id
            malId: malId,
            traktId: traktShow.ids.slug,
            title: traktShow.title,
            year: traktShow.year,
          },
          this.cache.CACHE_DURATION.mapping,
        );
      }

      return malId;
    } catch (error) {
      console.error('Error mapping Trakt to MAL:', error);
      return null;
    }
  }

  /**
   * Search ids.moe by anime title
   * @param {string} title - Anime title to search
   * @returns {Promise<number|null>} - MAL ID or null if not found
   */
  async searchIdsMoeByTitle(title) {
    if (!config.APP.IDS_MOE_API_KEY) {
      return null;
    }

    try {
      // Search ids.moe by title (rate limited)
      const searchUrl = `${config.APP.IDS_MOE_API_BASE_URL}/search?q=${encodeURIComponent(title)}`;
      const searchResponse = await idsMoeLimiter.throttle(async () => {
        return fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${config.APP.IDS_MOE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (!searchResponse.ok) {
        return null;
      }

      const searchData = await searchResponse.json();

      // Get the top result
      if (!searchData.results || searchData.results.length === 0) {
        return null;
      }

      const topResult = searchData.results[0];

      // Fetch all platform IDs using the internal ID (rate limited)
      const idsUrl = `${config.APP.IDS_MOE_API_BASE_URL}/ids/${topResult.id}`;
      const idsResponse = await idsMoeLimiter.throttle(async () => {
        return fetch(idsUrl, {
          headers: {
            'Authorization': `Bearer ${config.APP.IDS_MOE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (!idsResponse.ok) {
        return null;
      }

      const idsData = await idsResponse.json();
      return idsData?.myanimelist || null;
    } catch (error) {
      console.error('Error searching ids.moe by title:', error);
      return null;
    }
  }

  /**
   * Get MAL ID from ids.moe API
   * @param {string} sourceType - Source ID type (trakt, thetvdb, themoviedb, imdb)
   * @param {number|string} sourceId - Source ID value
   * @returns {Promise<number|null>} - MAL ID or null if not found
   */
  async getMalIdFromIdsMoe(sourceType, sourceId) {
    if (!config.APP.IDS_MOE_API_KEY) {
      return null;
    }

    try {
      // ids.moe endpoint format: /ids/{id}?platform={platform} (rate limited)
      const url = `${config.APP.IDS_MOE_API_BASE_URL}/ids/${sourceId}?platform=${sourceType}`;
      const response = await idsMoeLimiter.throttle(async () => {
        return fetch(url, {
          headers: {
            'Authorization': `Bearer ${config.APP.IDS_MOE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data?.myanimelist || null;
    } catch (error) {
      console.error(`Error fetching from ids.moe (${sourceType}:${sourceId}):`, error);
      return null;
    }
  }

  /**
   * Get MAL ID by searching MAL API by title (fallback method)
   * @param {object} traktShow - Trakt show entry
   * @returns {Promise<number|null>} - MAL ID or null if not found
   */
  async getMalIdByTitleSearch(traktShow) {
    try {
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

      return bestMatch ? bestMatch.node.id : null;
    } catch (error) {
      console.error('Error searching MAL by title:', error);
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
      let titleSimilarity = this.calculateSimilarity(source.title, targetTitle);

      // Check alternative titles for better matching
      if (direction === 'mal-to-trakt' && source.alternative_titles) {
        // MAL → Trakt: Check source (MAL) alternative titles against target (Trakt) title
        const altTitles = Object.values(source.alternative_titles).flat();
        // Check ALL alternative titles and use the best match (don't break early)
        for (const altTitle of altTitles) {
          const altSimilarity = this.calculateSimilarity(altTitle, targetTitle);
          if (altSimilarity > titleSimilarity) {
            titleSimilarity = altSimilarity;
          }
        }
      } else if (direction === 'trakt-to-mal' && result.node.alternative_titles) {
        // Trakt → MAL: Check target (MAL) alternative titles against source (Trakt) title
        const altTitles = Object.values(result.node.alternative_titles).flat();
        // Check ALL alternative titles and use the best match (don't break early)
        for (const altTitle of altTitles) {
          const altSimilarity = this.calculateSimilarity(source.title, altTitle);
          if (altSimilarity > titleSimilarity) {
            titleSimilarity = altSimilarity;
          }
        }
      }

      score += titleSimilarity * 0.8; // 80% weight on title match

      // Year match bonus
      const sourceYear =
        direction === 'mal-to-trakt' ? source.start_season?.year : source.year;
      if (sourceYear && targetYear && sourceYear === targetYear) {
        score += 0.2; // 20% weight on year match
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }

    // Require at least 60% similarity to consider it a match
    // Lower threshold because alternative titles often have slight variations
    return bestScore >= 0.6 ? bestMatch : null;
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
