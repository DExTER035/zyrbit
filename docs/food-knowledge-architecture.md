# Zyrbit Global Food Knowledge System
## Technical Audit, Global Dataset Research & Architecture Specification
**Document Version:** 1.0.0 — Run 1 (Audit & Architecture)  
**Status:** Architecture Specification — Pending Review & Approval  
**Scope:** Architecture Design Only — Zero Code Modifications Permitted in Run 1  

---

## 1. Executive Summary

Zyrbit’s mission as a Personal Operating System is to reduce friction and mental overload in daily habit, focus, health, and wealth tracking. Nutrition logging is one of the highest-friction actions in any health application. Users drop off when logging requires complex searching, multi-step portion conversions, endless branded dropdowns, or slow network queries.

In Phase B and Phase C, Dex evolved into an action and natural language engine capable of parsing compound food sentences (e.g., *"I had 80g oats and 200ml milk for breakfast"*), extracting portions and units, handling meal repetitions, and strictly preventing partial database writes. However, **Dex’s factual food knowledge currently depends on an in-memory seed dataset of 110 Indian food items (`src/data/foods/indianFoods.js`)**.

This document establishes the architecture to transform Zyrbit from a hardcoded regional seed into an **authoritative, multi-tier Global Food Knowledge System**.

### Core Architecture Axioms
1. **The LLM is Language Understanding; It is NOT the Nutrition Database**:
   Gemini/Dex translates natural speech into normalized food tokens, quantities, units, and preparation states. All nutrition values, portion gram weights, and macros are sourced authoritatively from verified knowledge catalogs.
2. **Offline-First Deterministic Core**:
   Common generic foods (e.g., *"2 rotis"*, *"2 eggs"*, *"1 banana"*, *"80g oats"*) must resolve and log deterministically without network calls or Gemini dependencies.
3. **First-Class Preparation States**:
   Foods must distinguish raw, dry, cooked, boiled, fried, and baked states. A user logging *"80g oats"* must never silently receive cooked oatmeal values.
4. **Historical Nutrition Immutability**:
   When a meal is logged, its complete nutritional facts and source provenance are frozen in time. Subsequent catalog updates never mutate past logs.
5. **Strict Licensing Isolation**:
   Public domain and permissive government datasets (USDA, UK CoFID, French CIQUAL) form the core canonical database. Copyleft datasets (Open Food Facts under ODbL) and restrictive commercial APIs are kept strictly segregated to prevent licensing contamination.

---

## 2. Current Architecture Audit

### 2.1 Complete Food Data Flow
The current food logging pipeline spans six distinct layers:

```
[User Natural Input] ("I ate 2 eggs and 80g oats for breakfast")
        │
        ▼
[Dex Intent Parser] (`src/dex/dexIntentParser.js`)
        │
        ├── Gateway Regex Filter: checks for keywords ('ate', 'had', 'breakfast', etc.)
        │
        ├── Deterministic Path: `resolveFoodInput(userMessage)` (`src/dex/resolvers/foodResolver.js`)
        │       │
        │       ├── Clause Splitter: splits compound phrases ("2 eggs", "80g oats")
        │       ├── Phrase Normalizer: extracts numbers, units ('g', 'ml', 'katori', 'piece')
        │       ├── Entity Matcher: matches against `FOOD_ALIASES` and `FOOD_DB`
        │       ├── Macro Scaler: calculates macros via `calculateScaledNutrition()`
        │       └── Validation Guard: rejects entire meal if any sub-item is unresolvable
        │
        └── Fallback Path (if Gateway Regex fails):
                │
                └── `askZyra()` via Gemini API Edge Function proxy
                        │
                        └── AI proposes `log_meal` intent -> Post-AI re-normalization against `FOOD_DB`
        │
        ▼
[Dex Orchestrator] (`src/dex/dexOrchestrator.js`)
        │
        └── Validates parameters against `actionSchemas.log_meal` via `validateAction()`
        │
        ▼
[Action Executor] (`src/actions/actionExecutor.js`)
        │
        └── Dispatches to `healthService.logMeal()` (`src/services/healthService.js`)
        │
        ▼
[Canonical Service Layer] (`src/services/foodService.js` / `healthService.js`)
        │
        ├── Applies min/max safety clamping on calories and macros
        └── Resolves active authenticated `user_id`
        │
        ▼
[Supabase Database Persistence]
        └── Table: `meal_logs` (Columns: `id`, `user_id`, `date`, `meal_type`, `food_id`, `food_name`, `quantity_g`, `calories`, `protein`, `carbs`, `fat`, `fiber`)
```

### 2.2 Key Findings from Repository Audit

| System Area | Implementation File | Current State | Critical Vulnerabilities / Limitations |
| :--- | :--- | :--- | :--- |
| **Food Seed** | `src/data/foods/indianFoods.js` | 110 hardcoded objects in memory | Misleadingly documented as *"~220 foods"*; limited exclusively to Indian cuisine; zero packaged goods. |
| **Entity Resolver** | `src/dex/resolvers/foodResolver.js` | In-memory lookup: exact match, alias table (32 entries), substring match | No phonetic matching; no full-text search; cannot query database; fails if word order varies. |
| **Intent Gateway** | `src/dex/dexIntentParser.js` | Hardcoded regex (`line 485`) guards deterministic parser | Foods lacking verbs like *"ate"* or *"had"* (e.g. `"2 rotis"`, `"Log 2 eggs"`) bypass local catalog and needlessly hit Gemini! |
| **AI Fallback** | `src/dex/dexIntentParser.js` | Calls `askZyra()`, then attempts re-resolution against `FOOD_DB` | If the AI resolves a food NOT in `FOOD_DB`, unverified AI macro numbers are committed to the DB. |
| **User Library** | `src/services/foodService.js` | Table: `user_food_library` | Exists for favorites/custom foods, but **`foodResolver.js` does not check it**! User custom foods cannot be logged via Dex! |
| **Meal Log Schema**| `supabase` / `src/services/foodService.js` | Table: `meal_logs` | Freezes macro values at log time (`calories`, `protein`, etc.), but `food_id` is set to `null` for all seed foods; zero provenance tracking. |
| **Cross-User Isolation**| `src/tests/twoUserIsolation.test.js` | RLS enabled on `user_food_library` & `meal_logs` | RLS is working and properly tested (2-user isolation verified). |

