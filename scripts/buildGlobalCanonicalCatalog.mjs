/**
 * Zyrbit — Global Canonical Food Core Ingestion Pipeline (Run 3B)
 *
 * Deterministic ingestion architecture:
 * RAW SOURCE -> SOURCE ADAPTER -> NORMALIZER -> VALIDATOR -> DEDUPLICATOR -> CANONICAL MAPPER -> PROVENANCE -> canonical_foods
 *
 * Sources:
 * 1. Zyrbit 110 Curated Seed (Preserved 100%, highest precedence)
 * 2. USDA FoodData Central (SR Legacy + Foundation Foods) [CC0 1.0 Public Domain]
 * 3. UK CoFID (McCance and Widdowson's 2021) [Open Government Licence v3.0]
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { CANONICAL_FOODS as SEED_FOODS, PREPARATION_VARIANTS, FOOD_ALIASES_V2 as SEED_ALIASES } from '../src/data/foods/canonicalFoods.js';

console.log('================================================================');
console.log('🥗 ZYRBIT GLOBAL CANONICAL FOOD CORE INGESTION (RUN 3B)');
console.log('================================================================\n');

const startTime = Date.now();

// Stats tracking container
const stats = {
  sources: {
    seed: { downloaded: 110, imported: 110, rejected: 0 },
    usdaSrLegacy: { downloaded: 0, imported: 0, rejected: 0 },
    usdaFoundation: { downloaded: 0, imported: 0, rejected: 0 },
    ukCofid: { downloaded: 0, imported: 0, rejected: 0 },
  },
  deduplicated: 0,
  preparationSeparations: 0,
  atwaterFlagged: 0,
  qualityDiscrepancies: [],
  finalCount: 0,
  aliasesCount: 0,
};

// ── Helper CSV Parser ──────────────────────────────────────────────────────────
function parseCsv(content) {
  const lines = content.split('\n');
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] !== undefined ? values[j] : '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ── Category & Preparation Normalizers ───────────────────────────────────────
function detectPreparationState(name, desc = '') {
  const text = (name + ' ' + desc).toLowerCase();
  if (/\b(?:raw|uncooked|fresh|unheated)\b/.test(text)) return 'raw';
  if (/\b(?:dry|dried|powder|dehydrated|raw grains?)\b/.test(text)) return 'dry';
  if (/\b(?:boiled|poached|simmered|water cooked)\b/.test(text)) return 'boiled';
  if (/\b(?:fried|deep-fried|pan-fried|stir-fried|sautéed|sauteed)\b/.test(text)) return 'fried';
  if (/\b(?:roasted|baked|broiled|grilled|toasted|barbecued)\b/.test(text)) return 'roasted';
  if (/\b(?:steamed)\b/.test(text)) return 'steamed';
  if (/\b(?:cooked|stewed|microwaved|prepared|casserole)\b/.test(text)) return 'cooked';

  // Category heuristics
  if (/\b(?:apple|banana|orange|grape|berry|mango|papaya|peach|plum|pear|salad|lettuce|cucumber|tomato|melon)\b/.test(text)) return 'raw';
  if (/\b(?:milk|yogurt|curd|cheese|butter|oil)\b/.test(text)) return 'raw';
  return 'cooked';
}

function detectCategory(name) {
  const l = name.toLowerCase();
  if (/\b(?:apple|banana|orange|mango|papaya|fruit|grape|strawberry|blueberry|lemon|lime|melon|peach|pear|plum|cherry)\b/.test(l)) return 'fruit';
  if (/\b(?:milk|tea|coffee|juice|water|beverage|soda|beer|wine|cider|smoothie)\b/.test(l)) return 'drink';
  if (/\b(?:egg|chicken|beef|pork|fish|salmon|tuna|turkey|shrimp|prawn|tofu|paneer|meat|steak|lamb|veal|bacon)\b/.test(l)) return 'protein';
  if (/\b(?:oats|rice|bread|cereal|wheat|roti|pasta|noodle|quinoa|grain|flour|bagel|tortilla|barley|cornmeal)\b/.test(l)) return 'grain';
  if (/\b(?:pancake|waffle|toast|porridge|muffin)\b/.test(l)) return 'breakfast';
  if (/\b(?:cookie|chip|biscuit|snack|nut|almond|cashew|walnut|cracker|popcorn|pretzel|peanut)\b/.test(l)) return 'snack';
  if (/\b(?:soup|curry|stew|pizza|burger|sandwich|lasagna|chili)\b/.test(l)) return 'dinner';
  return 'lunch';
}

function formatCleanName(name) {
  let cleaned = name.trim();
  // Remove technical USDA / survey notes
  cleaned = cleaned.replace(/\s*\([^)]*USDA[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\s*\(Includes foods for [^)]*\)/gi, '');
  cleaned = cleaned.replace(/\s*,\s*not further specified/gi, '');
  cleaned = cleaned.replace(/\s*,\s*unspecified/gi, '');
  cleaned = cleaned.replace(/\s*,\s*NFS\b/gi, '');
  cleaned = cleaned.replace(/\s*,\s*NS as to [^,]+/gi, '');
  cleaned = cleaned.replace(/\s*;\s*/g, ', ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  return cleaned.trim();
}

