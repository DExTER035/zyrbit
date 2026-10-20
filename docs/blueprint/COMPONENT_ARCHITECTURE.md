# Zyrbit Shared Component Architecture

---

## 1. Architectural Principles

1. **Unidirectional Dependency Flow**:
   Components render state and trigger events. They must never directly run SQL, query Supabase tables, or invoke AI API keys. All state mutations delegate downwards into **Domain Services** or **Dex Actions**.

```
[UI Components & Screens]
           │
           ▼
     [Dex Actions]
           │
           ▼
   [Domain Services]
           │
           ▼
  [Pure Math Engines]
           │
           ▼
[Supabase Client / Gemini API]
```

2. **Component Tokenization**:
   Components must strictly consume tokens from `src/styles/theme.css` and primitives from `src/components/ui/BrandPrimitives.jsx`. Hardcoded ad-hoc hex values (`#174A55`, `#F4F0E8`, `#111A20`) inside component `style` props must be eliminated in favor of unified CSS variables and shared primitive wrappers.

3. **Separation of Presentation & Business Logic**:
   Heavy math (such as runway days, sleep debt, macronutrient scaling, or DAG task dependency checks) is isolated in pure JavaScript functions in `src/engines/`.

---

## 2. Reusable Component Inventory

### A. Shell & Layout Components (`src/components/layout/`)

- **`AppLayout.jsx`**: Top-level shell that coordinates the desktop header/sidebar, main responsive view container, Quick Add sheet, Dex command modal, and mobile bottom navigation.
- **`BottomNav.jsx`**: Mobile 5-destination navigation bar featuring the elevated Petrol Teal Quick Add FAB button (`(+)`) with 3px solid white rim and active route indicators.
- **`DesktopSidebar.jsx`**: Left-hand widescreen navigation panel (`#111A20`) with brand wordmark, domain shortcuts, and persistent action triggers.
- **`QuickAddSheet.jsx`**: Fast activity logging launcher displaying the 6 canonical quick-entry rows and dedicated "Ask Dex" shortcut.
- **`InstallBanner.jsx`**: Non-intrusive PWA install prompt.

### B. Core UI Primitives (`src/components/ui/BrandPrimitives.jsx`)

- **`BrandButton`**:
  - `variant="primary"`: Solid Petrol Teal (`#174A55`) with white text and 14px radius.
  - `variant="secondary"` / `variant="outline"`: White or ivory surface with 1px `#E5E0D8` border.
  - `variant="pill"`: Fully rounded pill button (`999px` radius) for time-range selectors (7d/30d/90d) and quick chips.
  - Built-in loading spinner, disabled state, and full-width toggle.
- **`BrandCard`**:
  - Surface white (`#FFFFFF`) or subtle ivory fill with `16px` border radius, `1px solid #E5E0D8` border, and subtle elevation shadow.
- **`BrandBadge`**:
  - Standardized Zyrbit logo badge with customizable size (24px, 32px, 48px) and square/circular shape.
- **`BrandHeader`**:
  - Uniform top-bar wordmark (`Z` badge + `ZYRBIT PERSONAL OS`).
- **`BrandInput`**:
  - Validated single-line input or textarea with ivory fill (`#F4F0E8`), clean border focus state, and error message slot.
- **`BrandMetricTile`**:
  - High-clarity numerical summary card (e.g., Active Days, Liquid Cash, Sleep Hours).

### C. Domain-Specific Component Packages (`src/components/domain/`)

1. **Growth (`src/components/domain/growth/`)**:
   - `TodayTab.jsx`: Daily priority task list and quick check-offs.
   - `PlanTab.jsx`: Project hierarchy and dependency views.
   - `FocusSessionView.jsx`: Pomodoro and deep work countdown timer with ambient sound and pause/resume.
   - `GoalsTab.jsx`: Metric goal progress bars (target vs current).

2. **Food (`src/components/domain/food/`)**:
   - `DailyCalorieRing.jsx`: Circular progress visualization of consumed vs target calories.
   - `MealSection.jsx`: Breakfast, Lunch, Dinner, Snack cards with food item tags and gram amounts.
   - `FoodPicker.jsx`: Fast search across Indian Foods library, personal foods, and global canonical items.
   - `GoalSettingsModal.jsx`: Calorie and macronutrient target configuration.

3. **Health (`src/components/domain/health/`)**:
   - `BodyRhythmVisualizer.jsx`: Daily recovery readiness score and strain balance indicator.
   - `SleepCard.jsx`: Sleep duration, quality stars (1-5), and rolling sleep debt hours.
   - `WaterCard.jsx`: Hydration tracker with 1-tap quick increments (`+250ml`, `+500ml`).
   - `WorkoutList.jsx`: Logged physical activity sessions with RPE exertion ratings.

4. **Wealth (`src/components/domain/wealth/`)**:
   - `WealthFlowHero.jsx`: Net liquid cash, runway days survival meter, and monthly burn rate.
   - `TransactionFormModal.jsx`: Fast expense and income recording.
   - `BillFormModal.jsx`: Recurring bill reminders, due dates, and paid/unpaid status toggles.
   - `PromiseFormModal.jsx`: Lending and borrowing records (lent to / borrowed from).
   - `ConnectMoneyModal.jsx`: Statement import workflow for Paytm/UPI statements with deduplication.

5. **Home / Command Center (`src/components/domain/zenith/`)**:
   - `HabitCard.jsx`: 1-tap habit check-off with streak flame counter and skip options.
   - `ZenithNextUp.jsx`: Prioritized daily tasks and focus resume blocks.
   - `DayReceiptModal.jsx`: Evening reflection summary (mood rating, hardest habit, gratitude).

### D. Dex AI Workspace (`src/components/common/DexCommandModal.jsx`)

- **Single Composer Architecture**: High-contrast dark theme modal with exactly one message input area, avoiding earlier prototype layout regressions.
- **Preset Action Chips**: 1-tap starter prompts (*Plan my day*, *Analyze my meal*, *Review my spending*, *Check my habits*).
- **Execution Proposal Cards**: Clear preview cards for actions proposed by Dex with explicit `Confirm` and `Cancel` buttons before any database mutation occurs.

### E. Common Telemetry & Feedback (`src/components/common/`)

- **`HeatmapGrid.jsx`**: GitHub-style annual and monthly consistency grids.
- **`ErrorBoundary.jsx`**: Top-level React error boundary preventing white-screen crashes.
- **`Toast.jsx`**: Global notification toast system.
- **`AdminAnalytics.jsx`**: Anonymous, privacy-respecting product telemetry for founders.
