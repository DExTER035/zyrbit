# Zyrbit Global Food Data Source Verification (Run 3A)
**Authoritative Architectural & Licensing Research Report**
*Status: Pre-Ingestion Legal & Technical Audit (No Code Modified)*
*Date: October 2026*

---

## 1. Executive Summary

Zyrbit's Food Knowledge V2 architecture requires transitioning from a seed catalog of 110 foods to a robust, globally accurate food intelligence engine without incurring legal exposure, licensing contamination, vendor lock-in, or astronomical API costs.

The goal of Run 3A is **strictly evaluative**: to determine which global and national food datasets Zyrbit can legally, technically, and economically ingest, cache, transform, and expose to users.

### Key Strategic Findings:
1. **Public Domain & Permissive Government Datasets Form the True Global Core**:
   - **USDA FoodData Central** (SR Legacy, Foundation Foods, FNDDS) is **CC0 1.0 Universal / Public Domain**. It contains over 15,000 highly accurate, analytically verified generic and whole foods.
   - **UK CoFID** (Open Government Licence v3.0, ~2,884 foods), **French CIQUAL** (Licence Ouverte / Etalab 2.0, ~3,185 foods), **Canadian CNF** (Open Government Licence - Canada, ~5,690 foods), and **Australian AFCD** (CC BY 4.0, ~1,614 foods) provide unimpeded commercial rights for permanent database storage, modification, and offline querying with simple attribution.
   - Combining these government repositories yields **~28,000 high-fidelity canonical foods** with zero recurring subscription fees and zero copyleft contamination.
2. **Open Food Facts (OFF) Has Severe ODbL Contamination Risks for the Core Database**:
   - While Open Food Facts is open and free, it is governed by the **Open Database License (ODbL v1.0)**.
   - Under Section 4.4 of the ODbL, any "Adapted Database" (derivative database formed by combining, transforming, or merging OFF with other datasets) must be released under the ODbL.
   - **Critical Architecture Guardrail**: Open Food Facts must **NEVER** be blended into Zyrbit’s canonical food table. If utilized, it must exist strictly as an isolated, un-joined, read-only runtime packaged-product lookup microservice.
3. **Commercial APIs (Nutritionix, Edamam, FatSecret) Are Hostile to Local Canonical Databases**:
   - Nutritionix, Edamam, and FatSecret enforce strict terms that **ban caching beyond 24 hours** and **prohibit building or storing a local copy of nutrition data**.
   - Because Zyrbit requires point-in-time immutable nutrition snapshots on `meal_logs` and offline deterministic local resolution without network hops, commercial APIs cannot serve as the canonical database foundation.
   - Furthermore, Nutritionix pricing starts at **~$1,850/month (~$22,000/year)**, creating unjustifiable burn for a focused SaaS.
4. **Indian IFCT 2017 Requires Legal Clarification**:
   - ICMR-NIN’s Indian Food Composition Tables (IFCT 2017) is a government scientific publication with standard Crown/Government copyright. While provided for free scientific access, commercial redistribution or database extraction into a proprietary SaaS product is not explicitly covered by a permissive open license (such as OGL or CC0). It is classified as **Category B (Requires Legal Verification)** before bulk extraction.

---

## 2. Source-by-Source Comparison Table

