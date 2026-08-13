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
          "dnb.com",
          "zoominfo.com",
          "aeroleads.com",
          "d7leadfinder.com",
          "scribd.com",
          "urdupoint.com",
          "karachisnob.com",
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

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        if (!item.url) continue;

        const url = item.url.toLowerCase();

        // Directory/list pages ko reject karo
        const blockedPatterns = [
          "directory",
          "list",
          "companies",
          "company-information",
          "find-and-update",
          "top-",
          "best-",
          "restaurants-in",
          "business-directory",
          "view-leads",
        ];

        const isBlocked = blockedPatterns.some((pattern) =>
          url.includes(pattern),
        );

        if (isBlocked) {
          continue;
        }

        leads.push({
          businessName: item.title,
          website: item.url,
          category: searchCategory,
          city: searchCity,
          description: item.content || "",
          source: "tavily",
        });
      }
    }

    return leads;
  } catch (error) {
    console.error("Live Web Extraction Error:", error.message);

    throw error;
  }
};
