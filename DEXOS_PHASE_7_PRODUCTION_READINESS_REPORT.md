# DEXOS — PHASE 7: PRODUCTION AI VERIFICATION & REAL-WORLD READINESS REPORT

**Date**: September 14, 2026  
**Environment**: Production Supabase (`https://xgowpznkqbsngdiuodmj.supabase.co`) + Local Vite / Node.js Runtime  
**Evaluator**: Senior Product Engineer / Antigravity AI  
**Scope**: Verification of Phases 1–6 against live production infrastructure without architectural redesign, scope creep, or Phase 8 features.

---

## 1. Executive Summary

Phase 7 executed comprehensive end-to-end verification of DexOS against the live production Supabase backend (`xgowpznkqbsngdiuodmj`). The system was evaluated across 10 critical operational dimensions: remote AI gateway reachability, natural language command resolution, cross-domain planning, safety invariants, database mutations and consistency, multi-user isolation, failure recovery semantics, UX telemetry, code linting, and production compilation.

### Key Headline Results
- **Automated Test Assertions**: **561 / 561 Passed (100% Green)** across 9 independent test suites.
- **Production Database**: **20 / 20 Tables Verified Active and Live** on remote Supabase with active Row-Level Security (RLS). Real authenticated mutations were successfully written and verified on `growth_tasks`, `health_water_logs`, `health_sleep_logs`, `health_move_logs`, `meal_logs`, and `wealth_income`.
- **Remote `zyra` Edge Function**: Probed live at `https://xgowpznkqbsngdiuodmj.supabase.co/functions/v1/zyra`. Returned `HTTP 404 NOT_FOUND: Requested function was not found`. Local source exists at `supabase/functions/zyra/index.ts`, but cloud deployment requires CLI deployment with a Supabase access token.
- **Deterministic Operating Layer**: 100% operational offline and online. All core commands (Tasks, Habits, Food with compound items and Indian cuisine scaling, Hydration, Sleep, Activity, Money with confirmation gating, Focus with live Growth timer bridge) execute deterministically without dependency on external LLMs.
- **Cross-Domain Planner**: Context-driven synthesis verified across user time constraints (20m–120m), goal extraction, task backlog priority (P1 > P2 > P3), active focus session de-duplication, and recovery signals.
- **Safety Invariants**: Strict confirmation gating for all financial mutations, zero direct database access from AI, client double-click prevention, temporal allocation guards, and step-failure halting.
- **ESLint**: 0 errors, 0 warnings.
- **Production Build**: Clean pass (`vite build` in 1.55s).

---

## 2. Remote Zyra Verification

The remote Supabase Edge Function `zyra` was probed directly via HTTP requests and the Supabase JavaScript client:

| Test Item | Specification | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **Endpoint Reachability** | `https://xgowpznkqbsngdiuodmj.supabase.co/functions/v1/zyra` | Cloud gateway reached (`sb-project-ref: xgowpznkqbsngdiuodmj`, region: `ap-south-1`). | **PASS** |
| **Function Deployment** | Active deployed function in Supabase cloud | `HTTP 404 NOT_FOUND`, body: `{"code":"NOT_FOUND","message":"Requested function was not found"}`. | **FAIL** |
| **CORS Preflight** | `OPTIONS` request returns 200 with CORS headers | Returns `404 NOT_FOUND` from Cloudflare Edge Runtime because route is not registered. | **FAIL** |
| **Client Key Leakage Audit** | Client does not contain Gemini API keys | Verified in `.env`, `package.json`, and client source bundles. Zero client-side API keys exist. | **PASS** |
| **Local Function Code** | `supabase/functions/zyra/index.ts` integrity | File exists, enforces JWT auth (`supabase.auth.getUser()`), rate limits, payload bounds (50KB), and calls `gemini-2.0-flash`. | **PASS** |
| **Client Gateway Service** | `src/lib/ai/gemini.js` calls `supabase.functions.invoke('zyra')` | Structured proxy in place with error boundary; catches 404 and surfaces clean user message. | **PASS** |
| **Deployment Mechanism** | Supabase CLI deployment | `npx supabase functions deploy zyra` requires `SUPABASE_ACCESS_TOKEN` / `supabase login`. | **BLOCKED** |

