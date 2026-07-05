# DexOS Project Rules & Guidelines

This document outlines workspace-scoped development rules, coding standards, and guidelines for the **DexOS** (formerly Zyrbit) application. All agents working on this project must adhere to these rules.

## Tech Stack Overview
- **Frontend**: React (v19) + Vite (v8) + TailwindCSS (v4)
- **Database & Auth**: Supabase (PostgreSQL client)
- **AI Integration**: Gemini API (`gemini-2.5-flash`) via developer key (unified in `src/lib/gemini.js`)
- **Theme Variables**: CSS variables defined in `src/design/theme.css` (`--color-success`, `--color-accent`, etc.)

## Critical Behavioral Rules

### 1. API Consolidation
- **Rule**: All Gemini API calls must go through the centralized `askZyra` or `generateContent` helpers in `src/lib/gemini.js`. Do not write duplicate fetch calls or direct headers in UI components.
- **Reason**: Centralizes model tuning, keeps prompts manageable, and ensures robust global error boundaries for AI responses.

### 2. Styling and Aesthetic Standards
- **Rule**: Maintain the ambient dark theme aesthetics of DexOS. Use variables from `src/design/theme.css` and typography from `src/design/typography.css` for consistent, premium interfaces.
- **Rule**: Avoid hardcoded hex codes inside component `style` props when they relate to theme accents (e.g., success, warning, activity colors).

### 3. Database & RLS Safety
- **Rule**: Every database table must have Row Level Security (RLS) enabled.
- **Rule**: Queries must always filter by `user_id` or use appropriate authenticated user scopes.

### 4. Code Quality & Formatting
- **Rule**: Preserve existing code formatting, comments, and docstrings.
- **Rule**: Before completing work, always ensure the project builds correctly by running `pnpm run build`.

---

# DexOS Workspace Constitution (v1)

## Identity

DexOS is a Personal Operating System.

It is NOT:
- a habit tracker
- a finance app
- a health tracker
- an AI chatbot
- a productivity app

It unifies Habits, Focus, Health, Wealth and AI into one calm daily operating system that reduces mental overload.

The Product Blueprint is the single source of truth.
Whenever the implementation conflicts with the Product Blueprint, the Product Blueprint takes priority.
Never invent features that contradict the Product Blueprint.

---

## Product Philosophy

Always follow these principles:
1. Less but Better.
2. Every screen has one purpose.
3. Every screen has one visual hero.
4. Reduce typing.
5. Reduce taps.
6. Reduce decisions.
7. Reward recovery instead of perfection.
8. Never Miss Twice.
9. Calm technology over dopamine.
10. Action over outcomes.
11. Opinionated defaults over endless customization.
12. Consistency over creativity.
13. Earn complexity.
14. Trust is more important than cleverness.
15. Every feature must justify its existence.

---

## Before Building Anything

Before implementing any feature always ask:
- Does this solve a real user problem?
- Does this reduce stress?
- Does this improve daily retention?
- Does this fit the Personal Operating System vision?
- Would users realistically use this every day or every week?
- Is it worth maintaining as a solo founder?
- If another feature had to be removed to make room for this one, would this feature win?

If the answer is NO to most of these questions, recommend against building it.
Challenge unnecessary complexity.
Never blindly implement requests.

---

## UX Principles

Reduce friction everywhere.

Prefer:
- One tap over multiple taps.
- Preset buttons over manual typing.
- Quick actions over forms.

Avoid unnecessary confirmation dialogs.
If a workflow requires more than three taps, search for a simpler solution.

---

## Design System

Maintain a single design language across the entire application.

### Colors
- **Background**: `#0B0D0F`
- **Surface**: `#15181B`
- **Primary Text**: `#F5F5F5`
- **Secondary Text**: `#9CA3AF`
- **Accent**: `#1FA36F`
- **Status Colors**: Green = Success, Amber = Warning, Red = Critical

Do not introduce random blues, purples, pinks or additional accent colors.
Every screen should immediately feel like DexOS.

---

## Layout Rules

Every screen must contain:
- One Hero
- One Primary Action
- One Clear Information Hierarchy

Use generous whitespace.
Follow an 8px spacing system.
Reuse the same cards.
Reuse the same buttons.
Reuse the same typography.
Never duplicate design patterns.

---

## Engineering Rules

Never duplicate business logic.
Reuse components whenever possible.
Refactor instead of copying.
Remove dead code while working.
Maintain zero lint errors.
Maintain production build success.
Do not introduce technical debt unless explicitly approved.

---

## Performance

Optimize mobile first.
Avoid unnecessary re-renders.
Lazy load expensive components.
Avoid heavy animations.
Prioritize perceived performance over visual effects.

---

## AI Philosophy

Dex is an assistant.
Dex is NOT the product.
Quick commands should avoid AI calls whenever possible.
AI should reduce user effort.
Never replace user decision making.
Prefer deterministic logic over expensive LLM calls.

---

## Feature Policy

Never add features because they sound interesting.
Every feature must answer:
- What problem does this solve?
- Why does it belong inside DexOS?
- How does it improve retention?
- How does it support the Product Blueprint?

If it cannot answer these questions, recommend removing or postponing it.

---

## Product Roadmap Policy

Do not build V2 features inside V1.
If a requested feature belongs in V2, recommend postponing it.
Keep the MVP focused.

---

## Quality Assurance

Every completed feature must pass:
- [ ] Matches Product Blueprint
- [ ] Matches Design System
- [ ] Mobile Responsive
- [ ] Accessible
- [ ] No Console Errors
- [ ] No Lint Errors
- [ ] Production Build Passes
- [ ] No Broken Navigation
- [ ] No Regression
- [ ] Feature Fully Functional

---

## Working Style

Act as a Senior Product Engineer.
Not an autocomplete assistant.
Question poor decisions.
Suggest simpler solutions.
Protect product quality.
Protect long-term maintainability.
Protect design consistency.
Protect the Product Blueprint.
When uncertain, choose simplicity.

Always optimize DexOS for becoming a calm, premium SaaS that users trust and return to every day.
Never optimize for feature count.

---

## Golden Rule

Never optimize DexOS to impress developers.
Optimize DexOS to help overwhelmed students and young professionals feel less stressed, more organized, and more in control of their day.
Every decision should move the product closer to that goal.
