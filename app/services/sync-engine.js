import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Sync engine service
 * Handles the core synchronization logic between Trakt and MAL
 */
export default class SyncEngineService extends Service {
  @service trakt;
  @service mal;
  @service mapping;
  @service cache;

  @tracked syncProgress = 0;
  @tracked syncTotal = 0;
  @tracked syncStatus = 'idle'; // idle, analyzing, syncing, complete, error
  @tracked currentOperation = null;

  /**
   * Analyze differences between Trakt and MAL
   * @param {string} direction - 'trakt-to-mal' or 'mal-to-trakt'
   * @returns {Promise<Array>} Array of sync operations
   */
  async analyzeDifferences(direction) {
    this.syncStatus = 'analyzing';
    this.syncProgress = 0;
    this.syncTotal = 0;

    try {
      // Fetch data from both services
      this.currentOperation = 'Fetching anime lists...';
      const [traktData, malData] = await Promise.all([
        this.trakt.getWatchedShows(),
        this.mal.getAllAnime(),
      ]);

      // Map the data
      this.currentOperation = 'Matching anime between services...';
      this.syncTotal = traktData.length + malData.length;
      const mappedData = await this.mapEntries(traktData, malData);

      // Calculate differences
      const operations = this.calculateDifferences(mappedData, direction);

      this.syncStatus = 'idle';
      return operations;
    } catch (error) {
      this.syncStatus = 'error';
      throw error;
    }
  }

  /**
   * Map entries between Trakt and MAL
   * @param {Array} traktData - Trakt watched shows
   * @param {Array} malData - MAL anime list
   * @returns {Promise<Array>}
   */
  async mapEntries(traktData, malData) {
    const mapped = [];

    // Create a map of MAL IDs for quick lookup
    const malMap = new Map();
    for (const item of malData) {
      malMap.set(item.node.id, item);
    }

    // Process each Trakt entry
    for (const traktShow of traktData) {
      const traktId = traktShow.show.ids.slug;
      const malId = await this.mapping.getMALIdFromTrakt(traktShow.show);

      const malEntry = malId ? malMap.get(malId) : null;

      mapped.push({
        traktId,
        malId,
        title: traktShow.show.title,
        traktData: traktShow,
        malData: malEntry || null,
        mapped: !!malId,
      });

      // Remove from MAL map to track unmatched entries
      if (malId) {
        malMap.delete(malId);
      }

      this.syncProgress++;
    }

    // Add remaining MAL entries that weren't matched
    for (const [malId, malEntry] of malMap.entries()) {
      const traktSlug = await this.mapping.getTraktSlugFromMAL(malEntry.node);

      mapped.push({
        traktId: traktSlug,
        malId,
        title: malEntry.node.title,
        traktData: null,
        malData: malEntry,
        mapped: !!traktSlug,
      });

      this.syncProgress++;
    }

    return mapped;
  }

  /**
   * Calculate sync operations needed
   * @param {Array} mappedData - Mapped entries
   * @param {string} direction - Sync direction
   * @returns {Array} Sync operations
   */
  calculateDifferences(mappedData, direction) {
    const operations = [];

    for (const entry of mappedData) {
      if (!entry.mapped) {
        // Can't sync without mapping
        operations.push({
          type: 'unmapped',
          entry,
          action: 'skip',
          reason: 'No ID mapping available',
        });
        continue;
      }

      if (direction === 'trakt-to-mal') {
        if (entry.traktData && !entry.malData) {
          // Exists in Trakt but not in MAL - add to MAL
          operations.push({
            type: 'add',
            entry,
            action: 'add_to_mal',
            changes: this.extractTraktData(entry.traktData),
          });
        } else if (entry.traktData && entry.malData) {
          // Exists in both - check for differences
          const diff = this.compareTraktToMAL(
            entry.traktData,
            entry.malData.list_status,
          );
          if (diff.hasChanges) {
            operations.push({
              type: 'update',
              entry,
              action: 'update_mal',
              changes: diff.changes,
            });
          }
        }
      } else if (direction === 'mal-to-trakt') {
        if (entry.malData && !entry.traktData) {
          // Exists in MAL but not in Trakt - add to Trakt
          operations.push({
            type: 'add',
            entry,
            action: 'add_to_trakt',
            changes: this.extractMALData(entry.malData),
          });
        } else if (entry.malData && entry.traktData) {
          // Exists in both - check for differences
          const diff = this.compareMALToTrakt(
            entry.malData.list_status,
            entry.traktData,
          );
          if (diff.hasChanges) {
            operations.push({
              type: 'update',
              entry,
              action: 'update_trakt',
              changes: diff.changes,
            });
          }
        }
      }
    }

    return operations;
  }

