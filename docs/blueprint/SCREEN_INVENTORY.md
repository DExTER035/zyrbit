# Zyrbit Screen Inventory & UI State Catalog

---

## 1. Complete Screen Inventory

| Screen # | Screen Name | Route / Path | Primary Purpose | Domain Ownership | Approved Reference Available? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | **Home** | `/` or `/zenith` | Daily Command Center & Intention Anchor | System / Core | **Yes** (Figma 5-Screen Mockup) |
| **02** | **Track** | `/track` | Unified Hub for Growth, Health & Wealth | Track Hub | **Yes** (Figma 5-Screen Mockup) |
| **03** | **Quick Add** | Bottom Sheet Launcher | 1-Tap Rapid Activity Launcher | System Utility | **Yes** (Figma 5-Screen Mockup) |
| **04** | **Insights** | `/insights` | Cross-Domain Personal Analytics & Trends | Analytics | **Yes** (Figma 5-Screen Mockup) |
| **05** | **Your Space** | `/profile` | Profile, System Settings & Data Control | System / Account | **Yes** (Figma 5-Screen Mockup) |
| **06** | **Dex AI Workspace**| Modal / Drawer (`⌘K`) | Calm Socratic Mirror & Command Console | Dex Intelligence | **Yes** (Approved Dark Spec) |
| **07** | **Growth Detail** | `/growth` | Deep Task Management, Sprints & Focus | Growth | Inferred from approved tokens |
| **08** | **Food Detail** | `/food` | Nutrition, Macros & Food Library | Food | Inferred from approved tokens |
| **09** | **Health Detail** | `/health` | Sleep, Recovery, Workouts & Weight | Health | Inferred from approved tokens |
| **10** | **Wealth Detail** | `/wealth` | Cashflow, Bills, Runway & Statement Import| Wealth | Inferred from approved tokens |
| **11** | **Splash** | `/` (Unauth) | Welcome Brand Value Intro | Onboarding | **Yes** (Approved 4-Screen Onboarding) |
| **12** | **Welcome** | `/welcome` | Sign In / Sign Up Gateway | Onboarding | **Yes** (Approved 4-Screen Onboarding) |
| **13** | **Login / Signup**| `/login` | Supabase Password & OTP Auth Form | Onboarding | **Yes** (Approved 4-Screen Onboarding) |
| **14** | **Goal Setup** | `/goal-setup` | Initial 4-Domain Goal Selection Wizard | Onboarding | **Yes** (Approved 4-Screen Onboarding) |

---

## 2. Detailed Screen Specifications

### Screen 01: Home — Daily Command Center
- **Purpose**: Answer *"What matters today, and what is my next best step?"*
- **Entry Point**: App launch, bottom navigation Tab 1, desktop sidebar `Home`.
- **Navigation Outbound**:
  - `Choose your next step →` navigates to active task or focus timer.
  - Priority item 1 (`Plan the next study session`) navigates to `/growth`.
  - Priority item 2 (`Log a habit`) opens habit checklist or Quick Add.
  - Quick action chips (`+ Habit`, `+ Meal`, `+ Expense`) trigger relevant logging modals.
  - Dex prompt (`Need a starting point? Plan with Dex ↗`) opens Dex workspace.
- **Shared Components Used**:
  - `SharedMockupFrame` / `AppLayout`
  - `BrandCard`, `BrandButton`, `BrandBadge`
  - `BottomNav`
- **Current Code Mapping**: `src/pages/Zenith/index.jsx` (currently rich in habit logic, OS score, and timeline, rendered with legacy dark styling). Needs reskinning to Petrol Teal / Warm Ivory while preserving live data.
- **Backend Dependencies**:
  - `habits`, `activity_log` (via `habitService`)
  - `growth_tasks`, `growth_focus_sessions` (via `growthService`)
  - `dexos_daily_summary` (OS score, recovery score)
- **Required Interaction States**:
  - *Loading*: Neutral skeleton pulse in ivory card containers.
  - *Empty State*: Honest greeting with zero habits: *"Consistency starts here. Add your first habit →"*.
  - *Active State*: Dynamic intention, live priority count, completed habit count.
  - *Error State*: Offline fallback with retry button; no blank screen.

---

