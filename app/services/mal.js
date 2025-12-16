import Service, { service } from '@ember/service';
import config from 'trakt-mal-sync/config/environment';
import { malLimiter } from '../utils/rate-limiter';

/**
 * MyAnimeList API service
 * Handles all API calls to MyAnimeList
 */
export default class MalService extends Service {
  @service storage;
  @service oauth;
  @service cache;

  /**
   * Make an authenticated request to MAL API
   * @param {string} endpoint - API endpoint (e.g., '/users/@me/animelist')
   * @param {object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    // Check if token is expired and refresh if needed
    if (this.storage.isTokenExpired('mal_expires_at')) {
      await this.oauth.refreshMALToken();
    }

    const accessToken = this.storage.getToken('mal_access_token');
    if (!accessToken) {
      throw new Error('Not authenticated with MyAnimeList');
    }

    // Rate limit the request
    return malLimiter.throttle(async () => {
      const url = `${config.APP.MAL_API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.oauth.refreshMALToken();
        // Retry the request
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `MAL API error: ${response.statusText}`);
      }

      return response.json();
    });
  }

  /**
   * Get user's anime list
   * @param {string} status - Filter by status (watching, completed, plan_to_watch, on_hold, dropped)
   * @param {number} limit - Number of items per page (max 1000)
   * @param {number} offset - Offset for pagination
   * @returns {Promise<object>}
   */
  async getAnimeList(status = null, limit = 1000, offset = 0) {
    const cacheKey = `@me-${status || 'all'}-${offset}`;
    const cached = await this.cache.get('malCache', cacheKey);
    if (cached) {
      return cached.data;
    }

    let endpoint = `/users/@me/animelist?limit=${limit}&offset=${offset}&fields=list_status,num_episodes,alternative_titles`;
    if (status) {
      endpoint += `&status=${status}`;
    }

    const data = await this.request(endpoint);

    // Cache the response
    await this.cache.set(
      'malCache',
      { userId: cacheKey, data },
      this.cache.CACHE_DURATION.malData,
    );

    return data;
  }

  /**
   * Get all anime from user's list (handles pagination)
   * @param {string} status - Filter by status
   * @returns {Promise<Array>}
   */
  async getAllAnime(status = null) {
    let allAnime = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getAnimeList(status, limit, offset);
      allAnime = [...allAnime, ...response.data];

      // Check if there are more pages
      if (response.paging && response.paging.next) {
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    return allAnime;
  }

  /**
   * Get anime details
   * @param {number} animeId - MAL anime ID
   * @returns {Promise<object>}
   */
  async getAnime(animeId) {
    return this.request(
      `/anime/${animeId}?fields=alternative_titles,num_episodes,synopsis,mean,genres`,
    );
  }

  /**
   * Update anime list status
   * @param {number} animeId - MAL anime ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<object>}
   */
  async updateAnimeStatus(animeId, updates) {
    const params = new URLSearchParams();

    if (updates.status) params.append('status', updates.status);
    if (updates.score !== undefined) params.append('score', updates.score);
    if (updates.num_watched_episodes !== undefined) {
      params.append('num_watched_episodes', updates.num_watched_episodes);
    }
    if (updates.is_rewatching !== undefined) {
      params.append('is_rewatching', updates.is_rewatching);
    }
    if (updates.start_date) params.append('start_date', updates.start_date);
    if (updates.finish_date) params.append('finish_date', updates.finish_date);

    return this.request(`/anime/${animeId}/my_list_status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  /**
   * Delete anime from list
   * @param {number} animeId - MAL anime ID
   * @returns {Promise<void>}
   */
  async deleteFromList(animeId) {
    return this.request(`/anime/${animeId}/my_list_status`, {
      method: 'DELETE',
    });
  }

  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} limit - Number of results
   * @returns {Promise<object>}
   */
  async searchAnime(query, limit = 10) {
    return this.request(
      `/anime?q=${encodeURIComponent(query)}&limit=${limit}&fields=alternative_titles,num_episodes`,
    );
  }

  /**
   * Get user profile
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    return this.request('/users/@me');
  }

  /**
   * Map MAL status to Trakt status
   * @param {string} malStatus - MAL status
   * @returns {string} Trakt-compatible status
   */
  mapStatusToTrakt(malStatus) {
    const statusMap = {
      watching: 'watching',
      completed: 'completed',
      plan_to_watch: 'plantowatch',
      on_hold: 'watching', // No direct equivalent
      dropped: null, // Don't sync dropped
    };
    return statusMap[malStatus];
  }

  /**
   * Map Trakt status to MAL status
   * @param {string} traktStatus - Trakt status
   * @returns {string} MAL-compatible status
   */
  mapStatusFromTrakt(traktStatus) {
    const statusMap = {
      watching: 'watching',
      completed: 'completed',
      plantowatch: 'plan_to_watch',
    };
    return statusMap[traktStatus] || 'plan_to_watch';
  }
}
