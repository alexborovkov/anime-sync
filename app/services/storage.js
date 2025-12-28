import Service from '@ember/service';

/**
 * Secure storage service for managing tokens and settings in localStorage
 * Provides basic obfuscation (not encryption) for stored values
 */
export default class StorageService extends Service {
  /**
   * Set a value in localStorage with basic obfuscation
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  set(key, value) {
    try {
      const encrypted = btoa(
        JSON.stringify({
          value,
          timestamp: Date.now(),
        }),
      );
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  /**
   * Get a value from localStorage
   * @param {string} key - Storage key
   * @returns {any} The stored value or null
   */
  get(key) {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      const decrypted = JSON.parse(atob(encrypted));
      return decrypted.value;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  /**
   * Set an OAuth token with expiration
   * @param {string} key - Token key
   * @param {string} value - Token value
   */
  setToken(key, value) {
    // eslint-disable-next-line ember/classic-decorator-no-classic-methods
    this.set(key, value);
  }

  /**
   * Get an OAuth token
   * @param {string} key - Token key
   * @returns {string|null} The token or null
   */
  getToken(key) {
    // eslint-disable-next-line ember/classic-decorator-no-classic-methods
    return this.get(key);
  }

  /**
   * Remove a value from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    localStorage.removeItem(key);
  }

  /**
   * Clear all stored data
   */
  clearAll() {
    localStorage.clear();
  }

  /**
   * Check if a token is expired
   * @param {string} expiryKey - Key for expiry timestamp
   * @returns {boolean} True if expired
   */
  isTokenExpired(expiryKey) {
    // eslint-disable-next-line ember/classic-decorator-no-classic-methods
    const expiresAt = this.get(expiryKey);
    if (!expiresAt) return true;

    return Date.now() >= expiresAt;
  }

  /**
   * Set a user-provided API key
   * @param {string} keyName - API key name (e.g., 'user_trakt_client_id')
   * @param {string} value - API key value
   */
  setUserApiKey(keyName, value) {
    // eslint-disable-next-line ember/classic-decorator-no-classic-methods
    this.set(keyName, value);
  }

  /**
   * Get a user-provided API key
   * @param {string} keyName - API key name
   * @returns {string|null} The API key or null
   */
  getUserApiKey(keyName) {
    // eslint-disable-next-line ember/classic-decorator-no-classic-methods
    return this.get(keyName);
  }

  /**
   * Remove a user-provided API key
   * @param {string} keyName - API key name
   */
  removeUserApiKey(keyName) {
    this.remove(keyName);
  }

  /**
   * Check if all required user API keys are configured
   * @returns {boolean} True if Trakt and MAL keys are configured
   */
  hasRequiredKeys() {
    const traktClientId = this.getUserApiKey('user_trakt_client_id');
    const traktClientSecret = this.getUserApiKey('user_trakt_client_secret');
    const malClientId = this.getUserApiKey('user_mal_client_id');
    const malClientSecret = this.getUserApiKey('user_mal_client_secret');

    return !!(
      traktClientId &&
      traktClientSecret &&
      malClientId &&
      malClientSecret
    );
  }

  /**
   * Check if Trakt API keys are configured
   * @returns {boolean} True if configured
   */
  hasTraktKeys() {
    const clientId = this.getUserApiKey('user_trakt_client_id');
    const clientSecret = this.getUserApiKey('user_trakt_client_secret');
    return !!(clientId && clientSecret);
  }

  /**
   * Check if MAL API keys are configured
   * @returns {boolean} True if configured
   */
  hasMALKeys() {
    const clientId = this.getUserApiKey('user_mal_client_id');
    const clientSecret = this.getUserApiKey('user_mal_client_secret');
    return !!(clientId && clientSecret);
  }
}