### Screen 02: Track — Growth, Food, Health, Wealth
- **Purpose**: Give a clear, high-level summary of the four primary life domains and direct pathways into each domain's detailed workspace.
- **Headline**: *"Track your life — Four focused spaces. One connected system."*
- **Banner**: *"Consistency connects it all — Manage habits across every area."*
- **Domain Cards**:
  1. **Growth**: Goals & tasks · Study · Focus · Reflections (`Open Growth →`)
  2. **Food**: Meals & nutrition · Calories · Macros · Hydration (`Open Food →`)
  3. **Health**: Workouts · Physical activity · Sleep & recovery (`Open Health →`)
  4. **Wealth**: Income & expenses · Budgets · Bills · Savings (`Open Wealth →`)
- **Footer**: *"Your saved records stay connected across these spaces."*
- **Current Code Mapping**: Previously split between `/growth`, `/food`, `/health`, and `/wealth`. `src/components/showcase/TrackMockupView.jsx` provides the exact approved hub view.
- **Backend Dependencies**: Lightweight rollups from `growthService`, `foodService`, `healthService`, and `wealthService`.

---

### Screen 03: Quick Add — Navigation Shortcut Launcher
- **Purpose**: Instant, low-friction entry point to navigate directly to logging workflows without hunting through nested menus.
- **Entry Point**: Elevated central FAB `(+)` in mobile navigation bar, or `Quick Add` button in desktop header.
- **Behavior**: Dismissible bottom sheet modal (or command dialog). Selecting a destination navigates directly to that domain's active entry view or triggers Dex AI without losing page context.
- **Destinations (5-Anchor Launcher)**:
  1. **Growth** (`Tasks, focus sprints, and goals` -> `/growth`)
  2. **Food** (`Meals, macronutrients, and water` -> `/food`)
  3. **Health** (`Sleep, workouts, and recovery` -> `/health`)
  4. **Wealth** (`Expenses, income, and bills` -> `/wealth`)
  5. **Ask Dex** (`Calm companion across your day` -> `dexos:open-dex`)
- **Current Code Mapping**: `src/components/layout/QuickAddSheet.jsx` and `src/components/showcase/QuickAddMockupView.jsx`.

---

### Screen 04: Insights — Personal Analytics
- **Purpose**: Provide calm, long-term perspective on personal consistency and life balance.
- **Time Horizons**: Pill toggle (`7 days` | `30 days` | `90 days`).
- **Metric Cards**:
  - `Active days`: Number of active logged days in period.
  - `Logged activities`: Total count of actions taken across all domains.
- **Hero Chart**: `Activity over time` (honest state: *"Your patterns start with a record. Log an activity to begin."* with CTA `Log your first activity →`).
- **Domain Grid (Across your life)**:
  - Habits (Consistency rate)
  - Health (Nutrition & recovery trends)
  - Growth (Focus & study volume)
  - Wealth (Cashflow & savings velocity)
- **Footnote**: *"Only verified, available data is shown. No fabricated scores or assumed performance."*
- **Current Code Mapping**: Previously partially in `src/pages/Zenith/index.jsx` (HeatmapGrid) and legacy stats. `src/components/showcase/InsightsMockupView.jsx` implements the approved visual target.

---

### Screen 05: Your Space — Profile & Settings
- **Purpose**: System customization, security, subscription, and data autonomy.
- **Hero Card**: User avatar, full name, email, and `Edit profile →`.
- **Group 1: MAKE IT YOURS**:
  - `Preferences`: Appearance, theme, and daily routine settings.
  - `Notifications`: Push reminders, streak buffers, bill alerts.
- **Group 2: ACCOUNT & ACCESS**:
  - `Membership`: Pro vs Free plan status, billing details.
  - `Privacy & security`: Password update, data export (JSON/CSV), delete account.
  - `Install Zyrbit`: Native PWA install prompt.
  - `Sign out`: Secure session termination.
- **Current Code Mapping**: `src/pages/Profile/index.jsx` (features 1,360+ lines of robust auth, avatar upload, password modals, and export logic). Needs visual styling alignment to match `YourSpaceMockupView.jsx`.

---

### Screen 06: Dex AI Workspace
- **Purpose**: Socratic mirror for daily reflection and conversational command entry.
- **Visual Spec**: Charcoal dark theme (`#111A20`), single input composer, prompt chips (*Plan my day, Analyze my meal, Review my spending, Check my habits*).
- **Rule**: Eliminates duplicate input areas seen in earlier prototypes.
- **Current Code Mapping**: `src/components/common/DexCommandModal.jsx` and `src/dex/`.