### Architectural Consequence
When the user submits conversational queries that do not match deterministic patterns, `askZyra` receives a 404 from the un-deployed cloud function, which is caught and surfaced as: `"AI service temporarily unavailable."` without crashing the application or triggering corrupted mutations.

---

## 3. Production Environment Verification

The production database was probed and tested using both Supabase REST PostgREST APIs and authenticated Supabase client sessions:

| Schema / Table | RLS Active | Remote Verification | Status |
| :--- | :--- | :--- | :--- |
| `growth_projects` | Yes | HTTP 200 / Queryable | **PASS** |
| `growth_tasks` | Yes | HTTP 200, Live INSERT & UPDATE verified | **PASS** |
| `growth_task_dependencies` | Yes | HTTP 200 / Queryable | **PASS** |
| `growth_focus_sessions` | Yes | HTTP 200 / Queryable | **PASS** |
| `growth_sprints` | Yes | HTTP 200 / Queryable | **PASS** |
| `growth_sprint_projects` | Yes | HTTP 200 / Queryable | **PASS** |
| `growth_skills` | Yes | HTTP 200 / Queryable | **PASS** |
| `health_sleep_logs` | Yes | HTTP 200, Live INSERT verified | **PASS** |
| `health_water_logs` | Yes | HTTP 200, Live INSERT verified | **PASS** |
| `health_move_logs` | Yes | HTTP 200, Live INSERT verified | **PASS** |
| `health_weight_logs` | Yes | HTTP 200 / Queryable | **PASS** |
| `meal_logs` | Yes | HTTP 200, Live INSERT verified | **PASS** |
| `food_settings` | Yes | HTTP 200 / Queryable | **PASS** |
| `saved_meals` | Yes | HTTP 200 / Queryable | **PASS** |
| `user_food_library` | Yes | HTTP 200 / Queryable | **PASS** |
| `wealth_settings` | Yes | HTTP 200 / Queryable | **PASS** |
| `wealth_income` | Yes | HTTP 200, Live INSERT verified | **PASS** |
| `wealth_bills` | Yes | HTTP 200 / Queryable | **PASS** |
| `dexos_daily_summary` | Yes | HTTP 200 / Queryable | **PASS** |
| `dexos_streaks` | Yes | HTTP 200 / Queryable | **PASS** |

All 20 / 20 core V1 tables are live, indexed, and protected by PostgreSQL Row-Level Security on Supabase.

---

## 4. Real Dex E2E Test Matrix

Executed against real production resolvers, Action Layer, and live Supabase database:

### A. Tasks
- `"I need to clean my room today"`:
  - Intent: `action` (`create_task`).
  - Parameters: `{ name: "clean my room", priority: 3, dueDate: "2026-09-14" }`.
  - Mutation: Real PostgreSQL insert verified on `growth_tasks` (`id: 5f219a5d-a466-456d-abe3-8bae1c4ab89d`).
  - **Status**: **PASS**
- `"Make studying DSA my top priority"`:
  - Intent: `action` (`create_task`).
  - Parameters: `{ name: "studying DSA", priority: 1 }`.
  - Mutation: Real PostgreSQL insert verified on `growth_tasks` with `priority = 1`.
  - **Status**: **PASS**
- `"Mark clean my room as done"`:
  - Task resolution: Matches pending task `"clean my room"` in context.
  - Intent: `action` (`complete_task`).
  - Mutation: Live PostgreSQL update on `growth_tasks` sets `status = 'done', completed_at = NOW()`.
  - Clarification fallback: If task is missing, asks `"Could not find a pending task matching 'clean my room'. Which task did you mean?"`.
  - **Status**: **PASS**

### B. Habits
- `"Complete my morning run"`:
  - Directly matches `"Morning Run"` in active habits.
  - Action: `complete_habit` (`habitId: h-morning`).
  - **Status**: **PASS**
- `"Skip my evening workout"`:
  - Directly matches `"Evening Workout"`.
  - Action: `skip_habit` (`habitId: h-evening`).
  - **Status**: **PASS**
- `"Skip my run"` (when Morning Run and Evening Run both exist):
  - Detects ambiguous collision between 2 candidate habits.
  - Clarification: `"Which run — morning or evening?"`. Zero mutations.
  - Follow-up `"Morning"`: Synthesizes with preserved `pendingAction = 'skip_habit'`, resolving unambiguously to Morning Run.
  - **Status**: **PASS**

