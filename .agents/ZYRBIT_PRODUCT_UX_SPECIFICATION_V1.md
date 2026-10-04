# Zyrbit Product & UX Architecture Specification (v1)

> **Document Class:** Master Product Blueprint & UX Architecture Reference  
> **Status:** APPROVED FOR SPECIFICATION — ZERO CODE CHANGES UNTIL REVIEWED  
> **Scope:** Zenith, Growth, Health (incl. Food/Nutrition), Wealth, Dex, Day Receipt, Cross-Domain State Engine

---

## 1. Zyrbit Product Understanding

### 1.1 The Category Definition
Zyrbit is a **Personal Operating System**, not a productivity app, not a fitness tracker, not a budget manager, and not an AI chatbot wrapper.
- **The Core Premise:** *"The person is the integration layer of their own life."*
- In modern life, an individual does not experience "work," "sleep," "meals," and "money" as separate databases. When a student sleeps 5 hours because of an exam, their cognitive capacity shrinks (Growth), their recovery state drops (Health), their daily schedule compresses (Zenith), and their likelihood of ordering quick takeout increases (Wealth).
- Existing SaaS fractures this reality across five disconnected applications, forcing the human to perform manual mental synthesis, context switching, and repetitive data entry.
- **Zyrbit unifies these vectors into a single shared Life State.**

### 1.2 Direct UI vs. Dex Co-Existence
```
                 ┌───────────────────────────────────────────────────────────┐
                 │                        HUMAN USER                         │
                 └─────────────────────────────┬─────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         ┌───────────────────────────┐                   ┌───────────────────────────┐
         │         DIRECT UI         │                   │        DEX ENGINE         │
         │  Fast, deterministic,    │                   │ Natural language capture, │
         │  one-tap visual controls  │                   │ multi-domain synthesis,   │
         │  & immediate inspection   │                   │ planning & contextual Q&A │
         └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                       │                                               │
                       │   Deterministic Reads / Direct Mutations      │   Structured Plans / Proposed Actions
                       ▼                                               ▼
         ┌───────────────────────────────────────────────────────────────────────────┐
         │                    SHARED LIFE STATE & ACTION EXECUTOR                    │
         │               (Supabase Postgres / IndexedDB Offline Mirror)               │
         └───────────────────────────────────────────────────────────────────────────┘
```
1. **Direct UI:** For immediate, frictionless, deterministic inspection and one-tap updates (e.g., checking off a habit, tapping "+ Glass" of water, glancing at unencumbered cash).
2. **Dex:** For natural multi-entity capture ("Ate poha for ₹30"), situational queries ("Can I afford dinner out tonight?"), daily briefing, and proactive cognitive offloading.
3. **Crucial Invariant:** **There is no separate "Dex data" and "UI data."** Both surfaces read from and write to the exact same Postgres tables via the centralized `actionExecutor.js`.

---

## 2. Current → Target Gap Analysis

| Domain | Current Implementation (Codebase) | Target Product Direction (UX Architecture) | Core Gap to Bridge |
|---|---|---|---|
| **Zenith** | Standard card layout displaying isolated metric widgets (focus, water, money spent). | **ARC** — A chronological daily life arc showing current solar phase, active life context, TimeSpine, and urgent cross-domain pulses. | Transition from static KPI cards to a dynamic time-aware daily briefing arc. |
| **Growth** | Task checklist and habit row grids with standard streak counters. | **PATH** — Linear progression path showing Top 3 Daily Milestones, active Focus blocks, and habit momentum without dopamine clutter. | Shift from infinite to-do lists to a curated "3 Must-Wins" linear path with zero card spam. |
| **Health** | Macro counters (Calories, Protein, Carbs, Fat) and simple log forms. | **RHYTHM** — Circadian body rhythm: Recovery/Sleep debt score, hydration pace, and fuel timeline (Known/Estimated). | Remove obsessive fitness-tracker calorie counting; replace with intuitive body state indicators ("Fuel light", "Hydration behind pace"). |
| **Wealth** | Transaction tables, category badges, accounts list, and promise lists. | **FLOW** — Dynamic money flow: Unencumbered Safe-to-Spend hero, committed obligations timeline, cash reserves, and debt balance. | Elevate "Safe-to-Spend" as the single hero metric rather than static ledger lists. |
| **Dex** | Floating chat window with conversational AI fallback for unknown intents. | **COMMAND / RIPPLE** — Bottom-sheet command console with deterministic intent routing, cross-domain preview cards, and explicit confirmation. | Eliminate brittle LLM fallbacks for deterministic queries; provide instant structured ripple previews. |
| **Day Receipt** | Simple modal showing end-of-day numeric totals. | **EDITORIAL** — A clean, publication-grade daily retrospective narrative synthesizing habits, spending, meals, and focus into a calm daily log. | Transform cold accounting numbers into an editorial life summary. |
| **Start / Onboarding** | Traditional multi-step forms asking for initial account setups and budgets. | **CONVERSATIONAL SEEDING** — Single prompt: *"What's going on today?"* parses tasks, sleep, and money into an instant live operating state. | Replace multi-screen form fatigue with a 30-second conversational initialization. |

