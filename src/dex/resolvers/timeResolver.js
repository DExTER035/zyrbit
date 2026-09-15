/**
 * DexOS — Time & Duration Resolver
 * Deterministically normalizes natural language duration and health quantities into action parameters.
 *
 * Rules:
 * - Deterministic parsing only — zero AI arithmetic.
 * - Handles: "half an hour" -> 30, "45 mins" -> 45, "1 hr" -> 60, "1.5 hours" -> 90, etc.
 * - Handles health logs: water ml, sleep hours, activity duration & type.
 * - Pure JavaScript. Zero direct database queries.
 */

/**
 * Parses natural language duration expressions into integer minutes.
 * E.g. "half an hour" -> 30, "45 mins" -> 45, "1.5 hours" -> 90, "quarter of an hour" -> 15.
 *
 * @param {string|number} input
 * @returns {number|null} Duration in integer minutes, or null if unparseable
 */
export function parseDurationMinutes(input) {
  if (typeof input === 'number') {
    return isFinite(input) && input > 0 ? Math.round(input) : null;
  }
  if (!input || typeof input !== 'string') return null;

  const str = input.toLowerCase().trim();

  // Explicit phrases
  if (/\b(quarter of an hour|quarter hour|15\s*(?:min|mins|minutes)?)\b/.test(str)) return 15;
  if (/\b(half an hour|half hour|half-hour|30\s*(?:min|mins|minutes)?)\b/.test(str)) return 30;
  if (/\b(three quarters of an hour|45\s*(?:min|mins|minutes)?)\b/.test(str)) return 45;
  if (/\b(an hour|one hour|1\s*(?:hr|hour|hours)|60\s*(?:min|mins|minutes)?)\b/.test(str)) return 60;
  if (/\b(one and a half hours|1\.5\s*(?:hrs|hours)|90\s*(?:min|mins|minutes)?)\b/.test(str)) return 90;
  if (/\b(two hours|2\s*(?:hrs|hours)|120\s*(?:min|mins|minutes)?)\b/.test(str)) return 120;

  // Decimal hours: e.g. "2.5 hours", "0.5 hr"
  const decHourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/);
  if (decHourMatch) {
    const hrs = parseFloat(decHourMatch[1]);
    if (!isNaN(hrs) && hrs > 0) return Math.round(hrs * 60);
  }

  // Minutes regex: e.g. "45 mins", "25 minutes", "10m"
  const minMatch = str.match(/(\d+)\s*(?:minutes|minute|mins|min|m)\b/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    if (!isNaN(mins) && mins > 0) return mins;
  }

  // Pure integer string fallback (e.g. "45", "30", "25")
  const pureNum = str.match(/^\d+$/);
  if (pureNum) {
    const val = parseInt(pureNum[0], 10);
    if (!isNaN(val) && val > 0 && val <= 720) return val;
  }

  return null;
}

/**
 * Parses water hydration volume from natural language.
 * E.g. "I drank 750ml", "had 750 ml water", "drank 750", "drank a glass of water"
 *
 * @param {string} text
 * @returns {number|null} Milliliters (50-3000)
 */
export function parseWaterAmount(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // Check for explicit ml: e.g. "750ml", "500 ml", "1000ml"
  const mlMatch = str.match(/(\d+)\s*(?:ml|milliliters|millilitres)\b/i);
  if (mlMatch) {
    const ml = parseInt(mlMatch[1], 10);
    return ml >= 50 && ml <= 3000 ? ml : null;
  }

  // Check for glasses / cups / bottles
  const glassMatch = str.match(/(\d+|a|an|one|two|three|four)\s+(?:glass|glasses|cup|cups)\b/i);
  if (glassMatch) {
    const countMap = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 };
    const count = countMap[glassMatch[1].toLowerCase()] || parseInt(glassMatch[1], 10) || 1;
    return Math.min(3000, count * 250); // standard glass = 250ml
  }

  const bottleMatch = str.match(/(\d+|a|an|one|two)\s+(?:bottle|bottles)\b/i);
  if (bottleMatch) {
    const count = bottleMatch[1] === 'a' || bottleMatch[1] === 'one' ? 1 : parseInt(bottleMatch[1], 10) || 1;
    return Math.min(3000, count * 750); // standard water bottle = 750ml
  }

  // Check for liters: e.g. "1.5 liters", "1L", "2 litres"
  const lMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:l|liters|litres|liter|litre)\b/i);
  if (lMatch) {
    const liters = parseFloat(lMatch[1]);
    const ml = Math.round(liters * 1000);
    return ml >= 50 && ml <= 3000 ? ml : null;
  }

  // Shorthand e.g. "drank 750", "water 500"
  const shorthandMatch = str.match(/(?:drank|water|had)\s+(\d{3,4})\b/i);
  if (shorthandMatch) {
    const val = parseInt(shorthandMatch[1], 10);
    return val >= 50 && val <= 3000 ? val : null;
  }

  return null;
}