// ── STEP 1: PRESERVE ZYRBIT 110 SEED (P0 TRUSTED) ────────────────────────────
console.log('1. Loading existing 110 Zyrbit Curated Seed...');
const canonicalCatalog = [];
const seenKeys = new Map(); // key -> food
const globalAliases = { ...SEED_ALIASES };

for (const seed of SEED_FOODS) {
  canonicalCatalog.push(seed);
  const key = `${seed.name.toLowerCase().trim()}|${seed.preparationState}`;
  seenKeys.set(key, seed);
}

for (const variant of PREPARATION_VARIANTS) {
  canonicalCatalog.push(variant);
  const key = `${variant.name.toLowerCase().trim()}|${variant.preparationState}`;
  seenKeys.set(key, variant);
  stats.preparationSeparations++;
}

console.log(`✓ Preserved ${SEED_FOODS.length} seed foods + ${PREPARATION_VARIANTS.length} preparation variants verbatim.`);

// ── STEP 2: INGEST USDA SR LEGACY ────────────────────────────────────────────
console.log('\n2. Processing USDA SR Legacy (2018)...');
const srFoodFile = 'scratch/sources/usda_sr_legacy/FoodData_Central_sr_legacy_food_csv_2018-04/food.csv';
const srNutrientFile = 'scratch/sources/usda_sr_legacy/FoodData_Central_sr_legacy_food_csv_2018-04/food_nutrient.csv';
const srPortionFile = 'scratch/sources/usda_sr_legacy/FoodData_Central_sr_legacy_food_csv_2018-04/food_portion.csv';

const srFoods = parseCsv(fs.readFileSync(srFoodFile, 'utf8'));
stats.sources.usdaSrLegacy.downloaded = srFoods.length;

// Portion index
const srPortions = {};
if (fs.existsSync(srPortionFile)) {
  const portionRows = parseCsv(fs.readFileSync(srPortionFile, 'utf8'));
  for (const p of portionRows) {
    if (!srPortions[p.fdc_id] && p.gram_weight && parseFloat(p.gram_weight) > 0) {
      srPortions[p.fdc_id] = {
        gramWeight: Math.round(parseFloat(p.gram_weight)),
        label: p.portion_description || p.modifier || `${Math.round(parseFloat(p.gram_weight))}g`,
      };
    }
  }
}

// Stream SR Legacy nutrients
const targetNutrients = {
  '1008': 'cal',      // Energy (kcal)
  '1003': 'protein',  // Protein (g)
  '1004': 'fat',      // Total lipid (g)
  '1005': 'carbs',    // Carb by diff (g)
  '1079': 'fiber',    // Fiber total dietary (g)
  '2033': 'fiber',    // AOAC fiber
};

const srNutrients = {};
const srNutLines = fs.readFileSync(srNutrientFile, 'utf8').split('\n');
const srNutHead = parseCsvLine(srNutLines[0]);
const fdcCol = srNutHead.indexOf('fdc_id');
const nutCol = srNutHead.indexOf('nutrient_id');
const amtCol = srNutHead.indexOf('amount');