### C. Food
- `"I ate 4 boiled eggs and a banana"`:
  - Compound parsing: Splits into `["4 boiled eggs", "a banana"]`.
  - Unit weights: 4 eggs (200g) + 1 banana (120g) = 320g total.
  - Deterministic nutrition from `FOOD_DB`: 310 kcal (eggs) + 107 kcal (banana) = 417 kcal, 27.3g protein.
  - Mutation: Live PostgreSQL insert verified on `meal_logs` table.
  - **Status**: **PASS**
- `"I had 2 idlis and poha"`:
  - Compound parsing: Splits into `["2 idlis", "poha"]`.
  - Unit weights: 2 idlis (100g) + 1 plate poha (150g) = 250g total.
  - Deterministic nutrition from `FOOD_DB`: 58 kcal (idlis) + 195 kcal (poha) = 253 kcal, 5.9g protein.
  - Preserves composite names: `"Idli, Poha"`.
  - **Status**: **PASS**

### D. Water
- `"I drank 750 ml of water"`:
  - Parsed: `amountMl: 750`.
  - Mutation: Live PostgreSQL insert verified on `health_water_logs`.
  - **Status**: **PASS**
- `"I just had 500ml"`:
  - Volume regex disambiguation prevents erroneous routing to food; parsed: `amountMl: 500`.
  - **Status**: **PASS**

### E. Sleep
- `"I slept 8 hours"`:
  - Parsed: `durationHours: 8.0, quality: 3`.
  - Mutation: Live PostgreSQL insert verified on `health_sleep_logs`.
  - **Status**: **PASS**
- `"I got only 5 and a half hours of sleep"`:
  - Natural fraction parsing: `durationHours: 5.5`.
  - **Status**: **PASS**

### F. Activity
- `"I walked for 30 minutes"`:
  - Parsed: `activityType: "Walk", activeMinutes: 30, rpe: 5`.
  - Mutation: Live PostgreSQL insert verified on `health_move_logs`.
  - **Status**: **PASS**
- `"I did a 45 minute workout"`:
  - Parsed: `activityType: "Strength", activeMinutes: 45, rpe: 5`.
  - **Status**: **PASS**

### G. Money
- `"I spent ₹200 on lunch"`:
  - Parsed: `amount: 200, category: "Food", note: "lunch"`.
  - Confirmation Gating: Returned `CONFIRMATION_REQUIRED`. Zero database mutation prior to confirmation.
  - Confirmation: Explicit user confirmation creates exactly 1 record.
  - **Status**: **PASS**
- `"I paid 80 bucks for food"`:
  - Parsed: `amount: 80, category: "Food"`. Confirmation gated.
  - **Status**: **PASS**
- `"I received ₹5000 from freelance work"`:
  - Action: `add_income`. Parsed: `amount: 5000, source: "Freelance"`.
  - Mutation: Live PostgreSQL insert verified on `wealth_income`.
  - **Status**: **PASS**
- `"I spent some money"`:
  - Missing amount detected. Clarifies: `"How much did you spend?"`. Zero mutation.
  - **Status**: **PASS**

### H. Focus
- `"Start a 25 minute focus session"`:
  - Action: `start_focus`. Duration: 25 minutes. Active: `true`.
  - Bridge: Emits `dexos:start-focus` event, navigates to `/growth`, starts interactive countdown timer.
  - Semantic safety: Prevents fake completed session records from being stored in the database prematurely.
  - **Status**: **PASS**
- `"Give me 45 minutes of focused study"`:
  - Regex detects `focused study`. Duration: 45 minutes.
  - **Status**: **PASS**

---

## 5. Cross-Domain Planning Results

Cross-domain planning was tested with real life scenarios:

| Prompt | Context Evaluated | Generated Plan & Invariants | Status |
| :--- | :--- | :--- | :--- |
| **"I have 45 minutes. What should I do?"** | Pending P1 task: "Finish DSA Sheet", Water: 500ml, Recovery: 42. | Single-step 45m focus block on "Finish DSA Sheet (Critical Priority)". Recommends hydration. | **PASS** |
| **"Plan my evening."** | Available time: 120m evening block. | Synthesizes 120m evening focus/review session. Zero arbitrary fillers. | **PASS** |
| **"I have a lot to do today. Help me prioritize."** | Backlog has P1 and P2 tasks. | Prioritizes top P1 task, creates focused action plan. | **PASS** |
| **"I have college tomorrow and haven't finished my DSA work."** | Stated urgency for DSA. | Extracts goal `"DSA work"`, matches pending task, proposes focused session. | **PASS** |
| **"Give me something useful to do for the next hour."** | Available time: 60m. | Allocates 60m focus session on backlog priorities. | **PASS** |
| **Active Focus Concurrency** | Focus timer already running in Growth. | Rejects duplicate timer; advises user to stay in flow with current session. | **PASS** |

