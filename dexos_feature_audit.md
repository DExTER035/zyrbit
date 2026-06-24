# DexOS System Architecture & Feature Audit
This document outlines the current state, codebase structure, database schema, and UI screens for the **DexOS** application (formerly Zyrbit). Use this as a comprehensive guide for AI context/research to rebuild and refactor the app into a premium, unified AI-powered personal operating system.

---

## 1. System Overview & Tech Stack

DexOS is designed as a personal operating system bridging productivity, wellness, finance, and learning under a central gamified economy and an AI command layer.

### Core Technology Stack
*   **Frontend**: React (v19) + Vite (v8) + TailwindCSS (v4)
*   **Database & Auth**: Supabase (PostgreSQL client)
*   **AI Integration**: Gemini API (`gemini-2.5-flash`) via developer key
*   **Visual Assets**: Scalable SVGs, custom ambient gradients, clean pitch-black background (`#121214`), neon typography
*   **PWA Wrapper**: Workbox PWA configuration with manifest, custom install prompts, offline service worker, and mobile-responsive styling.

---

## 2. Directory & Codebase Structure

The active production files are organized as follows:

```
zyrbit/
├── index.html                   # Entry page with initial HTML splash screen
├── package.json                 # Project scripts and dependencies
├── vite.config.js               # Vite configurations + PWA plugin setup
├── public/
│   ├── manifest.json            # PWA manifest configurations
│   ├── app-icon.svg             # Main SVG logo asset (slanted-bar + Z-shape)
│   ├── favicon.svg              # Browser tab icon
│   ├── icons/                   # Generated PNG icons for PWA & iOS splash screens
│   └── qa_screenshots/          # Current visual screenshots of active views
├── src/
│   ├── main.jsx                 # React root hydration
│   ├── App.jsx                  # Main router, auth state observer, and shell
│   ├── index.css                # Base theme variables, utilities, scroll overrides
│   ├── design/
│   │   ├── theme.css            # Dark mode tokens (accents: success, warning, etc.)
│   │   └── typography.css       # Space Grotesk + Inter font utilities
│   ├── context/
│   │   └── SubscriptionContext.jsx # Premium subscription overlay logic
│   ├── hooks/
│   │   ├── useHabitReminders.js # PWA notifications scheduler
│   │   └── useInstallPrompt.js  # Custom browser PWA banner handler
│   ├── lib/
│   │   ├── supabase.js          # Supabase client instantiation
│   │   ├── gemini.js            # Gemini API wrapper (`askZyra` helper)
│   │   ├── gravity.js           # Gravity Score algorithm & calculations
│   │   ├── ranks.js             # Gamification rank brackets & thresholds
│   │   └── zyrons.js            # Gamified Zyrons ledger utilities
│   ├── pages/
│   │   ├── Zenith.jsx           # Main Life OS Dashboard
│   │   ├── Growth.jsx           # Study hub & Project tracker
│   │   ├── Health.jsx           # Vitals, sleep, exercise & water log
│   │   ├── Wealth.jsx           # Monthly budgets, expense log, and runway
│   │   ├── Dex.jsx              # Jarvis AI Voice & Chat Assistant
│   │   ├── Stats.jsx            # Performance charts & history
│   │   ├── Profile.jsx          # User rank, transaction ledger & shop
│   │   └── Challenge.jsx        # Sprints / habit challenge screen
│   └── components/
│       ├── Logo.jsx             # Reusable ZyrbitMark & ZyrbitIcon components
│       ├── BottomNav.jsx        # Mobile persistent navigation bar
│       ├── FeedbackWidget.jsx   # Floating bug reporter
│       ├── GravityRing.jsx      # Concentric ring visualizing Gravity Score
│       ├── InstallBanner.jsx    # Sticky PWA install drawer
│       └── ...                  # Specialized sub-widgets (VitalsGrid, ProjectsTab, etc.)
```

---

## 3. Database Schema

The backend runs on Supabase (Postgres). The active tables and migrations are detailed in `Zyrbit_Full_Schema.sql` and `dexos_v1_migration.sql`.