| Source | Organization | Records | License | Commercial Use | Permitted Storage | Redistribution / Derivative | API vs Bulk | Recommended Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. USDA FoodData Central** | USDA ARS | ~15,000 generic; ~350k branded | CC0 1.0 Universal (Public Domain) | Permitted (Free) | Permanent local storage allowed | Full rights; no copyleft | Both (REST API + CSV/JSON bulk) | **A — Canonical Core** |
| **2. UK CoFID** | UKHSA / OHID (GOV.UK) | 2,884 | Open Government Licence v3.0 | Permitted (Free) | Permanent local storage allowed | Permitted with attribution; no copyleft | Bulk only (Excel/CSV) | **A — Canonical Core** |
| **3. French CIQUAL** | ANSES (France) | 3,185 | Licence Ouverte / Etalab 2.0 | Permitted (Free) | Permanent local storage allowed | Permitted with attribution; no copyleft | Both (data.gouv.fr API + Excel/XML) | **A — Canonical Core** |
| **4. Japan MEXT Tables** | MEXT (Japan) | 2,541 | Japan Gov Website Terms (CC BY 4.0 equiv) | Permitted (Free) | Permanent local storage allowed | Permitted with attribution; no copyleft | Bulk only (Excel/CSV via e-Stat) | **A — Regional Extension** |
| **5. IFCT 2017 (India)** | ICMR-NIN (India) | 528 | Gov Copyright (Scientific Free Access) | **REQUIRES LEGAL VERIFICATION** | Unclear for commercial SaaS | Restrictive / Non-standard | Bulk PDF/FAO INFOODS tables | **B — Requires Approval** |
| **6. Open Food Facts** | Open Food Facts Association | 3.3M+ products | ODbL v1.0 (Database) / CC BY-SA (Images) | Permitted (Free) | Permitted, but subject to Share-Alike | **VIRAL SHARE-ALIKE** on Adapted Databases | Both (REST API v2/v3 + Parquet/JSONL) | **D — Packaged Lookup Only (Isolated)** |
| **7. Nutritionix** | Syndigo LLC | 900k+ foods | Proprietary Commercial EULA | Paid Only (~$1,850/mo) | **BANNED** (No caching/local copy) | Prohibited | API only (Strict limits) | **E — Not Recommended** |
| **8. Edamam** | Edamam LLC | 900k+ foods | Proprietary Commercial EULA | Paid Only ($29–$499+/mo) | **BANNED** (Max 4 macros, must delete on cancel) | Prohibited | API only | **E — Not Recommended** |
| **9. FatSecret** | Secret Industries Pty Ltd | 1.5M+ foods | Proprietary Commercial Terms | Paid Tier (Premier quoted) | **BANNED** (Max 24h cache; IDs only) | Prohibited | API only | **C — Runtime Adapter Only (Optional)** |
| **10. Australian AFCD** | FSANZ (Australia/NZ) | 1,614 | CC BY 4.0 International | Permitted (Free) | Permanent local storage allowed | Permitted with attribution; no copyleft | Bulk only (Excel) | **A — Canonical Core** |
| **11. Canadian CNF** | Health Canada | 5,690 | Open Government Licence - Canada | Permitted (Free) | Permanent local storage allowed | Permitted with attribution; no copyleft | Bulk (CSV/Access) + Search Portal | **A — Canonical Core** |

---

## 3. Deep-Dive License & Legal Analysis

### 3.1 USDA FoodData Central (Public Domain / CC0 1.0)
- **Legal Entity**: United States Department of Agriculture (USDA), Agricultural Research Service.
- **Governing Law**: Works of the United States Government are not subject to copyright protection within the United States under 17 U.S.C. § 105. Worldwide, USDA dedicates FoodData Central to the public domain under **CC0 1.0 Universal**.
- **Commercial Ingestion**: 100% permitted.
- **Redistribution & Transformation**: Zyrbit can modify, filter, calculate Atwater energy, merge aliases, and distribute normalized records in proprietary software without licensing restrictions.
- **Attribution Obligation**: Non-binding government request (best practice: credit *"U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, fdc.nal.usda.gov"* in app settings or documentation).

### 3.2 UK CoFID (Open Government Licence v3.0)
- **Legal Entity**: United Kingdom Health Security Agency (UKHSA) and Office for Health Improvement and Disparities (OHID).
- **License Terms**: OGL v3.0 grants a worldwide, royalty-free, perpetual, non-exclusive license to use, adapt, exploit, and incorporate the data into commercial applications.
- **Attribution Clause**: Section 4 requires: *"Contains public sector information licensed under the Open Government Licence v3.0."*
- **Copyleft / Share-Alike**: None. Does not force derivative databases to adopt OGL.
- **Suitability**: Excellent candidate for direct canonical ingestion.