---

## 3. Final Information Architecture

The Zyrbit navigation shell consists of a **5-Anchor Bottom Navigation** on mobile and a **Calm Ergonomic Left Rail** on desktop, anchored by an omnipresent **Dex Command Orb**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ZYRBIT ARCHITECTURE                                   │
├───────────────┬───────────────┬─────────────────────────┬───────────────┬───────────────┤
│    ZENITH     │    GROWTH     │       DEX COMMAND       │    HEALTH     │    WEALTH     │
│   (The Arc)   │  (The Path)   │      (The Ripple)       │  (The Rhythm) │  (The Flow)   │
├───────────────┼───────────────┼─────────────────────────┼───────────────┼───────────────┤
│ • Daily Phase │ • Daily Focus │ • Natural Input Bar     │ • Body State  │ • Safe-to-    │
│   (Morning /  │   (Top 3)     │ • Multi-Domain Proposal │ • Sleep &     │   Spend Hero  │
│   Afternoon / │ • Focus Mode  │ • Contextual Insights   │   Recovery    │ • Net Cash    │
│   Evening)    │   Timer       │ • Deterministic Query   │ • Fuel Ribbon │   Position    │
│ • TimeSpine   │ • Keystone    │   Resolver              │   (Known vs   │ • Committed   │
│ • Cross-Pulse │   Habits      │ • System Action Approval│   Estimated)  │   Bills &     │
│ • Day Receipt │ • Evening     │                         │ • Hydration   │   Promises    │
│   Trigger     │   Review      │                         │   Pace        │ • Flow Stream │
└───────────────┴───────────────┴─────────────────────────┴───────────────┴───────────────┘
```

---

## 4. Final UX Architecture: The Central Loop

Every interaction in Zyrbit cycles through an uncompromised 6-stage cognitive loop:

```
        ┌─────────────┐
        │ 1. CAPTURE  │ ◄─── Natural language (Dex) OR 1-tap direct action (UI)
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  2. STATE   │ ◄─── Reads existing unified Postgres schema (user_id scoped)
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │3. INTERPRET │ ◄─── Food/Money/Time resolvers deduce cross-domain implications
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  4. DECIDE  │ ◄─── Deterministic rules or Dex proposal presented for confirmation
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │   5. ACT    │ ◄─── Centralized ActionExecutor writes to Postgres tables
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  6. ADAPT   │ ◄─── UI surfaces update: Arc adjusts, Safe-to-Spend updates, Rhythm recalculates
        └─────────────┘
```

---

## 5. Final Visual Language & Metaphor System

### 5.1 The Master Token Palette
- **Obsidian Foundation:** Background `#0B0D0F`, Surface Elevated `#15181B`, Card Layer `#1B1F24`, Border Subtle `#282E36`.
- **Primary Typography:** Off-White `#F5F5F5` (High Contrast), Muted Gray `#9CA3AF` (Secondary/Context).
- **Domain Accents (Functional Tokens, never decorative noise):**
  - **Zenith (Arc):** Solar Gold `#F59E0B` (Time/Circadian pulse)
  - **Growth (Path):** Electric Cyan / Focus Teal `#06B6D4` (Direction & Momentum)
  - **Health (Rhythm):** Vitality Emerald `#1FA36F` (Restoration & Biological Balance)
  - **Wealth (Flow):** Sovereign Jade `#10B981` (Fluidity, Asset Clarity)
  - **Dex (Ripple):** Luminous Indigo `#6366F1` (Cognitive Synth & Command)
  - **Alerts:** Critical Coral `#EF4444`, Caution Amber `#F59E0B`.

