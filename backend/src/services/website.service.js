export const validateWebsite = async (websiteUrl) => {
  try {
    if (!websiteUrl) {
      return {
        valid: false,
        url: null,
        status: null,
        reason: "Website URL is missing",
      };
    }

    let url = websiteUrl.trim();

    // Add https:// if protocol is missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    const finalUrl = response.url;

    if (!response.ok) {
      return {
        valid: false,
        url,
        finalUrl,
        status: response.status,
        reason: `Website returned HTTP ${response.status}`,
      };
    }

    return {
      valid: true,
      url,
      finalUrl,
      status: response.status,
      https: finalUrl.startsWith("https://"),
      reason: "Website is working",
    };
  } catch (error) {
    console.error(`Website validation failed: ${websiteUrl}`);
    console.error(error.message);

    return {
      valid: false,
      url: websiteUrl,
      status: null,
      reason: error.message,
    };
  }
};