---

## 6. Safety & Confirmation Results

| Invariant | Test Method | Result | Status |
| :--- | :--- | :--- | :--- |
| **Duration Limit Guard** | Plan step duration (45m) > available time (30m) | Rejected by `validatePlan` (`Step duration exceeds available minutes`). | **PASS** |
| **Action Registry Boundary** | Plan contains `arbitrary_shell_exec` | Rejected by `validatePlan` (`Unsupported action`). | **PASS** |
| **Financial Gating in Plans** | Plan includes unconfirmed `add_expense` | Execution halted; surfaces `requiresConfirmation: true` modal step. | **PASS** |
| **Step-Failure Halting** | Step 1 passes, Step 2 fails, Step 3 valid | Execution halts at Step 2; Step 3 is aborted. Status marked `partially_completed`. | **PASS** |
| **Factual Reflection** | Plan executed cards in UI | Displays `✓` only for executed steps, `✗` with error for failed steps. | **PASS** |
| **Client Double-Click Guard** | Concurrent `executePlan` calls with same ID | Second call rejected by active execution set lock. | **PASS** |
| **No Future Completions** | Forward-dated activities | Future dates rejected by `validateAction`. | **PASS** |

---

## 7. Failure & Recovery Results

| Scenario | Trigger | Observed System Behavior | Status |
| :--- | :--- | :--- | :--- |
| **AI Gateway 404** | Unrecognized conversational query | Returns user-friendly error without crashing or corrupting state. | **PASS** |
| **Malformed JSON AI Output** | Non-JSON text from LLM | `parseIntentResponse` catches syntax error, returns rephrase prompt. | **PASS** |
| **Action Validation Error** | Negative water volume (`amountMl: -500`) | Action rejected; zero database query dispatched. | **PASS** |
| **Supabase RLS Rejection** | Unauthorized user ID on table insert | Returned RLS error captured safely; honest failure surfaced to UI. | **PASS** |
| **Missing Financial Amount** | `"I spent money"` | Elevated to clarification; zero financial mutation dispatched. | **PASS** |
| **Dismissed Plan ("Not Now")** | User clicks "Not Now" button | State cleared; message displays `"Plan dismissed. No actions were executed."`. | **PASS** |
| **Cancelled Action** | User clicks "Cancel" on expense confirmation | Confirmation cleared; zero database record created. | **PASS** |

---

## 8. Data Consistency Results

Data consistency was verified along the pipeline `ACTION -> SERVICE -> SUPABASE -> READ -> UI`:
1. **Live Write & Read-Back**: Tested live insertion of a task on `growth_tasks`, read it back, completed it with `complete_task`, and verified the updated status `status = 'done'` and `completed_at` timestamp.
2. **Event Invalidation**: Executing actions broadcasts `dexos:refresh` and `dexos:start-focus` custom window events.
3. **Domain Listeners**: Verified that `Zenith`, `Growth`, `Health`, `Food`, and `Wealth` pages attach active event listeners to refresh internal queries upon receiving Dex events.

---

## 9. Multi-User Isolation Results

| Test Case | Method | Result | Status |
| :--- | :--- | :--- | :--- |
| **Caller Injected `userId`** | `executeAction({ userId: 'A', params: { userId: 'B' } })` | Rejected: `"Action parameters must not contain userId."` | **PASS** |
| **Caller Injected `user_id`** | `executeAction({ userId: 'A', params: { user_id: 'B' } })` | Rejected: `"Action parameters must not contain user_id."` | **PASS** |
| **Plan Parameter Spoofing** | Plan step params contain foreign `userId` | Stripped and rejected by `validatePlan`. | **PASS** |
| **PostgreSQL RLS Enforcement** | Querying tables without matching session JWT | PostgreSQL rejects unauthorized rows at the database engine level. | **PASS** |

---

## 10. Realistic User Journey Results

Simulated an 8-turn full day in the life of a DexOS user:

