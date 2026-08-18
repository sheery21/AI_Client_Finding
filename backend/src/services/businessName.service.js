// businessName.service.js

const normalizeText = (text = "") => {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/https?:\/\/|www\./g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const extractBusinessName = (html, url, title = "") => {
  // ✅ SUPER SAFE: Always ensure we have a string
  let safeTitle = "";

  try {
    if (title !== undefined && title !== null && typeof title === "string") {
      safeTitle = title;
    } else if (
      title !== undefined &&
      title !== null &&
      typeof title === "object"
    ) {
      // If title is an object, try to convert
      safeTitle = String(title) || "";
    } else {
      safeTitle = "";
    }
  } catch (e) {
    safeTitle = "";
  }

  // Priority 1: Look for business name in structured data
  try {
    const structuredDataMatch = html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );

    if (structuredDataMatch) {
      for (const script of structuredDataMatch) {
        try {
          const jsonStr = script
            .replace(/<script[^>]*>/, "")
            .replace(/<\/script>/, "");
          const data = JSON.parse(jsonStr);

          if (data.name) return data.name;
          if (data.organization?.name) return data.organization.name;
          if (data.itemListElement?.[0]?.item?.name)
            return data.itemListElement[0].item.name;
        } catch (e) {
          // Invalid JSON, continue
        }
      }
    }
  } catch (e) {
    // Structured data parsing failed
  }

  // Priority 2: Look for business name in h1
  try {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      const h1Text = h1Match[1].replace(/<[^>]+>/g, " ").trim();
      const cleanH1 = h1Text
        .replace(/official website/i, "")
        .replace(/home/i, "")
        .replace(/welcome to/i, "")
        .trim();

      if (cleanH1.length > 2 && cleanH1.length < 100) {
        return cleanH1;
      }
    }
  } catch (e) {
    // H1 extraction failed
  }

  // Priority 3: Look for business name in meta data
  try {
    const ogSiteNameMatch = html.match(
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i,
    );
    if (ogSiteNameMatch) {
      const ogName = ogSiteNameMatch[1].trim();
      if (ogName && ogName.length > 2) {
        return ogName;
      }
    }
  } catch (e) {
    // OG site name extraction failed
  }

  // Priority 4: Look for business name in title
  try {
    // ✅ CRITICAL FIX: Check if safeTitle has content
    if (safeTitle && safeTitle.length > 0 && typeof safeTitle === "string") {
      // Remove common separators and take first part
      const cleanTitle = safeTitle
        .split(/[|–—\-:]/)[0]
        .replace(/official website/i, "")
        .replace(/home/i, "")
        .trim();

      // Only proceed if cleanTitle has content
      if (cleanTitle && cleanTitle.length > 0) {
        const genericPatterns = [
          /clothing/i,
          /fashion/i,
          /shop/i,
          /store/i,
          /online/i,
          /boutique/i,
          /brands/i,
          /collection/i,
          /workwear/i,
        ];

        let isGeneric = false;
        for (const pattern of genericPatterns) {
          if (cleanTitle.match(pattern) && cleanTitle.split(" ").length < 4) {
            isGeneric = true;
            break;
          }
        }

        if (!isGeneric && cleanTitle.length > 2) {
          return cleanTitle;
        }
      }
    }
  } catch (e) {
    // Title extraction failed
  }

  // Priority 5: Extract from URL domain
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");
    const parts = domain.split(".");
    let name = parts[0];

    name = name.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    if (name.length > 2 && !name.match(/^[0-9]+$/)) {
      return name;
    }
  } catch (e) {
    // URL parsing failed
  }

  // ✅ If all else fails, use domain as last resort
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");
    const parts = domain.split(".");
    return parts[0].toUpperCase();
  } catch (e) {
    return null;
  }
};

export const isGenericBusinessName = (name) => {
  if (!name) return true;

  // Ensure name is string
  const nameStr = typeof name === "string" ? name : String(name);

  const genericPatterns = [
    /^clothing$/i,
    /^fashion$/i,
    /^shop$/i,
    /^store$/i,
    /^online$/i,
    /^boutique$/i,
    /^brands$/i,
    /^collection$/i,
    /^workwear$/i,
    /^women's/i,
    /^men's/i,
    /^kids/i,
    /^accessories/i,
    /^footwear/i,
    /^best\s/i,
    /^top\s/i,
    /^where to buy/i,
    /^directory/i,
    /^list of/i,
    /^guide/i,
  ];

  for (const pattern of genericPatterns) {
    if (nameStr.match(pattern)) return true;
  }

  return false;
};
