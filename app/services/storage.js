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
    this.set(key, value);
  }

  /**
   * Get an OAuth token
   * @param {string} key - Token key
   * @returns {string|null} The token or null
   */
  getToken(key) {
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
    const expiresAt = this.get(expiryKey);
    if (!expiresAt) return true;

    return Date.now() >= expiresAt;
  }
}
