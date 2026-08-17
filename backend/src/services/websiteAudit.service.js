export const auditWebsite = async (websiteUrl) => {
  try {
    if (!websiteUrl) {
      return {
        success: false,
        message: "website URL is required",
      };
    }

    let url = websiteUrl.trim();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    // --------------------------------
    // 1. Fetch Website
    // --------------------------------

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Website returned HTTP ${response.status}`,
        status: response.status,
      };
    }

    const finalUrl = response.url;
    const html = await response.text();

    // --------------------------------
    // 2. HTTPS
    // --------------------------------

    const https = finalUrl.startsWith("https://");

    // --------------------------------
    // 3. Clean Text
    // --------------------------------

    const htmlText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    // --------------------------------
    // 4. Mobile Responsive
    // --------------------------------

    const hasViewport =
      /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);

    const mobileResponsive = hasViewport;

    // --------------------------------
    // 5. CTA
    // --------------------------------

    const ctaWords = [
      "contact us",
      "contact",
      "get started",
      "book now",
      "buy now",
      "shop now",
      "learn more",
      "request a quote",
      "get in touch",
      "order now",
      "subscribe",
      "sign up",
    ];

    const foundCTAs = ctaWords.filter((word) =>
      htmlText.includes(word),
    );

    const cta = foundCTAs.length > 0;

    // --------------------------------
    // 6. Navigation
    // --------------------------------

    const hasNav =
      /<nav[\s\S]*?<\/nav>/i.test(html) ||
      /<header[\s\S]*?<\/header>/i.test(html);

    const navigation = hasNav;

    // --------------------------------
    // 7. Images
    // --------------------------------

    const imageMatches =
      html.match(/<img\b[^>]*>/gi) || [];

    let imagesWithoutAlt = 0;

    for (const image of imageMatches) {
      const hasAlt = /\balt\s*=/i.test(image);

      if (!hasAlt) {
        imagesWithoutAlt++;
      }
    }

    const imageOptimization =
      imageMatches.length === 0 ||
      imagesWithoutAlt <= imageMatches.length * 0.3;

    // --------------------------------
    // 8. SEO
    // --------------------------------

    const titleMatch = html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    );

    const title = titleMatch?.[1]?.trim() || "";

    const metaDescription =
      /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(
        html,
      );

    const headings = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);

    const h1Matches =
      html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];

    const headingStructure =
      h1Matches.length >= 1 &&
      h1Matches.length <= 3;

    const structuredData =
      /<script[^>]+type=["']application\/ld\+json["']/i.test(
        html,
      );

    const canonical =
      /<link[^>]+rel=["']canonical["']/i.test(html);

    const seo = {
      title: title.length > 0,
      metaDescription,
      headings,
      headingStructure,
      structuredData,
      canonical,
    };

    // --------------------------------
    // 9. UX
    // --------------------------------

    const valuePropositionWords = [
      "welcome",
      "discover",
      "shop",
      "quality",
      "premium",
      "best",
      "official",
      "fashion",
      "collection",
      "products",
      "services",
    ];

    const clearValueProposition =
      valuePropositionWords.some((word) =>
        htmlText.includes(word),
      );

    const productDiscovery =
      htmlText.includes("search") ||
      htmlText.includes("categories") ||
      htmlText.includes("shop") ||
      htmlText.includes("collections");

    const trustSignals =
      htmlText.includes("secure payment") ||
      htmlText.includes("secure checkout") ||
      htmlText.includes("trusted") ||
      htmlText.includes("authentic") ||
      htmlText.includes("quality") ||
      htmlText.includes("privacy") ||
      htmlText.includes("returns");

    const ux = {
      clearValueProposition,
      easyNavigation: navigation,
      strongProductDiscovery: productDiscovery,
      trustSignals,
    };

    // --------------------------------
    // 10. Ecommerce
    // --------------------------------

    const productCatalog =
      htmlText.includes("products") ||
      htmlText.includes("collections") ||
      htmlText.includes("shop");

    const pricing =
      /\bprice\b|\brs\b|\bpkr\b|\$\s?\d/i.test(htmlText);

    const cart =
      htmlText.includes("cart") ||
      htmlText.includes("bag");

    const checkout =
      htmlText.includes("checkout") ||
      htmlText.includes("place order");

    const search =
      htmlText.includes("search");

    const ecommerce = {
      productCatalog,
      pricing,
      cart,
      checkout,
      search,
    };

    // --------------------------------
    // 11. Conversion
    // --------------------------------

    const newsletter =
      htmlText.includes("newsletter") ||
      htmlText.includes("subscribe");

    const socialProof =
      htmlText.includes("reviews") ||
      htmlText.includes("testimonials") ||
      htmlText.includes("customer reviews") ||
      htmlText.includes("ratings") ||
      htmlText.includes("rating") ||
      htmlText.includes("trusted by");

    const urgency =
      htmlText.includes("limited stock") ||
      htmlText.includes("limited time") ||
      htmlText.includes("only") ||
      htmlText.includes("sale") ||
      htmlText.includes("off");

    const conversion = {
      strongCTA: cta,
      newsletter,
      socialProof,
      urgency,
    };

    // --------------------------------
    // 12. Broken Links
    // --------------------------------

    const linkMatches =
      html.match(/<a\b[^>]+href=["'][^"']*["'][^>]*>/gi) ||
      [];

    let brokenLinks = 0;

    for (const link of linkMatches) {
      const hrefMatch =
        link.match(/href=["']([^"']*)["']/i);

      if (!hrefMatch) continue;

      const href = hrefMatch[1].trim();

      if (
        href === "" ||
        href === "#" ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        continue;
      }
    }

    // --------------------------------
    // 13. Page Speed
    // --------------------------------

    const pageSpeed = {
      score: null,
      status: "not_checked",
    };

    // --------------------------------
    // 14. Technical Score
    // --------------------------------

    let technicalScore = 0;

    if (mobileResponsive) technicalScore += 7;
    if (https) technicalScore += 6;
    if (imageOptimization) technicalScore += 6;
    if (brokenLinks === 0) technicalScore += 6;

    // Max = 25

    // --------------------------------
    // 15. UX Score
    // --------------------------------

    let uxScore = 0;

    if (clearValueProposition) uxScore += 5;
    if (navigation) uxScore += 5;
    if (productDiscovery) uxScore += 5;
    if (trustSignals) uxScore += 5;

    // Max = 20

    // --------------------------------
    // 16. SEO Score
    // --------------------------------

    let seoScore = 0;

    if (seo.title) seoScore += 4;
    if (seo.metaDescription) seoScore += 4;
    if (seo.headings) seoScore += 4;
    if (seo.headingStructure) seoScore += 3;
    if (seo.structuredData) seoScore += 3;
    if (seo.canonical) seoScore += 2;

    // Max = 20

    // --------------------------------
    // 17. Ecommerce Score
    // --------------------------------

    let ecommerceScore = 0;

    if (productCatalog) ecommerceScore += 3;
    if (pricing) ecommerceScore += 3;
    if (cart) ecommerceScore += 3;
    if (checkout) ecommerceScore += 3;
    if (search) ecommerceScore += 3;

    // Max = 15

    // --------------------------------
    // 18. Conversion Score
    // --------------------------------

    let conversionScore = 0;

    if (cta) conversionScore += 5;
    if (newsletter) conversionScore += 3;
    if (socialProof) conversionScore += 6;
    if (urgency) conversionScore += 6;

    // Max = 20

    // --------------------------------
    // 19. Website Score
    // --------------------------------

    const overallScore =
      technicalScore +
      uxScore +
      seoScore +
      ecommerceScore +
      conversionScore;

    // --------------------------------
    // 20. Lead Score
    // --------------------------------

    let leadScore = 0;
    const opportunityReasons = [];

    // Technical problems
    if (!mobileResponsive) {
      leadScore += 20;
      opportunityReasons.push(
        "Website is not mobile responsive",
      );
    }

    if (!https) {
      leadScore += 15;
      opportunityReasons.push(
        "Website is not using HTTPS",
      );
    }

    if (!imageOptimization) {
      leadScore += 10;
      opportunityReasons.push(
        "Images need optimization",
      );
    }

    if (brokenLinks > 0) {
      leadScore += Math.min(brokenLinks * 2, 15);

      opportunityReasons.push(
        `${brokenLinks} broken links detected`,
      );
    }

    // SEO problems
    if (!seo.title) {
      leadScore += 5;
      opportunityReasons.push(
        "Missing SEO title",
      );
    }

    if (!seo.metaDescription) {
      leadScore += 5;
      opportunityReasons.push(
        "Missing meta description",
      );
    }

    if (!seo.headings) {
      leadScore += 5;
      opportunityReasons.push(
        "Missing H1 heading",
      );
    }

    if (!seo.headingStructure) {
      leadScore += 5;
      opportunityReasons.push(
        "Weak heading structure",
      );
    }

    if (!seo.structuredData) {
      leadScore += 5;
      opportunityReasons.push(
        "Missing structured data",
      );
    }

    // UX problems
    if (!clearValueProposition) {
      leadScore += 5;
      opportunityReasons.push(
        "Weak value proposition",
      );
    }

    if (!navigation) {
      leadScore += 10;
      opportunityReasons.push(
        "Website navigation needs improvement",
      );
    }

    if (!productDiscovery) {
      leadScore += 10;
      opportunityReasons.push(
        "Weak product discovery",
      );
    }

    if (!trustSignals) {
      leadScore += 5;
      opportunityReasons.push(
        "Limited trust signals",
      );
    }

    // Ecommerce problems
    if (!productCatalog) {
      leadScore += 10;
      opportunityReasons.push(
        "Weak or missing product catalog",
      );
    }

    if (!pricing) {
      leadScore += 5;
      opportunityReasons.push(
        "Product pricing is unclear",
      );
    }

    if (!cart) {
      leadScore += 5;
      opportunityReasons.push(
        "Shopping cart is missing",
      );
    }

    if (!checkout) {
      leadScore += 5;
      opportunityReasons.push(
        "Checkout flow is unclear",
      );
    }

    if (!search) {
      leadScore += 5;
      opportunityReasons.push(
        "Website search is missing",
      );
    }

    // Conversion problems
    if (!cta) {
      leadScore += 10;
      opportunityReasons.push(
        "Website has weak or missing CTA",
      );
    }

    if (!newsletter) {
      leadScore += 3;
      opportunityReasons.push(
        "Newsletter signup is missing",
      );
    }

    if (!socialProof) {
      leadScore += 5;
      opportunityReasons.push(
        "Limited social proof",
      );
    }

    if (!urgency) {
      leadScore += 3;
      opportunityReasons.push(
        "Limited urgency or promotional messaging",
      );
    }

    // --------------------------------
    // 21. Opportunity
    // --------------------------------

    let opportunity = "LOW";

    if (leadScore >= 60) {
      opportunity = "VERY_HIGH";
    } else if (leadScore >= 40) {
      opportunity = "HIGH";
    } else if (leadScore >= 20) {
      opportunity = "MEDIUM";
    }

    // --------------------------------
    // 22. Final Result
    // --------------------------------

    return {
      success: true,

      website: finalUrl,

      audit: {
        mobileResponsive,
        pageSpeed,
        modernDesign: overallScore >= 70,
        https,
        cta,
        navigation,
        brokenLinks,
        imageOptimization,

        seo,
        ux,
        ecommerce,
        conversion,

        scores: {
          technical: technicalScore,
          ux: uxScore,
          seo: seoScore,
          conversion: conversionScore,
          ecommerce: ecommerceScore,
          overall: overallScore,
        },

        overallScore,

        leadScore,

        opportunity,

        opportunityReasons,
      },

      details: {
        viewport: hasViewport,
        title,
        ctaFound: foundCTAs,
        images: imageMatches.length,
        imagesWithoutAlt,
      },
    };
  } catch (error) {
    console.error(
      `Website audit failed: ${websiteUrl}`,
    );

    console.error(error.message);

    return {
      success: false,
      website: websiteUrl,
      message: error.message,
    };
  }
};