# Zyrbit Global Food Core Ingestion Report (Run 3B)

**Execution Date**: October 6, 2026  
**Pipeline Run**: Run 3B — Global Canonical Food Core Ingestion  
**Approved Sources Ingested**: USDA FoodData Central (SR Legacy) & UK CoFID (2021 Release)  
**Quarantined Sources**: Open Food Facts, IFCT / ICMR-NIN, CIQUAL, AFCD, CNF, Commercial APIs  

---

## Executive Summary

Run 3B successfully ingested the approved global nutritional core datasets (**USDA FoodData Central SR Legacy** and **UK Composition of Foods Integrated Dataset 2021**) into Zyrbit's Food Knowledge V2 engine through a deterministic, reproducible, multi-stage ingestion pipeline.

The initial curated 110-food Zyrbit seed library has been preserved with 100% fidelity, maintaining absolute precedence over external records. All imported records include explicit provenance metadata (`source_type = 'official_dataset'`), standardized preparation states (`raw`, `dry`, `cooked`, `boiled`, `roasted`, `fried`, `steamed`), and calibrated serving units.

The final canonical food catalog now contains **10,735 verified foods** with **2,747 global aliases**, with deterministic in-memory lookup latency averaging **2.2ms**. Zero breaking changes were introduced; all 356 unit and integration tests pass, all 6 Playwright E2E journeys pass, ESLint reports 0 warnings/errors, and the production build compiles cleanly.

---

## 1. USDA Source & Version

- **Dataset**: USDA FoodData Central (FDC) — SR Legacy (Standard Reference Legacy)
- **Version**: April 2018 Release (final stable freeze of USDA Standard Reference)
- **Official Download URL**: `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`
- **License**: CC0 1.0 Universal Public Domain Dedication (United States Government Work, 17 U.S.C. § 105)
- **Acquisition Timestamp**: 2026-10-06T17:42:00.000Z
- **Files Processed**:
  - `food.csv` (7,793 primary records)
  - `food_nutrient.csv` (Nutrient measurement records mapping energy, protein, carbohydrate, fat, fiber)
  - `food_portion.csv` (Standard portion descriptions and gram weights)

---

## 2. UK CoFID Source & Version

- **Dataset**: McCance and Widdowson’s Composition of Foods Integrated Dataset (CoFID)
- **Version**: 2021 Integrated Dataset Release
- **Official Publisher**: Department of Health and Social Care / Office for Health Improvement and Disparities (OHID)
- **Official Download URL**: `https://assets.publishing.service.gov.uk/media/605dc532e90e0724f2b96057/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021.xlsx`
- **License**: Open Government Licence v3.0 (OGL v3.0) — Permitted for commercial and non-commercial worldwide reuse with attribution
- **Acquisition Timestamp**: 2026-10-06T17:42:00.000Z
- **Sheets Processed**:
  - `1.2 Proximates` (Food Code, Food Name, Energy [kJ/kcal], Water, Total Nitrogen, Protein, Fat, Carbohydrate, Fiber)

---

## 3. Records Downloaded

| Source | Downloaded Records | Format | Raw Size |
| :--- | :--- | :--- | :--- |
| **Curated Zyrbit Seed** | 110 | In-repository JavaScript (`src/data/foods/indianFoods.js`) | 27 KB |
| **USDA FDC SR Legacy** | 7,793 | CSV (`food.csv`, `food_nutrient.csv`, `food_portion.csv`) | 32.5 MB |
| **UK CoFID 2021** | 2,887 | XLSX (`1.2 Proximates` table) | 4.5 MB |
| **Total Downloaded** | **10,790** | — | **~37 MB** |

---

## 4. Records Imported

| Source | Imported Canonical Records | Share of Catalog |
| :--- | :--- | :--- |
| **Curated Zyrbit Seed** | 110 | 1.02% |
| **Seed Preparation Variants** | 2 (`oats_dry`, `rice_raw`) | 0.02% |
| **USDA FDC SR Legacy** | 7,788 | 72.55% |
| **UK CoFID 2021** | 2,835 | 26.41% |
| **Total Imported** | **10,735** | **100.0%** |

---

## 5. Records Rejected

Total records rejected across all stages: **7 records**.

- **USDA SR Legacy Rejections (5 records)**:
  - Records lacking energy (kcal) values or missing all core macronutrients (empty entries such as experimental chemical reference rows with `kcal == 0` and `protein == 0` and `carbs == 0` and `fat == 0` and missing food descriptions).