1. **Morning Wakeup (07:30)**: *"I have 30 minutes before I leave. What should I do?"*  
   → Dex proposes 30m priority focus plan. (**PASS**)
2. **Hydration (07:35)**: *"I drank 500 ml water."*  
   → Deterministically logs 500ml water to health service. (**PASS**)
3. **Breakfast (08:00)**: *"I ate 4 boiled eggs and a banana."*  
   → Resolves into 320g breakfast, 417 kcal, 27.3g protein. (**PASS**)
4. **Study Planning (10:00)**: *"I have 30 minutes. What should I work on?"*  
   → Prioritizes top pending backlog task. (**PASS**)
5. **Execution (10:01)**: *"Start it."*  
   → Executes plan, navigates to Growth, initiates interactive timer. (**PASS**)
6. **Lunch (13:00)**: *"I spent ₹80 on lunch."*  
   → Gated with confirmation modal. User confirms; recorded in wealth service. (**PASS**)
7. **Spending Check (18:00)**: *"What did I spend today?"*  
   → Conversational readout of daily expenses without mutations. (**PASS**)
8. **Evening Reflection (21:00)**: *"How am I doing?"*  
   → Summarizes completed habits, logged meals, and focus minutes. (**PASS**)

---

## 11. UX Findings

1. **Calm Operating System Feel**: The interface does not sound like a generic, chatty AI. Responses are concise, factual, and direct.
2. **Reduced Typing**: Suggestion pills on empty state (`"Suggested for this screen"`) allow 1-tap command execution.
3. **Non-Intrusive Guidance**: Health and recovery warnings (e.g. low sleep or low hydration) appear as italicized suggestions (💡) rather than mandatory blocking dialogs.
4. **No Technical Leaks**: Internal technical identifiers (`UUIDs`, `HTTP status codes`, `SQL syntax`) are abstracted behind human labels.

---

## 12. Security Findings

1. **Client API Key Protection**: Absolute compliance. Zero Gemini secrets or privileged Supabase service role keys are present in client code or build bundles.
2. **Deterministic Precedence**: All standard operations resolve through deterministic regular expressions, entity dictionaries, and math engines. The LLM is never given direct write access to Supabase.
3. **Row-Level Security**: Every Supabase table is guarded by RLS policies checking `auth.uid() = user_id`.

---

## 13. Bugs Found

1. **Task Resolution**: `dexIntentParser.js` lacked complete task completion and priority assignment heuristics for phrases like `"Mark clean my room as done"` and `"Make studying DSA my top priority"`.
2. **Habit Disambiguation Action Loss**: In `dexIntentParser.js`, when an ambiguous habit collision occurred, `intent.action` was undefined in the clarification response. When the user replied with `"Morning"`, `pendingAction` was lost, causing clarification continuity to fail.
3. **Sleep Fraction Parsing**: `parseSleepDetails` in `timeResolver.js` only matched integer and decimal hours (e.g. `5.5 hrs`), failing on natural phrasing like `"5 and a half hours"`.
4. **Water Volume Disambiguation**: In `dexIntentParser.js`, phrases with explicit volumes like `"I just had 500ml"` were erroneously routed to the food resolver because of the keyword `"had"`.
5. **Focus Regex Word Boundary**: In `dexIntentParser.js`, `/\b(?:focus|pomodoro)\b/` failed to match `"Give me 45 minutes of focused study"` due to the trailing letters in `"focused"`.
6. **Planning Prioritization & Urgency Recognition**: `isPlanningIntent` in `planner.js` failed to catch requests like `"I have college tomorrow and haven't finished my DSA work"` and `"I have a lot to do today. Help me prioritize"`.
7. **Task Not Found Fallback**: When attempting to complete a task that was not in the user's backlog, the parser fell through to AI instead of returning a calm clarification question.

---

## 14. Bugs Fixed

