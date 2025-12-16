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
}