/**
 * Parses sleep duration and quality score from natural language.
 * E.g. "I slept 8 hours", "slept for 7.5 hours, quality 4", "got 6 hours sleep"
 *
 * @param {string} text
 * @returns {{ durationHours: number, quality: number } | null}
 */
export function parseSleepDetails(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // Duration in hours: e.g. "8 hours", "7.5 hrs", "5 and a half hours", "6h"
  const halfMatch = str.match(/(\d+)\s+and\s+a\s+half\s*(?:hours|hour|hrs|hr|h)\b/i);
  let hours = null;
  if (halfMatch) {
    hours = parseInt(halfMatch[1], 10) + 0.5;
  } else {
    const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\b/i);
    if (hourMatch) {
      hours = parseFloat(hourMatch[1]);
    }
  }

  if (hours === null || isNaN(hours) || hours < 0.5 || hours > 24) return null;

  // Quality rating (1-5): e.g. "quality 4", "rating 5", "slept well"
  let quality = 3; // Default neutral quality
  const qualMatch = str.match(/(?:quality|rating|score)\s*(?:of\s*)?([1-5])\b/i);
  if (qualMatch) {
    quality = parseInt(qualMatch[1], 10);
  } else if (/great|amazing|superb|well|deep|rested/i.test(str)) {
    quality = 4;
  } else if (/terrible|awful|poor|badly|restless/i.test(str)) {
    quality = 2;
  }

  return {
    durationHours: Math.round(hours * 10) / 10,
    quality,
  };
}

/**
 * Parses workout activity type and duration from natural language.
 * E.g. "I walked for 30 minutes", "30 minute walk", "did a 45 min run", "went cycling 1 hour"
 *
 * @param {string} text
 * @returns {{ activityType: string, activeMinutes: number, rpe: number } | null}
 */
export function parseActivityDetails(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // Detect activity type
  let activityType = null;
  if (/\b(walk|walking|walked)\b/i.test(str)) activityType = 'Walk';
  else if (/\b(run|running|ran|jog|jogging)\b/i.test(str)) activityType = 'Run';
  else if (/\b(cycle|cycling|bike|biking)\b/i.test(str)) activityType = 'Cycling';
  else if (/\b(swim|swimming)\b/i.test(str)) activityType = 'Swimming';
  else if (/\b(gym|lift|lifting|weights|workout|strength)\b/i.test(str)) activityType = 'Strength';
  else if (/\b(yoga|stretch|stretching)\b/i.test(str)) activityType = 'Yoga';
  else if (/\b(hiit|cardio)\b/i.test(str)) activityType = 'Cardio';

  if (!activityType) return null;

  // Detect duration
  const activeMinutes = parseDurationMinutes(str);
  if (!activeMinutes) return null;

  // Detect RPE (1-10) or default to 5
  let rpe = 5;
  const rpeMatch = str.match(/\brpe\s*(\d+)\b/i);
  if (rpeMatch) {
    const val = parseInt(rpeMatch[1], 10);
    if (val >= 1 && val <= 10) rpe = val;
  } else if (/intense|hard|exhausting|heavy/i.test(str)) {
    rpe = 8;
  } else if (/light|easy|gentle/i.test(str)) {
    rpe = 3;
  }

  return {
    activityType,
    activeMinutes,
    rpe,
  };
}
