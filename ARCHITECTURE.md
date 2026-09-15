# DexOS Architecture

> **Personal Operating System — Unified Architecture Specification**  
> DexOS unifies Habits, Focus, Health, Wealth, and AI into one calm daily operating system.  
> Every layer has one explicit responsibility with strictly enforced dependency boundaries.

---

## 1. Architectural Layers

```
EXPERIENCE (Pages, Components, Screens)
   │
   ▼
DEX (Intelligence & Intent Orchestration)
   │
   ▼
ACTIONS (Schema Validation, Permission & Controlled Execution)
   │
   ▼
SERVICES (Domain Data Operations & Supabase Mutations)
   │
   ▼
ENGINES (Pure Deterministic Calculations & Domain Intelligence)
   │
   ▼
INFRASTRUCTURE (Supabase Client, Gemini AI Provider, Analytics)
```

### Layer Definitions

| Layer | Path | Responsibility | Permitted Dependencies |
| :--- | :--- | :--- | :--- |
| **Experience** | `src/pages/`, `src/components/`, `src/screens/` | UI layout, presentation, user input capture, reactivity | Dex, Actions, Services, Engines, Infrastructure |
| **Dex** | `src/dex/` | Natural language understanding, context assembly, intent parsing, action proposals | Actions, Domain Services (read models), AI Client |
| **Actions** | `src/actions/` | Strict parameter validation, risk classification, confirmation gating, dispatch | Domain Services, Deterministic Engines |
| **Services** | `src/services/` | Canonical data mutations, Supabase database operations, domain invariants | Deterministic Engines, Supabase Client |
| **Engines** | `src/engines/` | Pure deterministic calculation formulas, DAG dependency graphs, scoring | *Pure JS only* (Zero UI, Zero React, Zero DB, Zero AI) |
| **Infrastructure** | `src/lib/` | External provider clients (Supabase, Gemini Edge Functions, telemetry) | Third-party SDKs, Environment variables |

---

## 2. Product Domains

DexOS organizes all capabilities into five core life domains:

| Domain | Scope | Engine Path | Service Path | Components Path |
| :--- | :--- | :--- | :--- | :--- |
| **Zenith** | Command-center, daily balance, habit impact correlation | `src/engines/zenith/` | `src/services/habitService.js` | `src/components/domain/zenith/` |
| **Growth** | Tasks, projects, focus sprints, DAG dependency graphs | `src/engines/growth/` | `src/services/growthService.js` | `src/components/domain/growth/` |
| **Health** | Sleep debt, dynamic hydration, recovery readiness, strain | `src/engines/health/` | `src/services/healthService.js` | `src/components/domain/health/` |
| **Food** | Meals, scaled macronutrients, personal usuals, TDEE targets | `src/engines/food/` | `src/services/foodService.js` | `src/components/domain/food/` |
| **Wealth** | Cashflow, burn rate, runway, safe-to-spend, bill pacing | `src/engines/wealth/` | `src/services/wealthService.js` | `src/components/domain/wealth/` |

---

## 3. Directory Map

```
src/
├── main.jsx                       # Application entry point (Vite/React 19)
├── App.jsx                        # Application root orchestrator & route switchboard
│
├── pages/                         # Route-level screens (one folder per domain)
│   ├── Zenith/                    # /zenith Command Center
│   ├── Growth/                    # /growth Tasks & Projects
│   ├── Health/                    # /health Sleep, Water, Activity & Recovery
│   ├── Food/                      # /food Meals, Nutrition & Food Library
│   ├── Wealth/                    # /wealth Cashflow, Runway & Safe-to-Spend
│   ├── Challenge/                 # /challenge Discipline streaks & challenges
│   ├── Profile/                   # /profile Account settings & preferences
│   └── Stats/                     # /stats Long-term correlation & analytics
│
├── screens/                       # Pre-authentication & onboarding full screens
│   ├── SplashScreen.jsx           # App intro & brand showcase
│   ├── OnboardingScreen.jsx       # User initial onboarding wizard
│   ├── LoginScreen.jsx            # Supabase OTP / password auth
│   ├── WelcomeAnimation.jsx       # Post-login welcome flourish
│   └── GoalSetupScreen.jsx        # Initial goal onboarding
│
├── components/                    # Reusable presentation & interaction
│   ├── ui/                        # Low-level UI primitives (Toast, Logo, ErrorState, PaywallOverlay)
│   ├── layout/                    # Shell & navigation (AppLayout, BottomNav, InstallBanner)
│   ├── common/                    # Cross-domain widgets (FeedbackWidget, HeatmapGrid, AdminAnalytics)
│   └── domain/                    # Domain-scoped UI components
│       ├── growth/                # TodayTab, ProjectsTab, FocusSessionView, ProjectDetailView, shared
│       ├── health/                # ActivityCard, RecoveryWidget, SleepCard, WaterCard, VitalsGrid, shared
│       ├── food/                  # DailyCalorieRing, MealSection, FoodPicker, NutritionSummary, etc.
│       ├── wealth/                # SafeToSpendBanner, TransactionFormModal, BillFormModal
│       └── zenith/                # HabitCard, ZoneTab
│
├── dex/                           # Dex Intelligence Orchestration Layer
│   ├── dexOrchestrator.js         # End-to-end user input → intent → action execution pipeline
│   ├── dexContextProvider.js      # Aggregates daily multi-domain context for the model
│   ├── dexIntentParser.js         # Calls Gemini via Edge Function and parses structured action
│   ├── dexPrompt.js               # System prompt generator with schema definitions
│   └── index.js                   # Dex public API
│
├── actions/                       # Controlled Action Boundary Layer
│   ├── actionSchemas.js           # Parameter definitions, types, constraints, and validation
│   ├── actionRegistry.js          # Registry of executable actions with domain metadata
│   ├── actionValidator.js         # Parameter validation and confirmation requirements
│   ├── actionExecutor.js          # Dispatches validated actions directly to Domain Services
│   └── index.js                   # Actions public API
│
├── services/                      # Domain Data Services (Canonical Supabase Mutations)
│   ├── growthService.js           # Tasks, projects, dependencies, focus sessions
│   ├── healthService.js           # Water logs, sleep logs, workouts, recovery score
│   ├── foodService.js             # Meal logs, food library, goal settings
│   ├── wealthService.js           # Expenses, income, bills, wealth settings
│   ├── habitService.js            # Habits, daily completions, daily reflections
│   └── index.js                   # Services public API
│
├── engines/                       # Pure Deterministic Engines (NO React, NO DB, NO AI)
│   ├── health/                    # Recovery readiness, sleep debt, dynamic water target
│   ├── food/                      # Scaled nutrition math, personal usuals ranking
│   ├── wealth/                    # Net liquid cash, runway days, burn rate, spending pace
│   ├── growth/                    # Task DAG dependency cycle detection & goal progress
│   ├── zenith/                    # Habit impact correlation & focus associations
│   └── index.js                   # Unified engines barrel export
│
├── data/                          # Static datasets
│   └── foods/                     # indianFoods.js & food databases
│
├── hooks/                         # Pure React hooks
│   ├── useHabitReminders.js       # Local notification scheduling
│   ├── useInstallPrompt.js        # PWA install prompt handler
│   ├── useOfflineDetector.js      # Network status detector
│   └── useSubscription.js         # Subscription entitlement hook
│
├── lib/                           # Infrastructure Clients & External Integrations
│   ├── supabase/                  # Canonical Supabase client instance
│   ├── ai/                        # Unified Gemini AI client (via Supabase Edge Function 'zyra')
│   ├── analytics/                 # Beta analytics event tracking
│   └── friendTag.js               # Referral / profile identity generator
│
├── styles/                        # Design System & Styling
│   ├── index.css                  # Tailwind v4 entry & global base styles
│   ├── theme.css                  # DexOS design tokens (spacing, colors, radii)
│   └── typography.css             # Inter & Space Grotesk font hierarchy
│
└── context/                       # React Context Providers
    └── SubscriptionContext.jsx    # Pro/Free subscription tier context
```