### 5.2 The 6 Surface Metaphors

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE 6 SURFACE METAPHORS                         │
├───────────────────┬────────────────────────────────────────────────────┤
│ ZENITH: ARC       │ A curved solar/circadian progression across the    │
│                   │ 24-hour day. Rises in morning, peaks at midday,    │
│                   │ cools to evening embers.                           │
├───────────────────┼────────────────────────────────────────────────────┤
│ GROWTH: PATH      │ A single linear road ahead. No branching grids.    │
│                   │ Milestones appear sequentially; completed items    │
│                   │ fade backward into the path.                       │
├───────────────────┼────────────────────────────────────────────────────┤
│ HEALTH: RHYTHM    │ An organic biometric wave. Fuel, hydration, and    │
│                   │ sleep appear as biological rhythms rather than     │
│                   │ mechanical accounting balances.                    │
├───────────────────┼────────────────────────────────────────────────────┤
│ WEALTH: FLOW      │ Liquid dynamics. Money isn't static rows; it is an │
│                   │ incoming reservoir branching into obligations,     │
│                   │ leaving a clear Safe-to-Spend current.             │
├───────────────────┼────────────────────────────────────────────────────┤
│ DEX: COMMAND /    │ A tactile console that expands upward. Inputs      │
│ RIPPLE            │ ripple across domain badges showing anticipated    │
│                   │ mutations before execution.                        │
├───────────────────┼────────────────────────────────────────────────────┤
│ DAY RECEIPT:      │ A tactile, editorial paper ticket. Elegant serif   │
│ EDITORIAL         │ accents, structured retrospective narrative,       │
│                   │ clean timestamp balance.                           │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 6. Zenith Redesign (Metaphor: ARC)

### 6.1 Purpose
Zenith is the **Mission Control & Daily Horizon**. It answers one question: *"Where do I stand right now in the arc of today?"*

```
┌──────────────────────────────────────────────────────────────────────┐
│ ZENITH: THE DAILY ARC                                                │
│                                                                      │
│   ☀️ 14:30  •  AFTERNOON ARC  •  4h 15m Daylight Remaining            │
│   ╭───────────────────────●──────────────────────╮                   │
│   │               [ Solar Arc Progress ]          │                   │
│   ╰───────────────────────────────────────────────╯                   │
│                                                                      │
│   CONTEXT HEADLINE                                                   │
│   "Heavy cognitive load day. Exam tomorrow morning; energy dip        │
│    expected around 16:00."                                           │
│                                                                      │
│   TIMESPINE (Vertical Chrono-Ribbon)                                 │
│   ├── 07:30 [H] Woke up (5.2h sleep · Short recovery)                 │
│   ├── 08:15 [F] Poha + Chai (~320 kcal · ₹30)                        │
│   ├── 09:30 [G] Deep Work: Organic Chemistry (90 min completed)       │
│   ├── 14:00 [●] NOW: Midday Hydration Check (1.2L / 2.5L)             │
│   └── 16:30 [G] Upcoming: Physics Revision Mock                      │
│                                                                      │
│   DOMAIN PULSE PILLS                                                 │
│   [Growth: 2/3 Priorities] [Health: Sleep Short] [Wealth: ₹380 Spent]│
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Structural Elements
1. **The Circadian Arc Hero:** Visual arc spanning Dawn $\rightarrow$ Solar Noon $\rightarrow$ Dusk $\rightarrow$ Sleep. A glowing focal node indicates the user's current minute.
2. **Context Headline:** Contextual natural synthesis generated from state: *"Running on 5h sleep with an exam tomorrow. Prioritize 1 key session, avoid heavy spending."*
3. **The TimeSpine:** A consolidated, chronological vertical ribbon interleaving meals logged, focus sessions completed, expenses incurred, and habits checked off.
4. **Day Receipt Anchor:** In the evening ($> 20:30$), Zenith smoothly surfaces the *"Review Day Receipt"* action.

---

## 7. Growth Redesign (Metaphor: PATH)

### 7.1 Purpose
Growth is the **Execution Engine**. It rejects the endless to-do list trap and enforces strict cognitive prioritization.

```
┌──────────────────────────────────────────────────────────────────────┐
│ GROWTH: THE PATH                                                     │
│                                                                      │
│   TODAY'S 3 MILESTONES (The Critical Path)                          │
│   [1] ◉ Complete Organic Chemistry Chapter 4 Notes    [In Progress]  │
│       └── Active Focus: [ ▶ Start 45m Block ]                        │
│   [2] ○ Solve 20 Practice Reaction Problems           [Queued]       │
│   [3] ○ Final 20-min Formula Sheet Review             [Queued]       │
│                                                                      │
│   HABIT MOMENTUM (Keystones Only)                                    │
│   ├── [✓] Morning Sunlight (Streak: 12d)                             │
│   ├── [✓] No Morning Phone (Streak: 4d)                              │
│   └── [ ] Evening Walk 20m                                           │
│                                                                      │
│   FOCUS ROADBED                                                      │
│   Today Focus: 1h 45m  •  2 Sessions Completed                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Structural Elements
1. **The Critical Path Hero (Rule of 3):** Maximum 3 primary milestones. Additional items are locked in the "Later" backlog until a primary slot clears.
2. **Integrated Focus Runner:** Milestones feature an inline `[▶ Focus]` trigger that morphs into a calm countdown with zero distracting animations.
3. **Keystone Habits Path:** Horizontal progression beads indicating streak momentum and recovery status ("Never Miss Twice" protocol highlighted if yesterday was missed).

