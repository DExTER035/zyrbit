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
