// OpportunityManager aggregates multiple providers, deduplicates, and separates stale records.

import { ScholarshipRegistryProvider } from "./scholarshipRegistryProvider.js";
import { DataGovInScholarshipProvider } from "./dataGovInScholarshipProvider.js";
import { ArbeitnowJobProvider } from "./arbeitnowJobProvider.js";
import { AdzunaJobProvider } from "./adzunaJobProvider.js";

/**
 * Build a list of provider instances based on environment configuration.
 * Each provider knows whether it is configured via its own `isConfigured()` method.
 */
function buildProviders() {
  const providers = [];

  // Scholarship providers (order defines precedence for duplicate resolution)
  providers.push(new ScholarshipRegistryProvider());
  providers.push(new DataGovInScholarshipProvider());

  // Job providers
  providers.push(new ArbeitnowJobProvider());
  providers.push(new AdzunaJobProvider());

  // Keep only those that report ready
  return providers.filter((p) => p.isConfigured());
}

/**
 * Fetch opportunities from all configured providers.
 * @param {Object} query – user‑side filters (role, skills, course, income, etc.)
 * @param {boolean} [query.includeStale=false] – whether stale items should be returned.
 * @returns {Promise<{current: Array, stale: Array}>}
 */
export async function getOpportunities(query = {}) {
  const providers = buildProviders();
  if (providers.length === 0) {
    return { current: [], stale: [] };
  }

  const includeStale = Boolean(query.includeStale);
  const fetchPromises = providers.map((p) =>
    // Each provider already enforces its own timeout.
    p
      .fetchOpportunities(query)
      .catch((err) => {
        console.warn(`[OpportunityManager] Provider ${p.name} failed: ${err.message}`);
        return [];
      })
  );

  const resultsArrays = await Promise.all(fetchPromises);
  const allResults = resultsArrays.flat();

  // Deduplicate – we keep the first occurrence (provider order priority).
  const seen = new Set();
  const current = [];
  const stale = [];

  for (const rec of allResults) {
    if (!rec || !rec.sourceUrl || !rec.title) continue;
    const key = `${rec.sourceUrl}::${rec.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (rec.isStale) {
      if (includeStale) stale.push(rec);
    } else {
      current.push(rec);
    }
  }

  return { current, stale };
}

// Export provider list for possible introspection/testing
export { buildProviders };