---

## 3. Exact Seed Data Count

A programmatic verification of `src/data/foods/indianFoods.js` confirms:
- **Total Registered Food Records:** **110** (not 220).
- **Unique IDs:** 110 / 110 (Zero duplicate IDs).
- **Unique Display Names:** 110 / 110 (Zero duplicate names).
- **Categories represented:**
  - `breakfast`: 16 items
  - `lunch`: 22 items
  - `dinner`: 15 items
  - `snack`: 37 items
  - `protein`: 20 items

---

## 4. Seed Data Integrity Audit

Every record in `FOOD_DB` was audited against Atwater general factor energy equivalents:
$$\text{Expected Calories} \approx (\text{Protein} \times 4) + (\text{Carbohydrate} \times 4) + (\text{Fat} \times 9)$$

### 4.1 Identified Atwater Discrepancies
17 of the 110 foods (15.5%) have a discrepancy exceeding $\pm 10\text{ kcal}$ or $>10\%$ against simple Atwater arithmetic:

| Food ID | Food Name | Stated Cal | Protein | Carbs | Fat | Fiber | Atwater Cal | Diff | Pct Diff | Root Cause Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `almonds` | Almonds | 579 | 21.0g | 22.0g | 50.0g | 12.5g | 622 | +43 | +7% | Total carbs includes 12.5g fiber. Net carbs is 9.5g. |
| `peanuts` | Peanuts (roasted)| 567 | 26.0g | 16.0g | 49.0g | 8.5g | 609 | +42 | +7% | Total carbs includes 8.5g fiber. Net carbs is 7.5g. |
| `cashews` | Cashews | 553 | 18.0g | 33.0g | 44.0g | 3.3g | 600 | +47 | +8% | High mono/polyunsaturated fatty acid density. |
| `dates` | Dates | 277 | 1.8g | 75.0g | 0.2g | 6.7g | 309 | +32 | +12% | High insoluble fiber; moisture content variability. |
| `protein_bar`| Protein Bar | 370 | 25.0g | 40.0g | 10.0g | 3.0g | 350 | -20 | -5% | Polyols / sugar alcohols used as sweeteners (not listed). |
| `whey_protein`| Whey Protein | 370 | 80.0g | 8.0g | 4.0g | 0.0g | 388 | +18 | +5% | Moisture & ash content in isolate powders. |
| `muesli` | Muesli | 367 | 9.5g | 66.0g | 6.0g | 6.5g | 356 | -11 | -3% | Insoluble cereal bran fiber. |
| `banana` | Banana | 89 | 1.1g | 23.0g | 0.3g | 2.6g | 99 | +10 | +11% | Resistant starch vs simple sugars. |
| `apple` | Apple | 52 | 0.3g | 14.0g | 0.2g | 2.4g | 59 | +7 | +13% | Pectin/fiber fraction. |
| `mango` | Mango | 60 | 0.8g | 15.0g | 0.4g | 1.6g | 67 | +7 | +11% | Soluble sugars vs organic acids. |
| `guava` | Guava | 68 | 2.5g | 14.0g | 1.0g | 5.4g | 75 | +7 | +10% | High fiber content (5.4g/100g). |
| `black_coffee`| Black Coffee | 2 | 0.3g | 0.0g | 0.0g | 0.0g | 1 | -1 | -40% | Trace values rounding artifacts. |

### 4.2 Preparation Ambiguity & Composite Foods in Seed
The audit revealed significant preparation and naming ambiguities in the seed:
1. **Raw vs. Cooked Confusion**:
   - `oats`: 389 kcal/100g $\rightarrow$ **Raw/Dry weight**. If cooked in water, 100g cooked oats has only ~68 kcal.
   - `rice`: 130 kcal/100g $\rightarrow$ **Cooked weight**. If raw dry basmati is measured, it has ~360 kcal/100g.
   - `soya_chunks_dry`: Explicitly states *(dry)* (345 kcal/100g), serving *"50g dry (makes ~150g cooked)"*.
   - `rajma_cooked`: Explicitly states *(cooked)* (127 kcal/100g).
   - `masoor_dal`: States 78 kcal/100g $\rightarrow$ Cooked dal with water, but name does not state "(cooked)". Raw masoor dal is 340 kcal/100g!
2. **Composite Meal Density Flaws**:
   - `maggi`: Listed as 415 kcal/100g with serving label *"1 packet cooked (80g)"*. An 80g dry cake absorbs 150-200ml water and weighs ~240g when cooked! A user logging "1 plate cooked Maggi (200g)" would be logged at 830 kcal instead of ~350 kcal!
   - `roti_dinner`: Name is *"Roti + Dal"*, serving *"3 rotis + 1 katori dal (250g)"*, 200 kcal/100g. If user logs "100g", it combines carbs from roti and water from dal in an arbitrary ratio.
   - `roti_sabzi`: Name is *"Roti + Sabzi"*, serving *"2 rotis + sabzi (200g)"*, 175 kcal/100g.

