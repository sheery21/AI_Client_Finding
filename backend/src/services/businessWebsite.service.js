import { isBlockedDomain, isBlockedPath } from "../config/blockedWebsites.js";

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

const cleanPageText = (html = "") => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
};

const extractTitle = (html = "") => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match ? normalizeText(match[1]) : "";
};

const extractMetaDescription = (html = "") => {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );

  return match ? normalizeText(match[1]) : "";
};

const extractH1 = (html = "") => {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  if (!match) return "";

  return normalizeText(match[1].replace(/<[^>]+>/g, " "));
};

const calculateNameMatch = (businessName, domain, pageText, title = "") => {
  const normalizedName = normalizeText(businessName);

  if (!normalizedName) return 0;

  const words = normalizedName.split(" ").filter((word) => word.length > 2);

  if (!words.length) return 0;

  let matchedWords = 0;

  for (const word of words) {
    if (
      domain.includes(word) ||
      title.includes(word) ||
      pageText.includes(word)
    ) {
      matchedWords++;
    }
  }

  return Math.round((matchedWords / words.length) * 100);
};

const getRootDomain = (domain) => {
  const parts = domain.split(".");

  if (parts.length <= 2) {
    return domain;
  }

  return parts.slice(-2).join(".");
};

const hasBusinessSignals = (pageText) => {
  const signals = [
    "contact us",
    "get in touch",
    "about us",
    "our products",
    "our services",
    "collections",
    "add to cart",
    "buy now",
    "checkout",
    "shopping cart",
    "shipping",
    "returns",
    "privacy policy",
    "terms and conditions",
  ];

  return signals.filter((signal) => pageText.includes(signal));
};

const hasDirectorySignals = (pageText) => {
  const signals = [
    "business directory",
    "company directory",
    "business listings",
    "find businesses",
    "find companies",
    "browse companies",
    "directory of businesses",
    "list of companies",
    "top businesses",
    "best businesses",
  ];

  return signals.filter((signal) => pageText.includes(signal));
};

export const checkOfficialBusinessWebsite = async (
  websiteUrl,
  businessName = "",
  category = "",
  html = "",
  status = null,
  finalUrl = null,
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

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      return {
        official: false,
        uncertain: false,
        reason: "Invalid URL",
      };
    }

    if (isBlockedDomain(url)) {
      return {
        official: false,
        uncertain: false,
        url,
        reason: "Blocked domain",
      };
    }

    if (isBlockedPath(url)) {
      return {
        official: false,
        uncertain: false,
        url,
        reason: "Blocked path",
      };
    }

    if (!html) {
      return {
        official: false,
        uncertain: true,
        url,
        finalUrl: finalUrl || url,
        status,
        reason: "Website HTML is missing",
      };
    }

    const verifiedFinalUrl = finalUrl || url;

    if (isBlockedDomain(verifiedFinalUrl)) {
      return {
        official: false,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,
        reason: "Redirected to blocked domain",
      };
    }

    if (isBlockedPath(verifiedFinalUrl)) {
      return {
        official: false,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,
        reason: "Redirected to blocked path",
      };
    }

    const finalDomain = getDomain(verifiedFinalUrl);

    const pageText = cleanPageText(html);

    const title = extractTitle(html);

    const metaDescription = extractMetaDescription(html);

    const h1 = extractH1(html);

    const directorySignals = hasDirectorySignals(pageText);

    if (directorySignals.length >= 2) {
      return {
        official: false,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,
        reason: "Directory content detected",
      };
    }

    const nameMatchScore = calculateNameMatch(
      businessName,
      finalDomain,
      pageText,
      title,
    );

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

    const categoryMatch =
      categoryWords.length === 1
        ? categoryMatches >= 1
        : categoryMatches >= Math.ceil(categoryWords.length / 2);

    const businessSignals = hasBusinessSignals(pageText);

    const hasContact =
      pageText.includes("contact us") || pageText.includes("get in touch");

    const hasAbout = pageText.includes("about us");

    const hasProducts =
      pageText.includes("our products") || pageText.includes("collections");

    const hasCommerce =
      pageText.includes("cart") ||
      pageText.includes("checkout") ||
      pageText.includes("add to cart") ||
      pageText.includes("buy now");

    const rootDomain = getRootDomain(finalDomain);

    const businessWords = normalizeText(businessName)
      .split(" ")
      .filter((word) => word.length > 2);

    const domainNameMatch =
      nameMatchScore >= 40 ||
      businessWords.some((word) => rootDomain.includes(word));

    // Strong official signal
    if (nameMatchScore >= 50 && businessSignals.length >= 2) {
      return {
        official: true,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,

        checks: {
          businessNameMatch: nameMatchScore,
          categoryMatch,
          domainNameMatch,
          businessSignals,
          hasContact,
          hasAbout,
          hasProducts,
          hasCommerce,
          title,
          metaDescription,
          h1,
        },

        reason: "Strong business name and website signals",
      };
    }

    // Ecommerce
    if (
      domainNameMatch &&
      (hasProducts || hasCommerce) &&
      (hasCommerce || businessSignals.length >= 3)
    ) {
      return {
        official: true,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,

        checks: {
          businessNameMatch: nameMatchScore,
          categoryMatch,
          domainNameMatch,
          businessSignals,
          hasContact,
          hasAbout,
          hasProducts,
          hasCommerce,
        },

        reason: "Official ecommerce/business website signals",
      };
    }

    // Category + business
    if (
      categoryMatch &&
      businessSignals.length >= 3 &&
      (hasContact || hasAbout)
    ) {
      return {
        official: true,
        uncertain: false,
        url,
        finalUrl: verifiedFinalUrl,
        status,

        checks: {
          businessNameMatch: nameMatchScore,
          categoryMatch,
          domainNameMatch,
          businessSignals,
          hasContact,
          hasAbout,
          hasProducts,
          hasCommerce,
        },

        reason: "Business and category signals match",
      };
    }

    return {
      official: false,
      uncertain: true,
      url,
      finalUrl: verifiedFinalUrl,
      status,

      checks: {
        businessNameMatch: nameMatchScore,
        categoryMatch,
        domainNameMatch,
        businessSignals,
        hasContact,
        hasAbout,
        hasProducts,
        hasCommerce,
      },

      reason: "Insufficient evidence that website belongs to business",
    };
  } catch (error) {
    console.error(
      `Official website check failed: ${websiteUrl}`,
      error.message,
    );

    return {
      official: false,
      uncertain: true,
      url: websiteUrl,
      finalUrl: finalUrl || websiteUrl,
      status,
      reason: "Official website verification failed",
    };
  }
};
