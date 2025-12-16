import Service, { service } from '@ember/service';

/**
 * Mapping service for converting between Trakt and MAL IDs
 * Uses anime-offline-database for ID mapping
 * Falls back to fuzzy title matching when direct mapping is unavailable
 */
export default class MappingService extends Service {
  @service cache;

  mappingDatabase = null;
  isLoaded = false;

  /**
   * Load the anime mapping database
   * Downloads from anime-offline-database if not cached
   * @returns {Promise<void>}
   */
  async loadMappingDatabase() {
    if (this.isLoaded && this.mappingDatabase) {
      return;
    }

    // Try to load from cache first
    const cached = await this.cache.get('animeMapping', 'database');
    if (cached && cached.entries) {
      this.mappingDatabase = cached.entries;
      this.isLoaded = true;
      return;
    }

    try {
      // Load from public folder
      const response = await fetch('/anime-offline-database.json');
      if (!response.ok) {
        throw new Error('Failed to load mapping database');
      }

      const data = await response.json();
      this.mappingDatabase = data.data || [];

      // Cache the database
      await this.cache.set(
        'animeMapping',
        { malId: 'database', entries: this.mappingDatabase },
        this.cache.CACHE_DURATION.mapping,
      );

      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading mapping database:', error);
      this.mappingDatabase = [];
      this.isLoaded = true;
    }
  }

  /**
   * Get Trakt ID from MAL ID
   * @param {number} malId - MyAnimeList ID
   * @returns {Promise<number|null>}
   */
  async getTraktIdFromMAL(malId) {
    await this.loadMappingDatabase();

    const entry = this.mappingDatabase.find((anime) => {
      if (!anime.sources) return false;
      return anime.sources.some(
        (source) =>
          source.startsWith('https://myanimelist.net/anime/') &&
          source.includes(`/${malId}`),
      );
    });

    if (!entry || !entry.sources) return null;

    // Find Trakt URL in sources
    const traktSource = entry.sources.find((source) =>
      source.startsWith('https://trakt.tv/shows/'),
    );

    if (!traktSource) return null;

    // Extract Trakt slug from URL
    const slug = traktSource.replace('https://trakt.tv/shows/', '');
    return slug;
  }

  /**
   * Get MAL ID from Trakt ID/slug
   * @param {string} traktSlug - Trakt show slug
   * @returns {Promise<number|null>}
   */
  async getMALIdFromTrakt(traktSlug) {
    await this.loadMappingDatabase();

    const entry = this.mappingDatabase.find((anime) => {
      if (!anime.sources) return false;
      return anime.sources.some(
        (source) =>
          source.startsWith('https://trakt.tv/shows/') &&
          source.includes(traktSlug),
      );
    });

    if (!entry || !entry.sources) return null;

    // Find MAL URL in sources
    const malSource = entry.sources.find((source) =>
      source.startsWith('https://myanimelist.net/anime/'),
    );

    if (!malSource) return null;

    // Extract MAL ID from URL
    const match = malSource.match(/\/anime\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Search for anime by title (fuzzy matching)
   * @param {string} title - Anime title to search for
   * @returns {Promise<Array>}
   */
  async searchByTitle(title) {
    await this.loadMappingDatabase();

    const searchTitle = title.toLowerCase();

    const results = this.mappingDatabase
      .filter((anime) => {
        if (!anime.title) return false;

        // Check main title
        if (anime.title.toLowerCase().includes(searchTitle)) {
          return true;
        }

        // Check alternative titles (synonyms)
        if (anime.synonyms && anime.synonyms.length > 0) {
          return anime.synonyms.some((synonym) =>
            synonym.toLowerCase().includes(searchTitle),
          );
        }

        return false;
      })
      .slice(0, 10); // Limit to 10 results

    return results.map((anime) => ({
      title: anime.title,
      malId: this.extractMALId(anime),
      traktSlug: this.extractTraktSlug(anime),
      synonyms: anime.synonyms || [],
    }));
  }

  /**
   * Extract MAL ID from anime entry
   * @param {object} anime - Anime entry from database
   * @returns {number|null}
   */
  extractMALId(anime) {
    if (!anime.sources) return null;

    const malSource = anime.sources.find((source) =>
      source.startsWith('https://myanimelist.net/anime/'),
    );

    if (!malSource) return null;

    const match = malSource.match(/\/anime\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Extract Trakt slug from anime entry
   * @param {object} anime - Anime entry from database
   * @returns {string|null}
   */
  extractTraktSlug(anime) {
    if (!anime.sources) return null;

    const traktSource = anime.sources.find((source) =>
      source.startsWith('https://trakt.tv/shows/'),
    );

    if (!traktSource) return null;

    return traktSource.replace('https://trakt.tv/shows/', '');
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;

    // Simple Levenshtein distance based similarity
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
}
