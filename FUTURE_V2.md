# DexOS — V2 Future Roadmap

This document outlines features and integrations postponed for V2, once core user retention on habit checklists and runways is validated.

---

## 1. Wearables Sensor Integration (Telemetry Automation)
- **Concept**: Integrate with Google Fit, Apple Health, Oura, or Garmin APIs.
- **Why Postponed**: Manual logging of sleep hours and exercise minutes is sufficient for beta. Sensor automation adds API dependencies and auth complexity that can wait.

---

## 2. Accountability Circles (Social Echelons)
- **Concept**: Collaborative focus rooms, synchronized Pomodoro countdowns, and group habit completions.
- **Why Postponed**: Core behavior change is an individual process first. Validating individual retention loop kinetics must precede network loops.

---

## 3. Automatic Bank Synchronization
- **Concept**: Integrate with bank aggregators (like Plaid or banking webhooks) to import spending.
- **Why Postponed**: Preserving user privacy is a key value proposition. Direct NLP manual inputs protect privacy and keep administrative complexity low.

---

## 4. Contextual Reminders (Local Push)
- **Concept**: Widgets and push notifications reminding users when they risk breaking habit streaks.
- **Why Postponed**: Requires writing custom background worker routines that can wait.
