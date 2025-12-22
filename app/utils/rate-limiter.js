/**
 * Rate limiter using token bucket algorithm
 * Prevents exceeding API rate limits by queuing requests
 */
export class RateLimiter {
  /**
   * Create a rate limiter
   * @param {number} maxRequests - Maximum number of requests
   * @param {number} timeWindowMs - Time window in milliseconds
   */
  constructor(maxRequests, timeWindowMs) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
    this.queue = [];
    this.timestamps = [];
    this.processing = false;
  }

  /**
   * Throttle a function call
   * @param {Function} fn - Function to execute
   * @returns {Promise<any>} Result of the function
   */
  async throttle(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Remove old timestamps outside the time window
      const now = Date.now();
      this.timestamps = this.timestamps.filter(
        (ts) => now - ts < this.timeWindowMs,
      );

      // Check if we can make a request
      if (this.timestamps.length < this.maxRequests) {
        const { fn, resolve, reject } = this.queue.shift();
        this.timestamps.push(now);

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        // Small delay between requests to avoid bursts
        await this.delay(100);
      } else {
        // Wait until the oldest timestamp expires
        const oldestTimestamp = this.timestamps[0];
        const waitTime = this.timeWindowMs - (now - oldestTimestamp) + 100;
        await this.delay(waitTime);
      }
    }

    this.processing = false;
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue length
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Get current request count in the time window
   * @returns {number}
   */
  getCurrentRequestCount() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.timeWindowMs,
    );
    return this.timestamps.length;
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
  }
}

// Pre-configured rate limiters for each API
export const traktLimiter = new RateLimiter(1000, 5 * 60 * 1000); // 1000 requests per 5 minutes
export const malLimiter = new RateLimiter(60, 60 * 1000); // 60 requests per minute
export const idsMoeLimiter = new RateLimiter(50, 60 * 1000); // 50 requests per minute (leave some buffer from 60 limit)
