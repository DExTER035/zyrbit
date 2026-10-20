# Zyrbit Blueprint — Design Decisions, Gaps & Open Questions

---

## 1. Confirmed vs. Inferred Design Decisions

To ensure total transparency and protect product integrity, the following matrix distinguishes between confirmed specifications and inferred details:

| Area / Screen | Decision | Status | Rationale / Reference |
| :--- | :--- | :---: | :--- |
| **Color Palette** | Petrol Teal (`#174A55`), Warm Ivory (`#F4F0E8`), Deep Charcoal (`#111A20`), Soft Teal (`#DDE9EB`), Border (`#E5E0D8`) | **Confirmed** | Explicitly approved in the 5-Screen presentation reference. |
| **5-Tab Mobile Nav** | `[Home] [Track] [(+) Quick Add FAB] [Insights] [Your Space]` | **Confirmed** | Explicitly approved in the 5-Screen presentation reference. |
| **Home Hero Card** | *"Make room for what matters"* intention card with CTA | **Confirmed** | Explicitly approved in Screen 1 mockup. |
| **Track Structure** | Unified hub card layout linking to all four domains: Growth, Food, Health, and Wealth | **Confirmed** | Explicitly confirmed in Phase 1 constraints. |
| **Quick Add Behavior**| 5-destination navigation launcher: Growth, Food, Health, Wealth, and Ask Dex | **Confirmed** | Explicitly confirmed in Phase 1 constraints. |
| **Insights Scope** | 7d/30d/90d pills, Active days, Logged activities, 2×2 life grid | **Confirmed** | Explicitly approved in Screen 4 mockup. |
| **Your Space Groups** | Profile hero, MAKE IT YOURS, ACCOUNT & ACCESS | **Confirmed** | Explicitly approved in Screen 5 mockup. |
| **Dex Dark Theme** | Charcoal/black surfaces, single composer, prompt chips | **Confirmed** | Explicitly approved in Section 9 of the blueprint. |
| **Food vs. Health Separation** | Food handles meals, calories & hydration; Health handles sleep, workouts, recovery readiness | **Confirmed** | Explicitly confirmed in Section 6 of the blueprint. |
| **Desktop Layout** | 240px left dark sidebar (`#111A20`), center command column, right Dex companion drawer | **Provisional** | Provisional until desktop layout is explicitly reviewed (Phase 1 constraint 7). |
| **Deep Domain Screens**| Detailed pages for Growth (`/growth`), Food (`/food`), Health (`/health`), Wealth (`/wealth`) | **Inferred** | Inferred by applying the approved Petrol Teal & Warm Ivory design tokens to the existing feature-complete forms and tables. |

---

## 2. Identified Technical Gaps & Risk Mitigations

1. **Dual Routing Convention (`/zenith` vs `/home`, `/profile` vs `/space`)**:
   - *Risk*: Renaming routes could break existing active sessions, push notifications, or stored links.
   - *Mitigation*: Maintain permanent route aliases in `src/App.jsx`. Both `/` and `/zenith` render Home; both `/profile` and `/space` render Your Space.

2. **Legacy Theme Tokens vs New Brand Tokens**:
   - *Risk*: `src/styles/theme.css` historically contained dark forest tokens (`--bg-root: #080E0B`, `--color-accent: #2DE09A`), while the approved design system uses Warm Ivory (`#F4F0E8`) and Petrol Teal (`#174A55`).
   - *Mitigation*: Map tokens carefully. Retain legacy variables for Dex's dark workspace and scoped components while promoting `--brand-ivory` and `--brand-petrol` to primary application scope.

3. **Database Schema Stability**:
   - *Rule*: **Zero schema migrations in this phase.** The existing PostgreSQL schema (`Zyrbit_Full_Schema.sql` and migration history) already supports habits, meals, workouts, sleep, expenses, bills, tasks, goals, and statement imports. All new screens will bind directly to existing tables and domain services.

---

## 3. Non-Blocking Questions for User Review

1. **Route Naming Preference**:
   Would you prefer the URL bar to display `/home` or remain `/zenith` (with `/` defaulting to it)? *(Recommendation: Keep `/` as the primary home URL with `/zenith` aliased).*

2. **Track Domain Navigation Flow**:
   On mobile, should tapping the `Track` tab in the bottom bar always open the unified 3-card hub (`/track`), or should it remember the last visited domain (e.g., if you were recently inside Wealth)? *(Recommendation: Always open the `/track` hub for calm predictability, with 1-tap entry into Growth, Health, or Wealth).*

3. **Dex Companion on Desktop**:
   In the widescreen desktop view, do you prefer the right-hand Dex panel to be permanently open as a persistent companion, or collapsible via a toggle button? *(Recommendation: Collapsible by default with `⌘K` or top-bar button to maximize focus when not interacting with Dex).*