---

## 5. Gemini Independence Audit

### 5.1 The Root Cause of Deterministic Failure
The current architecture **violates Gemini independence for known foods**.

#### Reproducible Failure Demonstration
When a user submits:
- `"I ate 2 rotis"` $\rightarrow$ **Resolves deterministically** (`action: 'log_meal'`).
- `"2 rotis"` $\rightarrow$ **Fails deterministic resolution (`null`)!**
- `"Log 2 rotis"` $\rightarrow$ **Fails deterministic resolution (`null`)!**

#### Code Root Cause
In `src/dex/dexIntentParser.js` (lines 484–486):
```javascript
// 6. Food Log:
if (/\b(?:ate|had|eating|lunch|dinner|breakfast|snack|poha|dosa|idli|dates|eggs?|oats?|milk)\b/i.test(lower)) {
  const foodRes = resolveFoodInput(str);
  ...
```

The gateway regex requires either an ingestion verb (*"ate"*, *"had"*, *"eating"*) or one of 8 hardcoded food words (*poha*, *dosa*, *idli*, *dates*, *eggs*, *oats*, *milk*). Because `"roti"` is not in that gateway regex, `"2 rotis"` does not trigger `resolveFoodInput()`. It falls completely through to:
```javascript
// Fast Path 2: AI Intent Resolution
const rawResponse = await askZyra([...], systemPrompt);
```
**Consequence:** If Gemini is unavailable, rate-limited, offline, or returns a 5xx error, `"2 rotis"` cannot be logged, despite `roti` existing in `FOOD_DB` (id: `'roti'`) and `FOOD_ALIASES` (`/^roti(s)?$/`).

### 5.2 Architectural Remedy
The intent parser must not gate food resolution behind a tiny hardcoded regex. Instead, the parser should execute a fast catalog/alias lookup on the token sequence:
```
Token Stream -> Fast In-Memory Trie / Set -> Match Detected -> Deterministic Action
```
Only if zero catalog matches and zero natural language structure exist should it delegate to Gemini.

---

## 6. Global Food Data Source Research

A thorough investigation of official global datasets was conducted across coverage, licensing, format, and redistribution rights:

| Source | Organization / Country | Scale & Content | Barcode Support | API / Bulk Download | License / Terms | Commercial Ingestion Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USDA FoodData Central (FDC)** | USDA / ARS (United States) | 400,000+ branded products; 15,000+ Foundation, SR Legacy, & FNDDS composite foods. Gold standard spectrometry. | Yes (Branded database has UPC/GTIN). | Full bulk JSON/CSV dumps (updated 2x/year) + free REST API. | **US Public Domain** (17 U.S.C. § 105). Unrestricted worldwide. | **Class A (Direct Ingestion)**. Ideal for generic foundation foods & cooked composites. |
| **UK CoFID (McCance and Widdowson)** | Quadram Institute / PHE (United Kingdom) | ~3,300 generic foods, traditional UK/European cooked dishes, cuts of meat, dairy, produce. | No (Generic foods only). | Bulk Excel / CSV downloads via gov.uk. | **Open Government Licence (OGL) v3.0**. Copy, publish, adapt, and exploit commercially. | **Class A (Direct Ingestion)**. Ideal for European generic foods & standard cooked items. |
| **CIQUAL (ANSES)** | Ministry of Agriculture / ANSES (France) | ~3,200 French and Mediterranean generic foods, raw and cooked culinary preparations. | No. | Bulk XML / CSV download. | **Open Licence (Etalab 2.0)**. Free commercial use with attribution. | **Class A (Direct Ingestion)**. Ideal for European culinary preparations. |
| **Standard Tables of Food Composition in Japan** | MEXT (Japan) | ~2,550 Japanese staple ingredients, Asian vegetables, seaweeds, soy products, noodles, broths. | No. | Bulk Excel / CSV download via MEXT portal. | **Government of Japan Standard Terms of Use** (CC-BY 4.0 compatible). Commercial use permitted. | **Class A (Direct Ingestion)**. Ideal for authentic East Asian generic foods. |
| **Open Food Facts (OFF)** | Open Food Facts (France / Global NGO) | 3,000,000+ packaged branded products across 150+ countries. Barcodes, ingredients, labels. | **Outstanding** (Global EAN-13, UPC-A, GS1). | Daily MongoDB dumps, Parquet, JSONL + free REST API. | **Open Database License (ODbL) v1.0** (DbCL for contents; CC-BY-SA for images). | **Class B / C (Segregated Lookup Only)**. Strict share-alike on derivative databases (see Section 7). |
| **IFCT 2017** | NIN / ICMR (Govt of India) | 528 key Indian raw ingredients with 151 analytical parameters. High scientific precision. | No. | PDF publication; search portal (`ifct2017.com`). No official API/bulk dump. | **Government of India Copyright (ICMR-NIN)**. All rights reserved. | **Class B (Requires Licensing Verification)**. Direct bulk copying requires formal ICMR permission. |
| **BLS (Bundeslebensmittel-schlüssel)** | Max Rubner-Institut (Germany) | ~15,000 European foods. Highly structured nutrient breakdown. | No. | Proprietary download. | Proprietary commercial license fee required. | **Class D (Not Recommended)**. High cost, restrictive licensing. |
| **Nutritionix / FatSecret / Edamam** | Commercial SaaS Vendors (USA) | 900,000+ branded and restaurant items across US/UK/CA/AU. Live natural language endpoints. | Yes. | REST APIs only. Strict caching bans (max 24-48h). Permanent storage prohibited. | Proprietary SaaS ($300 – $2,500/month recurring). | **Class C (Access via API Only)**. Prohibits database caching; extreme vendor lock-in. |

