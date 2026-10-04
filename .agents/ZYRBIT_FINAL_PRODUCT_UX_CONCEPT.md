# ZYRBIT — FINAL PRODUCT & UX ARCHITECTURE CONCEPT
**Document Type:** Authoritative Product & UX Specification  
**Version:** 1.0 (Master Release)  
**Status:** COMPLETE & FROZEN FOR IMPLEMENTATION  
**Target Platform:** Mobile-First Responsive PWA / Desktop OS Web Client  

---

# EXECUTIVE SUMMARY & PRODUCT MANIFESTO

Zyrbit is a **Personal Operating System**, not a productivity app, not a fitness tracker, not a budget manager, and not an AI chatbot wrapper.

### The Problem
Human lives do not happen in siloed databases. When someone sleeps only 5 hours because they have a high-stakes exam tomorrow:
- Their **Health** recovery score plummets.
- Their **Growth** capacity for deep cognitive focus compresses to short bursts.
- Their **Zenith** daily schedule must drop non-essential commitments and protect evening rest.
- Their **Wealth** likelihood of buying quick meals increases.

Current software fractures this reality across five different apps (Notion, Todoist, MyFitnessPal, YNAB, ChatGPT). The user is forced to be the manual data-entry clerk and synthesis engine.

### The Zyrbit Solution
**"The person is the integration layer of their own life."**
Zyrbit provides:
1. A **single unified state** across Growth, Health, Wealth, and Time.
2. **Direct UI** for instantaneous, deterministic, one-tap visual inspection and manipulation.
3. **Dex** as the natural-language command, contextual intelligence, and multi-domain ripple layer.
4. **Zero separate data pools**: Direct UI and Dex modify the exact same underlying Postgres records via a centralized `actionExecutor`.

---

# SECTION A: FINAL INFORMATION ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  ZYRBIT SYSTEM SHELL                                   │
├────────────────────┬────────────────────┬────────────────────┬────────────────────────┤
│     NAVIGATION     │     DIRECT UI      │    DEX COMMAND     │   CENTRAL EXECUTOR     │
│   5 Root Anchors   │ Instant 1-Tap Read │ Natural Capture &  │ actionExecutor.js      │
│  (Mobile Bottom /  │  & Quick In-Place  │ Deterministic Q&A  │ (Unified State Writes  │
│    Desktop Rail)   │     Mutations      │   + AI Reasoning   │   & RLS Validation)    │
└─────────┬──────────┴─────────┬──────────┴─────────┬──────────┴───────────┬────────────┘
          │                    │                    │                      │
          ▼                    ▼                    ▼                      ▼
┌───────────────────┐┌───────────────────┐┌───────────────────┐┌────────────────────────┐
│      ZENITH       ││      GROWTH       ││      HEALTH       ││        WEALTH          │
│   Metaphor: ARC   ││   Metaphor: PATH  ││ Metaphor: RHYTHM  ││    Metaphor: FLOW      │
├───────────────────┤├───────────────────┤├───────────────────┤├────────────────────────┤
│ • Circadian Solar ││ • Today's Path    ││ • Body Vitality   ││ • Safe-to-Spend Hero   │
│   Arc (24h Wave)  ││   (Top 3 Priority ││   Score & State   ││   (Explainable Flow)   │
│ • Context Briefing││    Milestones)    ││ • Circadian Fuel  ││ • Liquid Cash Reservoir│
│ • The TimeSpine   ││ • Milestone Focus ││   Ribbon (Meals)  ││ • Committed Bills &    │
│   (NOW/DONE/      ││   Runner (Inline) ││ • Macro Details   ││   Obligations Stream   │
│    PLANNED/DRIFT) ││ • Keystone Habits ││   (Known/Est/Unk) ││ • P2P Promises Ledger  │
│ • Day Receipt     ││   (Never Miss 2x) ││ • Hydration Pace  ││ • Cross-Domain Outflow │
│   Trigger (Eve)   ││ • Blockers Rail   ││ • Sleep Debt & Rest││   Stream (Tagged)      │
└───────────────────┘└───────────────────┘└───────────────────┘└────────────────────────┘
                                         ▲
                                         │
                         ┌───────────────┴───────────────┐
                         │          DEX COMMAND          │
                         │    Metaphor: COMMAND/RIPPLE   │
                         ├───────────────────────────────┤
                         │ • Persistent Command Bar      │
                         │ • Multi-Domain Ripple Preview │
                         │ • Deterministic Intent Parser │
                         │ • Contextual Synthesis Engine │
                         │ • Instant Undo & Audit Trail  │
                         └───────────────────────────────┘
                                         ▲
                                         │
                         ┌───────────────┴───────────────┐
                         │          DAY RECEIPT          │
                         │     Metaphor: EDITORIAL       │
                         ├───────────────────────────────┤
                         │ • Evening Retrospective Ticket│
                         │ • Narrative Life Summary      │
                         │ • Daily Math Reconciliation   │
                         │ • Tomorrow's Anchor Point     │
                         └───────────────────────────────┘
