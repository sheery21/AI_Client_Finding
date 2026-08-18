// searchBusinesses.js (updated)
import {
  blockedDomains,
  isBlockedDomain,
  isBlockedPath,
  normalizeDomain,
} from "../config/blockedWebsites.js";

import { checkOfficialBusinessWebsite } from "./businessWebsite.service.js";
import { validateWebsite } from "./website.service.js";
import { auditWebsite } from "./websiteAudit.service.js";
import {
  extractBusinessName,
  isGenericBusinessName,
} from "./businessName.service.js";
import {
  extractCityFromWebsite,
  isLocationRelevant,
} from "./cityExtract.service.js";
import { filterLeads } from "./leadFilter.service.js";
import { shouldKeepLead } from "./leadFilter.service.js";

const cleanTitleForBusinessName = (title = "") => {
  // Remove generic phrases
  return title
    .replace(/\|.*$/, "")
    .replace(/ - .*$/, "")
    .replace(/ — .*$/, "")
    .replace(/official website/i, "")
    .replace(/home page/i, "")
    .trim();
};

export const searchBusinesses = async (city, category) => {
  try {
    const searchCategory = category?.trim().toLowerCase();
    const searchCity = city?.trim();

    if (!searchCategory || !searchCity) {
      throw new Error("City and category are required");
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is missing");
    }

    const searchQuery = `
      "${searchCategory}"
      "${searchCity}"
      official website
      business
      company
      shop
    `
      .replace(/\s+/g, " ")
      .trim();

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: "advanced",
        max_results: 30,
        exclude_domains: blockedDomains,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily Error ${response.status}:`, errorText);
      throw new Error(`Tavily API responded with ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.results)) {
      return [];
    }

    const leads = [];
    const processedDomains = new Set();
    const attemptedDomains = new Set();

    for (const item of data.results) {
      if (!item.url) continue;

      const originalUrl = item.url.trim();
      if (!originalUrl) continue;

      // --------------------------------
      // 1. BLOCK DOMAIN
      // --------------------------------
      if (isBlockedDomain(originalUrl)) {
        console.log(`⛔ Blocked domain: ${originalUrl}`);
        continue;
      }

      // --------------------------------
      // 2. BLOCK PATH
      // --------------------------------
      if (isBlockedPath(originalUrl)) {
        console.log(`⛔ Blocked path: ${originalUrl}`);
        continue;
      }

      // --------------------------------
      // 3. DOMAIN DUPLICATE CHECK
      // --------------------------------
      const originalDomain = normalizeDomain(originalUrl);
      if (!originalDomain) continue;

      if (processedDomains.has(originalDomain)) {
        console.log(`⏭️ Already successfully processed: ${originalDomain}`);
        continue;
      }

      if (attemptedDomains.has(originalDomain)) {
        console.log(`⏭️ Already attempted (failed): ${originalDomain}`);
        continue;
      }
      attemptedDomains.add(originalDomain);

      // --------------------------------
      // 4. VALIDATE WEBSITE
      // --------------------------------
      const websiteCheck = await validateWebsite(originalUrl);

      if (!websiteCheck.valid) {
        console.log(
          `⚠️ Could not fetch/verify: ${originalUrl} — ${
            websiteCheck.reason || "Unknown error"
          }`,
        );
        continue;
      }

      // --------------------------------
      // 5. FINAL URL
      // --------------------------------
      const verifiedUrl = websiteCheck.finalUrl || originalUrl;
      const verifiedDomain = normalizeDomain(verifiedUrl);

      if (processedDomains.has(verifiedDomain)) {
        console.log(
          `⏭️ Redirected to already processed domain: ${verifiedDomain}`,
        );
        continue;
      }

      if (isBlockedDomain(verifiedUrl)) {
        console.log(`⛔ Redirected to blocked domain: ${verifiedUrl}`);
        continue;
      }

      if (isBlockedPath(verifiedUrl)) {
        console.log(`⛔ Redirected to blocked path: ${verifiedUrl}`);
        continue;
      }

      // --------------------------------
      // 6. EXTRACT BUSINESS NAME (IMPROVED)
      // --------------------------------

      let businessName = null;

      try {
        // ✅ SAFEST APPROACH: Use String() to convert anything to string
        const safeTitle = item.title ? String(item.title) : "";

        businessName = extractBusinessName(
          websiteCheck.html,
          verifiedUrl,
          safeTitle,
        );
      } catch (error) {
        console.log(`⚠️ Error extracting business name: ${error.message}`);
        businessName = null;
      }

      // If still no valid name, use domain as fallback
      if (!businessName || isGenericBusinessName(businessName)) {
        try {
          const urlObj = new URL(verifiedUrl);
          const domain = urlObj.hostname.replace(/^www\./, "");
          const parts = domain.split(".");
          businessName = parts[0]
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
        } catch (e) {
          businessName = null;
        }
      }

      // ✅ If still null, use a fallback
      if (!businessName) {
        try {
          const urlObj = new URL(verifiedUrl);
          businessName = urlObj.hostname
            .replace(/^www\./, "")
            .split(".")[0]
            .toUpperCase();
        } catch (e) {
          businessName = "Unknown Business";
        }
      }

      // Skip if business name is too generic
      if (isGenericBusinessName(businessName)) {
        console.log(
          `❌ Skipping: Generic business name - ${businessName} for ${verifiedUrl}`,
        );
        continue;
      }

      console.log(`✅ Business name extracted: ${businessName}`);

      // --------------------------------
      // 7. EXTRACT CITY
      // --------------------------------
      const businessCity = extractCityFromWebsite(
        websiteCheck.html,
        verifiedUrl,
        searchCity,
      );

      // Skip if city doesn't match
      if (businessCity && !isLocationRelevant(businessCity, searchCity)) {
        console.log(
          `❌ Skipping: City mismatch - ${businessCity} vs ${searchCity}`,
        );
        continue;
      }

      // --------------------------------
      // 8. OFFICIAL WEBSITE CHECK
      // --------------------------------
      const officialCheck = await checkOfficialBusinessWebsite(
        verifiedUrl,
        businessName,
        searchCategory,
        websiteCheck.html,
        websiteCheck.status,
        websiteCheck.finalUrl,
      );

      if (!officialCheck.official) {
        if (officialCheck.uncertain) {
          console.log(
            `⚠️ Could not verify official website: ${verifiedUrl} — ${officialCheck.reason}`,
          );
        } else {
          console.log(
            `❌ Not official business website: ${verifiedUrl} — ${officialCheck.reason}`,
          );
        }
        continue;
      }

      const officialUrl = officialCheck.finalUrl || verifiedUrl;
      const officialDomain = normalizeDomain(officialUrl);

      if (processedDomains.has(officialDomain)) {
        console.log(
          `⏭️ Official URL domain already processed: ${officialDomain}`,
        );
        continue;
      }

      // --------------------------------
      // 9. FINAL SAFETY CHECK
      // --------------------------------
      if (isBlockedDomain(officialUrl)) {
        console.log(`⛔ Final blocked domain: ${officialUrl}`);
        continue;
      }

      if (isBlockedPath(officialUrl)) {
        console.log(`⛔ Final blocked path: ${officialUrl}`);
        continue;
      }

      // --------------------------------
      // 10. AUDIT
      // --------------------------------
      console.log(`✅ Official business website: ${officialUrl}`);

      const audit = await auditWebsite(officialUrl);

      if (!audit.success) {
        console.log(`⚠️ Audit failed: ${officialUrl}`);
        continue;
      }

      console.log(`🔍 Website audited: ${officialUrl}`);
      console.log("📊 Audit Result:", {
        websiteScore: audit.audit?.overallScore,
        leadScore: audit.audit?.leadScore,
        opportunity: audit.audit?.opportunity,
        reasons: audit.audit?.opportunityReasons,
      });

      // --------------------------------
      // 11. CREATE LEAD
      // --------------------------------
      const lead = {
        businessName: businessName,
        website: officialUrl,
        category: searchCategory,
        city: businessCity || searchCity, // Use extracted city or search city as fallback
        description: item.content || "",
        source: "tavily",
        websiteStatus: websiteCheck.status,
        https: websiteCheck.https,
        audit: audit.audit,
      };

      // --------------------------------
      // 12. FILTER LEAD (NEW)
      // --------------------------------
      const shouldKeep = shouldKeepLead(lead, searchCity, searchCategory);

      if (!shouldKeep) {
        console.log(`❌ Lead filtered out: ${businessName}`);
        continue;
      }

      // --------------------------------
      // 13. MARK DOMAIN AS PROCESSED
      // --------------------------------
      processedDomains.add(originalDomain);
      processedDomains.add(officialDomain);

      // --------------------------------
      // 14. ADD LEAD
      // --------------------------------
      leads.push(lead);
      console.log(`✅ Lead added: ${businessName} (${officialUrl})`);
    }

    // --------------------------------
    // 15. FINAL FILTER (BONUS PASS)
    // --------------------------------
    const finalLeads = filterLeads(leads, searchCity, searchCategory);

    console.log(`✅ Total valid business leads: ${finalLeads.length}`);
    console.log(
      `📊 Unique domains successfully processed: ${processedDomains.size}`,
    );
    console.log(`📊 Unique domains attempted: ${attemptedDomains.size}`);

    return finalLeads;
  } catch (error) {
    console.error("Live Web Extraction Error:", error.message);
    throw error;
  }
};