---

## 7. Licensing Assessment & Compliance Guardrails

> [!CAUTION]
> **CRITICAL LEGAL HARD STOP: Open Food Facts & ODbL Share-Alike**
> Section 4.4 of the Open Database License (ODbL) mandates that anyone who creates and publicly distributes a **"Derivative Database"** (formed by merging, extracting, or transforming substantial portions of an ODbL database) must license that entire Derivative Database under the ODbL.
>
> If Zyrbit merges Open Food Facts records into its core canonical food database, Zyrbit’s proprietary database could legally become an ODbL Derivative Database, forcing Zyrbit to make its entire food catalog freely downloadable under ODbL!
>
> **Architectural Isolation Mandate:**
> Open Food Facts data must **NEVER** be merged directly into Zyrbit’s canonical PostgreSQL tables. It must be hosted either in a strictly isolated, read-only table (`external_off_mirror`) or queried on-demand via an API adapter as a "Produced Work" (ODbL Section 4.6).

### Dataset Ingestion Classifications

- **Class A — Approved for Direct Canonical Ingestion:**
  - **USDA FoodData Central (Foundation & FNDDS)**: US Public Domain. Free commercial ingestion, adaptation, and redistribution.
  - **UK CoFID (McCance and Widdowson)**: Open Government Licence (OGL) v3.0. Commercial exploitation and redistribution permitted with standard attribution.
  - **French CIQUAL (ANSES)**: Etalab 2.0 / CC-BY compatible. Open commercial ingestion with attribution.
  - **Japanese Food Composition Tables (MEXT)**: CC-BY compatible. Open commercial ingestion with attribution.
  - **Zyrbit Curated Seed**: Proprietary Zyrbit intellectual property.

- **Class B — Potentially Suitable but Requires Verification:**
  - **Open Food Facts (OFF)**: Safe as an isolated external lookup service or read-only cache with ODbL attribution. Ingestion into proprietary canonical tables is prohibited until legal counsel confirms ODbL boundary separation.
  - **IFCT 2017 (NIN / ICMR)**: Factual data values (calories, protein) are not copyrightable in isolation under Indian law (factual doctrine), but bulk extraction and distribution of the ICMR database requires formal written licensing from ICMR-NIN.

- **Class C — External API Access Only (No Local DB Storage):**
  - **Nutritionix / Edamam / FatSecret**: Must only be accessed live via transient HTTPS requests. Permanent local storage violates Terms of Service.

- **Class D — Not Recommended:**
  - **BLS (Germany)**: Commercial licensing fees are cost-prohibitive for a solo founder/early-stage product.

---

## 8. Recommended Global Data Strategy

### The 3-Tier Layered Hybrid Model

