import { BaseOpportunityProvider } from "./baseProvider.js";

/**
 * Arbeitnow Live Job Board Provider
 * Ingests live job postings aggregated from official employer ATS endpoints (Greenhouse, Lever, Personio).
 * Requires no API keys. Fully public, legitimate REST API.
 */
export class ArbeitnowJobProvider extends BaseOpportunityProvider {
  constructor(options = {}) {
    super({
      name: options.name || "Arbeitnow ATS Aggregator",
      category: "job",
      timeoutMs: options.timeoutMs || 5000,
    });
    this.endpoint = options.endpoint || "https://www.arbeitnow.com/api/job-board-api";
    this.staleThresholdDays = options.staleThresholdDays || 45;
  }

  isConfigured() {
    return true; // Open access REST API
  }

  normalize(raw) {
    if (!raw) return null;

    const createdAtMs = raw.created_at ? raw.created_at * 1000 : Date.now();
    const staleCutoffMs = Date.now() - this.staleThresholdDays * 86400 * 1000;
    const isStale = createdAtMs < staleCutoffMs;
    const validUntilDate = new Date(createdAtMs + this.staleThresholdDays * 86400 * 1000).toISOString().split("T")[0];

    // Strip HTML from description for clean summary
    const cleanDesc = (raw.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const normalized = {
      id: `arbeitnow-${raw.slug || Math.random().toString(36).substring(2, 9)}`,
      title: raw.title?.trim() || "Untitled Opportunity",
      organization: raw.company_name?.trim() || "Verified Employer",
      category: "job",
      sourceName: "Arbeitnow ATS Aggregator",
      sourceUrl: raw.url || "https://www.arbeitnow.com",
      provenance: "Arbeitnow Live Job Board API (ATS Aggregated)",
      lastVerifiedAt: new Date(createdAtMs).toISOString().split("T")[0],
      validUntil: validUntilDate,
      isStale,
      staleReason: isStale
        ? `Posting published >${this.staleThresholdDays} days ago; please confirm active vacancy on company careers portal.`
        : null,
      location: `${raw.location || "Flexible"}${raw.remote ? " (Remote Available)" : ""}`,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      summary: cleanDesc.slice(0, 240) + (cleanDesc.length > 240 ? "…" : ""),
      details: {
        remote: Boolean(raw.remote),
        jobTypes: Array.isArray(raw.job_types) ? raw.job_types : ["Full-time"],
        originalSlug: raw.slug,
      },
    };

    return this.validateRecord(normalized) ? normalized : null;
  }

  /**
   * Fetches live jobs from Arbeitnow and filters by query criteria.
   * @param {Object} query
   * @param {string} [query.role]
   * @param {string} [query.preferredRole]
   * @param {string[]} [query.skills]
   * @param {boolean} [query.includeStale=false]
   * @param {number} [query.limit=10]
   * @returns {Promise<Array<Object>>}
   */
  async fetchOpportunities(query = {}) {
    try {
      const data = await this.safeFetch(this.endpoint);
      const rawList = Array.isArray(data.data) ? data.data : [];

      const targetRole = (query.preferredRole || query.role || "").toLowerCase().trim();
      const userSkills = Array.isArray(query.skills)
        ? query.skills.map((s) => s.toLowerCase().trim())
        : typeof query.skills === "string"
        ? query.skills.split(/[,;]/).map((s) => s.toLowerCase().trim())
        : [];

      const results = [];

      for (const item of rawList) {
        const normalized = this.normalize(item);
        if (!normalized) continue;

        if (!query.includeStale && normalized.isStale) {
          continue;
        }

        // Filtering heuristic
        if (targetRole || userSkills.length > 0) {
          const titleLower = normalized.title.toLowerCase();
          const tagsLower = normalized.tags.map((t) => t.toLowerCase());
          const summaryLower = normalized.summary.toLowerCase();

          const matchesRole = targetRole ? titleLower.includes(targetRole) || tagsLower.some((t) => t.includes(targetRole)) : false;
          const matchesSkills = userSkills.some(
            (skill) => titleLower.includes(skill) || tagsLower.some((t) => t.includes(skill)) || summaryLower.includes(skill)
          );

          if (!matchesRole && !matchesSkills && !query.relaxed) {
            continue;
          }
        }

        results.push(normalized);
        if (query.limit && results.length >= query.limit) {
          break;
        }
      }

      return results;
    } catch (err) {
      console.warn(`[Arbeitnow Provider Warning]: ${err.message}`);
      return [];
    }
  }
}