  /**
   * Extract relevant data from Trakt entry
   * @param {object} traktData - Trakt entry
   * @returns {object}
   */
  extractTraktData(traktData) {
    return {
      status: 'completed', // Watched shows are completed
      episodes_watched: traktData.plays || 0,
      last_watched: traktData.last_watched_at,
    };
  }

  /**
   * Extract relevant data from MAL entry
   * @param {object} malData - MAL entry
   * @returns {object}
   */
  extractMALData(malData) {
    return {
      status: malData.list_status?.status || 'plan_to_watch',
      score: malData.list_status?.score || 0,
      episodes_watched: malData.list_status?.num_episodes_watched || 0,
    };
  }

  /**
   * Compare Trakt and MAL data
   * @param {object} traktData - Trakt entry
   * @param {object} malStatus - MAL list status
   * @returns {object}
   */
  compareTraktToMAL(traktData, malStatus) {
    const changes = {};
    let hasChanges = false;

    // MAL status should be completed if in Trakt watched
    if (malStatus?.status !== 'completed') {
      changes.status = { from: malStatus?.status, to: 'completed' };
      hasChanges = true;
    }

    // Check episodes watched
    const traktEpisodes = traktData.plays || 0;
    const malEpisodes = malStatus?.num_episodes_watched || 0;
    if (traktEpisodes > malEpisodes) {
      changes.episodes = { from: malEpisodes, to: traktEpisodes };
      hasChanges = true;
    }

    return { hasChanges, changes };
  }

  /**
   * Compare MAL and Trakt data
   * @param {object} malStatus - MAL list status
   * @param {object} traktData - Trakt entry
   * @returns {object}
   */
  compareMALToTrakt(malStatus, traktData) {
    const changes = {};
    let hasChanges = false;

    // If MAL is completed, should be in Trakt watched
    if (malStatus?.status === 'completed' && !traktData) {
      changes.status = { from: null, to: 'completed' };
      hasChanges = true;
    }

    return { hasChanges, changes };
  }

  /**
   * Execute sync operations
   * @param {Array} operations - Operations to execute
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<object>} Results summary
   */
  async executeSyncOperations(operations, onProgress = null) {
    this.syncStatus = 'syncing';
    this.syncTotal = operations.length;
    this.syncProgress = 0;

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    for (const operation of operations) {
      this.currentOperation = operation;

      try {
        if (operation.type === 'unmapped') {
          results.skipped++;
          results.details.push({
            ...operation,
            status: 'skipped',
          });
        } else {
          await this.executeOperation(operation);
          results.successful++;
          results.details.push({
            ...operation,
            status: 'success',
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          ...operation,
          status: 'error',
          error: error.message,
        });
      }

      this.syncProgress++;
      if (onProgress) {
        onProgress(this.syncProgress, this.syncTotal);
      }

      // Small delay to avoid rate limiting
      await this.delay(100);
    }

    this.syncStatus = 'complete';
    this.currentOperation = null;

    // Save sync history
    await this.saveSyncHistory(results);

    return results;
  }

  /**
   * Execute a single operation
   * @param {object} operation - Operation to execute
   * @returns {Promise<void>}
   */
  async executeOperation(operation) {
    switch (operation.action) {
      case 'add_to_mal':
        return this.mal.updateAnimeStatus(operation.entry.malId, {
          status: operation.changes.status || 'completed',
          num_watched_episodes: operation.changes.episodes_watched || 0,
        });

      case 'update_mal':
        return this.mal.updateAnimeStatus(operation.entry.malId, {
          status: operation.changes.status?.to,
          num_watched_episodes: operation.changes.episodes?.to,
        });

      case 'add_to_trakt':
        return this.trakt.addToHistory([
          {
            ids: { slug: operation.entry.traktId },
          },
        ]);

      case 'update_trakt':
        return this.trakt.addToHistory([
          {
            ids: { slug: operation.entry.traktId },
          },
        ]);

      default:
        throw new Error(`Unknown operation: ${operation.action}`);
    }
  }

  /**
   * Save sync history to cache
   * @param {object} results - Sync results
   * @returns {Promise<void>}
   */
  async saveSyncHistory(results) {
    await this.cache.set('syncHistory', {
      timestamp: new Date(),
      ...results,
    });
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
