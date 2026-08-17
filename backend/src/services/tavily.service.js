import { checkOfficialBusinessWebsite } from "./businessWebsite.service.js";
import { validateWebsite } from "./website.service.js";
import { auditWebsite } from "./websiteAudit.service.js";

export const searchBusinesses = async (city, category) => {
  try {
    const searchCategory = category.trim().toLowerCase();
    const searchCity = city.trim();

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is missing");
    }

    const searchQuery = `"${searchCategory}" "${searchCity}" "official website"`;

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        search_depth: "advanced",
        max_results: 20,

        exclude_domains: [
          "facebook.com",
          "instagram.com",
          "twitter.com",
          "x.com",
          "linkedin.com",
          "youtube.com",
          "yelp.com",
          "tripadvisor.com",
          "wikipedia.org",
          "pinterest.com",

          // Business directories
          "dnb.com",
          "zoominfo.com",
          "aeroleads.com",
          "d7leadfinder.com",

          // Other unwanted sources
          "scribd.com",
          "urdupoint.com",
          "karachisnob.com",

          // Media / magazines
          "vogue.com",
          "cntraveller.com",
          "forbes.com",
          "guardian.com",
          "bbc.com",
          "nytimes.com",

          // Shopping destinations / organizations
          "westfield.com",
          "coventgarden.london",
          "londonfashionweek.co.uk",
          "fashion-district.co.uk",
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(`Tavily Error ${response.status}:`, errorText);

      throw new Error(`Tavily API responded with ${response.status}`);
    }

    const data = await response.json();

    const leads = [];

    if (!Array.isArray(data.results)) {
      return leads;
    }

    for (const item of data.results) {
      if (!item.url) continue;

      // --------------------------------
      // 1. Basic URL filtering
      // --------------------------------

      const url = item.url.toLowerCase();

      const blockedPatterns = [
        "/directory",
        "/directories",
        "/gallery/",
        "/article/",
        "/articles/",
        "/blog/",
        "/blogs/",
        "/news/",
        "/reviews/",
        "/review/",
        "/list/",
        "/lists/",
        "/companies/",
        "/company-information",
        "/find-and-update",
        "/business-directory",
        "/retailers",
        "/retailer/",
        "/stores/",
        "/store-locator",
        "/top-",
        "/best-",
        "/where-to-shop",

        "restaurants-in",
        "business-directory",
        "view-leads",
      ];

      const isBlocked = blockedPatterns.some((pattern) =>
        url.includes(pattern),
      );

      if (isBlocked) {
        console.log(`⛔ Blocked result: ${item.url}`);
        continue;
      }

      // --------------------------------
      // 2. Validate website
      // --------------------------------

      const websiteCheck = await validateWebsite(item.url);

      if (!websiteCheck.valid) {
        if (websiteCheck.reason === "fetch failed") {
          console.log(`⚠️ Could not verify: ${item.url}`);
        } else {
          console.log(`❌ Invalid website: ${item.url}`);
        }

        continue;
      }

      // IMPORTANT:
      // validateWebsite ka finalUrl use karo
      const verifiedUrl = websiteCheck.finalUrl || item.url;

      // --------------------------------
      // 3. Official business website check
      // --------------------------------

      const officialCheck = await checkOfficialBusinessWebsite(
        verifiedUrl,
        item.title || "",
        searchCategory,
      );

      if (!officialCheck.official) {
        if (officialCheck.uncertain) {
          console.log(`⚠️ Could not verify official website: ${verifiedUrl}`);
        } else {
          console.log(`❌ Not official business website: ${verifiedUrl}`);
        }

        continue;
      }

      console.log(
        `✅ Official business website: ${officialCheck.finalUrl || verifiedUrl}`,
      );

      // --------------------------------
      // 4. Website Audit
      // --------------------------------

      const audit = await auditWebsite(officialCheck.finalUrl || verifiedUrl);

      if (!audit.success) {
        console.log(`⚠️ Audit failed: ${verifiedUrl}`);
        continue;
      }

      console.log(
        `🔍 Website audited: ${officialCheck.finalUrl || verifiedUrl}`,
      );

      console.log("📊 Audit Result:", {
        websiteScore: audit.audit?.overallScore,
        leadScore: audit.audit?.leadScore,
        opportunity: audit.audit?.opportunity,
        reasons: audit.audit?.opportunityReasons,
      });

      // --------------------------------
      // 5. Add Lead
      // --------------------------------

      leads.push({
        businessName: item.title || "Unknown Business",

        website: officialCheck.finalUrl || websiteCheck.finalUrl || item.url,

        category: searchCategory,

        city: searchCity,

        description: item.content || "",

        source: "tavily",

        websiteStatus: websiteCheck.status,

        https: websiteCheck.https,

        audit: audit.audit,
      });
    }

    return leads;
  } catch (error) {
    console.error("Live Web Extraction Error:", error.message);

    throw error;
  }
};
