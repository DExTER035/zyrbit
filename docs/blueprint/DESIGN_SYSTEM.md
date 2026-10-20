# Zyrbit Design System Specification
## Petrol Teal & Warm Ivory Architecture

---

## 1. Visual Direction & Master Palette

Zyrbit follows an approved, restrained aesthetic combining **Petrol Teal** and **Warm Ivory** for application domains, alongside a dedicated **Charcoal Dark Theme** for the Dex AI workspace.

### Core Application Palette

| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| `--brand-ivory` | `#F4F0E8` | Primary page background, canvas backdrop |
| `--brand-card-bg` | `#FFFFFF` | Surface containers, cards, dialogs, bottom sheets |
| `--brand-petrol` | `#174A55` | Primary brand accent, primary CTA buttons, elevated Quick Add FAB |
| `--brand-charcoal` | `#111A20` | Headings, primary text, dark chassis frame, desktop sidebar |
| `--brand-muted-petrol` | `#367887` | Interactive sub-elements, active pill highlights, icons |
| `--brand-soft-teal` | `#DDE9EB` | Subtle chip backgrounds, secondary badge fills, pulse tags |
| `--brand-border` | `#E5E0D8` | Hairlines, card borders, list dividers |
| `--brand-text-sub` | `#68777B` | Secondary text, captions, date stamps, placeholder labels |

### Status & Feedback Colors

| Semantic State | Hex Code | Background Tint (12%) | Purpose |
| :--- | :--- | :--- | :--- |
| **Success** | `#1FA36F` / `#2DE09A` | `rgba(31, 163, 111, 0.12)` | Completed habits, positive cashflow, healthy recovery |
| **Warning** | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | Due bills, high sleep debt, low liquid runway (<14d) |
| **Critical / Error** | `#EF4444` | `rgba(239, 68, 68, 0.12)` | Overdue tasks, critical runway (<7d), destructive actions |

---

## 2. Dex-Specific Dark Theme Palette

Dex is visually distinct to signal an ambient, calm AI workspace without feeling disconnected from Zyrbit:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `--dex-bg` | `#0B0D0F` | Root background for Dex modal and chat canvas |
| `--dex-surface` | `#15181B` | Composer surface, message cards, suggestion chips |
| `--dex-elevated` | `#1E2227` | Active message hover, border highlights |
| `--dex-text-primary`| `#F1F5F3` | Assistant and user chat transcripts |
| `--dex-text-muted` | `#7E948A` | Timestamps, system directives, tokens |
| `--dex-accent` | `#174A55` / `#367887` | Action confirm buttons, Dex avatar badge |

---

## 3. Typography Hierarchy

Zyrbit uses **Inter** (`font-family: 'Inter', -apple-system, sans-serif`) with an 8px modular scale:

| Level | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | 24px - 28px | 800 (Bold) | 1.15 | -0.02em | Hero intention cards, page titles |
| **Heading 1** | 20px - 22px | 700 (Bold) | 1.2 | -0.015em | Section headers, card titles |
| **Heading 2** | 16px - 17px | 650 (Semi) | 1.25 | -0.01em | Domain group titles, subheadings |
| **Body Primary** | 14px - 15px | 500 / 600 | 1.4 | 0 | List items, descriptions, inputs |
| **Body Secondary**| 12px - 13px | 450 / 500 | 1.4 | 0 | Subtext, timestamps, hints |
| **Micro / Badge** | 10px - 11px | 700 (Bold) | 1.2 | 0.04em | Section uppercase labels, status tags |

---

## 4. Radii & Elevation Tokens

- **Card Radius**: `16px` (outer surface cards), `12px` (nested inner items)
- **Button Radius**: `14px` (standard CTA), `999px` (pills and filter chips)
- **Input Radius**: `12px` - `14px`
- **Elevated FAB Radius**: `50%` (circular, 50×50pt with 3px solid white rim)
- **Elevation Shadows**:
  - Cards: `0 2px 10px rgba(17, 26, 32, 0.04)`
  - Elevated FAB: `0 4px 16px rgba(23, 74, 85, 0.35)`
  - Sheets / Modals: `0 -4px 24px rgba(17, 26, 32, 0.12)`
  - Desktop Canvas Frame: `0 24px 60px rgba(17, 26, 32, 0.22)`

---

## 5. Device Chassis & Shell Specifications

### Mobile Presentation Target
- **Device Dimensions**: `375pt × 812pt` (iPhone X/11/12/13/14 mini/standard ratio)
- **Status Bar**: `9:41` with WiFi, Signal, and Battery indicators
- **Dynamic Island / Sensor Housing**: Centered top pill `120px × 30px` with 18px radius
- **Bottom Navigation Bar**: Fixed bottom, 60px height + safe area, 5 anchor positions:
  `[Home] [Track] [(+) Quick Add FAB] [Insights] [Your Space]`

### Widescreen Desktop Adaptation
- **Max Width**: `1240px` centered canvas
- **Left Navigation Sidebar**: `240px` fixed dark panel (`#111A20`) with Zyrbit logo badge, 5 primary navigation links, track spaces shortcuts, and primary `[+ Quick Add Record]` button.
- **Center Canvas**: `flex: 1` Warm Ivory background (`#F4F0E8`), Daily Intention hero, Priorities, Pulse stats, and Connected Spaces.
- **Right Contextual Panel**: `280px` Dex Companion drawer with proactive suggestions and 1-tap prompts.

---

## 6. Interaction Rules
- **No Decorative Animations**: Transitions are limited to fast micro-interpolations (`0.15s` - `0.2s` ease-in-out).
- **Single Primary Action**: Only one primary high-contrast button per viewport to avoid decision paralysis.
- **Immediate Feedback**: All writes give instantaneous optimistic updates and standard toast confirmation.
- **Touch Target Accessibility**: Minimum touch target of `44pt × 44pt` on all mobile interactive elements.