### Key Tables
1.  **`profiles`**: User metadata, username, avatar, premium status.
2.  **`habits`**: User routine definitions (title, frequency, difficulty, zone: mind/body/growth/soul).
3.  **`habit_logs`**: Logs daily completion events, skips, or notes.
4.  **`focus_sessions`**: Tracks focus timer blocks (duration_minutes, subject, tags).
5.  **`expenses`**: Financial transactions (amount, category, date, type: income/expense).
6.  **`health_logs`**: Tracks daily metrics: sleep hours, water intake (ml), weight, active calories.
7.  **`goals`**: Tracks user-configured targets (target_value, current_value, deadline).
8.  **`zyrons_ledger`**: Logs every XP/currency transaction (rewarded for habits, focus, budget consistency).

---

## 4. UI/UX Breakdown by Tab (with Screenshots)

Here is a detailed audit of every active screen in the system, referencing the actual screenshot files generated during testing.

---

### A. Splash & Entry Flow
*   **File**: `src/screens/SplashScreen.jsx` & `index.html` (pure HTML splash)
*   **Aesthetics**: Charcoal-black surface (`#121214`) featuring a central white Zyrbit icon with a glowing pulse animation. 
*   **Visual Ref**: `public/qa_screenshots/1_splash.png`
*   **Functionality**: Checks for user session tokens. If anonymous or unauthenticated, redirects to `LoginScreen`. If authenticated, fades out and loads the primary shell.

---

### B. Onboarding & Setup
*   **Files**: `src/screens/OnboardingScreen.jsx` & `src/screens/GoalSetupScreen.jsx`
*   **Aesthetics**: Glassmorphic onboarding cards sliding horizontally, showcasing the Core Pillars (Mind, Body, Wealth, Growth).
*   **Visual Ref**: `public/qa_screenshots/2_onboarding.png` & `public/qa_screenshots/4_goal_setup_screen.png`
*   **Functionality**: Guides new users to seed initial goals (e.g. targeting monthly savings, active workout days per week, and sleep hours) to configure the database defaults.

---

### C. Zenith Dashboard (Home Tab)
*   **File**: `src/pages/Zenith.jsx`
*   **Aesthetics**: Dark premium workspace layout featuring a header with the central **Gravity Score Ring** (`src/components/GravityRing.jsx`). Displays alert banners at the top if scores drop too low.
*   **Visual Ref**: `public/qa_screenshots/5_zenith_page.png` & `public/qa_screenshots/7_zenith_with_new_habit.png`
*   **Widgets Included**:
    1.  **Gravity Ring**: Centered visual showing a score from `0` to `100` (computed from habit consistency, sleep, and budget).
    2.  **OS Warnings System**: Collated warnings list (e.g., *Capacity Alert: Recovery depleted* or *Runway Alert: low financial buffer*).
    3.  **Routines / Habit List**: Segmented list by time of day (Morning/Afternoon/Evening) allowing one-tap completion or skip logs.
    4.  **AI Operating Briefing**: A dynamic greeting block summarizing performance trends using Gemini API.

---

### D. Growth Engine (Growth Tab)
*   **File**: `src/pages/Growth.jsx`
*   **Aesthetics**: Slate-grey cards with neon-blue accents. Divided into sub-tabs: *Today*, *Projects*, and *Sprints*.
*   **Visual Ref**: `public/qa_screenshots/9_growth_page.png`
*   **Widgets Included**:
    1.  **Focus Session Timer**: A custom Pomodoro circle timer with toggle states (Work/Short Break/Long Break). Integrates a **Blackout Mode** option to lock tabs or hide distractions.
    2.  **Projects Tracker**: Lists active projects, milestones, task completion percentage, and estimated hours spent.

---