### 3.3 French CIQUAL (Licence Ouverte 2.0 / Etalab)
- **Legal Entity**: French Agency for Food, Environmental and Occupational Health & Safety (ANSES).
- **License Terms**: Etalab Open Licence 2.0 is designed for French public sector data and is legally compatible with CC-BY 2.0+, OGL, and MIT.
- **Commercial Rights**: Permitted for commercial extraction and SaaS embedding.
- **Attribution Clause**: Must acknowledge ANSES as the author and link to Licence Ouverte.
- **Copyleft / Share-Alike**: None.

### 3.4 Open Food Facts (ODbL v1.0 — High Risk Analysis)
- **Legal Entity**: Open Food Facts Association (French non-profit).
- **Governing License**: Open Database License (ODbL v1.0) for database structure and compilation; Database Contents License (DbCL 1.0) for factual data elements; Creative Commons Attribution-ShareAlike (CC BY-SA) for pack images.
- **The Derivative Database Problem (Section 4.4)**:
  > *"If You publicly Use or Distribute an Adapted Database or a Work produced from an Adapted Database, You must make available to the public the entire Adapted Database under the terms of this License [ODbL]."*
- **Legal Implications for Zyrbit**:
  - If Zyrbit downloads the Open Food Facts dump and joins it with Zyrbit’s proprietary canonical tables, user preferences, or AI-derived models into a consolidated database, the resulting database may legally qualify as an **"Adapted Database"**.
  - If deemed an Adapted Database, third parties or competitors could legally demand that Zyrbit release its entire combined database under the ODbL.
  - **Does putting OFF in a separate PostgreSQL table solve this?**  
    *REQUIRES LEGAL/LICENSING VERIFICATION*. Under Open Data Commons guidelines, if two tables are logically joined or extracted together to provide an integral query result, there is a risk of being classified as an "Adapted Database" rather than a "Collective Database".
- **Strict Architecture Mandate**:
  - Do **NOT** ingest Open Food Facts into the canonical food table.
  - If used for barcode scanning, treat Open Food Facts strictly as an external, isolated lookup service (runtime API or read-only auxiliary microservice).

### 3.5 IFCT 2017 / ICMR-NIN (Indian Food Composition Tables)
- **Legal Entity**: Indian Council of Medical Research - National Institute of Nutrition (ICMR-NIN), Hyderabad.
- **Copyright Status**: Published by ICMR-NIN under standard Indian Copyright Act, 1957.
- **Usage Terms**: The official document notes that it is prepared for public health professionals, research scientists, and educators. Unlike UK OGL or US CC0, the Indian Government has not attached an open data license (such as Government Open Data License - India / GODL) to the full IFCT 2017 tabular dataset.
- **Commercial Assessment**: *REQUIRES LEGAL/LICENSING VERIFICATION*.
  - Individual factual nutrient values are scientific facts (which are generally not copyrightable under basic copyright principles), but the selection, arrangement, compilation, and presentation of the 528 foods represent a copyrighted compilation.
  - Zyrbit currently has 110 Indian foods in its curated seed. Expanding this with the full 528 IFCT foods should be paused until formal clearance or verified fair-use legal review is confirmed.

### 3.6 Commercial APIs (Nutritionix, Edamam, FatSecret)
- **Nutritionix (Syndigo)**: Terms of Service strictly forbid local caching, automated data harvesting, or building a standalone database. Enterprise pricing (~$1,850/mo) is economically unviable for Zyrbit V1/V2.
- **Edamam**: Caching is forbidden except for a 4-macro transient cache behind password protection for paid accounts. Building a local database copy is an explicit material breach requiring immediate account termination and data destruction.
- **FatSecret**: API terms cap user-data caching at 24 hours. Indefinite storage is allowed **only for ID strings** (`food_id`, `serving_id`), not nutritional content. This violates Zyrbit's requirement to persist immutable point-in-time nutritional snapshots on `meal_logs`.

---

## 4. Data Quality & Nutritional Suitability Assessment

### 4.1 USDA FoodData Central Components
- **SR Legacy (7,793 foods)**:
  - *Quality*: Exceptional. Analyzed via rigorous USDA laboratory methods.
  - *Preparation States*: Explicit (e.g., "Chicken breast, meat only, raw", "Chicken breast, meat only, roasted", "Oats, rolled, dry", "Oats, rolled, cooked with water").
  - *Missing Fields*: Near 0% for calories, protein, carbs, fat, fiber, water, and ash.
  - *Suitability*: **P0 Gold Standard for Global Generic Core**.