---

## 8. Health Redesign (Metaphor: RHYTHM)

### 8.1 Purpose
Health is the **Biological Symphony**. It repudiates clinical spreadsheet tracking and presents an intuitive, actionable model of body vitality.

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEALTH: THE RHYTHM                                                   │
│                                                                      │
│   BODY STATE HERO                                                    │
│   Recovery: 64%  •  "Short sleep debt; hydration pace is critical"   │
│   ~~~~~~~~~~~~~~~~~~~~ Bio-Wave Gauge ~~~~~~~~~~~~~~~~~~~~           │
│                                                                      │
│   CIRCADIAN FUEL RIBBON                                              │
│   08:00            13:30               20:00                         │
│   [● Breakfast]    [● Lunch]           [○ Dinner Expected]           │
│   Poha + Chai      Thali (~550 kcal)                                 │
│   ~320 kcal (Est)  Estimated Range                                   │
│                                                                      │
│   FUEL OVERVIEW (Contextual, Not Clinical)                           │
│   Meals: 2 Logged  •  Fuel State: Moderate                           │
│   Protein: Moderate (~38g est)  •  Hydration: 1.4L / 2.5L            │
│   [ + Log Meal / Water ]                                             │
│                                                                      │
│   REST & RECHARGE                                                    │
│   Sleep: 5h 15m  •  Debt: -2h 15m  •  Efficiency: Fair               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Food & Nutrition System Specification

### Rule 1: Natural Food Capture
- Natural language via Dex or Health Command Bar is the primary intake mechanism:
  - *"I ate poha."*
  - *"I ate 2 bananas."*
  - *"I had 3 eggs."*
  - *"I had poha and chai."*
  - *"I ate 1 large plate poha for ₹30."*
- Direct UI manual entry remains a secondary one-tap fallback for direct adjustment.

### Rule 2: Nutrition Output Data Classification
For any recognized or parsed food item, data is classified strictly into three confidence tiers:
- **`KNOWN`**: Exact deterministic match from `FOOD_DB` (`src/data/foods/index.js`) or user custom library with verified gram/serving metrics.
- **`ESTIMATED`**: Regional composite dishes, restaurant foods, or fuzzy matches where serving weight or exact recipe varies (e.g., "mixed veg curry", "thali", "biryani").
- **`UNKNOWN`**: Unrecognized food terms or generic entries ("lunch at cafe"). Parsed as generic fuel notes without fake macro numbers.

### Rule 3: Estimation Rules & Range Integrity
- **Known food:** *"2 bananas"* $\rightarrow$ Deterministic lookup: 210 kcal, 2.6g protein, 54g carbs, 0.6g fat.
- **Unknown composite food:** *"one plate homemade mixed vegetable curry"* $\rightarrow$ Marked as **ESTIMATED** with rounded values (`~220-280 kcal`).
- **Photo/AI Food:** Never emit fake precision like `412 kcal`. Always emit an honest range (`~380–450 kcal`) unless confirmed from a branded barcode/exact verified database.

### Rule 4: User Correction Workflow
- The user can tap any logged meal to edit: Food name, quantity, unit/serving size, calories, protein, carbs, fats.
- Once user edits an estimated value, the record's confidence flag permanently transitions from `ESTIMATED` to `KNOWN` (with `user_edited: true` metadata preserved in JSONB).

### Rule 5: Food Purchase $\neq$ Food Consumption
The system maintains strict semantic separation between financial transactions and biological intake:
- *"I bought 6 eggs for ₹60."* $\rightarrow$ **Wealth Expense** (Category: Groceries/Food, Amount: ₹60). **Zero** calories or meals logged in Health.
- *"I ate 2 eggs I already had."* $\rightarrow$ **Health Meal** (Breakfast: 2 eggs, 140 kcal, 12g protein). **Zero** impact on Wealth.
- *"I ate poha for ₹30."* $\rightarrow$ **Cross-Domain Synthesis**: Logs Health meal (Poha, ~280 kcal) **AND** creates Wealth expense (₹30, Food & Dining).

