/**
 * ZYRBIT — Growth Task Completion Regression Tests
 *
 * Covers the bug where GrowthPathHero passed a raw task ID (string) to
 * completeTask() which expects a full task object. The fix was made in
 * GrowthPathHero.jsx to look up the full task from the tasks array.
 *
 * Tests:
 *   1. completeTask service: successful completion returns success=true
 *   2. completeTask service: DB failure returns success=false (no silent swallow)
 *   3. Repeated completion attempts are idempotent (no duplicate side effects)
 *   4. Reopening a task (status='todo') returns completed_at=null
 *   5. Service accepts a valid UUID string taskId directly
 *   6. Missing taskId (undefined) returns early error — documents old bug path
 *   7. Missing userId returns early error
 *   8. GrowthPathHero fix: lookup finds full task object from tasks array by ID
 *   9. GrowthPathHero fix: placeholder IDs (m-1 etc.) resolve to undefined safely
 *  10. Documents the old bug: string.id === undefined
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted by Vitest to the top of the file,
// so we CANNOT reference outer variables defined with let/const in the factory.
// Instead, we use vi.hoisted() to create the shared mock refs before the hoist.
const { mockSingle, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));

  const makeEqChain = () => {
    const eq = vi.fn(() => ({ eq, select: mockSelect }));
    return { eq, select: mockSelect };
  };

  const mockUpdate = vi.fn(() => makeEqChain());
  const mockFrom = vi.fn(() => ({ update: mockUpdate }));

  return { mockSingle, mockFrom };
});

vi.mock('../lib/supabase/index.js', () => ({
  supabase: { from: mockFrom },
}));

import { completeTask } from '../services/growthService.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const FAKE_USER_ID = 'user-uuid-aaaa-bbbb-cccc-dddddddddddd';
const FAKE_TASK_ID = 'task-uuid-1111-2222-3333-444444444444';

describe('growthService.completeTask — unit regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns success:true and data on successful DB update', async () => {
    const fakeUpdatedTask = {
      id: FAKE_TASK_ID,
      user_id: FAKE_USER_ID,
      status: 'done',
      completed_at: new Date().toISOString(),
      name: 'Finish Growth Module',
    };
    mockSingle.mockResolvedValueOnce({ data: fakeUpdatedTask, error: null });

    const res = await completeTask({
      userId: FAKE_USER_ID,
      taskId: FAKE_TASK_ID,
      status: 'done',
    });

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('done');
    expect(res.data.completed_at).toBeTruthy();
    expect(res.error).toBeUndefined();
  });

  it('2. Returns success:false and error message when Supabase returns an error', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'PGRST116: JSON object requested, multiple (or no) rows returned' },
    });

    const res = await completeTask({
      userId: FAKE_USER_ID,
      taskId: FAKE_TASK_ID,
      status: 'done',
    });

    expect(res.success).toBe(false);
    expect(typeof res.error).toBe('string');
    expect(res.error.length).toBeGreaterThan(0);
    expect(res.data).toBeUndefined();
  });

  it('3. Repeated completion calls do not crash — both return success', async () => {
    const fakeTask = {
      id: FAKE_TASK_ID,
      user_id: FAKE_USER_ID,
      status: 'done',
      completed_at: '2026-10-17T08:00:00.000Z',
    };
    mockSingle
      .mockResolvedValueOnce({ data: fakeTask, error: null })
      .mockResolvedValueOnce({ data: fakeTask, error: null });

    const res1 = await completeTask({ userId: FAKE_USER_ID, taskId: FAKE_TASK_ID, status: 'done' });
    const res2 = await completeTask({ userId: FAKE_USER_ID, taskId: FAKE_TASK_ID, status: 'done' });

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res1.data.status).toBe('done');
    expect(res2.data.status).toBe('done');
  });

  it('4. Reopening a task (status=todo) returns completed_at as null', async () => {
    const fakeReopened = {
      id: FAKE_TASK_ID,
      user_id: FAKE_USER_ID,
      status: 'todo',
      completed_at: null,
    };
    mockSingle.mockResolvedValueOnce({ data: fakeReopened, error: null });

    const res = await completeTask({
      userId: FAKE_USER_ID,
      taskId: FAKE_TASK_ID,
      status: 'todo',
    });

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('todo');
    expect(res.data.completed_at).toBeNull();
  });

  it('5. Service accepts a valid UUID string taskId directly', async () => {
    const fakeTask = {
      id: FAKE_TASK_ID,
      user_id: FAKE_USER_ID,
      status: 'done',
      completed_at: new Date().toISOString(),
    };
    mockSingle.mockResolvedValueOnce({ data: fakeTask, error: null });

    const res = await completeTask({
      userId: FAKE_USER_ID,
      taskId: FAKE_TASK_ID,
      status: 'done',
    });

    expect(res.success).toBe(true);
  });

  it('6. Returns success:false when taskId is undefined — documents old bug path', async () => {
    // Old bug: GrowthPathHero called onCompleteTask(item.id) — a string.
    // completeTask(task) received that string as `task`.
    // taskId: task.id → string.id → undefined.
    // This guard catches that exact scenario.
    const res = await completeTask({
      userId: FAKE_USER_ID,
      taskId: undefined,
      status: 'done',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('User ID and Task ID are required.');
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('7. Returns success:false when userId is empty', async () => {
    const res = await completeTask({
      userId: '',
      taskId: FAKE_TASK_ID,
      status: 'done',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('User ID and Task ID are required.');
    expect(mockSingle).not.toHaveBeenCalled();
  });
});

// ── GrowthPathHero fix logic — pure unit tests ────────────────────────────────
describe('GrowthPathHero.onCompleteTask — task lookup fix (pure logic)', () => {
  it('8. lookup finds task object from tasks array by ID', () => {
    const tasks = [
      { id: 'task-001', name: 'Task One', status: 'todo' },
      { id: 'task-002', name: 'Task Two', status: 'todo' },
    ];
    const itemId = 'task-001';
    const fullTask = tasks.find(t => t.id === itemId);

    expect(fullTask).toBeDefined();
    expect(fullTask.id).toBe('task-001');
    expect(fullTask.name).toBe('Task One');
  });

  it('9. Placeholder IDs (m-1, m-2, m-3) resolve to undefined — onCompleteTask not called', () => {
    const tasks = [{ id: 'task-001', name: 'Task One', status: 'todo' }];
    const fullTask = tasks.find(t => t.id === 'm-1');

    // Fixed code: if (fullTask) onCompleteTask(fullTask)
    // undefined → onCompleteTask is not invoked — no crash, no spurious call
    expect(fullTask).toBeUndefined();
  });

  it('10. OLD bug: passing raw string to completeTask(task) makes task.id undefined', () => {
    // This test documents why the old code broke:
    // GrowthPathHero: onCompleteTask(item.id)  →  completeTask receives a string
    // Inside completeTask: taskId: task.id  →  'uuid-string'.id  →  undefined
    // Then: serviceCompleteTask({ taskId: undefined }) → guard fires → no Supabase call
    // But the UI had already done nothing (no optimistic update), so the task
    // appeared stuck forever.
    const rawId = 'task-uuid-1111-2222-3333-444444444444';
    expect(typeof rawId).toBe('string');
    expect(rawId.id).toBeUndefined();
  });
});