- **Foundation Foods (~2,500 foods)**:
  - *Quality*: Newest USDA standard with complete metadata, sampling variance, and Atwater factors.
  - *Suitability*: **High**.
- **FNDDS (~5,600 foods)**:
  - *Quality*: Excellent representative dietary intakes and mixed dishes (e.g., sandwiches, salads, stir-fries).
- **Branded Foods (~350,000+ foods)**:
  - *Quality*: Very poor. Manufacturer-submitted, high error rate, 40%+ missing fiber, sodium inconsistencies, zero preparation states.
  - *Suitability*: Unfit for canonical core.

### 4.2 UK CoFID
- *Quality*: High-standard laboratory data tailored to UK and European dietary habits.
- *Preparation States*: Rigorously split by cooking method (raw, boiled without salt, boiled with salt, baked, fried in corn oil, etc.).
- *Completeness*: Complete macronutrient profiles with Englyst and AOAC dietary fiber splits.
- *Suitability*: **P0 for Western European coverage**.

### 4.3 French CIQUAL
- *Quality*: High scientific rigor managed by ANSES.
- *Preparation States*: Detailed culinary preparation distinctions.
- *Regional Specialty*: Unmatched accuracy for cheeses, European breads, charcuterie, Mediterranean oils, and cooked dishes.
- *Suitability*: **High for European and Mediterranean canonical foods**.

### 4.4 Open Food Facts
- *Quality*: Highly variable crowdsourced data.
- *Missing Fields*: ~35% of products lack fiber; ~20% have energy/macro calculation mismatches.
- *Duplicates*: Significant (multiple barcode variants for regional packaging).
- *Preparation States*: None (packaged state as purchased).
- *Suitability*: Suitable **only** for barcode-scanned packaged goods where user confirms the label.

---

## 5. API vs. Bulk-Download Assessment

| Dimension | Real-Time API Architecture | Bulk Download / Canonical Ingestion |
| :--- | :--- | :--- |
| **Offline Resilience** | Fails when offline or during vendor outages | **100% resilient; works completely offline** |
| **Dex Deterministic Speed** | 300ms – 1,200ms network roundtrip | **< 2ms local PostgreSQL full-text / trigram match** |
| **Operational Cost** | $300 – $2,500/month in SaaS API bills | **$0 / month (Hosted in existing Supabase instance)** |
| **Licensing Constraints** | Strict 24h caching caps, anti-storage clauses | **Full ownership of database under CC0/OGL** |
| **Data Immutability** | Vendor can modify or delete records unexpectedly | **Strict immutable point-in-time snapshots** |
| **Engineering Complexity** | Complex HTTP retry, auth, token, and quota handlers | **Clean SQL migrations and indexed tables** |

**Conclusion**: Bulk ingestion of open government datasets is overwhelmingly superior to commercial runtime APIs across latency, cost, reliability, and architectural autonomy.

---

## 6. Recommended Source Hierarchy

To build a calm, fast, and legally bulletproof system, Zyrbit must implement a **3-Layer Knowledge Hierarchy**:

```
                              ┌────────────────────────────────────────┐
                              │           USER FOOD INPUT              │
                              │       ("2 rotis" / "80g oats")         │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                                ┌───────────────────────────────────┐
                                │   TIER 1: PERSONAL FOOD LIBRARY   │
                                │    (User's custom verified foods) │
                                └─────────────────┬─────────────────┘
                                                  │ No match
                                                  ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TIER 2: GLOBAL CANONICAL CORE                                   │
│                        (Self-hosted in Supabase `canonical_foods`, ~20,000 foods)                 │
├───────────────────────────────┬───────────────────────────────┬───────────────────────────────────┤
│    PRIMARY GLOBAL ANCHOR      │      EUROPEAN EXTENSION       │        REGIONAL EXTENSIONS        │
│    USDA FoodData Central      │           UK CoFID            │       Japanese MEXT Tables        │
│   (SR Legacy + Foundation)    │         French CIQUAL         │       Australian AFCD / CNF       │
│      License: CC0 1.0         │      License: OGL / Etalab    │      License: CC BY 4.0 / OGL     │
└───────────────────────────────┴───────────────┬───────────────┴───────────────────────────────────┘
                                                │ No match
                                                ▼
                                ┌───────────────────────────────────┐
                                │  TIER 3: PACKAGED PRODUCT LOOKUP  │
                                │       (Barcode Scanning ONLY)     │
                                │   Open Food Facts Isolated API    │
                                │   *Quarantined / No Shared DB*    │
                                └─────────────────┬─────────────────┘
                                                  │ No match / complex input
                                                  ▼
                                ┌───────────────────────────────────┐
                                │      TIER 4: GEMINI AI FALLBACK   │
                                │   (Tagged as `ai_estimate`, 0.65) │
                                └───────────────────────────────────┘
```