### Rule 6: Manual UX Flow
Manual entry avoids accounting spreadsheets:
```
[Health Bar] ──► Type/Speak ──► Interpreted Preview Card ──► Quick Stepper (+/-) ──► [Confirm] ──► Saved
```

### Rule 7: Body Rhythm Timestamps
- Schema verification: `meal_logs` contains `meal_time` (TIME), `date` (DATE), and `created_at` (TIMESTAMPTZ).
- **Finding:** Existing records have complete timestamp precision. They can be placed directly on the Health Circadian Fuel Ribbon and Zenith TimeSpine without schema modification.

### Rule 8: Health State Derivations (Non-Medical)
The system calculates calm, truthful body state summaries based strictly on documented inputs:
- *"Running on short sleep."* $\leftarrow$ Derived when sleep duration is $< 6.5$ hours against user's target (default 8h).
- *"Fuel is light so far."* $\leftarrow$ Derived when current local time is past 14:00 and logged meals $< 2$ or total calories $< 700$ kcal.
- *"Hydration is behind pace."* $\leftarrow$ Derived when current water logged is below linear daytime target trajectory ($(\text{Current Hour} - 8) \times 200\,\text{ml}$).

### Rule 9: Macro Display Philosophy
- Health is **NOT** a Bodybuilder Macro Tracker.
- Default view highlights: **Fuel State**, **Meal Timestamps**, and **Protein Adequacy tier** (*Low*, *Balanced*, *Optimal*).
- Detailed macro gram breakdowns (Protein, Carbs, Fat) are collapsed by default and expand on single-tap inspection.

### Rule 10: Food History
- Historical navigation supports **Today**, **Yesterday**, **This Week**, and **Monthly Trends**.
- Past records retain their original meal components, timestamp, and confidence tags (`KNOWN` vs `ESTIMATED`).

### Rule 11: Dex Food Commands Inventory
| Natural Command | Current Codebase Status | Deterministic vs. AI Target |
|---|---|---|
| *"I ate 2 bananas"* | Supported via `foodResolver.js` regex + `FOOD_DB` lookup. | **Deterministic** |
| *"I had 3 eggs"* | Supported via regex quantity multiplier + `FOOD_DB`. | **Deterministic** |
| *"I ate poha for ₹30"* | Supported via dual-intent detection (Meal + Expense). | **Deterministic** |
| *"Change that to 2 plates"* | Missing in current regex (falls back to Gemini context). | **Deterministic Context Pointer** (refers to `last_logged_meal`) |
| *"Delete my breakfast"* | Partially supported via `delete_meal` (requires exact match). | **Deterministic Filter** (`meal_type = 'breakfast'` on `current_date`) |

---

## 10. Wealth Redesign (Metaphor: FLOW)

### 10.1 Purpose
Wealth is the **Financial Current**. It answers the daily anxiety question: *"How much money can I safely move today without breaking upcoming commitments?"*