```

---

# SECTION B: FINAL VISUAL LANGUAGE

### 1. Aesthetic Philosophy: Calm Ambient Obsidian
- **No dopamine gamification**: No confetti bursts, cartoon mascots, or neon streaks.
- **Ultra-high legibility**: Dark obsidian substrate with precise typographic hierarchy.
- **Functional color tokens only**: Color is never decorative; it communicates state, domain, and urgency.

### 2. Design Tokens
| Token | Hex Value | Usage |
|---|---|---|
| `--bg-base` | `#0B0D0F` | Deep obsidian canvas (100% viewport) |
| `--bg-surface` | `#15181B` | Primary card container and floating panels |
| `--bg-elevated` | `#1E2227` | Interactive elements, active states, hover fields |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | 1px border separator for structural boundaries |
| `--text-primary` | `#F5F5F5` | Off-white for headlines and primary values |
| `--text-secondary` | `#9CA3AF` | Neutral slate for context, subheaders, and units |
| `--text-tertiary` | `#6B7280` | Muted charcoal for timestamps and metadata |
| `--accent-zenith` | `#F59E0B` | Solar Gold — Daylight arc, time progress |
| `--accent-growth` | `#06B6D4` | Electric Cyan — Path progression, focus states |
| `--accent-health` | `#10B981` | Vitality Emerald — Biological balance, fuel nodes |
| `--accent-wealth` | `#34D399` | Sovereign Mint — Cash flow, Safe-to-Spend |
| `--accent-dex` | `#6366F1` | Luminous Indigo — Command input, intelligence ripple |
| `--status-warning` | `#F59E0B` | Amber — Sleep debt, hydration lag, bill due soon |
| `--status-danger` | `#EF4444` | Coral Red — Overdraft risk, missed critical habit |

### 3. Surface Metaphors Overview
1. **Zenith = ARC**: Continuous solar curve tracking 24 hours. The visual hero is the arc with a glowing sun-node at the current minute. Below it is the **TimeSpine**: a vertical timeline of `DONE`, `NOW`, `PLANNED`, and `DRIFTED`.
2. **Growth = PATH**: A single forward road. No multi-column kanban boards. Only **Today's 3 Milestones**, keystone habit momentum, and friction blockers.
3. **Health = RHYTHM**: A biometric wave. Sleep debt, hydration pace, and meal fuel nodes placed along a circadian timeline. Macros are kept secondary and contextual.
4. **Wealth = FLOW**: Dynamic liquid flow. Big hero is **Safe-to-Spend**, showing the clear breakdown: Total Liquid $\rightarrow$ Committed Obligations $\rightarrow$ Free-to-Spend.
5. **Dex = COMMAND + RIPPLE**: Bottom-sheet command console. Natural input triggers an expanding multi-domain ripple showing preview badges across domains before writing.
6. **Day Receipt = EDITORIAL**: Premium tactile paper receipt with serif typography, calm narrative review, and end-of-day closure.

---

# SECTION C: THE FIVE SURFACES & 12 CORE STATES

---

## 1. ZENITH (The Arc)

