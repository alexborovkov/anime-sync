import Service, { service } from '@ember/service';
import config from 'trakt-mal-sync/config/environment';
import { traktLimiter } from 'trakt-mal-sync/utils/rate-limiter';

/**
 * Trakt API service
 * Handles all API calls to Trakt.tv
 */
export default class TraktService extends Service {
  @service storage;
  @service oauth;
  @service cache;

  /**
   * Make an authenticated request to Trakt API
   * @param {string} endpoint - API endpoint (e.g., '/users/me/watched/shows')
   * @param {object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    // Check if token is expired and refresh if needed
    if (this.storage.isTokenExpired('trakt_expires_at')) {
      await this.oauth.refreshTraktToken();
    }

    const accessToken = this.storage.getToken('trakt_access_token');
    if (!accessToken) {
      throw new Error('Not authenticated with Trakt');
    }

    // Rate limit the request
    return traktLimiter.throttle(async () => {
      const url = `${config.APP.TRAKT_API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'trakt-api-version': '2',
          'trakt-api-key': config.APP.TRAKT_CLIENT_ID,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.oauth.refreshTraktToken();
        // Retry the request
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `Trakt API error: ${response.statusText}`,
        );
      }

      return response.json();
    });
  }

  /**
   * Get user's watched shows
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @returns {Promise<Array>}
   */
  async getWatchedShows(username = 'me') {
    // Check cache first
    const cacheKey = `${username}-watched`;
    const cached = await this.cache.get('traktCache', cacheKey);
    if (cached) {
      return cached.shows;
    }

    const shows = await this.request(`/users/${username}/watched/shows`);

    // Cache the response
    await this.cache.set(
      'traktCache',
      { userId: cacheKey, shows },
      this.cache.CACHE_DURATION.traktData,
    );

    return shows;
  }

  /**
   * Get user's watchlist
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @returns {Promise<Array>}
   */
  async getWatchlist(username = 'me') {
    const cacheKey = `${username}-watchlist`;
    const cached = await this.cache.get('traktCache', cacheKey);
    if (cached) {
      return cached.shows;
    }

    const shows = await this.request(`/users/${username}/watchlist/shows`);

    await this.cache.set(
      'traktCache',
      { userId: cacheKey, shows },
      this.cache.CACHE_DURATION.traktData,
    );

    return shows;
  }

  /**
   * Get user's collection
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @returns {Promise<Array>}
   */
  async getCollection(username = 'me') {
    const cacheKey = `${username}-collection`;
    const cached = await this.cache.get('traktCache', cacheKey);
    if (cached) {
      return cached.shows;
    }

    const shows = await this.request(`/users/${username}/collection/shows`);

    await this.cache.set(
      'traktCache',
      { userId: cacheKey, shows },
      this.cache.CACHE_DURATION.traktData,
    );

    return shows;
  }

  /**
   * Get user's custom lists
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @returns {Promise<Array>} Array of list objects with { name, ids, item_count, etc }
   */
  async getUserLists(username = 'me') {
    const cacheKey = `${username}-lists`;
    const cached = await this.cache.get('traktCache', cacheKey);
    if (cached) {
      return cached.lists;
    }

    const lists = await this.request(`/users/${username}/lists`);

    await this.cache.set(
      'traktCache',
      { userId: cacheKey, lists },
      this.cache.CACHE_DURATION.traktData,
    );

    return lists;
  }

  /**
   * Get items from a specific list
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @param {string} listId - List ID or slug
   * @returns {Promise<Array>} Array of list items (filtered to shows and movies)
   */
  async getListItems(username = 'me', listId) {
    const cacheKey = `${username}-list-${listId}`;
    const cached = await this.cache.get('traktCache', cacheKey);
    if (cached) {
      return cached.items;
    }

    // Fetch all items from the list
    const allItems = await this.request(`/users/${username}/lists/${listId}/items`);

    // Filter to only show and movie items (anime can be both TV shows and movies on Trakt)
    const items = allItems.filter(item => item.type === 'show' || item.type === 'movie');

    await this.cache.set(
      'traktCache',
      { userId: cacheKey, items },
      this.cache.CACHE_DURATION.traktData,
    );

    return items;
  }

  /**
   * Get show information
   * @param {string} id - Trakt show ID or slug
   * @returns {Promise<object>}
   */
  async getShow(id) {
    return this.request(`/shows/${id}?extended=full`);
  }

  /**
   * Get user's ratings
   * @param {string} username - Trakt username (use 'me' for authenticated user)
   * @returns {Promise<Array>}
   */
  async getRatings(username = 'me') {
    return this.request(`/users/${username}/ratings/shows`);
  }

  /**
   * Add shows to history
   * @param {Array} shows - Array of show objects with ids and watched_at
   * @returns {Promise<object>}
   */
  async addToHistory(shows) {
    return this.request('/sync/history', {
      method: 'POST',
      body: JSON.stringify({ shows }),
    });
  }

  /**
   * Add shows to watchlist
   * @param {Array} shows - Array of show objects with ids
   * @returns {Promise<object>}
   */
  async addToWatchlist(shows) {
    return this.request('/sync/watchlist', {
      method: 'POST',
      body: JSON.stringify({ shows }),
    });
  }

  /**
   * Remove shows from watchlist
   * @param {Array} shows - Array of show objects with ids
   * @returns {Promise<object>}
   */
  async removeFromWatchlist(shows) {
    return this.request('/sync/watchlist/remove', {
      method: 'POST',
      body: JSON.stringify({ shows }),
    });
  }

  /**
   * Add ratings
   * @param {Array} shows - Array of show objects with ids and rating
   * @returns {Promise<object>}
   */
  async addRatings(shows) {
    return this.request('/sync/ratings', {
      method: 'POST',
      body: JSON.stringify({ shows }),
    });
  }

  /**
   * Get user profile
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    return this.request('/users/me');
  }

  /**
   * Search for shows
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async searchShows(query) {
    return this.request(
      `/search/show?query=${encodeURIComponent(query)}&extended=full`,
    );
  }

  /**
   * Create a new custom list
   * @param {string} name - List name
   * @param {string} description - List description (optional)
   * @param {string} privacy - List privacy (private, friends, public) - default: private
   * @returns {Promise<object>} Created list object
   */
  async createList(name, description = '', privacy = 'private') {
    return this.request('/users/me/lists', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        privacy,
        display_numbers: true,
        allow_comments: false,
      }),
    });
  }

  /**
   * Add items to a custom list
   * @param {string} listId - List ID or slug
   * @param {Array} shows - Array of show objects with ids
   * @param {Array} movies - Array of movie objects with ids (optional)
   * @returns {Promise<object>}
   */
  async addItemsToList(listId, shows = [], movies = []) {
    return this.request(`/users/me/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        shows,
        movies,
      }),
    });
  }
}