```
┌──────────────────────────────────────────────────────────────────────┐
│ WEALTH: THE FLOW                                                     │
│                                                                      │
│   UNENCUMBERED FLOW (The Hero)                                       │
│   ₹4,250                                                             │
│   Safe-to-Spend Right Now (Next 7 Days Safe)                         │
│                                                                      │
│   THE CASH RESERVOIR                                                 │
│   Total Liquid Assets: ₹18,600                                       │
│   ├── HDFC Checking: ₹14,200                                         │
│   └── Cash in Hand:  ₹4,400                                          │
│                                                                      │
│   THE COMMITTED STREAM (Next 14 Days)                                │
│   - ₹9,500 Rent (Due in 5 days)                                      │
│   - ₹3,850 Utilities & Subscriptions                                 │
│   - ₹1,000 Lent to Rahul (Promise: Due Tomorrow)                     │
│                                                                      │
│   TODAY'S FLOW                                                       │
│   Spent Today: ₹380  •  3 Transactions                               │
│   ├── ₹30 Poha (Breakfast)                                           │
│   ├── ₹150 Metro Card Recharge                                       │
│   └── ₹200 Shared Study Material                                     │
│   [ + Quick Expense / Income / Move ]                                │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.2 Structural Elements
1. **Safe-to-Spend Hero:** $\text{Liquid Cash} - \text{Committed Bills} - \text{Minimum Reserve Floor}$. This eliminates mathematical calculation stress.
2. **Promised & Borrowed Dynamics:** Dedicated bidirectional ledger tracking peer-to-peer promises (receivables and payables) without losing track of personal liabilities.
3. **Flow Stream (Recent Activity):** Real-time list of outflows and inflows with cross-domain indicators (e.g., [Health: Meal] badge on food expenditures).

---

## 11. Dex Redesign (Metaphor: COMMAND / RIPPLE)

### 11.1 Purpose
Dex is the **Intelligent Interaction Layer**. It receives natural expressions, extracts multi-domain entities, presents a crystal-clear ripple preview, and executes mutations only upon user consent.

```
┌──────────────────────────────────────────────────────────────────────┐
│ DEX COMMAND CONSOLE                                                  │
│                                                                      │
│   [ Input: "I ate poha for ₹30" ]                            [ 🎙️ ⏎ ]│
│                                                                      │
│   PROPOSED MULTI-DOMAIN RIPPLE                                       │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ 🟢 HEALTH · Log Meal                                         │   │
│   │    • Item: Poha (1 Plate)                                    │   │
│   │    • Est. Calories: ~280 kcal  • Protein: ~5g (ESTIMATED)    │   │
│   │    • Meal: Breakfast (08:30 AM)                              │   │
│   ├──────────────────────────────────────────────────────────────┤   │
│   │ 🟢 WEALTH · Log Expense                                      │   │
│   │    • Amount: ₹30.00                                          │   │
│   │    • Category: Food & Dining                                 │   │
│   │    • Payment: Primary Cash / Account                         │   │
│   ├──────────────────────────────────────────────────────────────┤   │
│   │ 🟡 ZENITH · Timeline Update                                  │   │
│   │    • Injected into morning TimeSpine                         │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   [ Discard ]                                [ Confirm & Apply (⏎) ] │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.2 Deterministic-First Orchestration Engine
1. **Tier 1 — Deterministic Regex & Keyword Resolvers:**
   - Expenses: `/(\d+)\s*(rs|inr|₹|bucks)/i` $\rightarrow$ `add_expense`
   - Food/Meals: `/(ate|had|consumed)\s+([a-zA-Z0-9\s]+)/i` $\rightarrow$ `log_meal`
   - Habits/Tasks: `/(did|completed|finished)\s+([a-zA-Z\s]+)/i` $\rightarrow$ `update_habit`
   - Queries: *"What did I spend on food this month?"* $\rightarrow$ Deterministic SQL aggregation on `wealth_transactions`.
2. **Tier 2 — AI Contextual Synthesis (Gemini 2.5 Flash):**
   - Invoked *only* for ambiguous, multi-sentence life updates or reflective questions.
   - Outputs strict JSON schema conforming to `ActionPayload`. Never executes arbitrary mutations silently.

---

## 12. Day Receipt Redesign (Metaphor: EDITORIAL)

### 12.1 Purpose
The Day Receipt is the **Daily Retrospective Anchor**. At the close of each day, it synthesizes raw logs into an elegant, editorial summary that provides closure and prevents cognitive spillover into tomorrow.

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Z Y R B I T                                │
│                         D A Y  R E C E I P T                         │
│                    Tuesday, 24 September 2026                        │
│ ──────────────────────────────────────────────────────────────────── │
│                                                                      │
│   THE RETROSPECTIVE                                                  │
│   "A high-stress morning characterized by sleep debt was offset by   │
│    disciplined execution. You defended 1h 45m of deep focus and held │
│    discretionary expenses well below your daily pace."               │
│                                                                      │
│   BALANCE OF THE DAY                                                 │
│   ├── Focus Completed:      1h 45m (2 blocks)                        │
│   ├── Critical Milestones:  2 of 3 achieved                          │
│   ├── Habits Maintained:    3 of 4 keystones                         │
│   ├── Fuel Logged:          2 meals (~870 kcal, Estimated)           │
│   ├── Hydration Reached:    2.2L / 2.5L                              │
│   └── Total Outflow:        ₹380.00 (Safe-to-Spend remains ₹4,250)   │
│                                                                      │
│   TOMORROW'S ANCHOR                                                  │
│   Organic Chemistry Mock Exam at 09:00 AM. Sleep target: 22:30 PM.   │
│                                                                      │
│ ──────────────────────────────────────────────────────────────────── │
│                        [ Close Day & Rest ]                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. Cross-Domain Interaction Scenarios: Deep Traces

### Scenario A: *"I ate poha for ₹30."*