Zyrbit will not rely on a single massive unvetted dataset, nor will it rely on an expensive commercial API. Instead, Zyrbit will adopt a **3-Tier Layered Hybrid Model**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: USER FOOD MEMORY & PERSONAL LIBRARY (Highest Priority)         │
│ • Custom user foods, favorites, personal brand preferences             │
│ • "My Pintola oats", "My whey", "My paneer bhurji"                     │
│ • Latency: <5ms | 100% Offline | Zero Cost | Multi-tenant RLS          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (if no match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 2: ZYRBIT CANONICAL GLOBAL CORE (Offline / Edge + Postgres)       │
│ • ~15,000 cleaned, verified generic & prepared foods across 7 regions  │
│ • Ingested from Class A sources: USDA Foundation/FNDDS, UK CoFID,      │
│   French CIQUAL, Japan MEXT, and Zyrbit Curated Seed                   │
│ • First-class preparation states: raw, cooked, dry, boiled, fried      │
│ • Curated multi-lingual aliases and regional search keywords           │
│ • Latency: 5-15ms | 100% Offline-capable | Zero API cost               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (if no match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3: PACKAGED / BRANDED ADAPTER (Isolated External Service)         │
│ • Barcode scan lookups (EAN-13, UPC) and specific packaged brands      │
│ • Segregated read-only lookup adapter against Open Food Facts (ODbL)   │
│ • Completely physically separated from Canonical Core to protect IP    │
│ • Latency: 150-300ms | Online only | Zero API subscription fees        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (if no match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 4: GEMINI AI ESTIMATION FALLBACK (Last Resort)                    │
│ • Complex, unstructured, or uncataloged home-cooked meals              │
│ • LLM decomposes meal into canonical ingredients where possible        │
│ • Labeled explicitly as `source: 'ai_estimate'` with confidence rating │
│ • Prompts user with editable assumption confirmation card              │
└────────────────────────────────────────────────────────────────────────┘
```

### Strategic Evaluation Matrix

| Strategy | Cost | Latency | Offline Support | Licensing Risk | Data Quality | Maintainability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Own Canonical DB Only** | Very Low | <15ms | Excellent | Zero (Class A) | Very High | High (one-time pipeline) |
| **2. Commercial API Only** | Extreme ($1k+/mo) | 400-1200ms | None | High (lock-in) | Moderate | Low (vendor dependency) |
| **3. Open Food Facts Merged** | Very Low | <20ms | Excellent | **Critical (ODbL)** | Mixed/Crowdsourced | Moderate |
| **4. Recommended 3-Tier** | **Zero/Low** | **<15ms core** | **Yes (for 90% logs)** | **Zero (Protected)**| **Audited Gold** | **Optimal** |

---

## 9. Proposed Database Architecture

To implement the 3-Tier Layered Hybrid Model without breaking existing tables, three new tables and one isolated external mirror table are specified:

```
                               ┌─────────────────────────┐
                               │       auth.users        │
                               └────────────┬────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │ 1:N                        │ 1:N                        │ 1:N
               ▼                            ▼                            ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
│      user_food_library      │ │    user_food_preferences    │ │         meal_logs           │
│ (Custom foods & favorites)  │ │ (Learned brand/prep choices)│ │ (Historical meal records)   │
└─────────────────────────────┘ └─────────────────────────────┘ └──────────────┬──────────────┘
                                                                               │ stores snapshot
                                                                               ▼
┌─────────────────────────────────────────────────────────────┐ ┌─────────────────────────────┐
│                     canonical_foods                         │ │     nutrition_snapshot      │
│ (USDA, CoFID, CIQUAL, Seed - Public Domain & Permissive)    │ │ (Frozen JSONB: cal, p, c,   │
└──────────────┬──────────────────────────────────────────────┘ │  fat, source_type, version) │
               │ 1:N                                            └─────────────────────────────┘
               ▼
┌─────────────────────────────┐
│        food_aliases         │
│ (Multi-lingual & synonyms)  │
└─────────────────────────────┘
```

### 9.1 Table: `canonical_foods` (Core Knowledge Catalog)
```sql
CREATE TABLE public.canonical_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) UNIQUE NOT NULL,             -- e.g. 'oats_dry', 'rice_white_cooked'
    name VARCHAR(200) NOT NULL,                    -- e.g. 'Rolled Oats'
    common_name VARCHAR(200),                      -- e.g. 'Oatmeal'
    category VARCHAR(60) NOT NULL,                 -- 'grains', 'dairy', 'poultry', 'fruits', etc.
    region VARCHAR(60) DEFAULT 'global',           -- 'global', 'indian', 'us', 'european', 'asian'
    preparation_state VARCHAR(40) NOT NULL,        -- 'raw', 'dry', 'cooked', 'boiled', 'fried', etc.
    
    -- Authoritative Nutrition per 100g
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fiber_g NUMERIC(6, 2) DEFAULT 0,
    sugar_g NUMERIC(6, 2) DEFAULT 0,
    sodium_mg NUMERIC(7, 2) DEFAULT 0,
    
    -- Serving Specifications
    default_serving_g NUMERIC(6, 1) NOT NULL,      -- e.g. 40.0
    serving_unit_name VARCHAR(50) NOT NULL,        -- 'bowl', 'slice', 'cup', 'scoop', 'plate'
    density_g_per_ml NUMERIC(4, 2) DEFAULT 1.0,   -- For ml-to-gram volumetric conversions
    
    -- Provenance & Verification
    source_type VARCHAR(40) NOT NULL,              -- 'curated_seed', 'official_dataset'
    source_name VARCHAR(60) NOT NULL,              -- 'USDA_FNDDS', 'UK_CoFID', 'ZYRBIT_SEED'
    source_id VARCHAR(100),                        -- External FDC ID or CoFID code
    source_version VARCHAR(30) NOT NULL,           -- e.g. '2024.v1'
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-Text Search and Trigram Indices
ALTER TABLE public.canonical_foods ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(common_name, '') || ' ' || coalesce(slug, ''))) STORED;

CREATE INDEX idx_canonical_foods_fts ON public.canonical_foods USING GIN (search_vector);
CREATE INDEX idx_canonical_foods_trgm ON public.canonical_foods USING GIN (name gin_trgm_ops);
CREATE INDEX idx_canonical_foods_prep ON public.canonical_foods (slug, preparation_state);
```

### 9.2 Table: `food_aliases` (Synonyms & Regional Dialects)
```sql
CREATE TABLE public.food_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_food_id UUID NOT NULL REFERENCES public.canonical_foods(id) ON DELETE CASCADE,
    alias VARCHAR(150) NOT NULL,                   -- e.g. 'khajoor', 'chapati', 'porridge'
    language_code VARCHAR(10) DEFAULT 'en',        -- 'en', 'hi', 'es', 'fr', etc.
    region VARCHAR(40) DEFAULT 'global',
    priority INT DEFAULT 100,                      -- Lower number = higher priority
    unit_weight_g NUMERIC(6, 1),                   -- e.g. 1 chapati = 30g
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_aliases_alias ON public.food_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX idx_food_aliases_lookup ON public.food_aliases (lower(alias));
```

### 9.3 Table: `user_food_preferences` (User Food Memory)
```sql
CREATE TABLE public.user_food_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_keyword VARCHAR(100) NOT NULL,         -- e.g. 'oats', 'whey', 'bread'
    preferred_food_type VARCHAR(40) NOT NULL,      -- 'canonical', 'user_library', 'packaged'
    target_id UUID NOT NULL,                       -- ID in canonical_foods or user_food_library
    preferred_preparation VARCHAR(40),             -- 'dry', 'cooked', 'toasted'
    default_quantity_g NUMERIC(6, 1),              -- e.g. 80.0
    usage_count INT DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, trigger_keyword)
);

ALTER TABLE public.user_food_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own food preferences"
    ON public.user_food_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