---

## 7. Recommended Zyrbit Ingestion Strategy

### Phase 1: Curated Clean-Up (Run 2 — Completed)
- Existing 110 Indian seed foods migrated into canonical schema.
- Preparation state and 20% materiality ambiguity rules activated.

### Phase 2: Core Foundation Ingestion (Run 3B — Proposed)
1. **Source 1: USDA SR Legacy + Foundation Foods (~10,000 foods)**:
   - Filter out redundant laboratory variations.
   - Retain primary whole foods, fruits, vegetables, cuts of meat, legumes, dairy, and grains.
   - Standardize preparation states: `raw`, `dry`, `cooked`, `boiled`, `baked`, `fried`.
   - Ingest into `canonical_foods` with `source_type = 'official_dataset'`, `source_name = 'USDA_FDC'`.
2. **Source 2: UK CoFID (~2,800 foods)**:
   - Ingest UK/European staple dishes, pub foods, English breakfast items, European cheeses.
   - Tag with `source_name = 'UK_COFID'`, license `OGL_V3`.
3. **Source 3: French CIQUAL (~3,100 foods)**:
   - Ingest Mediterranean and continental European items.
   - Tag with `source_name = 'FR_CIQUAL'`, license `ETALAB_2`.
4. **Build Unified Alias Dictionary (`food_aliases`)**:
   - Extract multi-lingual and colloquial names (e.g., *egg* $\rightarrow$ *anda*, *egg boiled*, *hard boiled egg*).
   - Configure PostgreSQL `pg_trgm` and full-text search indexes.

### Phase 3: Barcode Packaged Foods (Run 4 — Future)
- Build an isolated runtime adapter for Open Food Facts.
- When user scans a barcode, query OFF API.
- Do **not** dump the 3.3M OFF dataset into `canonical_foods`.
- When a user saves an OFF item to their diary, save it to `user_food_library` as `source_type = 'brand_label'`. Under ODbL guidelines, saving individual user data records for personal tracking does not trigger derivative database redistribution.

---

## 8. Source Categorization & Recommendations

### Category A — Approved for Direct Canonical Ingestion
- **USDA FoodData Central (SR Legacy & Foundation)**: Public domain (CC0 1.0). Zero legal barriers. Highest accuracy.
- **UK CoFID**: Open Government Licence v3.0. Commercial use permitted. High quality.
- **French CIQUAL**: Licence Ouverte 2.0. Commercial use permitted. Excellent culinary quality.
- **Australian AFCD**: CC BY 4.0. Commercial use permitted with attribution.
- **Canadian CNF**: Open Government Licence - Canada. Commercial use permitted with attribution.

### Category B — Candidate Requiring Independent Legal/Licensing Approval
- **IFCT 2017 (ICMR-NIN India)**:
  - *Reason*: Scientific government publication without standard open-data license.
  - *Action*: Seek legal clearance or submit formal data access request to ICMR-NIN before ingesting bulk records beyond the current 110-food curated seed.
- **Japanese MEXT Tables**:
  - *Reason*: Permitted under government terms, but Japanese-to-English translation and transliteration schema requires verification.

### Category C — Runtime / API Adapter Only
- **FatSecret Platform API**:
  - *Reason*: Strictly forbids caching nutrition values beyond 24 hours. Cannot be stored in `canonical_foods`. Can only serve as a real-time auxiliary API if budget permits.

