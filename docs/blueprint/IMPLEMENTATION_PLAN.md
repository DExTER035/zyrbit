# Zyrbit Phased Implementation Plan

---

## 1. Migration Strategy: Zero Regressions & Rollback Safety

The redesign will be executed strictly in verified, incremental phases. At no point will functional business logic, database tables, or working queries be deleted or replaced with static mock data.

```
PHASE 0: Audit & Blueprint Approval (Current Milestone)
   │
   ▼
PHASE 1: Design Tokens, CSS & Brand Primitives Foundation
   │
   ▼
PHASE 2: Global Shell & 5-Destination Navigation
   │
   ▼
PHASE 3: Home — Daily Command Center
   │
   ▼
PHASE 4: Track Hub & Domain Alignments (Growth, Food, Health, Wealth)
   │
   ▼
PHASE 5: Insights — Cross-Domain Personal Analytics
   │
   ▼
PHASE 6: Your Space — Profile, Preferences & Data Governance
   │
   ▼
PHASE 7: Dex AI Workspace Refinement (UI & Single Composer)
   │
   ▼
PHASE 8: Responsive Polish, E2E Verification & Release Sign-Off
```

---

## 2. Phase-by-Phase Roadmap & Acceptance Criteria

### Phase 0: Audit & Blueprint Approval (Current Milestone)
- **Goal**: Full codebase audit, architectural alignment, design system specification, and risk assessment.
- **Deliverables**: Comprehensive blueprint package in `docs/blueprint/`.
- **Exit Gate**: Explicit user review and sign-off before any code changes begin.

---

### Phase 1: Design Tokens & Primitive Components Foundation
- **Goal**: Establish the master Petrol Teal & Warm Ivory design tokens and standard primitive components.
- **Files Affected**:
  - `src/styles/theme.css`: Clean up legacy dark variable collisions; expose canonical brand tokens (`--brand-petrol`, `--brand-ivory`, `--brand-charcoal`, `--brand-border`, etc.).
  - `src/components/ui/BrandPrimitives.jsx`: Finalize reusable `BrandButton`, `BrandCard`, `BrandBadge`, `BrandInput`, `BrandMetricTile`.
- **Preservation Rule**: Keep legacy CSS variable aliases active so un-migrated pages continue rendering without styling breaks.
- **Acceptance Criteria**:
  - [ ] Build passes with zero errors.
  - [ ] Color contrast passes WCAG AA standards across all text and button states.
  - [ ] Zero lint warnings.

---

### Phase 2: Global Shell & 5-Destination Navigation
- **Goal**: Implement the approved 5-anchor mobile bottom navigation and matching widescreen desktop sidebar.
- **Files Affected**:
  - `src/components/layout/BottomNav.jsx`: Update to 5 anchor destinations: `Home`, `Track`, `(+) Quick Add FAB`, `Insights`, `Your Space`.
  - `src/components/layout/QuickAddSheet.jsx`: Refine bottom sheet with 6 action rows + Ask Dex.
  - `src/components/layout/AppLayout.jsx`: Coordinate mobile shell, desktop sidebar, and modal drawers.
  - `src/App.jsx`: Register `/track` and `/insights` routes while maintaining `/zenith` and `/profile` aliases.
- **Acceptance Criteria**:
  - [ ] Mobile bottom navigation renders at 375pt with exact elevated FAB styling.
  - [ ] Tapping `(+)` opens Quick Add sheet instantly without changing or unloading the current route.
  - [ ] Widescreen view (>768px) displays dark left sidebar (`#111A20`) with 5 links.
  - [ ] Zero broken navigation routes.

---

### Phase 3: Home — Daily Command Center
- **Goal**: Upgrade the central daily overview screen to the approved Warm Ivory aesthetic.
- **Files Affected**:
  - `src/pages/Zenith/index.jsx` (or unified `src/pages/Home/index.jsx`):
    - Intention Hero Card (*"Make room for what matters"*).
    - Today's Priorities (top 2 suggested action cards).
    - Daily Pulse (Habit consistency progress + Focus session resume).
    - Quick Action Chips (`+ Habit`, `+ Meal`, `+ Expense`).
    - Dex AI prompt card.