```
                                  "I ate poha for ₹30."
                                           │
                                  [ Dex Orchestrator ]
                     Extracts: Food='Poha', Cost=₹30, Time=NOW
                                           │
               ┌───────────────────────────┴───────────────────────────┐
               ▼                                                       ▼
        [ Health Resolver ]                                   [ Wealth Resolver ]
  • Lookup 'poha' in Food DB                            • Deduce Category: 'Food & Dining'
  • Output: ~280 kcal, ~5g P                            • Deduce Outflow: ₹30
  • Tag: ESTIMATED (Regional composite)                 • Account: Default Wallet/UPI
               │                                                       │
               └───────────────────────────┬───────────────────────────┘
                                           ▼
                                [ Dex Proposed Ripple ]
                    "Log Breakfast (~280 kcal) and Expense (₹30)?"
                                           │
                                  [ User Confirms ]
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
   [ Health Domain ]               [ Wealth Domain ]                 [ Zenith Domain ]
• Injects meal into              • Appends ₹30 expense             • Injects event into
  Circadian Fuel Ribbon            to Wealth Flow                    TimeSpine at 08:30
• Updates daily protein/         • Deducts ₹30 from                • Updates Daily Spend Pulse
  energy summary                   Safe-to-Spend gauge               pill (+₹30)
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           ▼
                                 [ Day Receipt Domain ]
               • Formats line item: "Breakfast: Poha (₹30 · ~280 kcal)"
```

---

### Scenario B: *"I slept 5 hours and my exam is tomorrow."*

```
                    "I slept 5 hours and my exam is tomorrow."
                                        │
                               [ Dex Orchestrator ]
            Extracts: Sleep=5h, Mental Load='Exam Tomorrow' (High Urgency)
                                        │
            ┌───────────────────────────┴───────────────────────────┐
            ▼                                                       ▼
     [ Health Resolver ]                                   [ Growth Resolver ]
• Sleep Duration: 5.0h                                • Injects Milestone:
• Target: 8.0h $\rightarrow$ Sleep Debt: -3.0h         "Exam Prep Final Review"
• Calculates Recovery State: 52% (Low)                • Sets Daily Focus Cap: Max 2 blocks
            │                                                       │
            └───────────────────────────┬───────────────────────────┘
                                        ▼
                             [ Zenith Synthesis ]
       Context Headline: "Short sleep recovery. High-stakes exam tomorrow.
        Pace cognitive energy carefully; schedule 20m afternoon recharge."
                                        │
       ┌────────────────────────────────┴────────────────────────────────┐
       ▼                                                                 ▼
[ Zenith Arc & TimeSpine ]                                      [ Day Receipt Retrospective ]
• Morning arc tinted with Amber Recovery badge                 • Contextual log: "Under-slept day
• Focus blocks spaced with mandatory breaks                      managed with deliberate pacing."
```

---

## 14. First-User Experience (Conversational Seeding)

### 14.1 The Problem with Standard Onboarding
Traditional Life OS apps fail at onboarding: they present 15-field profile forms, bank connection steps, and empty task matrices that lead to immediate abandonment.

### 14.2 The Zyrbit Onboarding Protocol
1. **The Calm Welcome:** Ambient black screen, subtle breathing logo.
2. **The Single Seed Question:**  
   *"Welcome to Zyrbit. Tell Dex: What does your life look like today?"*
3. **The Natural Example Prompt:**  
   *"e.g., I have an exam tomorrow, got 6 hours of sleep, and have ₹2,000 in my wallet."*
4. **The Instant Multi-Domain Synthesis:**
   - Dex parses the response into:
     - Health: Initial sleep baseline (6h)
     - Wealth: Initial cash wallet balance (₹2,000)
     - Growth: Primary milestone ("Exam preparation")
     - Zenith: Active day arc calibrated to current time
5. **Instant Operating Reality:** The user lands on a **pre-populated, live Zenith Arc** in under 45 seconds, experiencing immediate calm and clarity.

---

## 15. System States: Empty, Loading, Error, Edit & Delete

### 15.1 Empty States
- **No generic illustrations or empty boxes.**
- Zenith Empty: Shows the continuous solar arc with the prompt: *"The day is clear. Tap Dex to capture your first moment."*
- Growth Empty: *"Zero active milestones. What single achievement would make today a win?"*
- Health Empty: Circadian ribbon shows current hour marker and quiet water pulse.
- Wealth Empty: Shows unencumbered cash balance with prompt: *"No outflows today. Safe-to-Spend is fully preserved."*

### 15.2 Loading States
- Zero full-screen blocking spinners.
- Micro-shimmer on affected text elements preserving layout geometry.

