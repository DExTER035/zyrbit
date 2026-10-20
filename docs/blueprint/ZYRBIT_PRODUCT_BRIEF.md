# Zyrbit — Master Product Brief
## Personal Operating System (POS)

---

## 1. Product Identity & Purpose

**Zyrbit is a Personal Operating System.**

It is **NOT**:
- A generic habit tracker
- A finance spreadsheet or crypto tracker
- A calorie-counting obsession app
- An ungrounded conversational AI chatbot
- A corporate project management tool

Zyrbit unifies **Habits, Focus, Health, Wealth, and AI** into one calm daily operating system designed to reduce cognitive load and help users feel in control of their day.

### Core Target Audience
Distracted founders, students, engineers, and young professionals facing burnout, mental fatigue, and administrative overload. They crave structure but are exhausted by fragmented, noisy apps.

### Primary User Problem Solved
> *"How do I take just one balanced, productive action today across my life without feeling overwhelmed?"*

---

## 2. Product Principles

1. **Less but Better**: Eliminate decorative clutter. Every element must earn its place.
2. **Every Screen Has One Purpose**: No mixed-intent screens or cognitive traps.
3. **Every Screen Has One Visual Hero**: A singular focal point (e.g., daily intention, recovery readiness, or runway safety).
4. **Reduce Typing**: 1-tap logging, preset buttons, and natural-language shortcuts.
5. **Reduce Taps**: If a frequent workflow requires more than two taps, simplify it.
6. **Reduce Decisions**: Provide opinionated defaults over endless configuration.
7. **Reward Recovery over Perfection**: Protect momentum during slips; never penalize a user with a total reset on a single bad day.
8. **Never Miss Twice**: Missing one day is life; missing two days is the start of a bad habit. Encourage immediate recovery.
9. **Calm Technology over Dopamine**: Clean lines, quiet feedback, and zero panic-inducing notifications.
10. **Action over Outcomes**: Focus on repeatable micro-habits rather than distant, intimidating goals.
11. **Truthful Data**: Never display fabricated analytics, fake scores, or ungrounded claims. Empty states must be honest and inviting.
12. **Earned Complexity**: Start simple; reveal advanced controls only as the user's data and consistency mature.

---

## 3. Core Domains & Architecture

Zyrbit organizes a person's life telemetry into four primary domains, governed by a central command center and unified intelligence:

```
                              ┌───────────────┐
                              │     HOME      │
                              │ Daily Command │
                              └───────┬───────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
      │    GROWTH     │       │ FOOD & HEALTH │       │    WEALTH     │
      │ Tasks · Focus │       │ Nutrition ·   │       │ Cash · Bills  │
      │ Habits · Goals│       │ Sleep · Move  │       │ Runway · Lent │
      └───────────────┘       └───────────────┘       └───────────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │   INSIGHTS    │
                              │ Cross-Domain  │
                              └───────┬───────┘
                                      │
                              ┌───────┴───────┐
                              │      DEX      │
                              │ AI Companion  │
                              └───────────────┘
```

### 1. Home — Daily Command Center
- **Purpose**: High-level morning orientation and daily execution anchor.
- **Hero**: Daily Intention Banner (*"Make room for what matters"*).
- **Key Modules**: Today's Priorities (top 2 suggested actions), Daily Pulse (Habit consistency & Focus sprint status), Quick action chips (`+ Habit`, `+ Meal`, `+ Expense`), and contextual Dex prompt.

### 2. Track — The Four Life Domains
- **Purpose**: Unified overview and navigation hub across all life telemetry.
- **Growth**: Tasks, projects, focus timers (Pomodoro/Deep Work), skill leveling, and discipline streaks.
- **Food**: Fast meal capture, calorie & macronutrient tracking (protein, carbs, fat, fiber), hydration logs, and food library.
- **Health**: Sleep duration & quality, sleep debt tracking, recovery readiness score, movement logs, and body weight progression.
- **Wealth**: Cashflow (income & expenses), monthly budget, liquid runway days, upcoming recurring bills, lending/borrowing records, and statement import.

### 3. Quick Add — Global Navigation Shortcut
- **Purpose**: Rapid access bottom sheet launcher accessible from anywhere via the central elevated FAB.
- **Destinations**: Growth, Food, Health, Wealth, and Ask Dex. Navigates directly to the target domain or Dex AI interface.

### 4. Insights — Cross-Domain Personal Analytics
- **Purpose**: Uncover meaningful correlations and habits over time.
- **Scope**: 7-day, 30-day, and 90-day activity trends, consistency across life domains, habit impact correlations.
- **Integrity**: Rigorously truthful. Insufficient data states are clearly explained; no fake numbers.

### 5. Your Space — Profile & Settings
- **Purpose**: Personal identity, system preferences, data control, and subscription management.
- **Scope**: Account profile, push notifications, security & password, full data export (CSV/JSON), account deletion, PWA offline status, and Pro membership.

### 6. Dex — Ambient AI Companion (UI Only in Current Phase)
- **Purpose**: Calm Socratic mirror and natural-language telemetry interface.
- **Interface**: Charcoal dark theme (`#111A20`), single input composer, prompt suggestions (*Plan my day, Analyze my meal, Review my spending, Check my habits*).
- **Boundary**: UI/UX refinement only. Autonomous agentic loops, fake memory states, and mock executions are explicitly deferred.

---

## 4. What Zyrbit Will NEVER Build
- Public social media feeds, likes, or vanity leaderboards.
- Complex Jira-like nested issue boards or confusing Gantt charts.
- Crypto/Web3 wallet integrations or third-party bank credential scrapers (protecting user privacy).
- Intrusive, guilt-inducing notifications that cause anxiety.
