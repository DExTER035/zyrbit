# DexOS — Phase 6: Planning & Cross-Domain Orchestration Report

**Status**: Phase 6 Complete & Verified  
**Date**: September 14, 2026  
**Repository**: `zyrbit` (DexOS Personal Operating System)

---

## 1. Planning Architecture

Phase 6 elevates Dex from understanding single-turn user language into a personal decision and planning layer across DexOS domains (Growth, Health, Food, Wealth, Habits):

$$\text{User} \longrightarrow \text{Understand} \longrightarrow \text{Context} \longrightarrow \text{Plan} \longrightarrow \text{Propose} \longrightarrow \text{Confirm} \longrightarrow \text{Execute} \longrightarrow \text{Record} \longrightarrow \text{Reflect}$$

### Strict Invariants Enforced
- **Zero Autonomous Execution**: Dex never executes actions autonomously. Plans are strictly proposals until the user explicitly confirms (`[Start Plan]`).
- **Zero Supabase Direct Access**: `src/dex/planning` contains no Supabase client imports or direct queries.
- **Controlled Action Execution**: Every executable step routes solely through the authoritative Action Layer:
  $$\text{Plan Executor} \longrightarrow \text{Action Registry} \longrightarrow \text{Action Validator} \longrightarrow \text{Action Executor} \longrightarrow \text{Domain Services} \longrightarrow \text{Supabase}$$
- **Zero Financial Bypass**: Approving a plan never bypasses financial confirmation requirements. Financial actions (`add_expense`, `add_income`, `add_bill`) require independent user confirmation.

---

## 2. Plan Schema & Structure

Located in `src/dex/planning/planSchema.js`:

```typescript
interface PlanStep {
  id: string;                  // Step UUID
  action: string;              // Registered action identifier from ACTION_REGISTRY
  params: Record<string, any>; // Validated action parameters
  label: string;               // Human-readable description
  durationMinutes?: number;    // Time cost (if time-bound)
  order: number;               // Step sequence order (1-indexed)
  requiresConfirmation: boolean;
}

interface DexPlan {
  id: string;                  // Plan UUID
  goal: string;                // User's stated or synthesized goal
  availableMinutes: number | null; // Stated or inferred time constraint
  rationale: string;           // Calm context-derived explanation
  steps: PlanStep[];           // Executable actions
  recommendations: string[];   // Non-executable informational guidance
  status: 'proposed' | 'executing' | 'completed' | 'partially_completed' | 'failed' | 'cancelled';
  createdAt: number;
}
```

### Separation of Executable Steps vs. Informational Guidance
- **Executable Steps**: Must map strictly to registered actions in `ACTION_REGISTRY` (e.g. `start_focus`, `log_water`, `complete_habit`).
- **Recommendations**: Non-executable advice (e.g., *"Take a 5-minute stretch break when your focus timer finishes"*) is held in `recommendations` and never manufactured as synthetic or fake database actions.

---

## 3. Planning Context Used

The planner leverages today's live domain snapshot from `src/dex/dexContextProvider.js`:

| Domain | Context Signals Inspected |
| :--- | :--- |
| **Growth** | Pending tasks sorted by priority ($P1 > P2 > P3$), active focus timer status, associated project IDs. |
| **Health** | Recovery score, sleep hours & quality, hydration level (`waterMlToday`), recent activity. |
| **Habits** | Completed vs pending habits for today, habit candidate names and IDs. |
| **Wealth** | Today's spending (`spentToday`), upcoming bills, monthly budget context. |
| **Food** | Total calories, protein, and meal count logged today. |

---

## 4. Planning Rules & Priority Hierarchy

When synthesizing a proposal from context, the planner adheres to a strict priority hierarchy:

1. **Explicit User Goal**: If the user asks for a specific topic (e.g., *"I have 45 minutes to study DSA"*), that explicit goal overrides generic defaults.
2. **Explicit User Constraints**: Stated available time (e.g., *"I have 45 minutes"*, *"before I leave in 30 minutes"*).
3. **Today's Explicit Priorities**: Selects highest priority pending task ($P1$ Critical > $P2$ High > $P3$ Normal) from `context.growth.pendingTasks`.
4. **Task Dependencies**: Prerequisite tasks take precedence over dependent tasks.
5. **Current Focus State**: If a focus timer is already running, the planner refuses to schedule an overlapping focus session and recommends staying in flow.
6. **Health Signals (Context, Not Medical Policing)**: Low recovery score or short sleep informs calm pacing and informational rest recommendations, rather than rigid algorithm policing.
7. **Today's Pending Habits**: Recommends completing daily habits if no pending tasks exist.
8. **Single-Step Support**: If one 45-minute focus block on the primary task is the best path, a single-step plan is proposed without manufacturing artificial filler steps.

