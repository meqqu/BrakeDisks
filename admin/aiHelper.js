// aiHelper.js — AI-powered brand detection, model detection, and years detection
import { MOTO_DATABASE } from "./motoDatabase.js";

const BRAND_ALIASES = {
  "harley": "Harley-Davidson",
  "harley davidson": "Harley-Davidson",
  "hd": "Harley-Davidson",
  "bmw": "BMW",
  "ktm": "KTM",
  "mv agusta": "MV Agusta",
  "moto guzzi": "Moto Guzzi"
};

/**
 * Detect brand from text
 */
export function detectBrand(text) {
  if (!text) return null;
  const lower = text.toLowerCase().replace(/[-_]/g, " ");

  // 1. Check direct aliases
  for (const [alias, realName] of Object.entries(BRAND_ALIASES)) {
    if (lower.includes(alias)) {
      return realName;
    }
  }

  // 2. Check brand names from database
  const knownBrands = Array.from(new Set(MOTO_DATABASE.map(m => m.brand)));
  for (const brand of knownBrands) {
    if (lower.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  // 3. Fallback: check matching model brand
  const matchedModel = findBestModelMatch(text);
  if (matchedModel) {
    return matchedModel.brand;
  }

  return null;
}

/**
 * Find best matching model in database
 */
function findBestModelMatch(text) {
  if (!text) return null;
  
  // Normalize the text: remove spaces, lowercase, remove punctuation
  const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, "");

  let bestMatch = null;
  let maxScore = 0;

  for (const item of MOTO_DATABASE) {
    const cleanModel = item.model.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Exact or substring matches
    if (cleanText.includes(cleanModel)) {
      // Score is length of matched model name to favor more specific matches (e.g., "VT1100C Shadow Spirit" over "VT1100C")
      if (cleanModel.length > maxScore) {
        maxScore = cleanModel.length;
        bestMatch = item;
      }
    }
  }

  // Try matching abbreviations/sub-parts (e.g., vt1100, r1, r6, gsxr750)
  if (!bestMatch) {
    for (const item of MOTO_DATABASE) {
      // Extract code parts from model (like VT1100, YZF-R1 -> YZFR1, R1, etc.)
      const parts = item.model.toLowerCase().split(/[^a-z0-9]/).filter(Boolean);
      for (const part of parts) {
        if (part.length >= 2 && cleanText.includes(part)) {
          const score = part.length;
          if (score > maxScore) {
            maxScore = score;
            bestMatch = item;
          }
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Detect model name from text
 */
export function detectModelName(text) {
  if (!text) return "";
  
  // Try matching from DB first
  const match = findBestModelMatch(text);
  if (match) {
    return match.model;
  }

  // Fallback: extract model from string (e.g. "disc for Honda VT1100" -> "VT1100")
  let clean = text;
  const dlaIdx = text.toLowerCase().lastIndexOf(" for ");
  if (dlaIdx !== -1) {
    clean = text.substring(dlaIdx + 5);
  }

  const brand = detectBrand(clean);
  if (brand) {
    clean = clean.replace(new RegExp(brand, "gi"), "");
  }

  // Remove years if any e.g. (2001-2005) or 2001-2005 or 1998
  clean = clean.replace(/\(?\b(19|20)\d{2}\b([-\s]+(19|20)\d{2})?\)?/g, "");
  
  // Remove common SEO words
  clean = clean.replace(/brake disc|rear|front|—|[-]/gi, "");

  return clean.trim();
}

/**
 * Detect production years from text (either explicitly written or from database)
 */
export function detectYears(text) {
  if (!text) return "";

  // 1. Check for explicit years pattern in name: e.g. "2001-2005" or "1998-2006" or "(2004)"
  const yearRangeRegex = /\b((?:19|20)\d{2})[-\s]+((?:19|20)\d{2})\b/;
  const singleYearRegex = /\b((?:19|20)\d{2})\b/;

  const rangeMatch = text.match(yearRangeRegex);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}`;
  }

  const singleMatch = text.match(singleYearRegex);
  if (singleMatch) {
    return singleMatch[1];
  }

  // 2. Lookup model in DB to get default production years
  const match = findBestModelMatch(text);
  if (match) {
    return match.years;
  }

  return "1980-2026"; // default fallback span
}

export function generateSeoName(rawName) {
  if (!rawName || rawName.trim().length < 2) return rawName;

  const brand = detectBrand(rawName);
  const modelName = detectModelName(rawName);
  const years = detectYears(rawName);

  if (brand && modelName) {
    let cleanModel = modelName;
    const brandLower = brand.toLowerCase();
    if (cleanModel.toLowerCase().startsWith(brandLower)) {
      cleanModel = cleanModel.substring(brand.length).trim();
    }
    // Remove fluff
    cleanModel = cleanModel.replace(/brake disc|rear|front|—/gi, "").trim();
    if (cleanModel.length > 0) {
      cleanModel = cleanModel.charAt(0).toUpperCase() + cleanModel.slice(1);
    }
    return years ? `${brand} ${cleanModel} (${years})` : `${brand} ${cleanModel}`;
  }

  if (brand) {
    let cleanName = rawName.replace(new RegExp(brand, "gi"), "").replace(/brake disc|rear|front|—/gi, "").trim();
    if (cleanName.length > 0) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    return years ? `${brand} ${cleanName} (${years})` : `${brand} ${cleanName}`;
  }

  // Fallback
  let capitalized = rawName.trim().replace(/brake disc|rear|front|—/gi, "").trim();
  if (capitalized.length > 0) {
    capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
  }
  return years ? `${capitalized} (${years})` : capitalized;
}

/**
 * Generate SEO-friendly URL slug (e.g. "disk-tormoznoy-honda-vt1100")
 */
export function generateSlug(rawName) {
  if (!rawName) return "product-" + Date.now();
  
  // Basic transliteration for Cyrillic
  const cyrillicToLatin = {
    'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'yo', 'ж':'zh',
    'з':'z', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o',
    'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'h', 'ц':'ts',
    'ч':'ch', 'ш':'sh', 'щ':'shch', 'ъ':'', 'ы':'y', 'ь':'', 'э':'e', 'ю':'yu', 'я':'ya'
  };
  
  let slug = rawName.toLowerCase();
  slug = slug.split('').map(char => cyrillicToLatin[char] || char).join('');
  
  slug = slug.replace(/[^a-z0-9\s-]/g, ' ') // Remove invalid chars
             .replace(/\s+/g, '-')          // Replace spaces with dashes
             .replace(/-+/g, '-')           // Collapse dashes
             .replace(/^-|-$/g, '');        // Trim dashes
             
  if (!slug) return "product-" + Date.now();
  return slug;
}
