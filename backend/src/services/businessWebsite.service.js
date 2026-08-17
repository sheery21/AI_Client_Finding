const blockedDomains = [
  // Social
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "pinterest.com",

  // Reviews / directories
  "yelp.com",
  "tripadvisor.com",
  "trustpilot.com",
  "yellowpages.com",
  "yell.com",
  "foursquare.com",

  // Media / magazines
  "vogue.com",
  "cntraveller.com",
  "forbes.com",
  "guardian.com",
  "bbc.com",
  "nytimes.com",

  // Business databases
  "dnb.com",
  "zoominfo.com",
  "aeroleads.com",
  "d7leadfinder.com",

  // Shopping destinations / marketplaces
  "westfield.com",
  "coventgarden.london",

  // Fashion organizations / directories
  "londonfashionweek.co.uk",
  "fashion-district.co.uk",
];

const blockedPathPatterns = [
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
  "/store-locator",
  "/top-",
  "/best-",
  "/where-to-shop",
];

const blockedWords = [
  "directory",
  "directories",
  "listing",
  "listings",
  "magazine",
  "news",
  "reviews",
  "review",
  "retailers",
  "retailer",
  "shopping centre",
  "shopping center",
  "fashion week",
  "festival",
  "event",
  "university",
  "museum",
];

