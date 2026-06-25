# DexOS — First-Time User Experience (FTUE) Audit

This document presents a usability audit of DexOS from the perspective of a **20-year-old college student** using the application for the first time.

---

## 1. The Student's Screen-by-Screen Journey

### Task 1 & 2: Signup & Installation
- **Confusion**: When logging in, the redirect is slightly laggy, leaving a loading spinner on screen. I wasn't sure if my account was created or if the server crashed.
- **Taps**: Typing email, verification, password config, and setting up initial profile details.
- **Delight**: The glowing neon dark mode splash animation.

### Task 3: Onboarding Slides
- **Confusion**: The app uses phrases like "Gravity Score" and "Zyrons" immediately. "I have no idea what a Zyron is yet, why are you explaining this to me before I even see the dashboard?"
- **Unnecessary**: Having to click "Next" through 5 slide explanations instead of just letting me play with the app.
- **Taps**: 5 clicks to clear the slides.
- **Delight**: Smooth carousel slide transitions.

### Task 4: Zenith (Create First Habit)
- **Confusion**: The ellipsis menu on habit cards is very small. Tapping it to edit or delete is frustrating on a phone viewport.
- **Unnecessary**: The "Daily Reflection" box occupies a large part of the screen right below the habits. "I haven't even logged a habit yet, why are you asking me to reflect on my day?"
- **Taps**: Click "Add Habit" button -> select name/zone -> click save -> tap habit to check.
- **Delight**: The immediate "+10 ⚡" XP popup and sound toast. It felt like getting a reward in a game.

### Task 5: Growth (Start Focus Session)
- **Confusion**: I wanted to start a simple 25-minute Pomodoro timer, but the app forced me to create a "Project folder" first. "Why can't I just type 'Study History' and hit start? Why must I define a project directory?"
- **Unnecessary**: "Blackout Mode" toggle. It hides visual stats, but if I want to escape, I can just reload the browser tab.
- **Taps**: Add Project -> type project details -> Save -> Add Task -> Save -> Tap Play. Too many taps.
- **Delight**: The neon countdown circle ring during focus intervals.

### Task 6: Wealth (Log First Expense)
- **Confusion**: The "Safe Vault" widget on the page. "Why would I encrypt files locally in a simple daily planner?"
- **Unnecessary**: Having to pick expense categories from a rigid dropdown list for minor items.
- **Taps**: Tap add expense -> type description -> choose category -> type amount -> select date -> click save.
- **Delight**: The remaining daily allowance progress bar updating instantly.

### Task 7: Health (Log First Water Entry)
- **Confusion**: Logged a water entry but the main dashboard telemetry score didn't change until I went back and reloaded the tab.
- **Unnecessary**: Opening a modal popup and typing "250" using the numeric keyboard.
- **Taps**: Tap water card -> select amount field -> type numbers -> click save.
- **Delight**: The recovery score gauge updating as I log.

### Task 8: Dex (Ask AI One Question)
- **Confusion**: Tapping "OS Summary" subtab showed an error since I have no historical log entries yet.
- **Unnecessary**: Brain Teasers quiz cards inside a coach window. "I came here to ask a question, not solve math puzzles."
- **Taps**: Click mic button -> speak question -> wait for audio parser.
- **Delight**: Strict personality mode roasts me for slacking. It was hilarious and memorable.

### Task 9: Return Next Day
- **Confusion**: I opened the app, and my habit streak was preserved but I didn't receive any push notifications on my phone to remind me.

---

## 2. Recommendation Verdict
### **Would I recommend DexOS to my best friend?**
**YES, but with a warning.**
I would tell them: *"The app looks incredibly cool, like a futuristic hacker dashboard, and the AI coach roasts you if you slack. But it takes too much typing to log water or expenses, and the shop is completely fake, so don't buy anything from the store."*

---

## 3. Top 10 UX Improvements for Retention
1. **1-Tap Water Presets**: Add simple buttons (+250ml, +500ml) directly on the Health card to avoid typing.
2. **Natural Language Finance**: Replace budget modals with a single text bar: *"lunch 12"*.
3. **Hide the Cosmos Shop**: Disable simulated shop purchases that lock zyrons without unlocking real features.
4. **Remove Project Folders**: Allow starting focus timers on standalone tasks immediately.
5. **Hide Safe Vault**: Prevent key loss vulnerabilities by disabling the local vault container.
6. **Mood Scale reflection**: Replace text area reflections with a 5-point emoji mood scale.
7. **Bypassable Onboarding Carousel**: Add a "Skip Intro" option to the onboarding slides.
8. **Enforce Blackout State**: Persist active blackout timers inside local storage to prevent reload bypass.
9. **Inline Stats Charts**: Distribute Recharts graphs inside Zenith/Wealth/Health pages instead of keeping them on a separate tab.
10. **Touch-Target Sizing**: Increase mobile touch zones for the habit card ellipsis dropdown menus.