- **UK CoFID Rejections (2 records)**:
  - Header spacer and footnote records in Excel table lacking food codes (`Food Code` null/empty) and valid proximates.

---

## 6. Records Deduplicated

Total deduplications performed during ingestion: **50 records**.

- **Cross-Source / Within-Source Deduplication Logic**:
  - Normalization by lowercase alphanumeric name key and preparation state.
  - When a CoFID food possessed identical normalized name and preparation state to an existing imported record with identical macronutrients (spread < 5%), the duplicate record was merged with the canonical item, appending the secondary source identifier to `alternateSourceIds` and preserving single canonical entry.
  - Curated seed items were protected by the **Seed Precedence Rule**: any external dataset item matching a seed item was not allowed to overwrite the seed item.

---

## 7. Records Retained Separately Due to Preparation Differences

Total distinct preparation state entries maintained in global catalog: **10,735 foods**.

### Breakdown by Preparation State

| Preparation State | Food Count | Examples |
| :--- | :--- | :--- |
| **cooked** | 4,480 | `Rice, white, cooked`, `Oats (cooked)`, `Chicken breast, roasted, cooked` |
| **raw** | 3,531 | `Apple, raw`, `Rice, white, raw`, `Spinach, raw`, `Olive oil` |
| **roasted** | 1,062 | `Almonds, roasted`, `Peanuts, dry roasted`, `Chicken breast, roasted` |
| **dry** | 768 | `Rolled oats (dry)`, `Lentils, dry`, `Beans, black, mature seeds, dry` |
| **boiled** | 490 | `Egg, whole, boiled`, `Potatoes, boiled without skin` |
| **fried** | 361 | `Egg, whole, fried`, `Fish, cod, fried in batter`, `Medu Vada` |
| **steamed** | 43 | `Idli`, `Broccoli, steamed`, `Dumplings, steamed` |

**Separation Rule Adherence**:
- `rice raw` (365 kcal/100g) and `rice cooked` (130 kcal/100g) remain strictly distinct entities.
- `oats dry` (389 kcal/100g) and `oats cooked` (68 kcal/100g) remain strictly distinct entities.
- Users logging ambiguous inputs like "80g oats" trigger clarification under the 20% Materiality Rule.

---

## 8. Exact Final Canonical Food Count

$$\mathbf{10,735\ Canonical\ Foods}$$

*(Resulting deterministically from: 110 Seed + 2 Seed Prep Variants + 7,788 USDA + 2,835 CoFID - 50 Deduplications)*.

---

## 9. Exact Seed Count Preserved

$$\mathbf{110\ Curated\ Zyrbit\ Seed\ Foods\ (100\%\ Preserved)}$$

- Placed at array indexes `0` through `109` in `ALL_CANONICAL_FOODS`.
- Identifiers, categories, emojis, macronutrients, default serving weights, and `sourceType: 'curated_seed'` remain unmodified.
- `CANONICAL_FOODS` export continues to return the exact 110 seed items for backwards compatibility.

---

## 10. Source Provenance Statistics

Every item in the global catalog contains complete provenance fields:

| Source Type | Source Name | Source Version | Count | Provenance Metadata |
| :--- | :--- | :--- | :--- | :--- |
| `curated_seed` | `ZYRBIT_SEED` | `1.0` | 110 | Curated Indian food core with verified serving sizes and cultural aliases |
| `curated_seed` | `ZYRBIT_SEED` | `1.0` (prep variant) | 2 | Distinct preparation variants (`oats_dry`, `rice_raw`) |
| `official_dataset` | `USDA_FDC` | `SR_Legacy_2018` | 7,788 | USDA FoodData Central SR Legacy IDs (`usda_<fdc_id>`) |
| `official_dataset` | `UK_COFID` | `2021` | 2,835 | UK CoFID Food Codes (`cofid_<food_code>`) |
| **Total** | — | — | **10,735** | — |

---

## 11. Data-Quality Findings & Atwater Relationship

### Automated Validation Checks
- **Negative Values**: 0 detected (100% clean).
- **Missing Core Macros (Calories, Protein, Carbs, Fat)**: 0 in final catalog (clean).
- **Duplicate IDs**: 0 collisions across 10,735 records.
- **Serving Weight Validation**: All foods have `defaultServingG > 0` and standard serving label.

### Atwater Relationship Analysis
The pipeline evaluated the Atwater macro-energy relationship for every imported food:
$$\text{Expected Calories} \approx (\text{Protein} \times 4) + (\text{Carbs} \times 4) + (\text{Fat} \times 9)$$

