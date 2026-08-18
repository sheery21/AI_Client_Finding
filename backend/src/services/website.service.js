export const validateWebsite = async (websiteUrl) => {
  if (!websiteUrl) {
    return {
      valid: false,
      url: null,
      finalUrl: null,
      status: null,
      html: "",
      https: false,
      reason: "Website URL is missing",
    };
  }

  let url = websiteUrl.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  console.log(`🌐 Fetching website: ${url}`);

  const headersList = [
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

      "Accept-Language": "en-US,en;q=0.9",

      "Cache-Control": "no-cache",

      Pragma: "no-cache",

      Upgrade: "1",
    },

    {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",

      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language": "en-US,en;q=0.9",
    },
  ];

  let lastError = null;

  for (let attempt = 0; attempt < headersList.length; attempt++) {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 15000);

      const response = await fetch(url, {
        method: "GET",

        redirect: "follow",

        headers: headersList[attempt],

        signal: controller.signal,
      });

      clearTimeout(timeout);

      const finalUrl = response.url || url;

      let html = "";

      try {
        html = await response.text();
      } catch {
        html = "";
      }

      // --------------------------------
      // EMPTY RESPONSE
      // --------------------------------

      if (!html || html.trim().length === 0) {
        return {
          valid: false,

          url,

          finalUrl,

          status: response.status,

          html: "",

          https: finalUrl.startsWith("https://"),

          reason: "Website returned empty HTML",
        };
      }

      // --------------------------------
      // SUCCESS
      // --------------------------------

      if (response.ok) {
        console.log(`✅ Website fetched: ${finalUrl}`);

        return {
          valid: true,

          url,

          finalUrl,

          status: response.status,

          https: finalUrl.startsWith("https://"),

          html,

          reason: "Website is working",
        };
      }

      // --------------------------------
      // BOT / ACCESS BLOCK
      // --------------------------------

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 429 ||
        response.status === 430 ||
        response.status === 431 ||
        response.status === 433
      ) {
        console.log(
          `⚠️ Website blocked automated request: ${url} — HTTP ${response.status}`,
        );

        // Try second header set
        if (attempt < headersList.length - 1) {
          continue;
        }

        return {
          valid: false,

          url,

          finalUrl,

          status: response.status,

          html: "",

          https: finalUrl.startsWith("https://"),

          reason: `Website blocked automated request (HTTP ${response.status})`,
        };
      }

      // --------------------------------
      // OTHER HTTP ERROR
      // --------------------------------

      return {
        valid: false,

        url,

        finalUrl,

        status: response.status,

        html: "",

        https: finalUrl.startsWith("https://"),

        reason: `Website returned HTTP ${response.status}`,
      };
    } catch (error) {
      lastError = error;

      console.log(
        `⚠️ Fetch attempt ${attempt + 1} failed: ${url} — ${error.message}`,
      );

      // Retry automatically
      if (attempt < headersList.length - 1) {
        continue;
      }
    }
  }

  // --------------------------------
  // FINAL FETCH ERROR
  // --------------------------------

  console.error(`❌ Website could not be fetched: ${url}`, lastError?.message);

  return {
    valid: false,

    url,

    finalUrl: null,

    status: null,

    html: "",

    https: url.startsWith("https://"),

    reason: lastError?.message || "fetch failed",
  };
};
