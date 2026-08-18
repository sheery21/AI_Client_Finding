import { isLocationRelevant } from "./cityExtract.service.js";

// leadFilter.service.js
export const shouldKeepLead = (lead, searchCity, searchCategory) => {
  // CRITICAL: Check if it's a directory/brand page
  const directoryPatterns = [
    /brands/i,
    /collection/i,
    /directory/i,
    /list of/i,
    /all brands/i,
    /top brands/i,
    /best brands/i,
    /find brands/i,
  ];

  for (const pattern of directoryPatterns) {
    if (lead.businessName?.match(pattern)) {
      console.log(
        `❌ Filtered: Directory page detected - ${lead.businessName}`,
      );
      return false;
    }
  }

  // Check if business name is too generic
  const genericNames = [
    "clothing",
    "fashion",
    "shop",
    "store",
    "online",
    "boutique",
    "accessories",
    "footwear",
    "workwear",
    "brand",
    "collection",
  ];

  const nameLower = lead.businessName?.toLowerCase() || "";
  for (const generic of genericNames) {
    if (nameLower === generic || nameLower === `${generic}s`) {
      console.log(`❌ Filtered: Generic business name - ${lead.businessName}`);
      return false;
    }
  }

  // Check if lead has valid business name
  if (!lead.businessName || lead.businessName.length < 2) {
    console.log(`❌ Filtered: No valid business name`);
    return false;
  }

  // Check if location is relevant
  if (lead.city) {
    const cityMatch = isLocationRelevant(lead.city, searchCity);
    if (!cityMatch) {
      console.log(
        `❌ Filtered: Location mismatch - ${lead.city} vs ${searchCity}`,
      );
      return false;
    }
  } else {
    // If no city found, try to check if search city appears in website
    const searchCityLower = searchCity.toLowerCase();
    const siteText = lead.description?.toLowerCase() || "";
    if (!siteText.includes(searchCityLower)) {
      console.log(`❌ Filtered: City not found in website content`);
      return false;
    }
  }

  // Check website score quality
  if (lead.audit?.overallScore < 60) {
    console.log(`❌ Filtered: Poor website score - ${lead.audit.overallScore}`);
    return false;
  }

  // Priority: Only keep HIGH and MEDIUM opportunities
  const opportunity = lead.audit?.opportunity || "LOW";
  if (opportunity === "LOW") {
    // Keep LOW if it's a well-known brand (business name is proper)
    const knownBrands = ["nishat", "khaadi", "gul ahmed", "zarif", "rangreza"];
    const isKnownBrand = knownBrands.some((brand) =>
      lead.businessName.toLowerCase().includes(brand),
    );

    if (!isKnownBrand) {
      console.log(`❌ Filtered: LOW opportunity - ${lead.businessName}`);
      return false;
    }
  }

  return true;
};

export const filterLeads = (leads, searchCity, searchCategory) => {
  const filtered = [];
  const rejected = [];

  for (const lead of leads) {
    if (shouldKeepLead(lead, searchCity, searchCategory)) {
      filtered.push(lead);
    } else {
      rejected.push(lead);
    }
  }

  console.log(`✅ Filtered leads: ${filtered.length}`);
  console.log(`❌ Rejected leads: ${rejected.length}`);

  return filtered;
};