const normalizeText = (text = "") => {
  return text
    .toLowerCase()
    .replace(/https?:\/\/|www\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

const calculateNameMatch = (businessName, domain, pageText) => {
  const normalizedName = normalizeText(businessName);

  const words = normalizedName.split(" ").filter((word) => word.length > 2);

  if (!words.length) {
    return 0;
  }

  let matchedWords = 0;

  for (const word of words) {
    if (pageText.includes(word) || domain.includes(word)) {
      matchedWords++;
    }
  }

  return Math.round((matchedWords / words.length) * 100);
};

export const checkOfficialBusinessWebsite = async (
  websiteUrl,
  businessName,
  category = "",
) => {
  try {
    if (!websiteUrl) {
      return {
        official: false,
        uncertain: false,
        reason: "Website URL is missing",
      };
    }

    let url = websiteUrl.trim();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    // ----------------------------------------
    // 1. Validate URL
    // ----------------------------------------

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        official: false,
        uncertain: false,
        reason: "Invalid URL",
      };
    }

    const domain = getDomain(url);
    const pathname = parsedUrl.pathname.toLowerCase();

    // ----------------------------------------
    // 2. Block known domains
    // ----------------------------------------

    const isBlockedDomain = blockedDomains.some(
      (blockedDomain) =>
        domain === blockedDomain || domain.endsWith(`.${blockedDomain}`),
    );

    if (isBlockedDomain) {
      return {
        official: false,
        uncertain: false,
        url,
        reason: "Blocked domain",
      };
    }

    // ----------------------------------------
    // 3. Block suspicious paths
    // ----------------------------------------

    const fullPath = `${pathname}${parsedUrl.search}`.toLowerCase();

    const isBlockedPath = blockedPathPatterns.some((pattern) =>
      fullPath.includes(pattern),
    );

    if (isBlockedPath) {
      return {
        official: false,
        uncertain: false,
        url,
        reason: "Directory/listing/article page",
      };
    }

    // ----------------------------------------
    // 4. Fetch website
    // ----------------------------------------

    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },

        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error(`Website validation failed: ${websiteUrl}`);

      console.error(error.message);

      return {
        official: false,
        uncertain: true,
        url,
        reason: "Website could not be verified",
      };
    }

    // ----------------------------------------
    // 5. HTTP error
    // ----------------------------------------

    if (!response.ok) {
      return {
        official: false,
        uncertain: false,
        url,
        status: response.status,
        reason: `Website returned HTTP ${response.status}`,
      };
    }

    const finalUrl = response.url;
    const finalDomain = getDomain(finalUrl);

    // ----------------------------------------
    // 6. Read HTML
    // ----------------------------------------

    let html;

    try {
      html = await response.text();
    } catch {
      return {
        official: false,
        uncertain: true,
        url,
        finalUrl,
        status: response.status,
        reason: "Could not read website content",
      };
    }

    const pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();

    // ----------------------------------------
    // 7. Final domain check
    // ----------------------------------------

    const finalIsBlocked = blockedDomains.some(
      (blockedDomain) =>
        finalDomain === blockedDomain ||
        finalDomain.endsWith(`.${blockedDomain}`),
    );

    if (finalIsBlocked) {
      return {
        official: false,
        uncertain: false,
        url,
        finalUrl,
        reason: "Redirected to blocked domain",
      };
    }

    // ----------------------------------------
    // 8. Suspicious website detection
    // ----------------------------------------

    const suspiciousSignals = [];

    const suspiciousWordFound = blockedWords.some((word) =>
      pageText.includes(word),
    );

    if (suspiciousWordFound) {
      suspiciousSignals.push("suspicious-content");
    }

    // Fashion event / organization
    if (
      finalDomain.includes("fashionweek") ||
      pageText.includes("london fashion week")
    ) {
      suspiciousSignals.push("fashion-event");
    }

    // ----------------------------------------
    // 9. Business name matching
    // ----------------------------------------

    const nameMatchScore = calculateNameMatch(
      businessName,
      finalDomain,
      pageText,
    );

    // ----------------------------------------
    // 10. Category matching
    // ----------------------------------------

    const normalizedCategory = normalizeText(category);

    const categoryWords = normalizedCategory
      .split(" ")
      .filter((word) => word.length > 3);

    let categoryMatches = 0;

    for (const word of categoryWords) {
      if (pageText.includes(word)) {
        categoryMatches++;
      }
    }

    const categoryMatch = categoryWords.length > 0 && categoryMatches > 0;

    // ----------------------------------------
    // 11. Business signals
    // ----------------------------------------

    const hasContact =
      pageText.includes("contact") || pageText.includes("get in touch");

    const hasAbout =
      pageText.includes("about us") || pageText.includes("about");

    const hasServices =
      pageText.includes("services") || pageText.includes("products");

    const hasShop =
      pageText.includes("shop") ||
      pageText.includes("collections") ||
      pageText.includes("buy");

    // ----------------------------------------
    // 12. Strong rejection
    // ----------------------------------------

    if (suspiciousSignals.includes("fashion-event")) {
      return {
        official: false,
        uncertain: false,
        url,
        finalUrl,
        reason: "Fashion event/organization website",
      };
    }

    // ----------------------------------------
    // 13. Official website decision
    // ----------------------------------------

    // Strong business name match
    if (nameMatchScore >= 40) {
      return {
        official: true,
        uncertain: false,

        url,
        finalUrl,
        status: response.status,

        checks: {
          businessNameMatch: nameMatchScore,

          categoryMatch,

          hasContact,
          hasAbout,
          hasServices,
          hasShop,
        },

        reason: "Business name matches website",
      };
    }

    // Category + business signals
    if (categoryMatch && (hasContact || hasAbout || hasServices || hasShop)) {
      return {
        official: true,
        uncertain: false,

        url,
        finalUrl,
        status: response.status,

        checks: {
          businessNameMatch: nameMatchScore,

          categoryMatch,

          hasContact,
          hasAbout,
          hasServices,
          hasShop,
        },

        reason: "Website matches business/category signals",
      };
    }

    // ----------------------------------------
    // 14. Not official
    // ----------------------------------------

    return {
      official: false,
      uncertain: false,

      url,
      finalUrl,
      status: response.status,

      checks: {
        businessNameMatch: nameMatchScore,

        categoryMatch,

        hasContact,
        hasAbout,
        hasServices,
        hasShop,
      },

      reason: "Business website confidence too low",
    };
  } catch (error) {
    console.error(`Official website check failed: ${websiteUrl}`);

    console.error(error.message);

    return {
      official: false,
      uncertain: true,
      url: websiteUrl,
      reason: "Could not verify website",
    };
  }
};