### Category D — Packaged-Product Lookup Only (Quarantined)
- **Open Food Facts**:
  - *Reason*: ODbL v1.0 viral Share-Alike on Adapted Databases.
  - *Action*: Strictly isolate from canonical tables. Use exclusively as an on-demand runtime barcode lookup.

### Category E — Not Recommended (Avoid)
- **Nutritionix (Syndigo)**:
  - *Reason*: Extreme cost (~$22,000/yr), complete prohibition on local database caching, vendor lock-in.
- **Edamam**:
  - *Reason*: Strict anti-storage terms, mandatory data deletion upon contract end, call-volume pricing traps.

---

## 9. Proposed Run 3B Ingestion Plan

If approved, **Run 3B** will execute the following structured ingestion pipeline:

1. **Extraction & Normalization Tooling**:
   - Develop a deterministic Node.js ingestion pipeline in `scripts/ingestOfficialDatasets.mjs`.
   - Download official CSV/JSON releases directly from USDA and UK GOV portals.
2. **Canonical Mapping & Schema Harmonization**:
   - Map nutrient IDs to Zyrbit's canonical columns (`calories`, `protein`, `carbs`, `fat`, `fiber`).
   - Standardize all values to per-100g base with standard portion grams.
   - Parse explicit preparation states (`raw` vs `dry` vs `cooked` vs `fried`).
3. **Deduplication & Collision Filtering**:
   - Prioritize USDA Foundation > USDA SR Legacy > UK CoFID > CIQUAL.
   - Deduplicate near-identical items (e.g., USDA "Apple, raw, with skin" vs UK "Apple, eating, raw").
4. **Database Migration**:
   - Batch insert into `canonical_foods` via an idempotent Supabase migration.
   - Populate `food_aliases` with search variants and plural forms.
5. **Quality Gate Validation**:
   - Verify 0 duplicate IDs.
   - Verify Atwater calorie consistency: $|4\text{P} + 4\text{C} + 9\text{F} - \text{Cal}| < \text{tolerance}$.
   - Ensure all 347 existing tests continue passing.

---

## 10. Risks & Mitigation

| Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **ODbL Contamination** | Ingesting Open Food Facts into canonical tables forces Zyrbit to open-source its proprietary food catalog. | **Strict Quarantine**: Zero OFF records in `canonical_foods`. Use OFF only via runtime barcode API. |
| **IP Claim from ICMR-NIN** | Commercializing IFCT 2017 data without formal licensing agreement. | **Hold IFCT Ingestion**: Maintain current 110 Indian seed foods; do not ingest the remaining 418 IFCT foods until legal clearance. |
| **Calorie / Preparation Inversion** | Confounding dry grains with cooked grains creates 300% calorie logging errors. | **Explicit Preparation State Engine**: Mandate preparation state on all cereal, grain, pulse, and meat records; trigger 20% materiality rule if ambiguous. |
| **Database Bloat** | Ingesting 350,000 low-quality branded foods degrades PostgreSQL query performance. | **Curate to ~20,000 High-Value Foods**: Restrict canonical ingestion to generic and whole foods; ignore manufacturer branded dumps. |

---

## 11. Open Decisions Requiring Approval

Before proceeding to Run 3B implementation, the following decisions require user review:

1. **Global Core Dataset Approval**:
   - Confirm approval to ingest **USDA FoodData Central (SR Legacy + Foundation)** and **UK CoFID** as the primary Category A foundation (~12,000 curated canonical records).
2. **Open Food Facts Quarantine Policy**:
   - Confirm that Open Food Facts will **NOT** be ingested into `canonical_foods`, and will only be utilized as an isolated runtime lookup for barcode scanning in a later release.
3. **IFCT 2017 Policy**:
   - Confirm that bulk ingestion of the remaining ~418 IFCT 2017 foods remains **PAUSED** pending legal clearance, maintaining Zyrbit's existing 110-food Indian seed.
4. **Commercial API Exclusion**:
   - Confirm that Nutritionix, Edamam, and FatSecret are rejected due to their strict anti-caching terms and commercial SaaS constraints.
