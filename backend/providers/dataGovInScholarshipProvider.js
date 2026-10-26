import { BaseOpportunityProvider } from "./baseProvider.js";

/**
 * Data.gov.in Open Government Data (OGD) Scholarship Provider
 * Connects to open government datasets hosted on data.gov.in.
 * Requires: DATA_GOV_IN_API_KEY environment variable.
 */
export class DataGovInScholarshipProvider extends BaseOpportunityProvider {
  constructor(options = {}) {
    super({
      name: "Open Government Data (data.gov.in)",
      category: "scholarship",
      timeoutMs: options.timeoutMs || 5000,
    });
    this.apiKey = options.apiKey || process.env.DATA_GOV_IN_API_KEY || null;
    this.resourceId = options.resourceId || process.env.DATA_GOV_IN_SCHOLARSHIP_RESOURCE_ID || null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.resourceId);
  }

  normalize(raw) {
    if (!raw) return null;

    const normalized = {
      id: `datagov-${raw.id || raw._id || Math.random().toString(36).substring(2, 9)}`,
      title: raw.scheme_name || raw.title || "Government Scholarship Scheme",
      organization: raw.ministry || raw.department || "Government of India",
      category: "scholarship",
      sourceName: "Open Government Data Platform India (data.gov.in)",
      sourceUrl: raw.official_url || "https://data.gov.in",
      provenance: `OGD Resource ${this.resourceId || "catalog"}`,
      lastVerifiedAt: raw.updated_date || new Date().toISOString().split("T")[0],
      validUntil: raw.valid_until || null,
      isStale: false,
      staleReason: null,
      location: raw.state || "All India",
      tags: [raw.category, raw.level].filter(Boolean),
      summary: raw.description || "Public scholarship scheme listed on data.gov.in",
      details: {
        awardAmount: raw.amount || "Variable",
        eligibleCourses: raw.eligible_courses ? [raw.eligible_courses] : [],
      },
    };

    return this.validateRecord(normalized) ? normalized : null;
  }

  async fetchOpportunities(query = {}) {
    if (!this.isConfigured()) {
      return [];
    }

    const url = `https://api.data.gov.in/resource/${this.resourceId}?api-key=${encodeURIComponent(this.apiKey)}&format=json&limit=20`;

    try {
      const data = await this.safeFetch(url);
      const records = data.records || [];
      return records.map((r) => this.normalize(r)).filter(Boolean);
    } catch (err) {
      console.warn(`[data.gov.in provider error]: ${err.message}`);
      return [];
    }
  }
}
