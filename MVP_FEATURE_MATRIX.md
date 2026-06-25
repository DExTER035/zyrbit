# DexOS — MVP Feature Matrix

This document defines the product scope for DexOS, classifying features into MVP, active Beta, and future roadmap phases.

---

## 1. MVP Feature List (Required for launch)
These features represent the absolute baseline required to solve the core problem of low-friction habit, timer, and expense logging:
- **Zenith checklist**: 1-tap completion and skip toggles.
- **Runway Budget tracker**: Visual progress bar indicating remaining financial survival days based on daily burn rate.
- **Simple Pomodoro timer**: Clean countdown ring with simple task input (no project folder nesting required).
- **Core Recovery Score telemetry**: Simple numeric logs for hydration (with preset increments) and sleep duration.
- **Visual Ranks Banner**: Progress bar tracking total earned Zyrons to level up.

---

## 2. Beta Feature List (Optional enhancements)
These features enrich the user experience but are not blockers for a restricted beta test:
- **Dex AI Chat Coach**: Short-form (under 80 words) wellness reflections and prompts using context-aware telemetry.
- **Consistency Heatmap**: Calendar grid visualization of daily check-ins.
- **Natural Language Expense Bar**: Logging transactions by typing quick strings (e.g. "lunch 15").

---

## 3. Future Roadmap (Saved for V2+)
Advanced features that will be built after core retention is verified:
- **Accountability Circles**: Shared focus timers and budget notifications between accountability partners or team groups.
- **Automatic Bank Sync**: Importing card statements directly without manual entries.
- **Sensor Integration**: Fetching sleep and movement data automatically from Apple Health and Wearables APIs.

---

## 4. Features that should NEVER have been built
These features created high technical debt, low user value, or security risks:
- **Simulated Cosmos Shop**: Spending points on items that do not activate any code functionality.
- **Base64 Photo Uploads**: Direct database storage of image strings causing query delays.
- **Local Safe Vault**: Local AES-GCM encryption keys that result in permanent user data loss if client cache is cleared.
- **Brain Teaser Quiz**: riddle game distractions that break the focus contract of a productivity tool.