- **Preservation Rule**: Connect directly to live Supabase `habits`, `activity_log`, and `growth_tasks`.
- **Acceptance Criteria**:
  - [ ] Home displays real data when logged in, with an honest, inviting empty state when no records exist.
  - [ ] Tapping a priority navigates to the relevant task/focus sprint.
  - [ ] Tapping a habit checkbox logs completion immediately with visual confirmation.

---

### Phase 4: Track Hub & Domain Workspaces
- **Goal**: Implement the unified `/track` hub screen and align Growth, Food, Health, and Wealth workspaces.
- **Files Affected**:
  - `src/pages/Track/index.jsx`: New unified hub displaying Growth, Health, and Wealth domain cards.
  - `src/pages/Growth/index.jsx`: Align colors and headers with design system; preserve task DAG engine, focus timers, and goal tracking.
  - `src/pages/Food/index.jsx`: Keep Food distinct from Health; preserve natural language parsing, Indian foods database, and macro calculators.
  - `src/pages/Health/index.jsx`: Focus on sleep debt, hydration, recovery readiness, and workouts.
  - `src/pages/Wealth/index.jsx`: Preserve cashflow math, runway days, statement import, and atomic loan reconciliation.
- **Acceptance Criteria**:
  - [ ] `/track` hub navigates seamlessly into each domain and returns smoothly.
  - [ ] All forms (meal log, expense, workout, task) write valid data to Supabase without errors.
  - [ ] All 29 existing Vitest tests continue to pass.

---

### Phase 5: Insights — Cross-Domain Personal Analytics
- **Goal**: Deliver the cross-domain analytics experience across Growth, Food, Health, and Wealth.
- **Files Affected**:
  - `src/pages/Insights/index.jsx`:
    - Time-range selector (7d / 30d / 90d pills).
    - Active Days and Logged Activities metric tiles.
    - Activity Over Time chart with honest empty state.
    - Across Your Life 2×2 breakdown grid.
- **Integrity Rule**: No fabricated numbers. If data is sparse, display clear guidance on how to build consistent history.
- **Acceptance Criteria**:
  - [ ] Accurate metric rollups aggregated from existing database records.
  - [ ] Responsive chart rendering on both mobile and widescreen desktop viewports.

---

### Phase 6: Your Space — Profile & Settings
- **Goal**: Upgrade the user space screen to match the approved design.
- **Files Affected**:
  - `src/pages/Profile/index.jsx`:
    - Profile hero card (avatar, name, email, edit trigger).
    - "MAKE IT YOURS" (Preferences, Notifications).
    - "ACCOUNT & ACCESS" (Membership, Privacy & security, Install Zyrbit, Sign out).
- **Acceptance Criteria**:
  - [ ] Name editing and avatar uploads persist successfully.
  - [ ] JSON/CSV full data export functions cleanly.
  - [ ] Password updates and sign-out terminate sessions securely.

---

### Phase 7: Dex AI Workspace Refinement
- **Goal**: Refine the Dex command modal into a calm, dark-themed AI console with a single input composer.
- **Files Affected**:
  - `src/components/common/DexCommandModal.jsx`:
    - Distinctive charcoal dark theme (`#111A20` / `#0B0D0F`).
    - Single primary input composer (removing duplicated inputs).
    - Starter prompt chips (*Plan my day*, *Analyze my meal*, *Review my spending*, *Check my habits*).
    - Action confirmation preview cards before database writes.
- **Boundary**: UI/UX refinement only. Future multi-step autonomous agentic planning is deferred.
- **Acceptance Criteria**:
  - [ ] Exactly one active text input composer is present.
  - [ ] Actions proposed by Dex require explicit user confirmation before mutating data.

---

### Phase 8: Mobile-First Responsive Polish & Release Sign-Off
- **Goal**: Full visual regression check, performance optimization, and production build verification.
- **Tasks**:
  - Run complete end-to-end user journeys (Sign in -> Log habit -> Log meal -> Record expense -> View insights -> Chat with Dex).
  - Verify touch targets and keyboard safety on mobile viewports.
  - Execute full test suite (`npm run test`) and production build (`npm run build`).
  - Deploy to Vercel production preview.
- **Acceptance Criteria**:
  - [ ] 0 console errors, 0 lint warnings.
  - [ ] Production build succeeds in under 4 seconds.
  - [ ] High-resolution visual proof captured across all 5 core tabs.
