# ZYRBIT v2 Feature Audit

Goal: transform ZYRBIT from a habit tracker into an AI-powered personal operating system.

This document lists the features already present in the current ZYRBIT codebase, estimates how complete they are, and recommends whether each should be kept, merged, redesigned, or deleted for v2.

## Decision Key

- Keep: strong fit for v2 and can remain mostly intact.
- Merge: useful, but should be combined into a broader v2 system.
- Redesign: concept is valuable, but implementation or product model needs a major rethink.
- Delete: remove from v2 unless there is a specific reason to preserve it.

## North Star For v2

ZYRBIT v2 should feel less like a set of separate trackers and more like one personal operating system:

- One AI command layer that can read, summarize, and act across life areas.
- One unified daily timeline instead of scattered logs.
- One data model for tasks, habits, goals, health, money, study, and reflections.
- One meaningful score or status system, not several competing gamification layers.
- Fewer tabs, clearer flows, and stronger automation.

## Feature Audit

| Area | Feature | Current Completion | v2 Decision | Notes |
| --- | --- | ---: | --- | --- |
| Core App | Auth/session flow | 75% | Keep | Supabase auth is wired through `App.jsx`; session checks, login flow, and protected routes exist. Needs cleaner error states and route consistency. |
| Core App | Splash screen | 90% | Keep | Strong brand entry. Keep but shorten and make it optional after first launch. |
| Core App | Onboarding slides | 75% | Redesign | Current onboarding is visual and polished, but v2 needs onboarding that teaches the AI OS model and gathers goals/preferences. |
| Core App | New-user goal setup | 70% | Redesign | Useful habit seeding exists. Should evolve into OS setup: life areas, current baselines, priorities, AI style, notification rules. |
| Core App | Protected routing | 70% | Keep | Active routes are clear, but old pages remain unused. Clean route map for v2. |
| Core App | PWA install support | 80% | Keep | Manifest, icons, install banner, and service worker exist. Needs verification and asset cleanup. |
| Core App | Capacitor mobile wrapper | 30% | Redesign | Config exists, but native app behavior is not deeply integrated. Decide whether v2 is PWA-first or native-first. |
| Core App | Theme toggle | 60% | Keep | Basic theme persistence exists. v2 should support focused themes without overcomplicating design. |
| Core App | Toast notifications | 75% | Keep | Useful global feedback system. Should be standardized across all actions. |
| Navigation | Bottom mobile nav | 80% | Keep | Active main navigation is functional. v2 should reduce destinations and expose AI command access prominently. |
| Navigation | Desktop sidebar/topbar/panel | 35% | Redesign | Desktop pieces exist but are not integrated into active layout. v2 needs a real responsive desktop command center. |
| Navigation | Legacy `NavBar` | 20% | Delete | Older route targets do not match active app. Remove during cleanup. |
| Habits | Habit CRUD | 80% | Merge | Solid implementation. In v2, merge into a broader "Routines" system with habits, tasks, rituals, and recurring goals. |
| Habits | Daily habit completion | 80% | Merge | Core behavior works. Should feed unified timeline, AI context, and operating-system status. |
| Habits | Habit skip flow | 60% | Redesign | Skips exist, but v2 should distinguish intentional skip, missed, blocked, and rescheduled. |
| Habits | Habit zones | 70% | Merge | Mind/body/growth/soul zones are useful, but v2 needs configurable life domains. |
| Habits | Habit cards | 75% | Keep | Good reusable UI. Simplify for v2 and connect to unified action model. |
| Habits | Habit modal | 70% | Redesign | Basic create/edit exists. Needs better scheduling, reminders, difficulty, AI suggestions, and goal links. |
| Habits | Heatmap grid | 55% | Merge | Useful visualization, but should move into analytics rather than individual habit clutter. |
| Habits | Perfect-day celebration | 65% | Merge | Good motivation, but v2 should reward system-level consistency, not only habits. |
| Habits | Reflection after completion | 55% | Merge | Valuable. Should become part of AI daily review and timeline. |
| Goals | System goals dashboard | 60% | Redesign | CGPA, weight, gold, side income exist as hardcoded-ish personal targets. v2 needs flexible goal objects with metrics, milestones, and AI review. |
| Goals | Mirror bar | 55% | Merge | Screen time and spending awareness is a strong OS concept. Merge into daily status/command center. |
| Goals | Weekly review modal | 35% | Redesign | Concept exists but is thin. v2 should have AI-generated weekly operating review. |
| Gamification | Zyrons wallet | 75% | Redesign | Strong identity, but current economy is scattered. v2 needs one coherent reward economy tied to meaningful progress. |
| Gamification | Zyron transactions | 75% | Keep | Transaction ledger is useful and should remain as event history. |
| Gamification | Rank ladder | 70% | Redesign | Strong brand flavor, but multiple rank systems exist. Consolidate into one identity/progression model. |
| Gamification | Rank banner | 65% | Keep | Keep as a celebratory UI component after rank model is cleaned. |
| Gamification | Shop purchases | 50% | Redesign | Shop exists but many purchases are conceptual. v2 should avoid fake unlocks unless they actually change behavior. |
| Gamification | Streak shield | 55% | Redesign | Good idea, but must be clearly tied to skip/miss semantics and not distort progress data. |
| Gamification | Zyron cooldowns | 45% | Redesign | Cooldowns are partly implemented. Revisit after economy redesign. |
| Gamification | Achievement badges | 45% | Merge | Useful but should be generated from unified milestones. |
| Gravity | Gravity score | 75% | Redesign | Central status metric is valuable. v2 should define one OS health score using habits, sleep, money, study, health, and intent alignment. |
| Gravity | Gravity ring | 80% | Keep | Strong visual identity. Keep as the primary personal OS status display. |
| Gravity | Energy map | 45% | Redesign | Interesting, but needs clearer data source and user value. |
| Gravity | Shadow mode | 45% | Redesign | Useful self-awareness idea. Should become an AI insight mode rather than a standalone widget. |
| Gravity | Alter ego | 45% | Redesign | Good identity concept, but needs product clarity. Could become "future self" inside AI coaching. |
| Gravity | Detrox | 50% | Redesign | Promising intervention mode. Needs clearer scope around reset/recovery protocols. |
| Study | Study session logging | 70% | Merge | Good data capture. Merge into unified work/study focus system. |
| Study | Study subjects | 55% | Redesign | Tables and UI exist, but schema mismatch needs cleanup. |
| Study | Study exams | 60% | Merge | Useful for students. Should be optional domain module. |
| Study | Study goals | 45% | Redesign | Present in schema patches. Needs first-class goal integration. |
| Study | Daily study tasks | 65% | Merge | Useful, but should become part of universal task system. |
| Study | Study notes | 70% | Merge | Keep concept, but integrate with AI summaries/search. |
| Study | Pomodoro/focus timer | 60% | Merge | Valuable. Combine with Blackout Mode into one Focus system. |
| Study | Blackout Mode | 75% | Redesign | Strong OS-like feature. Needs stricter app behavior, better session history, and consistent schema. |
| Study | Phantom self | 45% | Redesign | Strong idea for predictive self, but needs reliable analytics foundation. |
| Diary | Diary entries | 75% | Merge | Keep as part of unified timeline/journal. |
| Diary | Diary PIN lock | 65% | Redesign | Useful, but PIN hash is not salted per best practice. Needs security review. |
| Diary | Encrypted diary content | 65% | Redesign | AES-GCM exists. Needs robust key handling, recovery story, and UX clarity. |
| Diary | Secret notes | 65% | Merge | Useful, but should become private vault/locked memory. |
| Diary | Gratitude fields | 60% | Merge | Good reflection primitive. Merge into AI daily review. |
| Diary | Mood tracking | 60% | Merge | Keep as one signal in personal OS timeline. |
| Diary | Mood graph placeholder | 20% | Delete | Replace with real analytics if needed. |
| Diary | Daily prompt | 60% | Merge | Valuable. AI should generate prompts from user context. |
| Diary | Void journal AI | 45% | Redesign | Interesting concept, but should merge into AI memory/reflection layer. |
| Diary | Brutal weekly report | 50% | Redesign | Keep as an optional AI tone, not a separate feature. |
| Money | Money setup | 70% | Keep | Currency and monthly budget setup exists. Needs better onboarding and editing. |
| Money | Expense logging | 80% | Keep | Functional and important for OS. |
| Money | Income logging | 65% | Keep | Implemented as negative expense. Should become clearer schema in v2. |
| Money | Budget tracking | 65% | Redesign | Basic monthly budget works. v2 needs category budgets, burn rate, alerts, and AI advice. |
| Money | Category breakdown | 70% | Keep | Useful visual summary. |
| Money | Savings goals | 70% | Merge | Merge into universal goals system while preserving finance-specific fields. |
| Money | Savings deposits | 70% | Keep | Useful action. Should create timeline events. |
| Money | Transaction feed | 65% | Merge | Merge with unified activity timeline. |
| Money | Wallet overview | 65% | Merge | Useful but should align with v2 gamification redesign. |
| Health | Workout logging | 75% | Keep | Good baseline. Needs better activity types and metrics. |
| Health | Movement logs | 65% | Merge | Merge with health timeline and rewards. |
| Health | Food logging | 65% | Redesign | Basic calorie/protein logging exists. Needs usability and optional detail levels. |
| Health | Water logging | 70% | Keep | Simple and useful. |
| Health | Sleep logging | 70% | Keep | Important OS signal. |
| Health | Progress photos | 55% | Redesign | Currently stores base64 in database. v2 should use Supabase storage. |
| Health | Health targets | 45% | Redesign | Hardcoded local targets. Move to configurable goals/preferences. |
| AI | Gemini helper library | 60% | Redesign | `askZyra` exists, but AI calls are duplicated elsewhere. v2 needs one AI service layer. |
| AI | Jarvis chat | 75% | Redesign | Strong v2 centerpiece. Needs streaming, tool/action safety, memory, and structured commands. |
| AI | Voice commands | 65% | Redesign | Useful and OS-like. Needs confirmation, broader parser, and cross-browser handling. |
| AI | AI daily summary | 55% | Keep | Keep and make automatic/context-aware. |
| AI | AI smart suggestions | 50% | Keep | Strong fit, but needs reliable JSON parsing and fallback handling. |
| AI | AI quiz generation | 65% | Redesign | Fun, but not core OS. Keep only if it supports learning/focus goals. |
| AI | Old AI Coach page | 45% | Delete | Duplicate of Jarvis/Zyra concepts and not routed. Fold any good prompts into v2 AI layer. |
| AI | Old Coach page | 30% | Delete | Legacy implementation. |
| AI | Weekly summary component | 20% | Delete | Imports missing `callGemini`; replace with unified AI summary service. |
| Challenge | Personal 7/21/30-day challenge mode | 65% | Merge | Useful for routines/goals. Merge into universal programs/sprints. |
| Challenge | Challenge day grid | 70% | Keep | Strong visualization for time-boxed programs. |
| Challenge | Public habit challenges | 45% | Redesign | Tables are not fully consolidated. Keep concept after schema cleanup. |
| Challenge | Battles | 45% | Redesign | Interesting social motivation, but needs scoring, fairness, and anti-abuse design. |
| Community | Profiles/friend tags | 70% | Keep | Good social foundation. |
| Community | Friend search/request flow | 65% | Keep | Mostly implemented. Needs better duplicate/error handling. |
| Community | QR friend tag | 60% | Keep | Nice mobile affordance. |
| Community | Friend list | 60% | Keep | Useful if social survives into v2. |
| Community | Direct messages | 45% | Redesign | UI exists but schema is not in main SQL. Needs moderation/privacy decisions. |
| Community | Friend activity feed | 30% | Redesign | Queries `habit_logs`, while app uses `activity_log`. Fix or remove. |
| Community | Rank chat rooms | 50% | Redesign | Interesting, but rank model and schema need consolidation. |
| Community | Leaderboard | 55% | Redesign | Needs clear score source and privacy controls. |
| Community | Global orbits | 45% | Redesign | Strong v2 community concept, but current version has mock member counts and incomplete admin/request flow. |
| Community | Orbit chat | 50% | Redesign | Realtime chat exists conceptually. Needs schema and moderation. |
| Community | Orbit requests | 45% | Redesign | Tables exist in patches; workflow incomplete. |
| Analytics | Stats page | 55% | Redesign | Large analytics page exists but is not routed. Rebuild around v2 OS insights. |
| Analytics | Recharts visualizations | 65% | Keep | Useful dependency and chart patterns. |
| Analytics | Lifetime stats | 50% | Merge | Merge into profile/analytics. |
| Analytics | Phantom self expansion | 45% | Redesign | Good v2 AI projection feature, but needs real data consistency. |
| Data | Supabase client | 70% | Keep | Good base. Needs stricter env validation and no placeholder client in production. |
| Data | Full schema SQL | 65% | Redesign | Broad but fragmented. Consolidate into migrations. |
| Data | Supabase migration | 35% | Redesign | Only covers early core tables. Must be replaced or expanded. |
| Data | Patch SQL files | 45% | Merge | Useful history, but v2 needs one coherent schema. |
| Data | RLS policies | 60% | Redesign | Many exist, but community/public data requires careful review. |
| Data | Streak trigger | 70% | Keep | Useful, but align with skip/miss/reschedule semantics. |
| Scripts | Screenshot generator | 60% | Keep | Useful for PWA store assets if maintained. |
| Scripts | PWA asset downloader | 25% | Delete | Downloads placeholder assets from external services. Replace with intentional brand assets. |
| Scripts | Table audit script | 45% | Redesign | Useful dev utility, but hardcoded keys must be removed. |
| Scripts | Debug scripts | 20% | Delete | Hardcoded Supabase keys and temporary debugging code. |
| Assets | Logo/favicon/app icons | 80% | Keep | Strong visual identity. Clean up generated duplicates. |
| Assets | Screenshots | 60% | Redesign | Current screenshots may be useful, but v2 needs updated product screenshots. |
| Assets | React/Vite default assets | 0% | Delete | Remove `react.svg` and `vite.svg` unless still referenced. |