---

## 5. Temporal Bounds & Time Guards

Implemented deterministically in `src/dex/planning/planner.js` and `src/dex/planning/planValidator.js`:

- **Extraction**:
  - `"I have 45 minutes"` $\rightarrow 45$
  - `"I have half an hour"` $\rightarrow 30$
  - `"I have an hour before class"` $\rightarrow 60$
  - `"30 minutes before I leave"` $\rightarrow 30$
  - `"I have 20 mins"` $\rightarrow 20$
  - `"Plan my next hour"` $\rightarrow 60$
  - `"the whole evening"` $\rightarrow 120$
- **Time Bound Invariant**: Total duration of executable steps ($\sum \text{step.durationMinutes}$) must never exceed `availableMinutes`.
  - A 20-minute window strictly rejects or bounds a 45-minute focus step.

---

## 6. Confirmation & Approval Model

- **Proposal Phase**: Zero database mutations occur when a plan is proposed or dismissed.
- **Approval Phase**:
  - User clicks `[Start Plan]` in `DexCommandModal` or sends approval (*"Start plan"*, *"Do it"*).
  - Conversational approval guard: Saying *"Do it"* or *"Start it"* without an active pending plan returns conversational guidance and causes zero mutations.
- **Financial Confirmation Isolation**:
  - If a plan step involves financial mutation (`add_expense`, `add_income`, `add_bill`), plan approval does not bypass confirmation. The step halts and requires independent user confirmation through `ActionExecutor`.

---

## 7. Execution Engine & Double-Click Guard

Implemented in `src/dex/planning/planExecutor.js`:

- **Sequential Execution**: Steps execute one by one through `executeAction()`.
- **Client Session Double-Click Guard**:
  - In-memory lock (`activeExecutionPlanIds`) prevents concurrent duplicate executions within the current client session (e.g., if a user rapidly double-clicks `[Start Plan]`).
- **Event Dispatch**:
  - Dispatches `dexos:refresh` for affected domains.
  - Dispatches `dexos:start-focus` with timer parameters when `start_focus` is executed.

---

## 8. Honest Failure Semantics

- If Step 1 succeeds and Step 2 fails:
  - Execution halts immediately.
  - Subsequent steps (Step 3+) are marked `aborted`.
  - Plan status is marked `partially_completed` (or `failed` if Step 1 failed).
  - Reflection reports honestly:
    ```
    Plan partially completed (1/2 steps).
    ✓ 25m Focus Block
    ✗ Invalid Water: Water amount must be positive.
    ```
  - No synthetic or fake completions are ever recorded.

---

## 9. Quality Assurance & Test Verification

### Regression & Phase 6 Test Suites (450 Assertions Total)

| Test Suite | Assertions | Result |
| :--- | :--- | :--- |
| `test_engines.mjs` | 13 | ✅ Pass |
| `test_phase2_actions.mjs` | 58 | ✅ Pass |
| `test_phase3_5_services.mjs` | 30 | ✅ Pass |
| `test_phase4_dex_ui.mjs` | 116 | ✅ Pass |
| `test_phase5_intelligence.mjs` | 101 | ✅ Pass |
| `test_e2e_real_dex_qa.mjs` | 49 | ✅ Pass |
| `test_security_qa.mjs` | 22 | ✅ Pass |
| `test_phase6_planning.mjs` | 61 | ✅ Pass |
| **Total Automated Assertions** | **450 / 450** | **100% Green** |

### Quality Gates
- **ESLint**: `0 errors, 0 warnings` (`npx eslint .`).
- **Production Bundle**: Clean build in 1.56s (`vite build` — 57 PWA assets precached).
- **Security Check**: Zero direct Supabase access in `src/dex/planning/`, caller-injected `userId` rejected, Action Layer authoritative.

---

## 10. Known Limitations & V1 Boundary

1. **No Distributed Idempotency**: The client execution mutex protects against duplicate concurrent clicks in the browser session, but does not provide distributed server-level idempotency across multiple simultaneous devices.
2. **Deterministic Time Scope**: Time constraints extract duration intervals (e.g. 45 min, 1 hr) rather than calendar synchronization or clock-time schedule booking (out of scope for V1).
3. **Phase Boundary**: Phase 6 concludes planning and cross-domain orchestration. Strictly no autonomous agent behavior or background execution loops were introduced.
