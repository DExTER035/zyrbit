# Zyrbit Existing Functionality & Codebase Audit
## Concrete, File-Aware Codebase Inventory

---

## 1. Executive Codebase Summary

- **Frontend Core**: React 19 (`^19.2.4`), Vite 8 (`^8.0.1`), TailwindCSS v4 (`^4.2.2`).
- **Icons**: Lucide React (`^0.577.0`).
- **Data Visualizations**: Recharts (`^3.8.0`).
- **Mobile Packaging**: Capacitor Core & Android 6 (`^6.0.0`).
- **Database & Auth**: `@supabase/supabase-js` (`^2.99.3`) targeting PostgreSQL with Row-Level Security (RLS) enabled across all user tables.
- **AI Integration**: Google Gemini 2.5 Flash via Supabase Edge Function (`/functions/v1/zyra`) and direct developer client in `src/lib/ai/gemini.js`.
- **Test Suite**: Vitest (`^5.0.2`) with 29 comprehensive test suites spanning all four core domains.

---

## 2. Domain-by-Domain Audit of Existing Code

### A. Authentication & User Profile Layer

| Feature | Code Location | Status | Database Tables Used | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Auth Gateway** | `src/App.jsx:43-74` | Working | `auth.users`, `profiles` | Multi-screen gate (Splash, Welcome, Login, App). Listens to `onAuthStateChange`. |
| **Login / Signup**| `src/screens/LoginScreen.jsx` | Working | `auth.users` | Supports password authentication and OTP email magic links with instant validation. |
| **Profile & Archetype** | `src/lib/friendTag.js`, `src/pages/Profile/index.jsx` | Working | `profiles` | Automatic profile provisioning (`ensureProfile`), avatar upload, and friend tag generator. |
| **Data Export** | `src/pages/Profile/index.jsx:870-940` | Working | All user tables | Exports complete user records to JSON and CSV download files. |

### B. Growth Domain

| Feature | Code Location | Status | Database Tables Used | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Task Creation & Completion** | `src/services/growthService.js:23-70` | Working | `growth_tasks` | Priority 1-3, due dates, project association, and automated daily summary triggers. |
| **DAG Cycle Detection** | `src/engines/growth/index.js`, `src/pages/Growth/index.jsx:23` | Working | None (Pure Engine) | Graph algorithm (`hasCycle`) prevents circular task dependencies. |
| **Focus Sessions** | `src/services/growthService.js:140-190` | Working | `growth_focus_sessions` | Duration tracking, project tagging, reflection notes, and daily focus minutes sync. |
| **Goal Tracking** | `src/services/growthService.js:220-310` | Working | `dexos_goals` | Pillar categorization, numerical targets, progress tracking, auto-completion trigger. |

### C. Food & Nutrition Domain

| Feature | Code Location | Status | Database Tables Used | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Meal Logging** | `src/services/foodService.js:45-120` | Working | `health_food_logs`, `meal_logs` | Meal slots (breakfast, lunch, dinner, snack), grams, calories, protein, carbs, fat, fiber. |
| **Natural Language Parsing** | `src/dex/resolvers/foodResolverV2.js` | Working | None (Pure Engine) | Parses expressions like *"80g oats + 200ml milk + 5 dates"* with confidence scores. |
| **Nutrition Math** | `src/engines/food/index.js` | Working | None (Pure Engine) | Scales raw ingredient macronutrients and calculates daily cumulative totals. |
| **Food Reference DB**| `src/data/foods/indianFoods.js` | Working | In-memory library | Hundreds of common foods and regional dishes for instant offline lookups. |
| **Nutrition Goals** | `src/components/domain/food/GoalSettingsModal.jsx` | Working | `food_settings` / metadata | Custom daily targets for calories, protein, carbs, fat, and dietary fiber. |

### D. Health Domain

| Feature | Code Location | Status | Database Tables Used | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Hydration Logging** | `src/services/healthService.js:32-70` | Working | `health_water_logs` | Milliliter tracking with automated sync to `dexos_daily_summary.water_ml`. |
| **Sleep Tracking** | `src/services/healthService.js:103-142` | Working | `health_sleep_logs` | Sleep duration, 1-5 quality rating, and 7-day rolling sleep debt calculation. |
| **Recovery Readiness** | `src/services/healthService.js:502-530` | Working | `dexos_daily_summary` | Composite algorithm combining sleep duration, quality, sleep debt, and hydration ratio. |
| **Physical Workouts**| `src/services/healthService.js:177-225` | Working | `health_move_logs` | Activity types (strength, cardio, mobility, walk), active minutes, and RPE (1-10) ratings. |
| **Body Weight History**| `src/services/healthService.js:258-320`| Working | `health_weight_logs` | Rolling historical weight logs and trend charts. |

### E. Wealth Domain

| Feature | Code Location | Status | Database Tables Used | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Expense Recording**| `src/services/wealthService.js:32-84` | Working | `wealth_expenses`, `money_expenses` | Amount, category, description, and expense date. |
| **Income Recording** | `src/services/wealthService.js:200-252`| Working | `wealth_income` | Salary, freelance, one-time gains, and source categorization. |
| **Recurring Bills** | `src/services/wealthService.js:326-475`| Working | `wealth_bills` | Due dates, monthly/annual frequencies, and paid/unpaid status toggles. |
| **Runway & Burn Rate**| `src/engines/wealth/index.js` | Working | None (Pure Engine) | Calculates remaining survival days ($\text{Liquid Cash} \div \text{Daily Burn}$). |
| **Lending & Borrowing**| `src/services/wealthService.js:1326-1450`| Working | `money_promises`, `money_promise_repayments` | Atomic PostgreSQL transactions (`record_loan_atomic`) preventing balance skew. |
| **Statement Import** | `src/services/statementImportService.js`| Working | `statement_import_batches`, `imported_transactions` | Excel/CSV Paytm statement parser with fingerprint deduplication and rollback. |

### F. Dex Intelligence Layer

| Feature | Code Location | Status | Dependencies | Verification / Notes |
| :--- | :--- | :---: | :--- | :--- |
| **Context Assembly** | `src/dex/dexContextProvider.js` | Working | Domain Services | Aggregates daily multi-domain snapshot without raw table leaks. |
| **Intent Parsing** | `src/dex/dexIntentParser.js` | Working | Gemini 2.5 Flash | Parses natural-language user commands into structured JSON actions. |
| **Action Pipeline** | `src/actions/actionExecutor.js` | Working | Domain Services | Gated validation pipeline: high-risk actions require user confirmation before execution. |
| **Voice Commands** | `src/components/common/VoiceCommandOverlay.jsx` | Working | Web Speech API | Hands-free speech-to-text logging. |

---

## 3. Automated Database Triggers & Invariants

The database maintains rigorous relational integrity via PL/pgSQL triggers (`Zyrbit_Full_Schema.sql`):
1. **`trg_sync_water`**: Automatically aggregates daily hydration into `dexos_daily_summary`.
2. **`trg_sync_protein`**: Automatically aggregates daily protein intake into `dexos_daily_summary`.
3. **`trg_sync_movement`**: Automatically aggregates workout minutes into `dexos_daily_summary`.
4. **`trg_sync_focus`**: Automatically syncs completed focus minutes to active sprints and daily summaries.
5. **`trg_sleep_update`**: Calculates 7-day sleep debt and updates Recovery Score (0-100) automatically.
6. **`trg_timeline_*`**: Auto-logs all activities to `timeline_events` for unified timeline review.
