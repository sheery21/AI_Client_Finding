export const blockedDomains = [
  // Social
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "reddit.com",
  "pinterest.com",

  // Reviews / directories
  "yelp.com",
  "tripadvisor.com",
  "trustpilot.com",
  "yellowpages.com",
  "yell.com",
  "foursquare.com",
  "f6s.com",

  // Content / media
  "medium.com",
  "quora.com",
  "substack.com",
  "vogue.com",
  "cntraveller.com",
  "forbes.com",
  "guardian.com",
  "bbc.com",
  "nytimes.com",
  "glamourmagazine.co.uk",
  "womanandhome.com",

  // Business databases
  "dnb.com",
  "zoominfo.com",
  "aeroleads.com",
  "d7leadfinder.com",

  // Shopping destinations
  "westfield.com",
  "coventgarden.london",
  "visitlondon.com",

  // Fashion organizations
  "londonfashionweek.co.uk",
  "fashion-district.co.uk",
  "britishfashioncouncil.co.uk",

  // Education / organizations
  "arts.ac.uk",
  "london.ac.uk",

  // Guides / directories
  "kingsroad.co.uk",
  "wanderlog.com",
  "fashionandfrappes.com",
  "origami.chat",

  // Marketplace
  "markaz.app",

  // Government / organizations
  "trade.gov",
];

export const blockedPathPatterns = [
  // Directories
  "/directory/",
  "/directories/",
  "/business-directory/",
  "/company-directory/",
  "/company-information/",
  "/find-and-update/",

  // Articles / blogs
  "/article/",
  "/articles/",
  "/blog/",
  "/blog-",
  "/blog-post/",
  "/blogs/",
  "/news/",
  "/review/",
  "/reviews/",
  "/magazine/",

  // Lists
  "/list/",
  "/lists/",
  "/top-",
  "/best-",
  "/where-to-shop/",
  "/where-to-buy/",
  "/ultimate-",
  "-list",

  // Social / community
  "/r/",
  "/community/",
  "/forum/",
  "/forums/",
  "/post/",
  "/posts/",
  "/video/",
  "/videos/",
  "/@",

  // Shopping guides only
  "/shopping-guide/",
  "/shopping-guides/",
  "/things-to-do/",
  "/things-to-do-",

  // Retail directories
  "/retailers/",
  "/retailer/",
  "/store-locator/",

  // Education
  "/university/",
  "/universities/",
  "/college/",
  "/colleges/",
  "/course/",
  "/courses/",

  // Events
  "/events/",
  "/event/",
  "/festival/",
  "/festivals/",

  // Utility
  "/product-similar-image",
];

export const normalizeDomain = (url) => {
  try {
    return new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const isBlockedDomain = (url) => {
  const domain = normalizeDomain(url);

  if (!domain) return true;

  return blockedDomains.some(
    (blocked) =>
      domain === blocked ||
      domain.endsWith(`.${blocked}`),
  );
};

export const isBlockedPath = (url) => {
  try {
    const parsed = new URL(url);

    const pathname = parsed.pathname.toLowerCase();

    const fullPath =
      `${pathname}${parsed.search}`.toLowerCase();

    return blockedPathPatterns.some((pattern) =>
      fullPath.includes(pattern),
    );
  } catch {
    return true;
  }
};