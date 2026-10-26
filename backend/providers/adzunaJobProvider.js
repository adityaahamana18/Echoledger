import { BaseOpportunityProvider } from "./baseProvider.js";

/**
 * Adzuna Job Search API Provider
 * Legitimate global job search API.
 * Requires: ADZUNA_APP_ID and ADZUNA_APP_KEY in backend/.env.
 */
export class AdzunaJobProvider extends BaseOpportunityProvider {
  constructor(options = {}) {
    super({
      name: options.name || "Adzuna Job Search",
      category: "job",
      timeoutMs: options.timeoutMs || 5000,
    });
    this.appId = options.appId || process.env.ADZUNA_APP_ID || null;
    this.appKey = options.appKey || process.env.ADZUNA_APP_KEY || null;
    this.country = options.country || process.env.ADZUNA_COUNTRY || "in"; // default: India
    this.staleThresholdDays = options.staleThresholdDays || 45;
  }

  isConfigured() {
    return Boolean(this.appId && this.appKey);
  }

  normalize(raw) {
    if (!raw) return null;

    const createdAtMs = raw.created ? new Date(raw.created).getTime() : Date.now();
    const staleCutoffMs = Date.now() - this.staleThresholdDays * 86400 * 1000;
    const isStale = createdAtMs < staleCutoffMs;
    const validUntilDate = new Date(createdAtMs + this.staleThresholdDays * 86400 * 1000).toISOString().split("T")[0];

    const cleanDesc = (raw.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const normalized = {
      id: `adzuna-${raw.id || Math.random().toString(36).substring(2, 9)}`,
      title: raw.title?.replace(/<[^>]+>/g, "").trim() || "Job Opening",
      organization: raw.company?.display_name?.trim() || "Verified Hiring Partner",
      category: "job",
      sourceName: "Adzuna Job Search (Developer API)",
      sourceUrl: raw.redirect_url || "https://www.adzuna.in",
      provenance: `Adzuna API (${this.country.toUpperCase()})`,
      lastVerifiedAt: new Date(createdAtMs).toISOString().split("T")[0],
      validUntil: validUntilDate,
      isStale,
      staleReason: isStale ? `Posting published >${this.staleThresholdDays} days ago; please verify vacancy status.` : null,
      location: raw.location?.display_name || "India",
      tags: [raw.category?.label].filter(Boolean),
      summary: cleanDesc.slice(0, 240) + (cleanDesc.length > 240 ? "…" : ""),
      details: {
        salaryMin: raw.salary_min || null,
        salaryMax: raw.salary_max || null,
        contractType: raw.contract_time || "Permanent",
      },
    };

    return this.validateRecord(normalized) ? normalized : null;
  }

  async fetchOpportunities(query = {}) {
    if (!this.isConfigured()) {
      return [];
    }

    const searchTerm = query.preferredRole || query.role || "Software Developer";
    const url = `https://api.adzuna.com/v1/api/jobs/${this.country}/search/1?app_id=${encodeURIComponent(this.appId)}&app_key=${encodeURIComponent(this.appKey)}&what=${encodeURIComponent(searchTerm)}&content-type=application/json`;

    try {
      const data = await this.safeFetch(url);
      const results = Array.isArray(data.results) ? data.results : [];
      return results
        .map((r) => this.normalize(r))
        .filter(Boolean)
        .filter((r) => query.includeStale || !r.isStale);
    } catch (err) {
      console.warn(`[Adzuna Provider Warning]: ${err.message}`);
      return [];
    }
  }
}