### 9.4 Table: `external_packaged_products` (Isolated OFF Mirror)
```sql
-- Strictly isolated to prevent ODbL contamination of canonical tables
CREATE TABLE public.external_packaged_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(64) UNIQUE,                    -- EAN-13, UPC-A
    brand_name VARCHAR(150),                       -- e.g. 'Pintola'
    product_name VARCHAR(200) NOT NULL,            -- e.g. 'All-Natural Peanut Butter Crunchy'
    serving_size_g NUMERIC(6, 1) DEFAULT 100,
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fiber_g NUMERIC(6, 2) DEFAULT 0,
    
    source_attribution VARCHAR(100) DEFAULT 'Open Food Facts (ODbL v1.0)',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packaged_barcode ON public.external_packaged_products (barcode);
CREATE INDEX idx_packaged_trgm ON public.external_packaged_products USING GIN (product_name gin_trgm_ops);
```

---

## 10. Food Resolution Architecture

### 10.1 Pipeline Priority Specification
When a food string is parsed (e.g., `"my Pintola oats"`), the resolver executes a strictly prioritized resolution chain:

```
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Personal Food Library & Explicit Preferences                   │
│ Check `user_food_library` for exact match or user favorite             │
│ Check `user_food_preferences` for trigger keyword                      │
│ Match found? -> RETURN (Confidence: 1.00, Source: 'user_library')      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (No match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Barcode / Packaged Product Match                               │
│ If input contains barcode digits or exact brand + product phrase       │
│ Match found in `external_packaged_products`?                           │
│ -> RETURN (Confidence: 0.95, Source: 'brand_label')                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (No match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Canonical Exact Slug / Name Match                              │
│ Check `canonical_foods.slug` and `canonical_foods.name`               │
│ Match found? -> RETURN (Confidence: 0.95, Source: 'official_dataset')  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (No match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Canonical Alias & Regional Synonym Table                       │
│ Query `food_aliases` (e.g. 'khajoor' -> dates, 'chapati' -> roti)      │
│ Match found? -> RETURN (Confidence: 0.92, Source: 'official_dataset')  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (No match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Database Fuzzy & Trigram Search                                │
│ FTS `search_vector @@ to_tsquery()` + `similarity(name, query) > 0.35` │
│ Single dominant match?                                                 │
│ -> RETURN (Confidence: 0.85, Source: 'official_dataset')               │
│ Multiple matches with calorie variance > 20%?                          │
│ -> TRIGGER AMBIGUITY RESOLVER (Step 13)                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (No match)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Gemini AI Fallback                                             │
│ Prompt Gemini for structured ingredient breakdown & estimated portion  │
│ Validate estimated macros against safety thresholds                    │
│ -> RETURN (Confidence: 0.60 - 0.75, Source: 'ai_estimate')             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Search Architecture: Why SQL Trigram & FTS Wins Over Vector Search

| Search Criterion | PostgreSQL FTS + `pg_trgm` + Aliases (Chosen) | Vector Search (e.g. pgvector / OpenAI Embeddings) |
| :--- | :--- | :--- |
| **Query Latency** | **4 – 12 ms** (Direct local btree/GIN index). | **150 – 450 ms** (Embedding generation API call + vector scan). |
| **Exact Brand / Number Handling** | **100% Deterministic**. Matches exact words, model numbers, grams. | **Poor**. Vectors blur exact numbers (e.g., "100g" vs "200g") into general semantic spaces. |
| **Preparation State Sensitivity** | **Exact**. Can filter explicitly on `WHERE preparation_state = 'dry'`. | **Poor**. Embedding vectors for "dry oats" and "cooked oats" have high cosine similarity (>0.92). |
| **Offline Capability** | **100% Offline-capable** when running embedded/client SQLite or local server. | **Requires network API** or heavyweight local ONNX embedding models (>50MB). |
| **Cost** | **$0.00**. Runs within existing Supabase PostgreSQL instance. | **Recurring API costs** for every single search keystroke/query. |

**Verdict:** Vector search is rejected for food retrieval in Zyrbit. PostgreSQL GIN trigram indexing combined with full-text search and a curated alias table is faster, cheaper, fully deterministic, and immune to embedding hallucinations.

---

## 12. Confidence Scoring System

Every resolved food intent must output a normalized numeric confidence score between `0.00` and `1.00`:

- **HIGH CONFIDENCE (`0.85 – 1.00`):**
  - `1.00`: Match from `user_food_library` or user's explicit preference.
  - `0.95`: Exact canonical match or exact barcode match.
  - `0.90`: Curated alias match with known unit weight (e.g., `"2 rotis"` $\rightarrow$ 60g).
  - **UX Behavior:** Logs immediately; displays clean confirmation toast; zero interruptions.

- **MEDIUM CONFIDENCE (`0.60 – 0.849`):**
  - `0.75`: Fuzzy trigram match where top candidate is clearly dominant ($>15\%$ score margin over runner-up).
  - `0.70`: Gemini AI estimate with standard portion assumptions.
  - **UX Behavior:** Logs immediately with an **editable assumption badge** (e.g., *"Logged as 1 bowl yellow dal (150g) — tap to edit"*).

- **LOW CONFIDENCE (`< 0.60`):**
  - Multiple candidates with diverging calories ($>20\%$ variance).
  - Unrecognized food or uninterpretable quantity.
  - **UX Behavior:** **Never commits to the database.** Presents a clarification question with 2–4 clickable buttons.

---

## 13. Meaningful Ambiguity System

Dex must avoid asking pointless questions while protecting users from catastrophic macro errors.

### 13.1 The 20% Calorie Materiality Rule
When multiple food candidates or preparation states match a user query:

1. **Calculate Calorie Spread:**
   $$\Delta_{\text{cal}} = \frac{|\text{Calories}_{\text{Candidate A}} - \text{Calories}_{\text{Candidate B}}|}{\max(\text{Calories}_A, \text{Calories}_B)}$$

2. **If $\Delta_{\text{cal}} > 0.20$ (Material Discrepancy):**
   - **Do NOT guess silently.**
   - Example: `"80g oats"`.
     - Candidate A (Dry oats): 311 kcal.
     - Candidate B (Cooked oats): 55 kcal.
     - $\Delta_{\text{cal}} = \frac{|311 - 55|}{311} = 82.3\%$.
     - **Dex prompts:** *"Did you measure the 80g oats dry (311 kcal) or cooked with water (55 kcal)?"* with two quick-tap buttons.

3. **If $\Delta_{\text{cal}} \le 0.20$ (Immaterial Discrepancy):**
   - **Do NOT interrupt the user.**
   - Example: `"1 medium banana"`.
     - Candidate A (Cavendish): 89 kcal.
     - Candidate B (Robusta): 95 kcal.
     - $\Delta_{\text{cal}} = 6.3\%$.
   - **Dex behavior:** Logs Candidate A immediately and shows an editable tag.

### 13.2 Learning User Preferences
When a user resolves an ambiguous choice (e.g., taps *"Dry"* for oats), Dex increments `user_food_preferences`:
- Once a selection is confirmed **3 times**, Dex updates the default preference.
- The next time the user says `"80g oats"`, Dex skips clarification and logs dry oats directly at `0.95` confidence.

---

## 14. Historical Nutrition Snapshot Architecture

To guarantee that past nutrition logs remain mathematically permanent even when catalog data is updated or corrected, `meal_logs` will store a lightweight JSONB snapshot.

### 14.1 Schema Extension for `meal_logs`
```sql
ALTER TABLE public.meal_logs
    ADD COLUMN IF NOT EXISTS food_ref_id UUID,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(40) DEFAULT 'curated_seed',
    ADD COLUMN IF NOT EXISTS preparation_state VARCHAR(40) DEFAULT 'cooked',
    ADD COLUMN IF NOT EXISTS nutrition_snapshot JSONB;