- **Total Records Evaluated**: 10,735
- **Records Flagged with >40% Discrepancy**: **95 records**
- **Analysis of Discrepancies**:
  1. **Alcoholic Beverages (84 records)**: Distilled spirits (vodka, rum, gin, whiskey at 80–100 proof), liqueurs, fortified wines, and beers. In these foods, calories originate primarily from ethanol ($\approx 7\text{ kcal/g}$), which is not captured by carbohydrate, protein, or fat sums. Reported calories match authoritative laboratory measurements.
  2. **High-Organic-Acid / Fiber Products (11 records)**: Pure cream of tartar (potassium bitartrate), carob flours, and high-insoluble-fiber wheat brans where official lab bomb calorimetry measures energy differently from general Atwater 4-4-9 factors.
- **Decision**: Discrepancies were logged and flagged in quality telemetry rather than rejected, preserving true official laboratory values without artificial tampering.

---

## 12. Duplicate Findings

- 50 duplicate entries identified between identical culinary preparations in UK CoFID and USDA datasets (e.g. standard butter, common salt, refined cane sugar, raw whole milk).
- Deduplicator preserved primary record, recorded cross-dataset references in `alternateSourceIds`, and eliminated duplicate entries.
- Zero seed foods were overwritten or modified.

---

## 13. Performance Measurements

### In-Memory Resolution Benchmarks (10,735 Foods)
Evaluated across common single-word queries, compound multi-word queries, regional queries, and preparation queries:

| Query Type | Sample Query | Matches Found | Latency | Top Match & Source |
| :--- | :--- | :--- | :--- | :--- |
| **Curated Seed** | `roti` | 29 | 3.5ms | `Roti / Chapati` (ZYRBIT_SEED) |
| **Curated Seed** | `boiled egg` | 1 | 2.5ms | `Boiled Egg` (ZYRBIT_SEED) |
| **Curated Seed** | `chicken breast` | 9 | 2.0ms | `Chicken Breast (grilled)` (ZYRBIT_SEED) |
| **Preparation Ambiguity** | `oats` | 34 | 2.3ms | `Oats (cooked)` (ZYRBIT_SEED) |
| **USDA Official Food** | `olive oil` | 4 | 2.4ms | `Oil, olive, salad or cooking` (USDA_FDC) |
| **USDA Official Food** | `cheddar cheese` | 6 | 1.8ms | `Cheese, cheddar` (USDA_FDC) |
| **USDA Official Food** | `brown rice` | 28 | 1.6ms | `Rice, brown, long-grain, cooked` (USDA_FDC) |
| **UK CoFID Food** | `cream of tartar`| 1 | 1.4ms | `Cream of tartar` (UK_COFID) |
| **Seed Cultural Food** | `greek yogurt` | 1 | 1.3ms | `Greek Yogurt` (ZYRBIT_SEED) |

- **Average Lookup Latency**: **2.255 ms** (well within sub-10ms requirement).
- **Memory Footprint**: `globalCanonicalFoods.js` adds ~4.8 MB uncompressed (~545 KB gzipped), parsed once at app startup with zero runtime GC spikes.

---

## 14. Database Changes

### Staging and Migration Script
- Generated idempotent SQL migration:
  `supabase/migrations/20261006_import_global_canonical_foods.sql` (2.7 MB).
- Features:
  - Uses `ON CONFLICT (slug) DO NOTHING` to ensure zero overwrites of existing database records.
  - Inserts into `canonical_foods` with complete provenance (`source_type = 'official_dataset'`, `source_name = 'USDA_FDC'` or `'UK_COFID'`).
  - Prepares PostgreSQL FTS and `pg_trgm` indexes for fast database querying.
  - Fully rollbackable via standard SQL transaction boundary.

---

## 15. Files Changed

### Created
1. `scripts/buildGlobalCanonicalCatalog.mjs` — Deterministic ingestion and normalization pipeline.
2. `src/data/foods/globalCanonicalFoods.js` — Universal ESM export of 10,735 canonical foods.
3. `src/data/foods/globalCanonicalFoods.json` — Machine-readable JSON artifact of the global catalog.
4. `src/data/foods/globalFoodAliases.js` — Global alias dictionary with 2,747 entries.
5. `src/data/foods/globalFoodAliases.json` — Machine-readable JSON artifact of aliases.
6. `supabase/migrations/20261006_import_global_canonical_foods.sql` — Idempotent database migration.
7. `docs/global-food-ingestion-report.md` — This report.