### Metaphor & Philosophy
Zenith is the **Mission Control of Today**. It does not look like a generic dashboard. Its hero is the **Circadian Arc**, accompanied by the **TimeSpine** that organizes the day into **NOW**, **DONE**, **PLANNED**, **DRIFTED**, and **NEXT**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ ZENITH: THE DAILY ARC                                        02:15 PM  │
│                                                                        │
│                    ☀️ 14:15  •  4h 45m Daylight Left                   │
│             ╭──────────────────────●──────────────────────╮            │
│       06:00 │              [ Solar Arc ]                  │ 20:00      │
│             ╰─────────────────────────────────────────────╯            │
│                                                                        │
│   CONTEXT HEADLINE                                                     │
│   "Short sleep (5.2h) with exam prep scheduled. Energy dip expected    │
│    at 16:00. Safe-to-Spend has ₹4,250 remaining."                      │
│                                                                        │
│   THE TIMESPINE                                                        │
│   ├── DONE     07:30   [H] Woke up (5.2h sleep · -2.8h debt)           │
│   ├── DONE     08:15   [H] Poha & Chai (~320 kcal · ₹30)               │
│   ├── DONE     09:30   [G] Focus: Organic Chem Ch 4 (90m)              │
│   ├── NOW      14:15   [H] Hydration Check (1.2L / 2.5L · Behind pace) │
│   ├── PLANNED  15:00   [G] Practice Problems (20 questions)            │
│   ├── DRIFTED  12:00   [G] 15m Walk (Missed · Rescheduled to 17:30)    │
│   └── NEXT     19:00   [W] Electricity Bill Due (₹1,200)               │
│                                                                        │
│   [ Review Today's Receipt (Unlocks at 20:30) ]                        │
└────────────────────────────────────────────────────────────────────────┘
```

### The 12 Surface States for Zenith
1. **Home Screen**: Circadian Arc hero at top; Context headline underneath; vertical TimeSpine showing chronological life markers with domain badges (`[H]`, `[G]`, `[W]`); Domain summary pills at bottom.
2. **Main Interaction**: Tapping any node on the TimeSpine opens its cross-domain detail sheet. Tapping the Solar Arc displays the daylight/circadian energy curve.
3. **Capture**: Tapping the center Dex Orb or pulling up from bottom opens the universal command console. Quick-capture direct action: "+" on TimeSpine allows manual placement of an event at a specific hour.
4. **Confirmation**: When an event is added to the TimeSpine, a gold pulse illuminates along the arc, momentarily highlighting the new node.
5. **Detail**: Tapping an event (e.g., `08:15 Poha & Chai`) opens a drawer showing connected domains: Health (nutrition breakdown, confidence badge) and Wealth (expense receipt, payment account).
6. **Edit**: In-place inline edit on TimeSpine allows dragging the time handle or editing notes directly without opening modal forms.
7. **Delete**: Swiping left on a TimeSpine event reveals `Delete`. A confirmation banner asks: *"Remove from Health and Wealth as well?"*
8. **History**: Tapping the date header opens the **Arc Calendar**, allowing the user to scrub backward through past days to view previous TimeSpines and Day Receipts.
9. **Empty State**: Dawn of a new day: Arc is empty except for the sunrise marker and baseline sleep log. Prompt: *"The arc of today is open. What is your single focus before noon?"*
10. **Loading State**: Subtle ambient glow breathes across the Solar Arc curve; TimeSpine items render subtle bone-shimmer lines maintaining exact height.
11. **Error State**: If sync fails, an ambient offline indicator displays: *"Offline mirror active. All time events preserved locally."*
12. **Cross-Domain Update**: When Dex executes *"I ate poha for ₹30"*, Zenith's TimeSpine dynamically slides in `08:15 [H] Poha & Chai (₹30)` under `DONE`, and the Context Headline recalculates daily spending pacing.

---

## 2. GROWTH (The Path)

### Metaphor & Philosophy
Growth is the **Execution Path**, not a chaotic to-do board. It enforces the **Rule of 3 (Top 3 Milestones)**, integrates a frictionless inline **Focus Runner**, tracks **Keystone Momentum** (with the *"Never Miss Twice"* recovery protocol), and highlights **Blockers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ GROWTH: THE PATH                                             TODAY     │
│                                                                        │
│   TODAY'S CRITICAL PATH (Top 3 Milestones)                             │
│   [1] ◉ Organic Chemistry Chapter 4 Synthesis Notes    [ACTIVE]        │
│       └── [ ▶ START FOCUS BLOCK (45m) ]  •  Est: 2 blocks              │
│   [2] ○ Solve 20 Practice Reaction Problems            [QUEUED]        │
│   [3] ○ Flashcard Review: Reaction Mechanisms          [QUEUED]        │
│                                                                        │
│   MOMENTUM (Keystones · Never Miss Twice)                              │
│   ├── [✓] Morning Sunlight 15m       (Streak: 12 days)                 │
│   ├── [✓] No Phone Before 09:00      (Streak: 4 days)                  │
│   └── [!] Evening Walk 20m           (Missed Yesterday · RECOVER TODAY)│
│                                                                        │
│   BLOCKERS & FRICTION                                                  │
│   ⚠️ Low sleep recovery (52%) may cause focus fatigue after 60 min.    │
│                                                                        │
│   ROADBED COMPLETED TODAY                                              │
│   ✓ Reviewed Class Notes (45m Focus Block)                             │
└────────────────────────────────────────────────────────────────────────┘
```

### The 12 Surface States for Growth
1. **Home Screen**: Top 3 Milestones linear card stack; Inline Focus Runner trigger; Keystone Habit momentum beads; Blocker notice.
2. **Main Interaction**: Tapping `[ ▶ START FOCUS BLOCK ]` smoothly expands the card into an ambient full-bleed Focus Runner with a circular elapsed ring, calm chime, and distraction guard.
3. **Capture**: Single "+ Add Milestone" input at the base of the Top 3. If 3 milestones already exist, adding a new one prompts: *"Your path is full. Swap with an existing milestone or move to Backlog?"*
4. **Confirmation**: Checking a milestone turns the checkbox into a cyan bead, sounds a 10ms haptic tick, and smoothly shifts the item to the "Completed Roadbed" below.
5. **Detail**: Tapping a milestone reveals linked focus sessions, notes, sub-steps, and deadline context.
6. **Edit**: Tapping milestone title enables inline text editing; dragging handles allows reordering Priority 1, 2, and 3.
7. **Delete**: Swiping left reveals `Archive` or `Delete`.
8. **History**: Scrubbing the top date bar displays past days' completed Roadbed and weekly habit consistency percentages.
9. **Empty State**: *"No milestones chosen for today. What is the single most important thing you must complete?"* with a 1-tap preset suggestion based on recent backlog.
10. **Loading State**: The Path roadbed displays skeleton pulses with cyan wireframes.
11. **Error State**: Non-blocking toast: *"Task sync delayed. Working offline."*
12. **Cross-Domain Update**: When Dex processes *"I slept 5 hours and my exam is tomorrow"*, Growth automatically injects *"Exam Final Revision Mock"* into Milestone slot 1 and caps suggested focus blocks to 2 sessions.

---

## 3. HEALTH (The Rhythm)

### Metaphor & Philosophy
Health is the **Circadian Rhythm**, not an obsessive fitness/calorie tracker. It communicates **Body State** (Recovery score, Sleep debt, Hydration pace) and displays a **Circadian Fuel Ribbon** where meals are classified as **`KNOWN`**, **`ESTIMATED`**, or **`UNKNOWN`**. Detailed calories and macros are available on tap, never shoved in the user's face.

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEALTH: THE RHYTHM                                           TODAY     │
│                                                                        │
│   BODY VITALITY HERO                                                   │
│   Recovery: 52% (Low)  •  "Running on short sleep; hydration critical" │
│   ~~~~~~~~~~~~~~~~~~~~ Circadian Wave ~~~~~~~~~~~~~~~~~~~~             │
│                                                                        │
│   CIRCADIAN FUEL RIBBON                                                │
│   08:00              13:30               20:00                         │
│   [● Breakfast]      [● Lunch]           [○ Dinner Expected]           │
│   Poha + Chai        Thali (~550 kcal)                                 │
│   ~320 kcal (EST)    ESTIMATED                                         │
│                                                                        │
│   FUEL STATE OVERVIEW                                                  │
│   Meals Logged: 2  •  Fueling: Moderate  •  Protein Pace: Fair         │
│   [ Inspect Calories & Macro Breakdown (870 kcal total) ▾ ]            │
│                                                                        │
│   HYDRATION RHYTHM                                                     │
│   1.4L / 2.5L Target  •  Behind Pace (-300ml)                          │
│   [ + 250ml Glass ]   [ + 500ml Bottle ]                               │
│                                                                        │
│   REST & SLEEP DEBT                                                    │
│   Last Night: 5h 15m  •  Debt: -2h 45m  •  Target: 8h 00m              │
└────────────────────────────────────────────────────────────────────────┘
```

### The 12 Surface States for Health
1. **Home Screen**: Body Vitality Hero (recovery %, sleep debt summary); Circadian Fuel Ribbon; Fuel State overview; Hydration Rhythm with quick-tap water loggers; Rest & Sleep card.
2. **Main Interaction**: Tapping `[ + 250ml Glass ]` increments hydration with an organic liquid ripple animation and adjusts the hydration rhythm indicator.
3. **Capture**: Tapping "+ Log Fuel" opens the Health Command Bar:
   ```
   [ Health Bar: "Had 2 boiled eggs and black coffee" ]
   → Interprets: 2 Boiled Eggs (KNOWN: 140 kcal, 12g P) + Coffee (KNOWN: 5 kcal)
   → Confidence: KNOWN
   → [ Confirm ]
   ```
4. **Confirmation**: Meal appears on the Circadian Fuel Ribbon at the exact current time with a green confidence pip.
5. **Detail**: Tapping any meal opens the **Nutrition Transparency Sheet**:
   - Shows Food Name, Serving Count, Confidence Tag (`KNOWN` vs `ESTIMATED`).
   - Macro breakdown: Calories, Protein, Carbs, Fat, Fiber.
   - Shows estimation source: *"Deterministic match from Verified Food DB"* or *"Estimated regional portion"*.
6. **Edit**: User can tap any value (e.g., change `1 Plate` to `1.5 Plates` or manually adjust Protein from `12g` to `18g`). When edited, the system marks the record as `KNOWN` with `user_edited: true`.
7. **Delete**: Tapping "Delete Meal" prompts: *"Delete this fuel log? If this was linked to a Wealth expense, the expense will remain unless deleted separately."*
8. **History**: Allows toggling between Today, Yesterday, This Week, and Month with rolling averages of sleep debt, hydration consistency, and fuel timing.
9. **Empty State**: Morning before breakfast: Circadian ribbon shows quiet wave. Headline: *"Awaiting first fuel. Hydration rhythm starting now."*
10. **Loading State**: Smooth emerald liquid shimmer across the biometric wave.
11. **Error State**: *"Unable to retrieve food database item. Logged as generic meal note."*
12. **Cross-Domain Update**: When Dex captures *"I ate poha for ₹30"*, Health creates a meal node at the morning position on the Fuel Ribbon tagged as `ESTIMATED (~280 kcal)`.

---

## 4. WEALTH (The Flow)

### Metaphor & Philosophy
Wealth is the **Financial Current**. It completely rejects cluttered accounting ledgers. The single visual hero is **Safe-to-Spend**: an explainable, trust-driven number calculated from liquid assets minus committed bills and debt promises.

```
┌────────────────────────────────────────────────────────────────────────┐
│ WEALTH: THE FLOW                                             TODAY     │
│                                                                        │
│   UNENCUMBERED FLOW (The Hero)                                         │
│   ₹4,250                                                               │
│   Safe-to-Spend Right Now (Next 7 Days Safe)                           │
│   [ Why is this number ₹4,250? (Explainable Flow Waterfall) ▾ ]        │
│                                                                        │
│   THE CASH RESERVOIR                                                   │
│   Total Liquid Assets: ₹18,600                                         │
│   ├── HDFC Main:   ₹14,200                                             │
│   └── Cash/Wallet:  ₹4,400                                             │
│                                                                        │
│   THE COMMITTED STREAM (Next 14 Days)                                  │
│   - ₹9,500   Rent (Due in 5 days)                                      │
│   - ₹3,850   Electricity & Wi-Fi                                       │
│   - ₹1,000   Lent to Rahul (Promise: Due Tomorrow)                     │
│                                                                        │
│   TODAY'S FLOW STREAM (Recent Activity)                                │
│   Spent Today: ₹380  •  3 Outflows                                     │
│   ├── ₹30   Poha Breakfast  [Health: Meal]                             │
│   ├── ₹150  Metro Recharge                                             │
│   └── ₹200  Stationery & Photocopies                                   │
│   [ + Quick Expense / Income / Move ]                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### The Explainable Safe-to-Spend Waterfall
When the user taps *"Why is this number ₹4,250?"*, it expands:
```
  Total Liquid Balances:        + ₹18,600
- Committed Upcoming Bills:     - ₹13,350
- Safety Reserve Floor:         - ₹1,000
-----------------------------------------
= Safe-to-Spend (Unencumbered):   ₹4,250
```

### The 12 Surface States for Wealth
1. **Home Screen**: Safe-to-Spend Hero; Cash Reservoir list; Committed Stream; Today's Outflows stream with cross-domain badges.
2. **Main Interaction**: Tapping `[ + Quick Expense ]` opens a 3-tap bottom sheet: Amount $\rightarrow$ Category preset $\rightarrow$ Account.
3. **Capture**: Natural capture via Dex or in-app keyboard. Example: `30` $\rightarrow$ tap `Food` $\rightarrow$ Done.
4. **Confirmation**: Safe-to-Spend immediately recalculates with a subtle decrement animation; newly added transaction slides into the Flow Stream.
5. **Detail**: Tapping a transaction displays amount, timestamp, account deducted, category, and any linked cross-domain entity (e.g., `Linked to Health Meal: Poha`).
6. **Edit**: Direct editing of amount, date, account, or category with instant recalculation of Safe-to-Spend.
7. **Delete**: Swiping left reveals `Delete`. Deducted cash is instantly refunded to the account balance and Safe-to-Spend rises.
8. **History**: Filterable by Month, Week, Category, or Account with cash flow comparison charts (Income vs Expense vs Savings).
9. **Empty State**: No spending today: *"Zero outflows today. Your Safe-to-Spend is fully intact at ₹4,250."*
10. **Loading State**: Subtle emerald pulse across balance figures with preserved number layout.
11. **Error State**: Non-blocking banner: *"Account sync unavailable. Offline ledger active."*
12. **Cross-Domain Update**: When Dex captures *"I ate poha for ₹30"*, Wealth records an expense of ₹30 under Food & Dining, attaches a `[Health: Meal]` badge, and reduces Safe-to-Spend by ₹30.

---

## 5. DEX (The Command & Ripple)

### Metaphor & Philosophy
Dex is the **Command & Ripple Console**, not a grid of buttons. It is accessed via the omnipresent central Orb or bottom swipe. It executes deterministic operations natively and reserves Gemini AI for contextual reasoning. Every cross-domain action presents a **Ripple Proposal Card** with clear domain previews and 1-tap confirmation.

```
┌────────────────────────────────────────────────────────────────────────┐
│ DEX COMMAND CONSOLE                                          [ ✕ Close ]│
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ "I ate poha for ₹30"                                 [ 🎙️ ⏎ ] │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   PROPOSED MULTI-DOMAIN RIPPLE                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ 🟢 HEALTH · Log Meal                                         │     │
│   │    • Food: Poha (1 plate)                                    │     │
│   │    • Nutrition: ~280 kcal · 5g Protein · ESTIMATED           │     │
│   │    • Timing: Breakfast (08:15 AM)                            │     │
│   ├──────────────────────────────────────────────────────────────┤     │
│   │ 🟢 WEALTH · Log Expense                                      │     │
│   │    • Amount: ₹30.00                                          │     │
│   │    • Category: Food & Dining                                 │     │
│   │    • Source: Primary Cash / UPI                              │     │
│   ├──────────────────────────────────────────────────────────────┤     │
│   │ 🟡 ZENITH · Update TimeSpine                                 │     │
│   │    • Insert event at 08:15 AM marker                         │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   [ Discard ]                                [ Confirm & Apply (⏎) ]   │
│                                                                        │
│   ------------------------------------------------------------------   │
│   CONTEXTUAL MEMORY & AUDIT TRAIL                                      │
│   ✓ 09:30 AM: Injected Focus Block: Organic Chem (90m) [Undo]          │
└────────────────────────────────────────────────────────────────────────┘
```

### The 12 Surface States for Dex
1. **Home Screen / Console**: Floating Command Input Bar; Recent Ripple Audit Trail; Contextual suggestion chips (*"How much did I spend this week?"*, *"Review today's focus"*).
2. **Main Interaction**: User types or speaks a compound life sentence.
3. **Capture**: Omnipresent bottom-sheet modal with automatic auto-focus on text bar or instant microphone streaming.
4. **Confirmation**: The multi-domain Ripple Card shows each affected domain with its planned mutation. User taps `[ Confirm & Apply ]` or presses Enter.
5. **Detail**: Tapping any domain row inside the Ripple card allows fine-tuning before execution (e.g., changing ₹30 to ₹40 or adjusting meal portion).
6. **Edit**: Once executed, Dex displays an inline `[ Undo ]` chip for 10 seconds.
7. **Delete**: User can issue natural language deletion: *"Delete the breakfast I just logged"* $\rightarrow$ Dex resolves target record and requests confirmation.
8. **History**: Scrollable conversational and command log with search filter.
9. **Empty State**: *"Dex is listening. Tell me what happened, or ask about your day."*
10. **Loading State**: Subtle violet laser ripple traverses the input border while deterministic resolvers parse entities.
11. **Error State**: If ambiguous: *"I recognized Poha (~280 kcal), but wasn't sure about the payment account. Default to Cash?"*
12. **Cross-Domain Update**: Dex is the origin point of all cross-domain operations.

---

## 6. DAY RECEIPT (The Editorial)

### Metaphor & Philosophy
The Day Receipt is a **Tactile Editorial Artifact**, not an analytics dashboard. It triggers in the evening ($> 20:30$) or on demand. It provides closure, celebrates recovery, balances the day's numbers, and sets tomorrow's anchor.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Z Y R B I T                               │
│                         D A Y  R E C E I P T                           │
│                     Tuesday, 24 September 2026                         │
│ ────────────────────────────────────────────────────────────────────── │
│                                                                        │
│   THE RETROSPECTIVE                                                    │
│   "A high-cognitive-load day handled with discipline. Despite short    │
│    sleep recovery (5.2h), you protected 2 hours of deep focus for your │
│    exam prep and kept discretionary spending within safe limits."      │
│                                                                        │
│   THE DAILY LEDGER                                                     │
│   ├── Focus Completed:       2h 15m across 2 blocks                    │
│   ├── Critical Milestones:   2 of 3 achieved                           │
│   ├── Keystone Habits:       3 of 4 maintained                         │
│   ├── Fuel & Nutrition:      3 meals logged (1,420 kcal, Estimated)   │
│   ├── Hydration Reached:     2.1L / 2.5L target                        │
│   └── Financial Outflow:     ₹380.00 (Safe-to-Spend remains ₹4,250)    │
│                                                                        │
│   TOMORROW'S ANCHOR                                                    │
│   Organic Chemistry Mock Exam at 09:00 AM. Sleep target: 22:30 PM.     │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────── │
│                         [ Close Day & Rest ]                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION D: CROSS-DOMAIN INTERACTION FLOWS

### Deep Trace 1: *"I ate poha for ₹30."*
```
[ User Input in Dex ] ──► "I ate poha for ₹30."
                                │
                        [ Dex Orchestrator ]
           ├── Intent A: Log Fuel (Food: "poha", Price: ₹30)
           └── Intent B: Log Expense (Amount: 30, Cat: Food)
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
      [ Food Resolver ]                    [ Wealth Resolver ]
• DB Lookup: 'poha'                  • Category: 'Food & Dining'
• Cal: ~280 kcal, P: ~5g             • Outflow: ₹30.00
• Confidence: ESTIMATED              • Account: Primary Cash / UPI
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                    [ Proposed Ripple Preview ]
          Shows Health card + Wealth card + Zenith marker
                                │
                     [ User Taps "Confirm" ]
                                │
                    [ Central ActionExecutor ]
       ├── Writes to `meal_logs` (health_meals)
       └── Writes to `wealth_transactions`
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
 [ Health Surface ]       [ Wealth Surface ]       [ Zenith Surface ]
• Injects meal node      • Subtracts ₹30 from     • Adds 08:15 event on
  into Circadian           Safe-to-Spend            TimeSpine:
  Fuel Ribbon              (₹4,280 ➔ ₹4,250)        "Poha & Chai (₹30)"
• Updates Fuel State     • Appends transaction    • Daily spend pulse
  to Moderate              with [Health: Meal]      increments by ₹30
                           badge
```

### Deep Trace 2: *"I slept 5 hours and my exam is tomorrow."*
```
[ User Input in Dex ] ──► "I slept 5 hours and my exam is tomorrow."
                                │
                        [ Dex Orchestrator ]
           ├── Biometric Entity: Sleep = 5.0 hours
           └── Cognitive Urgency: Exam tomorrow (Priority 1 Event)
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
      [ Health Resolver ]                  [ Growth Resolver ]
• Duration: 5.0h                     • Injects Priority Milestone 1:
• Target: 8.0h                         "Exam Final Revision Mock"
• Debt: -3.0 hours                   • Caps Focus Blocks to max 2
• Recovery Score: 52% (Low)            (45m each) with forced breaks
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                     [ Zenith System Arc ]
• Solar Arc displays Amber Recovery warning.
• Context Headline updates:
  "Short sleep recovery (5.2h). Exam tomorrow. Pace cognitive energy;
   schedule afternoon recharge; defend 22:30 sleep window."
• TimeSpine reserves 14:00–16:00 for Exam Focus Block and marks 22:30
  as Mandatory Sleep Anchor.
```

---

# SECTION E: MOBILE INTERACTION MODEL

```
┌────────────────────────────────────────────────────────┐
│                   TOP STATUS / HORIZON                 │
│  [Date / Day]                         [Offline Status] │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    MAIN CANVAS AREA                    │
│             (Scrollable Domain Viewport)               │
│                                                        │
├────────────────────────────────────────────────────────┤
│              THE THUMB ZONE (Bottom 35%)               │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │           DEX COMMAND SHEET TRIGGER            │   │
│   │      [ 🎙️ "Tell Dex what happened..." ]        │   │
│   └────────────────────────────────────────────────┘   │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │ [Zenith]  [Growth]   ( ⊙ )   [Health] [Wealth] │   │
│   │   Arc      Path     DEX ORB   Rhythm    Flow   │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```
1. **Thumb Zone Ergonomics**: All actionable buttons, navigation items, and the Dex Orb sit strictly within the lower 35% of the mobile screen.
2. **Sheet Detents**: Dex expands upward in 3 fluid detents:
   - *Detent 1 (Collapsed, 56px)*: Ambient command pill.
   - *Detent 2 (Half-Sheet, 45%)*: Active Ripple confirmation preview.
   - *Detent 3 (Full-Sheet, 90%)*: Deep Q&A, search, and Day Receipt editorial view.
3. **Haptic Hierarchy**:
   - *10ms light tick*: Habit toggle, water increment.
   - *25ms medium tick*: Dex mutation execution, milestone completion.
   - *Double alert buzz*: Bill due within 24h, Safe-to-Spend threshold breached.

---

# SECTION F: FIRST-USER EXPERIENCE (Conversational Seeding)

### Step 1: The Ambient Welcome (10 seconds)
Screen fades in from obsidian black. A clean off-white typographic mark:
> *"Welcome to Zyrbit. The personal operating system for your real life."*

### Step 2: The Single Seed Question (20 seconds)
No 15-field profile forms. Dex presents one simple input prompt:
> *"Tell Dex: What does your day look like right now?"*  
> *e.g., "I have an exam tomorrow, slept 6 hours, and have ₹3,000 in my account."*

### Step 3: Instant Multi-Domain Initialization (15 seconds)
Dex parses the input and initializes the entire OS:
- **Health**: Baseline sleep set to 6h (Recovery: 68%).
- **Wealth**: Liquid cash account initialized to ₹3,000 (Safe-to-Spend: ₹3,000).
- **Growth**: Milestone 1 initialized to "Prepare for Exam".
- **Zenith**: Circadian Arc calibrated to the current local minute.

The user lands on a **live, fully populated Zenith Arc in under 45 seconds**.

---

# SECTION G: SELLABLE PRODUCT DIFFERENTIATORS

1. **Single-Sentence Multi-Domain Resolution**: Speak once, update four domains. No other software connects *"I ate poha for ₹30"* into an estimated fuel log, an expense outflow, and a timeline update.
2. **Deterministic Trust Over AI Guesswork**: Financial balances, habit streaks, and task completions are governed by 100% deterministic code. AI is strictly used for language comprehension and contextual synthesis.
3. **Calm Technology**: Zero spam notifications, zero gamification tricks, zero ads. Built to reduce mental load, not demand attention.
4. **Explainable Financial Clarity**: Replaces confusing budgeting software with a single, trustworthy number: **Safe-to-Spend**.

---

# SECTION H: ZYRBIT VS. EXISTING APPS

| Feature / Dynamic | Generic Apps (Notion, Todoist, YNAB, MFP) | Zyrbit Personal OS |
|---|---|---|
| **Data Architecture** | Fractured across 4-5 apps with zero integration. | 1 unified Postgres schema shared across all domains. |
| **Input Method** | Tedious manual form filling in each individual app. | Unified natural language command with multi-domain ripple. |
| **Cognitive Load** | High — user must manually remember to cross-update. | Low — cross-domain implications are resolved automatically. |
| **Food & Nutrition** | Obsessive, clinical calorie/macro counting. | Circadian Fuel Rhythm with Known/Estimated/Unknown tiers. |
| **Money Management** | Complex monthly zero-based budgeting spreadsheets. | Clear, explainable daily Safe-to-Spend current. |
| **Daily Closure** | App notifications demand user engagement at night. | Editorial Day Receipt provides psychological closure. |

---

# SECTION I: IMPLEMENTATION DIRECTIVES FOR ANTIGRAVITY

1. **Token Hierarchy**: Import and apply the functional color tokens defined in Section B (`--accent-zenith`, `--accent-growth`, etc.) across `src/design/theme.css`.
2. **Metaphor Purity**:
   - In `src/pages/Zenith/index.jsx`: Replace card grid with the **Circadian Arc** and vertical **TimeSpine**.
   - In `src/pages/Growth/index.jsx`: Enforce the **Rule of 3 Milestones** and inline focus runner.
   - In `src/pages/Health/index.jsx`: Render the **Circadian Fuel Ribbon** and contextual fuel states.
   - In `src/pages/Wealth/index.jsx`: Elevate **Safe-to-Spend** hero with the explainable waterfall.
   - In `src/components/dex/`: Embed the **Multi-Domain Ripple Card** with pre-mutation confirmation.
3. **Deterministic Query Routing**: Expand deterministic regex handlers in `src/dex/dexOrchestrator.js` to intercept financial aggregations and meal searches before invoking Gemini API.

---

# SECTION J: ARCHITECTURAL INVARIANTS (DO NOT MODIFY)

1. **Remote Database Schema**: All 19 verified Supabase tables (`meal_logs`, `focus_sessions`, `wealth_transactions`, etc.) must remain unchanged. No renaming of columns or altering foreign keys.
2. **Row-Level Security (RLS)**: Every database query and subscription must be scoped to `auth.uid() = user_id`.
3. **Central Action Execution**: All state mutations must flow through `src/actions/actionExecutor.js`. Direct component-level writes for shared entities are prohibited.
4. **Gemini API Consolidation**: All LLM calls remain strictly centralized in `src/lib/gemini.js` via `askZyra` and `generateContent`.
5. **5-Anchor Navigation Root**: The five anchors (Zenith, Growth, Dex, Health, Wealth) are the permanent backbone of Zyrbit.