### 15.3 Error States
- Transparent, non-fatal messages.
- If Dex encounters an ambiguous query: *"Dex couldn't confirm the food quantity. Did you mean 1 plate or 2?"* (Never raw exception messages).

### 15.4 Edit & Delete Invariants
- Every logged entity (meal, task, habit, transaction, promise) has an accessible **3-dot menu or swipe action**.
- Deleting an entity cleanly reverses its cross-domain side effects:
  - Deleting a food expense also asks: *"Remove corresponding Health meal log as well?"*

---

## 16. Mobile Ergonomics & Interaction Model

1. **The 48px Thumb Zone:** All primary triggers (BottomNav, Dex Orb, Quick Action FABs) sit strictly within the lower 35% of the mobile viewport.
2. **Swipe-to-Reveal Sheets:** Dex operates as a bottom sheet with 3 detents:
   - *Collapsed (56px):* Quick voice / text command bar.
   - *Half-Sheet (45%):* Active proposal preview & quick confirmations.
   - *Full-Sheet (90%):* Deep conversational context & Day Receipt review.
3. **Haptic Feedback:**
   - 10ms light tick on habit toggle.
   - 25ms medium tick on Dex proposal confirmation.
   - Distinct double-tap buzz on critical spending alert.

---

## 17. Sellable Product Differentiators

1. **Single Sentence, Multi-Domain Resolution:** No other app on the market converts *"I ate poha for ₹30"* into an accurate nutrition estimate, an expense deduction, and a timeline update simultaneously.
2. **Deterministic Trust First, AI Second:** Users trust Zyrbit because math, budgets, and habits are governed by rock-solid deterministic code. AI is strictly reserved for interpretation and synthesis.
3. **Calm Aesthetic Identity:** Black obsidian, zero dopamine gamification badges, zero noisy ads, and zero infinite notification loops.
4. **True Solo-Founder Sustainability:** Unified database architecture requiring zero bloated microservices.

---

## 18. Architectural Invariants: What Must NOT Be Changed

To protect the stability, security, and integrity of the Zyrbit codebase, the following foundations are declared **FROZEN & IMMUTABLE**:

1. **Database Schema & RLS Policies:**
   - The 19 production Supabase tables and their RLS policies (`auth.uid() = user_id`) are structurally sound and verified.
   - **Do not alter table names or primary key conventions.**
2. **Centralized Action Execution:**
   - All mutations from Direct UI or Dex must flow through `src/actions/actionExecutor.js`. Direct component-level Supabase writes for shared domain entities are prohibited.
3. **API Consolidation:**
   - All LLM access remains strictly encapsulated inside `src/lib/gemini.js` via `askZyra` and `generateContent`. Component-level fetch calls to Gemini are strictly banned.
4. **5-Anchor Navigation:**
   - Zenith, Growth, Dex, Health, and Wealth are the fixed five anchors of Zyrbit. Do not add auxiliary root navigation tabs.

---

## 19. Phased Implementation Roadmap

```
PHASE 1: UX & VISUAL FOUNDATIONS (Immediate)
├── Unify CSS tokens for the 6 visual metaphors (Arc, Path, Rhythm, Flow, Ripple, Editorial)
├── Implement standard bottom sheet and thumb-zone ergonomics for mobile
└── Clean up leftover card-grid styling in Growth and Zenith

PHASE 2: HEALTH & NUTRITION ENGINE POLISH
├── Wire Food DB lookup confidence flags (KNOWN vs ESTIMATED vs UNKNOWN)
├── Add the Circadian Fuel Ribbon to Health (using existing meal_logs timestamps)
├── Implement the two-tier macro view (Fuel adequacy tier by default, detailed grams on tap)
└── Support user edit flow that updates ESTIMATED records to KNOWN

PHASE 3: WEALTH FLOW ELEVATION
├── Refactor Wealth hero to Safe-to-Spend formula
├── Integrate upcoming promises and bills directly into the Safe-to-Spend calculation
└── Implement cross-domain badges on recent transactions

PHASE 4: DEX INTENT & MULTI-DOMAIN REFINEMENT
├── Harden deterministic regex resolvers for compound life sentences
├── Add explicit multi-domain proposal preview card before mutation execution
└── Route queries ("What did I spend on food this month?") to deterministic SQL aggregations

PHASE 5: ZENITH ARC & DAY RECEIPT
├── Implement the Circadian Solar Arc hero on Zenith
├── Build the vertical TimeSpine timeline interleaving meals, focus, habits, and expenses
└── Finalize the editorial Day Receipt end-of-day experience
```