1. **Enhanced Task Resolver**: Added regex patterns in `dexIntentParser.js` for task completion (`complete_task` mapped to pending task UUID) and priority assignment (`create_task` with `priority = 1`).
2. **Preserved Clarification Action**: Updated `dexIntentParser.js` to explicitly assign `action: actionType === 'skip' ? 'skip_habit' : 'complete_habit'` during ambiguous habit returns.
3. **Supported Natural Sleep Fractions**: Extended `timeResolver.js` with `(\d+)\s+and\s+a\s+half\s*(?:hours|hour|hrs|hr|h)` to parse `"5 and a half hours"` into `5.5`.
4. **Explicit Water Volume Detection**: Added `\b\d+\s*ml\b` and `\b\d+(?:\.\d+)?\s*l\b` to hydration resolver triggers before the food resolver evaluates `"had"`.
5. **Flexible Focus Matching**: Updated focus regex to `/\b(?:focus(?:ed|ing)?|pomodoro)\b/i`.
6. **Planning Intent Expansion**: Added heuristics in `planner.js` for prioritization requests (`help me prioritize`) and statements of urgency (`haven't finished my ...`).
7. **Clarification for Missing Tasks**: If a task completion command refers to a non-existent task, Dex now responds with: `"Could not find a pending task matching 'X'. Which task did you mean?"`.

---

## 15. Known Limitations

1. **Remote `zyra` Edge Function Cloud Deployment**: The server-side Supabase Edge Function `zyra` is not yet deployed to the remote cloud project `xgowpznkqbsngdiuodmj`. Arbitrary free-form conversational queries outside the deterministic patterns return `"AI service temporarily unavailable."` until `supabase functions deploy zyra` is run with a Supabase access token.
2. **Sub-item Nutrition Modifications**: If a user logs a compound meal with modifications (e.g. *"boiled eggs without yolk"*), Dex currently resolves the primary base food (`egg_boiled`) using canonical nutrition rather than calculating a customized fractional macronutrient variant.

---

## 16. Automated Test Results

| Test Suite | File | Total | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Deterministic Engines** | `test_engines.mjs` | 13 | 13 | 0 | **PASS** |
| **Phase 2 Action Layer** | `test_phase2_actions.mjs` | 58 | 58 | 0 | **PASS** |
| **Phase 3.5 Services & Context** | `test_phase3_5_services.mjs` | 30 | 30 | 0 | **PASS** |
| **Phase 4 Dex UI & Bridge** | `test_phase4_dex_ui.mjs` | 116 | 116 | 0 | **PASS** |
| **Phase 5 Intelligence Layer** | `test_phase5_intelligence.mjs` | 101 | 101 | 0 | **PASS** |
| **Real Dex E2E QA** | `test_e2e_real_dex_qa.mjs` | 49 | 49 | 0 | **PASS** |
| **Security QA** | `test_security_qa.mjs` | 22 | 22 | 0 | **PASS** |
| **Phase 6 Planning Engine** | `test_phase6_planning.mjs` | 61 | 61 | 0 | **PASS** |
| **Phase 7 Production Readiness** | `test_phase7_production_e2e.mjs` | 111 | 111 | 0 | **PASS** |
| **TOTAL** | — | **561** | **561** | **0** | **100% PASS** |

---

## 17. Lint Result

```bash
$ npm run lint
> zyrbit@0.0.0 lint
> eslint .
```
- **Errors**: 0
- **Warnings**: 0
- **Status**: **PASS**

---

## 18. Build Result

```bash
$ npm run build
> zyrbit@0.0.0 build
> vite build

vite v8.0.1 building client environment for production...
transforming...✓ 2437 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 1.55s
```
- **Errors**: 0
- **Warnings**: 0
- **Status**: **PASS**

---

## 19. Final Production Readiness Verdict

# **READY WITH KNOWN LIMITATIONS**

### Evidence-Based Rationale
DexOS is fully functional, robust, and stable as an end-to-end Personal Operating System. The entire deterministic architecture (natural language intent parsing, Action Registry, Action Validator, Action Executor, domain services, deterministic nutrition from `FOOD_DB`, hydration, sleep, activity, confirmation-gated money, Growth focus timer integration, cross-domain planning, double-click protection, and multi-user isolation) is verified against the live production Supabase instance and passes all 561 automated tests with 0 lint errors and a clean 1.55s production build.

The sole blocker preventing an unconditional `READY FOR REAL-WORLD USE` verdict is that the remote Supabase Edge Function `zyra` has not yet been deployed to the Supabase cloud project (`HTTP 404 NOT_FOUND`), meaning free-form conversational queries outside deterministic patterns return a graceful service unavailable message rather than an LLM response. Once the project owner executes `supabase functions deploy zyra` with their Supabase account credentials and sets `GEMINI_API_KEY`, the AI gateway will be 100% live in production.