---

## 4. Strict Dependency Flow Rules

To maintain high architectural integrity, dependencies must flow downwards:

```
Pages / Components ──► Dex ──► Actions ──► Services ──► Engines ──► Infrastructure
```

### Prohibited Dependencies:
1. **Services MUST NOT import Pages or Components.** (No UI imports in data layer)
2. **Engines MUST NOT import React, Dex, Services, or Supabase.** (Engines must remain 100% pure deterministic JavaScript functions)
3. **Actions MUST NOT import Pages, Components, or Supabase directly.** (Action layer is headless and delegates DB ops to Domain Services)
4. **Dex MUST NOT directly query or mutate Supabase.**
   - Reads: Context assembly must exclusively call domain read services (`getGrowthData`, `getHealthData`, `getFoodSummary`, `getWealthSummary`, `getHabitsToday`).
   - Mutations: All writes must flow strictly through:
     `Dex ➔ Action Registry ➔ Action Validator ➔ Action Executor ➔ Domain Service ➔ Supabase`
5. **AI/Gemini MUST NEVER directly access Supabase database tables.** (Security & integrity boundary)

---

## 5. Dex Execution & Action Pipeline

Dex operations follow an immutable, secure pipeline:

```
[ User Input ]
      │
      ▼
[ Dex Context Provider ] ────► Assembles local date + minimal domain summary
      │
      ▼
[ Dex Intent Parser ] ───────► Gemini Edge Function parses input into structured JSON
      │
      ▼
[ Action Validator ] ────────► Validates parameter bounds & assesses risk level
      │
      ├──────────────────────► (If high-risk: Requests User Confirmation)
      │
      ▼
[ Action Executor ] ─────────► Maps action name to Domain Service method
      │
      ▼
[ Domain Service ] ──────────► Executes validated PostgreSQL mutation via Supabase
      │
      ▼
[ Context Refresh ] ─────────► Emits update event and returns clear confirmation to user
```

---

## 6. Architectural Decisions & Notes

### Vite Root Files (`src/App.jsx`, `src/main.jsx`)
`App.jsx` and `main.jsx` are preserved at the `src/` root. Vite and React tooling rely on conventional entry points. Keeping `App.jsx` at `src/` avoids artificial routing indirection while providing a clear top-level switchboard.

### Direct Reads in `dexContextProvider.js` (Documented for Future Refactor)
During the reorganization audit, it was confirmed that:
- `dexContextProvider.js` uses `growthService.getGrowthData()` and `healthService.getHealthData()` for Growth and Health context.
- For **Food**, **Wealth**, and **Habits**, `dexContextProvider.js` currently issues lightweight direct `.select()` queries against `meal_logs`, `money_expenses`, `wealth_income`, `wealth_bills`, `habits`, and `activity_log`.
- **Status**: Maintained behaviorally intact to preserve zero functional regressions.
- **Recommendation**: In a future phase, expand domain services with canonical `getFoodContext()`, `getWealthContext()`, and `getHabitsContext()` methods so `dexContextProvider.js` consumes all context exclusively through domain services.