## Recommended v2 Product Structure

### 1. Command Center

The home screen should become the personal OS dashboard:

- Today's mission
- AI briefing
- Current OS score
- Top three actions
- Timeline of logged events
- Warnings: overspending, low sleep, missed routines, upcoming exams, weak focus

This should replace the feeling of landing inside a habit tracker.

### 2. AI Layer

Jarvis/Zyra should become the main interaction model:

- Chat with memory
- Voice commands
- Daily planning
- Weekly review
- Cross-module insights
- Safe structured actions, such as "log water", "create task", "move this goal", "summarize this week"

All AI calls should go through one service file instead of being duplicated across pages.

### 3. Unified Timeline

Create one `events` or `timeline_entries` model that records:

- habit completion
- workouts
- meals
- water
- sleep
- study sessions
- expenses/income
- diary entries
- AI reviews
- challenges

Specialized tables can still exist, but the user experience should feel like one life log.

### 4. Universal Goals

Merge system goals, savings goals, study goals, health targets, and habit challenges into one goal architecture:

- goal
- metric
- target
- deadline
- linked routines/tasks/logs
- AI status
- progress history

### 5. Routines And Tasks

Merge habits, study tasks, daily tasks, focus sessions, and recurring actions into a routines/tasks engine.

Suggested object types:

- Habit
- Task
- Ritual
- Sprint
- Program
- Reminder

### 6. Personal OS Score

Redesign Gravity Score into a broader operating score:

- consistency
- focus
- sleep
- movement
- money discipline
- study/work progress
- emotional reflection
- goal alignment

The Gravity Ring should remain the visual anchor.

### 7. Community As Optional Layer

Keep community, but do not let it distract from the personal OS:

- Friends
- Orbits
- Challenges
- Leaderboards
- Chat

For v2, ship only the parts that have a complete schema, privacy model, and moderation assumptions.

## Cleanup Priorities Before Rebuilding

1. Remove or archive unused legacy pages.
2. Consolidate Supabase SQL into clean migrations.
3. Fix schema mismatches:
   - `activity_log` vs `habit_logs`
   - `duration_mins` vs `duration_minutes`
   - missing community tables
   - progress photos stored as base64
4. Remove hardcoded Supabase keys from debug scripts.
5. Replace duplicated AI helper code with one AI service.
6. Decide the active product map before UI rebuild.
7. Normalize text encoding so emojis/symbols render correctly.
8. Run a full build/lint once Node/npm is available.

## Suggested v2 MVP

The first v2 release should include:

- Command Center home
- AI chat and voice command layer
- Routines/tasks
- Unified timeline
- Goals
- Focus/blackout sessions
- Money basics
- Health basics
- Diary/reflection
- Personal OS score
- Profile/wallet/rank, simplified

Delay until later:

- Public social orbits
- Rank chat rooms
- Battles
- Shop economy
- AI quiz mode
- Complex leaderboards
- Deep analytics dashboards

