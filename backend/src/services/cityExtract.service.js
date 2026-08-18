// cityExtract.service.js
export const extractCityFromWebsite = (html, url, searchCity) => {
  // Priority 1: Check if business location is mentioned
  const locationPatterns = [
    /(?:located|based|office|store|showroom|headquarters?) in ([A-Za-z\s,]+)/i,
    /<meta[^>]+name=["']location["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+name=["']geo\.placename["'][^>]+content=["']([^"']*)["']/i,
    /<span[^>]+class=["'][^"']*location["']/i,
  ];

  for (const pattern of locationPatterns) {
    const match = html.match(pattern);
    if (match) {
      const city = match[1].trim().split(",")[0].trim();
      if (city.length > 2) {
        return city;
      }
    }
  }

  // Priority 2: Check if search city appears in the website
  if (searchCity) {
    const normalizedSearchCity = searchCity.toLowerCase().trim();
    const htmlLower = html.toLowerCase();

    // Check if city appears in contact/address context
    const contextPatterns = [
      `${normalizedSearchCity}`,
      `in ${normalizedSearchCity}`,
      `${normalizedSearchCity},`,
      `based in ${normalizedSearchCity}`,
    ];

    for (const pattern of contextPatterns) {
      if (htmlLower.includes(pattern)) {
        return searchCity;
      }
    }
  }

  // Priority 3: Check URL for city clues
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");

    for (const part of pathParts) {
      if (part && part.length > 2 && part.length < 30) {
        // Check if it's a city name
        const cityNames = [
          "london",
          "lahore",
          "karachi",
          "newyork",
          "losangeles",
          "chicago",
        ];
        if (cityNames.includes(part.toLowerCase())) {
          return part;
        }
      }
    }
  } catch (e) {
    // Invalid URL
  }

  return null;
};

export const isLocationRelevant = (businessCity, searchCity) => {
  if (!businessCity || !searchCity) return false;

  const normalizedBusiness = businessCity.toLowerCase().trim();
  const normalizedSearch = searchCity.toLowerCase().trim();

  // Direct match
  if (normalizedBusiness === normalizedSearch) return true;

  // Partial match (e.g., "New York" vs "york")
  if (
    normalizedSearch.includes(normalizedBusiness) ||
    normalizedBusiness.includes(normalizedSearch)
  ) {
    return true;
  }

  return false;
};