### Modified
1. `src/data/foods/canonicalFoods.js` — Connected `ALL_CANONICAL_FOODS` and global aliases to `findCanonicalFood`.
2. `src/tests/foodKnowledgeV2.test.js` — Added Section 8 verifying catalog scale, USDA/CoFID resolution, preparation states, seed precedence, and snapshot immutability.
3. `vite.config.js` — Scoped Vitest runner pattern (`src/tests/**/*.test.{js,jsx}`) and increased Workbox precache limit to 8MB.

---

## 16. Tests Added

Section 8 added to `src/tests/foodKnowledgeV2.test.js` containing 9 comprehensive verification tests:
1. `verifies catalog scale expands beyond 10,000 foods with exact seed preservation`
2. `verifies imported USDA food exists with official_dataset provenance`
3. `verifies imported UK CoFID food exists with official_dataset provenance`
4. `preserves distinct preparation states for imported foods`
5. `curated seed foods retain absolute precedence over external duplicate foods`
6. `resolves imported USDA food deterministically without Gemini`
7. `prioritizes personal food over generic imported USDA/CoFID food`
8. `performs fast in-memory search across global catalog without latency regression`
9. `ensures historical nutrition snapshots remain immutable regardless of catalog expansion`

---

## 17. Complete Test Count

- **Previous Baseline**: 347 passed tests.
- **Run 3B Total**: **356 passed tests** (across 14 test suites).
- **Test Failures**: 0.
- **Skipped Tests**: 0.

---

## 18. Playwright Results

Executed `node tests/e2e/food_knowledge_v2.spec.mjs`:

```text
================================================================
🥗 ZYRBIT FOOD KNOWLEDGE V2 — PLAYWRIGHT JOURNEY SUITE
================================================================
✅ [Journey 1] "2 rotis" — Deterministic Canonical Resolution: PASS
✅ [Journey 2] "80g oats" — Preparation Ambiguity (20% Materiality Rule): PASS
✅ [Journey 3] "my Pintola oats" — Personal Food Library Priority: PASS
✅ [Journey 4] Migrated Seed Food — Catalog Integrity (110 Foods Preserved): PASS
✅ [Journey 5] Gemini Unavailable + Known Food ("Log 2 rotis"): PASS
✅ [Journey 6] Unknown Food + AI Fallback Handling: PASS
================================================================
RESULT: 6 / 6 Journeys Passed
================================================================
```

---

## 19. Lint Result

Executed `npm run lint` (`eslint .`):

```text
> zyrbit@0.0.0 lint
> eslint .

[BABEL] Note: The code generator has deoptimised the styling of
C:\Users\insan\OneDrive\Desktop\zyrbit\src\data\foods\globalCanonicalFoods.js
as it exceeds the max of 500KB.
```

- **Exit Code**: 0 (Clean — 0 errors, 0 warnings).

---

## 20. Build Result

Executed `npm run build` (`vite build`):

```text
✓ built in 1.53s
PWA v1.2.0
mode      generateSW
precache  229 entries (23811.77 KiB)
files generated:
  dist/sw.js
  dist/workbox-66610c77.js
```

- **Exit Code**: 0 (Production build successful).

---

## 21. Rollback Procedure

If rollback is ever required:
1. **Catalog Module Rollback**: Revert `src/data/foods/canonicalFoods.js` to point `ALL_CANONICAL_FOODS` directly to `CANONICAL_FOODS` (110 seed items).
2. **Database Rollback**:
   ```sql
   DELETE FROM canonical_foods WHERE source_type = 'official_dataset';
   ```
3. **Historical Meal Log Safety**: Because `health_meals` records store immutable `nutrition_snapshot` JSONB payloads recorded at log time, no database rollback can alter past user nutrition history.
4. **Feature Flag Control**: Toggle `FEATURES.FOOD_KNOWLEDGE_V2 = false` in `src/config/features.js` to immediately divert all traffic to legacy Phase C food paths.

---

## 22. Remaining Limitations & Recommendations

1. **Brand-Specific Commercial Foods**: In accordance with strict boundaries, Open Food Facts and commercial APIs (Nutritionix, FatSecret) were quarantined. Packaged branded items (e.g. specific protein powders, regional snack bars) remain in the Personal Food Library tier or AI estimation fallback.
2. **Indian National Dataset (IFCT 2017)**: Remained paused pending formal licensing confirmation from ICMR-NIN. The 110 curated Indian seed foods continue to provide comprehensive coverage for daily Indian diets.
3. **Multi-Language Synonyms**: Synonyms currently cover English, Hindi transliterations, and standard culinary descriptors. Regional Indian language aliases (Tamil, Telugu, Bengali) should be added in a curated, reviewed dictionary pass.