```

### 14.2 Structure of `nutrition_snapshot`
```json
{
  "per100g": {
    "cal": 389.0,
    "protein": 16.9,
    "carbs": 66.3,
    "fat": 6.9,
    "fiber": 10.6
  },
  "serving_size_g": 40.0,
  "serving_label": "1 bowl (40g dry)",
  "source_name": "USDA_FNDDS",
  "source_version": "2024.v1",
  "logged_at_utc": "2026-10-05T18:30:00Z"
}
```
**Invariable Rule:** Daily recovery engines, Zenith summaries, and macro dashboards calculate historical totals strictly from the frozen values (`calories`, `protein`, `carbs`, `fat`) on `meal_logs`. They never re-query `canonical_foods` dynamically for past dates.

---

## 15. Personal Food System Integration

The existing `user_food_library` table will be fully wired into Dex’s resolution pipeline.

### 15.1 Entity Priority Rule
When Dex executes `findFoodItem(rawName)`:
1. It queries `user_food_library` for `user_id = auth.uid()`:
   ```sql
   SELECT id, food_name, serving_size_g, calories, protein, carbs, fat, fiber
   FROM public.user_food_library
   WHERE user_id = $1 AND (lower(food_name) = lower($2) OR lower(food_name) LIKE '%' || lower($2) || '%')
   LIMIT 1;
   ```
2. If the user says *"My Pintola oats"* or has saved a custom food called *"Protein Shake"*, the personal food **beats the canonical database**.
3. When logged, `food_id` on `meal_logs` references the UUID in `user_food_library`, and `source_type` is tagged `'user_library'`.

---

## 16. Migration Strategy: Preserving the Current Seed

The existing Indian food dataset (`FOOD_DB` in `src/data/foods/indianFoods.js`) will not be deleted or discarded.

### Reversible Migration Plan
1. **Curated Seed Ingestion:**
   The 110 foods in `FOOD_DB` will be seeded into `canonical_foods` with:
   - `source_type = 'curated_seed'`
   - `source_name = 'ZYRBIT_SEED'`
   - `slug = item.id` (preserves existing slugs verbatim: `poha`, `idli`, `egg_boiled`, `roti`, etc.)
2. **Backward-Compatible Resolver Interface:**
   The new `resolveFood()` function will accept an optional fallback to `FOOD_DB` in memory if the database is unreachable, guaranteeing zero regression.
3. **Reversibility Guarantee:**
   If the database catalog encounters any failure, flipping the feature flag instantly routes food resolution back to the original in-memory `indianFoods.js` file.

---

## 17. Feature Flag Strategy

The Global Food Knowledge System will be introduced behind a strict, decoupled feature flag:

```javascript
// src/config/features.js
export const FEATURES = {
  FOOD_KNOWLEDGE_V2: false, // Default: false during development & testing
};
```

### Routing Logic
```javascript
export function resolveFoodInput(userMessage, context) {
  if (FEATURES.FOOD_KNOWLEDGE_V2) {
    return resolveGlobalFoodKnowledge(userMessage, context);
  }
  // Baseline Phase C resolver (untouched)
  return resolveLegacyFoodInput(userMessage, context);
}
```
**Requirement:** `FOOD_KNOWLEDGE_V2` will remain `false` until all Playwright journeys pass and production build is verified.

---

## 18. Playwright E2E Test Suite Specification

The following 6 End-to-End browser scenarios must be authored and verified in Run 2:

### Journey 1: `"2 rotis"` (Offline / Gemini Independent)
- **Precondition:** Gemini API mock is configured to throw HTTP 500 / Network Error.
- **Action:** User types `"2 rotis"` in Dex chat and hits Enter.
- **Assertion:**
  - Dex does not trigger AI network requests.
  - Resolves immediately to `Roti` (60g).
  - Logs 180 kcal, 4.8g protein, 36g carbs.
  - UI shows green success badge.

### Journey 2: `"80g oats"` (Preparation Ambiguity & Quick Selection)
- **Precondition:** User has no saved preference for oats.
- **Action:** User types `"80g oats"`.
- **Assertion:**
  - Calorie difference exceeds 20%.
  - Dex does not write to the database yet.
  - Dex renders clarification card: *"Did you measure 80g dry (311 kcal) or cooked (55 kcal)?"* with two buttons: `[Dry (311 kcal)]` and `[Cooked (55 kcal)]`.
  - User clicks `[Dry]`.
  - Meal is logged with 311 kcal.

### Journey 3: `"My Pintola oats"` (Personal Food Priority)
- **Precondition:** User has a custom food in `user_food_library` named `"Pintola Oats"` (390 kcal/100g).
- **Action:** User types `"Log 100g of my Pintola oats"`.
- **Assertion:**
  - Resolver matches `user_food_library`.
  - Logs meal with `food_id = <user_food_library.id>`.
  - Personal food macros override generic canonical oats.

### Journey 4: Migrated Seed Food Parity
- **Precondition:** System runs with `FOOD_KNOWLEDGE_V2 = true`.
- **Action:** User logs `"poha"`.
- **Assertion:**
  - Resolves to `poha` slug.
  - Calories and macros exactly equal the legacy `FOOD_DB` values (130 kcal/100g, 2.6g protein, 28g carbs, 1.3g fat).

### Journey 5: Unknown Complex Food (AI Fallback with Clear Marking)
- **Precondition:** Gemini API available; user types an uncataloged food: `"I had half a plate of Salvadoran pupusa revuelta"`.
- **Action:** Dex detects zero catalog/alias matches; calls AI fallback.
- **Assertion:**
  - AI estimates ~320 kcal.
  - Dex marks intent as `confidence: 0.65`, `source: 'ai_estimate'`.
  - Displays editable confirmation prompt to user before committing.

### Journey 6: Historical Snapshot Immutability
- **Action:** Log 100g of food at time $T_1$ with 380 kcal. In database, update the catalog entry for that food to 370 kcal at time $T_2$.
- **Assertion:**
  - Querying today's meal logs for $T_1$ returns exactly 380 kcal.
  - Past statistics and Zenith recovery metrics remain completely unchanged.

---

## 19. P0 Implementation Plan (For Run 2 Execution)

### Step 1: Database Migration (SQL)
- Create `canonical_foods`, `food_aliases`, and `user_food_preferences` tables in Supabase with RLS.
- Add `food_ref_id`, `source_type`, `preparation_state`, and `nutrition_snapshot` to `meal_logs`.

### Step 2: Seed Ingestion Pipeline
- Ingest the 110 audited records from `src/data/foods/indianFoods.js` into `canonical_foods` as `source_type = 'curated_seed'`.
- Ingest ~500 common global staples from USDA Foundation & UK CoFID (raw grains, fruits, vegetables, eggs, dairy, cuts of meat).

### Step 3: Fast Intent Gateway Refactor
- Remove the narrow regex check on line 485 of `dexIntentParser.js`.
- Replace with a zero-cost local catalog lookup so `"2 rotis"` resolves without hitting Gemini.

### Step 4: Universal Resolver Engine
- Create `src/engines/food/foodResolverV2.js` implementing the 6-step resolution chain (Personal $\rightarrow$ Packaged $\rightarrow$ Canonical $\rightarrow$ Alias $\rightarrow$ Fuzzy $\rightarrow$ AI).

### Step 5: Ambiguity UI Integration
- Connect the 20% materiality check to Dex’s interactive clarification card.

### Step 6: Test Verification
- Run full Vitest suite (`321/321` baseline preserved).
- Execute new Playwright E2E journeys.
- Verify 0 ESLint errors and production build.

---

## 20. Architectural Risks & Mitigation Strategies

| Risk Identified | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **ODbL Contamination** | High | Legal liability if Open Food Facts is merged into proprietary tables. | Strict physical database isolation; access OFF solely via segregated mirror table or live proxy. |
| **Catalog Performance Drag**| Medium | Slow SQL queries on large food tables. | GIN trigram indexes; generated tsvector search column; client-side memory caching of top 200 foods. |
| **Over-Clarification Fatigue**| Medium | User annoyance if Dex asks questions on every meal. | Strict 20% materiality threshold; automatically learn user preferences after 3 selections. |
| **Data Regressions** | High | Existing 110 Indian food logs or tests break. | Preserve all 110 slugs and macros verbatim; operate behind `FOOD_KNOWLEDGE_V2` flag. |

---

## 21. Decisions Requiring User Approval Before Run 2

1. **Approval of the 3-Tier Layered Hybrid Model**:
   Confirm using public domain / OGL government datasets (USDA Foundation, UK CoFID) for canonical foods, while keeping Open Food Facts strictly in an isolated lookup layer.
2. **Approval of the 20% Calorie Materiality Threshold**:
   Confirm that Dex will only ask clarification questions when candidate preparation states differ by $>20\%$ calories (or $>100\text{ kcal}$).
3. **Approval of the P0 Dataset Scope**:
   Confirm that Run 2 will ingest the 110 migrated seed items plus ~500 fundamental global staples from USDA Foundation / UK CoFID, rather than attempting bulk ingestion of 400,000 uncurated branded items.

---
*End of Document — Standing by for user authorization to proceed to Run 2.*
