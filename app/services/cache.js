import Service from '@ember/service';

/**
 * Cache service using IndexedDB for storing anime mapping data and API responses
 * Provides TTL-based caching with automatic expiration
 */
export default class CacheService extends Service {
  dbName = 'TraktMALSync';
  dbVersion = 4;  // Increment version to trigger upgrade
  db = null;

  // Cache durations in milliseconds
  CACHE_DURATION = {
    mapping: 7 * 24 * 60 * 60 * 1000, // 7 days
    traktData: 1 * 60 * 60 * 1000, // 1 hour
    malData: 1 * 60 * 60 * 1000, // 1 hour
  };

  /**
   * Initialize the database on service creation
   */
  constructor() {
    super(...arguments);
    this.openDatabase();
  }

  /**
   * Open or create the IndexedDB database
   * @returns {Promise<IDBDatabase>}
   */
  async openDatabase() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Delete old mapping store if it exists (schema change)
        if (db.objectStoreNames.contains('animeMapping')) {
          db.deleteObjectStore('animeMapping');
        }

        // Create object store for anime mapping with 'id' as keyPath
        const mappingStore = db.createObjectStore('animeMapping', {
          keyPath: 'id',  // Changed from 'malId' to 'id'
        });
        mappingStore.createIndex('malId', 'malId', { unique: false });
        mappingStore.createIndex('traktId', 'traktId', { unique: false });
        mappingStore.createIndex('title', 'title', { unique: false });

        // Create object store for Trakt data cache
        if (!db.objectStoreNames.contains('traktCache')) {
          db.createObjectStore('traktCache', { keyPath: 'userId' });
        }

        // Create object store for MAL data cache
        if (!db.objectStoreNames.contains('malCache')) {
          db.createObjectStore('malCache', { keyPath: 'userId' });
        }

        // Create object store for sync history
        if (!db.objectStoreNames.contains('syncHistory')) {
          db.createObjectStore('syncHistory', {
            keyPath: 'id',
          });
        }

        // Create object store for list sync history
        if (!db.objectStoreNames.contains('listSyncHistory')) {
          const listSyncStore = db.createObjectStore('listSyncHistory', {
            keyPath: 'id',
          });
          listSyncStore.createIndex('listId', 'listId', { unique: false });
          listSyncStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        }

        // Create object store for list sync status (simple flag)
        if (!db.objectStoreNames.contains('listSyncStatus')) {
          db.createObjectStore('listSyncStatus', {
            keyPath: 'id',
          });
        }
      };
    });
  }

  /**
   * Get a value from a store
   * @param {string} storeName - Object store name
   * @param {any} key - Key to retrieve
   * @returns {Promise<any>} The cached data or null if expired/not found
   */
  async get(storeName, key) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const data = request.result;

        // Check if data exists and is not expired
        if (data && data.expiresAt && Date.now() < data.expiresAt) {
          resolve(data);
        } else if (data && !data.expiresAt) {
          // No expiration set, return data
          resolve(data);
        } else {
          // Expired or not found
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Cache get error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Set a value in a store with optional TTL
   * @param {string} storeName - Object store name
   * @param {any} data - Data to store
   * @param {number} ttlMs - Time to live in milliseconds (optional)
   * @returns {Promise<any>}
   */
  async set(storeName, data, ttlMs = null) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const dataToStore = {
        ...data,
        cachedAt: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : null,
      };

      const request = store.put(dataToStore);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Cache set error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get data by index
   * @param {string} storeName - Object store name
   * @param {string} indexName - Index name
   * @param {any} value - Value to search for
   * @returns {Promise<any>}
   */
  async getByIndex(storeName, indexName, value) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);

      request.onsuccess = () => {
        const data = request.result;

        // Check expiration
        if (data && data.expiresAt && Date.now() >= data.expiresAt) {
          resolve(null);
        } else {
          resolve(data);
        }
      };

      request.onerror = () => {
        console.error('Cache getByIndex error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all items from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter out expired items
        const items = request.result.filter((item) => {
          if (!item.expiresAt) return true;
          return Date.now() < item.expiresAt;
        });
        resolve(items);
      };

      request.onerror = () => {
        console.error('Cache getAll error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove a value from a store
   * @param {string} storeName - Object store name
   * @param {any} key - Key to remove
   * @returns {Promise<void>}
   */
  async remove(storeName, key) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Cache remove error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all data from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Cache clearStore error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all expired items from all stores
   * @returns {Promise<void>}
   */
  async clearExpired() {
    await this.openDatabase();

    const storeNames = ['animeMapping', 'traktCache', 'malCache', 'syncHistory', 'listSyncHistory', 'listSyncStatus'];

    for (const storeName of storeNames) {
      const items = await this.getAll(storeName);
      const expiredKeys = items
        .filter((item) => item.expiresAt && Date.now() >= item.expiresAt)
        .map((item) => item.id || item.userId);

      for (const key of expiredKeys) {
        await this.remove(storeName, key);
      }
    }
  }

  /**
   * Clear all data from all stores
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.openDatabase();

    const storeNames = ['animeMapping', 'traktCache', 'malCache', 'syncHistory', 'listSyncHistory', 'listSyncStatus'];

    for (const storeName of storeNames) {
      await this.clearStore(storeName);
    }
  }
}
