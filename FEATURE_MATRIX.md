# DexOS — Feature Matrix

This document lists every feature currently implemented in DexOS, detailing its status, technical footprint, and core user value.

---

## 1. Zenith Tab (Core Habit Checklist)

### Feature: Habit Check-in & Logs
- **Screen**: Zenith
- **Description**: Allows users to check off, skip, edit, or delete habits daily.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Zenith.jsx`, `src/components/HabitCard.jsx`
- **Database Tables**: `habits`, `activity_log`
- **User Value**: Helps users maintain routine consistency with low-friction 1-tap checks.

### Feature: Daily Reflection Journal
- **Screen**: Zenith
- **Description**: Text input field prompting users to submit a daily summary journal.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Zenith.jsx`
- **Database Tables**: `orbit_journal`
- **User Value**: Promotes mindful self-reflection and mental clarity before sleep.

---

## 2. Growth Tab (Tasks & Pomodoro)

### Feature: Standalone Task Manager
- **Screen**: Growth
- **Description**: Task checklists linked to custom project folders.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Growth.jsx`
- **Database Tables**: `growth_tasks`, `growth_projects`
- **User Value**: Offloads working memory by tracking immediate task objectives.

### Feature: Pomodoro Timer Session
- **Screen**: Growth
- **Description**: Visual countdown clock tracking focused study/work intervals.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Growth.jsx`
- **Database Tables**: `growth_focus_sessions`
- **User Value**: Enforces deep work periods and prevents screen distraction.

---

## 3. Health Tab (Readiness Telemetry)

### Feature: Hydration & Water Logging
- **Screen**: Health
- **Description**: Records water consumption against dynamic thresholds.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Health.jsx`, `src/components/health/WaterCard.jsx`
- **Database Tables**: `health_water_logs`
- **User Value**: Promotes cognitive hydration metrics.

### Feature: Sleep & Workouts Logging
- **Screen**: Health
- **Description**: Logs hours of sleep, sleep quality, and active strain (RPE).
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Health.jsx`
- **Database Tables**: `health_sleep_logs`, `health_move_logs`
- **User Value**: Calculates recovery scores to prevent burnout.

---

## 4. Wealth Tab (Budgeting & Spending)

### Feature: Daily Runway & Expenses Log
- **Screen**: Wealth
- **Description**: Calculates remaining survival days (Runway) based on spending entries.
- **Working Status**: ✅ Fully Working
- **Files Involved**: `src/pages/Wealth.jsx`
- **Database Tables**: `money_expenses`, `wealth_settings`
- **User Value**: Reduces money anxiety by focusing on safety metrics rather than detailed ledger accounting.