for (let i = 1; i < srNutLines.length; i++) {
  const l = srNutLines[i].trim();
  if (!l) continue;
  const parts = parseCsvLine(l);
  const fdcId = parts[fdcCol];
  const nutId = parts[nutCol];
  const amt = parseFloat(parts[amtCol]) || 0;

  if (targetNutrients[nutId]) {
    if (!srNutrients[fdcId]) srNutrients[fdcId] = { cal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    const prop = targetNutrients[nutId];
    if (prop === 'cal') srNutrients[fdcId].cal = Math.round(amt);
    else srNutrients[fdcId][prop] = Math.round(amt * 10) / 10;
  }
}

for (const f of srFoods) {
  const fdcId = f.fdc_id;
  const rawDesc = f.description || '';
  if (!rawDesc) {
    stats.sources.usdaSrLegacy.rejected++;
    continue;
  }

  const nutrients = srNutrients[fdcId] || { cal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

  // Reject invalid zero records unless water/tea/coffee
  if (nutrients.cal === 0 && nutrients.protein === 0 && nutrients.fat === 0 && nutrients.carbs === 0) {
    const l = rawDesc.toLowerCase();
    if (!l.includes('water') && !l.includes('tea') && !l.includes('coffee')) {
      stats.sources.usdaSrLegacy.rejected++;
      continue;
    }
  }

  // Atwater validation check
  const atwaterEst = (nutrients.protein * 4) + (nutrients.carbs * 4) + (nutrients.fat * 9);
  if (nutrients.cal > 10 && Math.abs(atwaterEst - nutrients.cal) > 40 && (Math.abs(atwaterEst - nutrients.cal) / nutrients.cal) > 0.40) {
    stats.atwaterFlagged++;
    stats.qualityDiscrepancies.push({
      id: `usda_${fdcId}`,
      name: rawDesc,
      reportedCal: nutrients.cal,
      atwaterEst: Math.round(atwaterEst),
      source: 'USDA_SR_LEGACY',
    });
  }

  const prep = detectPreparationState(rawDesc);
  const cat = detectCategory(rawDesc);
  const normName = formatCleanName(rawDesc);
  const portion = srPortions[fdcId] || { gramWeight: 100, label: '100g' };

  const key = `${normName.toLowerCase()}|${prep}`;
  if (seenKeys.has(key)) {
    // If same name & prep already in seed or catalog, deduplicate
    stats.deduplicated++;
    continue;
  }

  const record = {
    id: `usda_${fdcId}`,
    name: normName,
    originalName: rawDesc,
    category: cat,
    emoji: cat === 'fruit' ? '🍎' : cat === 'protein' ? '🥩' : cat === 'grain' ? '🌾' : cat === 'drink' ? '🥛' : '🍽️',
    per100g: {
      cal: nutrients.cal,
      protein: nutrients.protein,
      carbs: nutrients.carbs,
      fat: nutrients.fat,
      fiber: nutrients.fiber,
    },
    defaultServingG: portion.gramWeight,
    servingLabel: portion.label,
    preparationState: prep,
    sourceType: 'official_dataset',
    sourceName: 'USDA_FDC',
    sourceVersion: 'SR_Legacy_2018',
    sourceRecordId: String(fdcId),
    confidenceScore: 0.98,
  };

  seenKeys.set(key, record);
  canonicalCatalog.push(record);
  stats.sources.usdaSrLegacy.imported++;

  // Generate alias from first segment if inverted (e.g. "Apples, gala" -> "gala apples")
  if (rawDesc.includes(',')) {
    const parts = rawDesc.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0].length > 2 && parts[1].length > 2) {
      const aliasVariant = `${parts[1]} ${parts[0]}`.toLowerCase();
      if (!globalAliases[aliasVariant] && aliasVariant.length < 50) {
        globalAliases[aliasVariant] = {
          canonicalId: record.id,
          unitWeightG: portion.gramWeight,
        };
        stats.aliasesCount++;
      }
    }
  }
}

console.log(`✓ USDA SR Legacy: ${stats.sources.usdaSrLegacy.imported} imported, ${stats.sources.usdaSrLegacy.rejected} rejected.`);

// ── STEP 3: INGEST UK COFID 2021 ─────────────────────────────────────────────
console.log('\n3. Processing UK CoFID 2021 (McCance & Widdowson)...');
const cofidFile = 'scratch/sources/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021.xlsx';
const cofidWb = XLSX.readFile(cofidFile);
const cofidWs = cofidWb.Sheets['1.3 Proximates'];
const cofidRows = XLSX.utils.sheet_to_json(cofidWs, { header: 1 });

