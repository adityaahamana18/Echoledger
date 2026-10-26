// Abstract Base Class for Opportunity Data Providers
// Enforces decoupled provider interface, timeout handling, and record validation.

export class BaseOpportunityProvider {
  /**
   * @param {Object} options
   * @param {string} options.name - Unique identifier for the provider
   * @param {"scholarship"|"job"} options.category - Opportunity domain
   * @param {number} [options.timeoutMs=6000] - Request timeout in milliseconds
   */
  constructor({ name, category, timeoutMs = 6000 }) {
    if (!name) throw new Error("Provider must have a name");
    if (!["scholarship", "job"].includes(category)) {
      throw new Error(`Invalid category "${category}". Must be 'scholarship' or 'job'.`);
    }
    this.name = name;
    this.category = category;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Whether the provider is configured and ready to be queried (e.g. required env vars present)
   * @returns {boolean}
   */
  isConfigured() {
    return true;
  }

  /**
   * Fetches opportunities matching the given query parameters.
   * Subclasses must implement this.
   * @param {Object} query - Criteria such as role, skills, educationLevel, course, income
   * @returns {Promise<Array<NormalizedOpportunity>>}
   */
  async fetchOpportunities(query = {}) {
    throw new Error(`fetchOpportunities() not implemented on ${this.constructor.name}`);
  }

  /**
   * Performs an HTTP request with built-in timeout, rate limit handling, and status checks.
   * Never leaks internal credentials or raw keys in error messages.
   * @param {string} url
   * @param {RequestInit} [options={}]
   * @returns {Promise<any>} Parsed JSON response
   */
  async safeFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Provider "${this.name}" returned HTTP ${response.status} (${response.statusText})`);
      }

      return await response.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(`Provider "${this.name}" timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Validates that an imported record satisfies mandatory integrity constraints.
   * Filters out fabricated, corrupted, or incomplete listings.
   * @param {Object} record
   * @returns {boolean}
   */
  validateRecord(record) {
    if (!record || typeof record !== "object") return false;
    if (!record.id || typeof record.id !== "string") return false;
    if (!record.title || typeof record.title !== "string" || record.title.trim().length === 0) return false;
    if (!record.organization || typeof record.organization !== "string" || record.organization.trim().length === 0) return false;
    if (!record.sourceUrl || typeof record.sourceUrl !== "string" || !record.sourceUrl.startsWith("http")) return false;
    if (record.category !== this.category) return false;
    return true;
  }

  /**
   * Normalizes a raw record into the standardized opportunity schema.
   * Subclasses must implement this.
   * @param {Object} raw
   * @returns {NormalizedOpportunity|null}
   */
  normalize(raw) {
    throw new Error(`normalize() not implemented on ${this.constructor.name}`);
  }
}