### E. Health Telemetry (Health Tab)
*   **File**: `src/pages/Health.jsx`
*   **Aesthetics**: Forest-green and dark teal color scheme. Standardized card layouts for health signals.
*   **Visual Ref**: `public/qa_screenshots/15_health_page.png`
*   **Widgets Included**:
    1.  **Vitals Grid**: Inline quick displays showing Sleep quality (hours logged vs target), active calories, and current weight.
    2.  **Water Card**: Incremental logger allowing the user to tap `+250ml` or `+500ml` options with animated waves.
    3.  **Dexos Recovery Score**: A daily score computed based on sleep hours and exercise level.

---

### F. Wealth Tracker (Wealth Tab)
*   **File**: `src/pages/Wealth.jsx`
*   **Aesthetics**: Emerald green highlights with graphite background surfaces.
*   **Visual Ref**: `public/qa_screenshots/17_wealth_page.png`
*   **Widgets Included**:
    1.  **Financial Runway**: Computes runway buffer in months based on total savings divided by monthly average burn rate.
    2.  **Expense/Income Logs**: A fast-entry ledger split by category (Food, Housing, Subscriptions, Investment).
    3.  **Mirror Bar**: Displays a progress bar comparing total spent this month against the designated budget.

---

### G. Dex AI (Jarvis Tab)
*   **File**: `src/pages/Dex.jsx`
*   **Aesthetics**: Holographic blue/cyan glowing waves. Implements a large central AI orb widget that expands/contracts based on response states.
*   **Visual Ref**: `public/qa_screenshots/19_dex_page.png` & `public/qa_screenshots/21_dex_summary_tab.png`
*   **Widgets Included**:
    1.  **Chat Interface**: Realtime conversational interface with the personal operating assistant. Includes options to fetch daily briefings or execute rapid tasks.
    2.  **Voice Recognition**: Utilizes Web Speech API for voice commands (e.g. *"Log 500ml of water"*, *"Log a 45 min focus session"*).
    3.  **Knowledge/Quiz Mode**: Generates interactive quick quizes based on the user's logged focus session subjects.

---

### H. Profile & Wallet (Profile Tab)
*   **File**: `src/pages/Profile.jsx`
*   **Aesthetics**: Gold and silver rank overlays. Dark chrome interfaces.
*   **Visual Ref**: `public/qa_screenshots/23_profile_page.png`
*   **Widgets Included**:
    1.  **Rank Banner**: Displays current tier (e.g. *Ascendant*, *Strategist*) based on lifetime Zyrons.
    2.  **Zyrons Transactions**: Lists a detailed history of XP earnings (ledger).
    3.  **Cosmos Shop**: Conceptual store showing unlockable features or premium themes.

---

## 5. Claude Blueprint for Rebuilding DexOS (v2)

When instructing Claude or another LLM to refactor this codebase into **DexOS v2**, provide the following blueprint:

### Phase 1: Core Cleanups & Routing
*   **Action**: Consolidate the router in `App.jsx` to map only the active pages (Zenith, Growth, Health, Wealth, Dex, Stats, Profile). Remove unrouted files like `DailyLog.jsx`, `Dashboard.jsx`, `Journal.jsx`, and `Orbit.jsx`.
*   **Goal**: Simplify navigation paths, making page changes snappy. Keep the bottom bar navigation limited to the core pillars.

### Phase 2: Schema Hardening
*   **Action**: Ensure that postgres logs are correctly structured. Reconcile the fields for focus durations (ensure database is aligned to `duration_minutes` or `duration_mins`, not a mix of both).
*   **Goal**: Prevent silent database errors during logs.

### Phase 3: AI Service Layer Consolidation
*   **Action**: Extract the API calls from `Dex.jsx` and `Zenith.jsx` into a unified helper file (e.g. `src/lib/gemini.js`). Implement structured JSON output formats using schemas to ensure the AI summary widget always parses correctly.
*   **Goal**: Eliminate duplicate fetch code, establish global error boundaries for the AI.

### Phase 4: Standardize Theme Variables
*   **Action**: Ensure styling relies on CSS variables defined in `src/design/theme.css` (`--color-success`, `--color-accent`, etc.) instead of hardcoded hex values in component style props.
*   **Goal**: Allow unified theme toggles to propagate instantly to all sub-components.