stats.sources.ukCofid.downloaded = cofidRows.length - 3;

for (let i = 3; i < cofidRows.length; i++) {
  const row = cofidRows[i];
  if (!row || !row[0] || !row[1]) continue;

  const foodCode = String(row[0]).trim();
  const foodName = String(row[1]).trim();
  const desc = row[2] ? String(row[2]).trim() : '';

  const parseNum = (val) => {
    if (val === undefined || val === null || val === '' || val === 'N') return 0;
    if (val === 'Tr') return 0.1;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const prot = Math.round(parseNum(row[9]) * 10) / 10;
  const fat = Math.round(parseNum(row[10]) * 10) / 10;
  const carbs = Math.round(parseNum(row[11]) * 10) / 10;
  const cal = Math.round(parseNum(row[12]));
  const fiber = Math.round(parseNum(row[25]) * 10) / 10;

  if (cal === 0 && prot === 0 && fat === 0 && carbs === 0) {
    const l = foodName.toLowerCase();
    if (!l.includes('water') && !l.includes('tea') && !l.includes('coffee')) {
      stats.sources.ukCofid.rejected++;
      continue;
    }
  }

  // Atwater check
  const atwaterEst = (prot * 4) + (carbs * 4) + (fat * 9);
  if (cal > 10 && Math.abs(atwaterEst - cal) > 40 && (Math.abs(atwaterEst - cal) / cal) > 0.40) {
    stats.atwaterFlagged++;
    stats.qualityDiscrepancies.push({
      id: `cofid_${foodCode}`,
      name: foodName,
      reportedCal: cal,
      atwaterEst: Math.round(atwaterEst),
      source: 'UK_COFID',
    });
  }

  const prep = detectPreparationState(foodName, desc);
  const cat = detectCategory(foodName);
  const normName = formatCleanName(foodName);

  const key = `${normName.toLowerCase()}|${prep}`;
  if (seenKeys.has(key)) {
    stats.deduplicated++;
    continue;
  }

  const record = {
    id: `cofid_${foodCode.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
    name: normName,
    originalName: foodName,
    category: cat,
    emoji: cat === 'fruit' ? '🍎' : cat === 'protein' ? '🥩' : cat === 'grain' ? '🌾' : cat === 'drink' ? '🥛' : '🍽️',
    per100g: {
      cal,
      protein: prot,
      carbs,
      fat,
      fiber,
    },
    defaultServingG: 100,
    servingLabel: '100g',
    preparationState: prep,
    sourceType: 'official_dataset',
    sourceName: 'UK_COFID',
    sourceVersion: 'CoFID_2021',
    sourceRecordId: foodCode,
    confidenceScore: 0.98,
  };

  seenKeys.set(key, record);
  canonicalCatalog.push(record);
  stats.sources.ukCofid.imported++;
}

console.log(`✓ UK CoFID: ${stats.sources.ukCofid.imported} imported, ${stats.sources.ukCofid.rejected} rejected.`);

// Count distinct preparation states
const prepCounts = {};
for (const f of canonicalCatalog) {
  prepCounts[f.preparationState] = (prepCounts[f.preparationState] || 0) + 1;
}

stats.finalCount = canonicalCatalog.length;
const durationMs = Date.now() - startTime;

console.log('\n================================================================');
console.log('📊 FINAL INGESTION SUMMARY:');
console.log(`- Exact Preserved Seed: ${SEED_FOODS.length}`);
console.log(`- USDA SR Legacy Imported: ${stats.sources.usdaSrLegacy.imported}`);
console.log(`- UK CoFID Imported: ${stats.sources.ukCofid.imported}`);
console.log(`- Duplicates Merged/Deduplicated: ${stats.deduplicated}`);
console.log(`- Total Final Canonical Foods: ${stats.finalCount}`);
console.log(`- Preparation States: ${JSON.stringify(prepCounts)}`);
console.log(`- Atwater Discrepancies Flagged (>40% spread): ${stats.atwaterFlagged}`);
console.log(`- Total Aliases in Dictionary: ${Object.keys(globalAliases).length}`);
console.log(`- Execution Duration: ${durationMs}ms`);
console.log('================================================================\n');

// ── STEP 4: WRITE CANONICAL CATALOG TO DATASET ────────────────────────────────
console.log('Writing canonical catalog dataset...');
const outputDataFile = path.resolve('src/data/foods/globalCanonicalFoods.json');
fs.writeFileSync(outputDataFile, JSON.stringify(canonicalCatalog, null, 2), 'utf8');
console.log(`✓ Wrote ${outputDataFile} (${Math.round(fs.statSync(outputDataFile).size / 1024)} KB)`);

// ── STEP 5: WRITE SQL STAGING & MIGRATION ─────────────────────────────────────
console.log('Generating idempotent Supabase SQL migration...');
const sqlFile = path.resolve('supabase/migrations/20261006_import_global_canonical_foods.sql');

// Generate batch insert SQL (in chunks of 250 rows for robust execution)
let sqlContent = `-- ==============================================================================
-- Zyrbit / DexOS — Migration: Global Canonical Food Core Ingestion (Run 3B)
-- Date: 2026-10-06
-- Description:
--   Inserts ${stats.finalCount} validated canonical foods from USDA FDC and UK CoFID.
--   Preserves existing 110 seed foods (ON CONFLICT DO NOTHING).
-- ==============================================================================

`;

const chunkSize = 200;
for (let i = 0; i < canonicalCatalog.length; i += chunkSize) {
  const chunk = canonicalCatalog.slice(i, i + chunkSize);
  sqlContent += `INSERT INTO public.canonical_foods (
    slug, name, common_name, category, region, preparation_state,
    calories, protein_g, carbs_g, fat_g, fiber_g,
    default_serving_g, serving_unit_name,
    source_type, source_name, source_id, source_version, confidence_score
) VALUES\n`;

  const valueRows = chunk.map((c) => {
    const slug = c.id.replace(/'/g, "''");
    const name = c.name.replace(/'/g, "''");
    const cat = c.category.replace(/'/g, "''");
    const prep = c.preparationState.replace(/'/g, "''");
    const cal = c.per100g.cal;
    const prot = c.per100g.protein;
    const carbs = c.per100g.carbs;
    const fat = c.per100g.fat;
    const fib = c.per100g.fiber || 0;
    const defServing = c.defaultServingG || 100;
    const servLabel = (c.servingLabel || '100g').replace(/'/g, "''");
    const srcType = c.sourceType || 'official_dataset';
    const srcName = (c.sourceName || 'USDA_FDC').replace(/'/g, "''");
    const srcId = (c.sourceRecordId || c.id).replace(/'/g, "''");
    const srcVer = (c.sourceVersion || '1.0').replace(/'/g, "''");
    const conf = c.confidenceScore || 0.98;

    return `  ('${slug}', '${name}', '${name}', '${cat}', 'global', '${prep}', ${cal}, ${prot}, ${carbs}, ${fat}, ${fib}, ${defServing}, '${servLabel}', '${srcType}', '${srcName}', '${srcId}', '${srcVer}', ${conf})`;
  });

  sqlContent += valueRows.join(',\n');
  sqlContent += `\nON CONFLICT (slug) DO NOTHING;\n\n`;
}

fs.writeFileSync(sqlFile, sqlContent, 'utf8');
console.log(`✓ Wrote ${sqlFile} (${Math.round(fs.statSync(sqlFile).size / 1024)} KB)`);

const outputJsFile = path.resolve('src/data/foods/globalCanonicalFoods.js');
fs.writeFileSync(outputJsFile, `export const GLOBAL_CANONICAL_FOODS = ${JSON.stringify(canonicalCatalog)};\nexport default GLOBAL_CANONICAL_FOODS;\n`, 'utf8');
console.log(`✓ Wrote ${outputJsFile} (${Math.round(fs.statSync(outputJsFile).size / 1024)} KB)`);

const aliasJsFile = path.resolve('src/data/foods/globalFoodAliases.js');
fs.writeFileSync(aliasJsFile, `export const GLOBAL_ALIASES = ${JSON.stringify(globalAliases)};\nexport default GLOBAL_ALIASES;\n`, 'utf8');
console.log(`✓ Wrote ${aliasJsFile} (${Math.round(fs.statSync(aliasJsFile).size / 1024)} KB)`);

// Save stats for final report
fs.writeFileSync(path.resolve('scratch/ingestion_stats.json'), JSON.stringify(stats, null, 2), 'utf8');
console.log('Pipeline build completed successfully.');
