/**
 * Zyrbit / DexOS — Growth Domain Service
 * Pure JavaScript domain operations for tasks, projects, and focus sessions.
 * Independent of React components and state.
 */

import { supabase } from '../lib/supabase/index.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Creates a new growth task.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Task title/name
 * @param {number} [params.priority=3] - Priority (1=critical, 2=high, 3=normal)
 * @param {string|null} [params.dueDate=null] - YYYY-MM-DD due date
 * @param {string|null} [params.projectId=null] - Optional parent project UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createTask({ userId, name, priority = 3, dueDate = null, projectId = null }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Task title cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    name: cleanName,
    priority: Number(priority) || 3,
    due_date: dueDate || null,
    project_id: projectId || null,
  };

  try {
    const { data, error } = await supabase
      .from('growth_tasks')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to create task.' };
  }
}

/**
 * Updates a task's completion status.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.taskId - Task UUID
 * @param {string} [params.status='done'] - 'done' or 'todo'
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function completeTask({ userId, taskId, status = 'done' }) {
  if (!userId || !taskId) {
    return { success: false, error: 'User ID and Task ID are required.' };
  }

  const isDone = status === 'done';
  const completedAt = isDone ? new Date().toISOString() : null;

  try {
    const { data, error } = await supabase
      .from('growth_tasks')
      .update({ status, completed_at: completedAt })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to complete task.' };
  }
}

/**
 * Updates task priority.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.taskId - Task UUID
 * @param {number} params.priority - Priority (1, 2, or 3)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateTaskPriority({ userId, taskId, priority }) {
  if (!userId || !taskId) {
    return { success: false, error: 'User ID and Task ID are required.' };
  }
  const cleanPriority = Math.max(1, Math.min(3, Number(priority) || 3));

  try {
    const { data, error } = await supabase
      .from('growth_tasks')
      .update({ priority: cleanPriority })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update priority.' };
  }
}

/**
 * Deletes a task by ID.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.taskId - Task UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTask({ userId, taskId }) {
  if (!userId || !taskId) {
    return { success: false, error: 'User ID and Task ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('growth_tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete task.' };
  }
}

/**
 * Creates a new project container.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Project name
 * @param {string} [params.icon='📁'] - Project icon
 * @param {string|null} [params.deadline=null] - Deadline date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createProject({ userId, name, icon = '📁', deadline = null }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Project name cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    name: cleanName,
    icon: icon || '📁',
    deadline: deadline || null,
  };

  try {
    const { data, error } = await supabase
      .from('growth_projects')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to create project.' };
  }
}

/**
 * Records a completed focus session and triggers streak update.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.durationMinutes - Focus duration in minutes
 * @param {string|null} [params.projectId=null] - Associated project UUID
 * @param {string} [params.sessionDate=todayStr()] - Session date (YYYY-MM-DD)
 * @param {string|null} [params.startedAt=null] - ISO timestamp
 * @param {string|null} [params.endedAt=null] - ISO timestamp
 * @param {string|null} [params.notes=null] - Session notes
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function endFocusSession({
  userId,
  durationMinutes,
  projectId = null,
  sessionDate = todayStr(),
  startedAt = null,
  endedAt = null,
  notes = null,
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const mins = Math.max(1, Math.round(Number(durationMinutes) || 1));

  const payload = {
    user_id: userId,
    project_id: projectId || null,
    skill_id: null,
    duration_minutes: mins,
    session_date: sessionDate,
    started_at: startedAt || new Date(Date.now() - mins * 60000).toISOString(),
    ended_at: endedAt || new Date().toISOString(),
    notes: notes || null,
  };

  try {
    const { data, error } = await supabase
      .from('growth_focus_sessions')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Optional streak update RPC call
    try {
      await supabase.rpc('update_streak', { p_user_id: userId, p_date: sessionDate });
    } catch {
      // Non-critical RPC failure ignored
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to record focus session.' };
  }
}

/**
 * Fetches growth projects, tasks, dependencies, and focus sessions for a user.
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getGrowthData(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const [pRes, tRes, depRes, sRes] = await Promise.all([
      supabase.from('growth_projects').select('*').eq('user_id', userId).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('growth_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('growth_task_dependencies').select('*').eq('user_id', userId),
      supabase.from('growth_focus_sessions').select('*').eq('user_id', userId).order('session_date', { ascending: false }).limit(50),
    ]);

    return {
      success: true,
      data: {
        projects: pRes.data || [],
        tasks: tRes.data || [],
        dependencies: depRes.data || [],
        sessions: sRes.data || [],
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch growth data.' };
  }
}

/**
 * Creates a new milestone goal associated with a project or growth.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Goal title/name
 * @param {string|null} [params.projectId=null] - Associated project UUID
 * @param {number} [params.targetValue=1] - Numeric target value
 * @param {string} [params.unit='done'] - Target unit (e.g. 'done', 'hours', 'problems')
 * @param {string|null} [params.deadline=null] - YYYY-MM-DD deadline
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createGoal({ userId, name, projectId = null, targetValue = 1, unit = 'done', deadline = null }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Goal title cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    name: cleanName,
    pillar: 'growth',
    project_id: projectId || null,
    target_value: Number(targetValue) || 1,
    current_value: 0,
    unit: unit || 'done',
    deadline: deadline || null,
    is_complete: false,
  };

  try {
    const { data, error } = await supabase
      .from('dexos_goals')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to create goal.' };
  }
}

/**
 * Updates goal progress and completion status.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.goalId - Goal UUID
 * @param {number} [params.currentValue] - New current numeric value
 * @param {boolean} [params.isComplete] - Optional completion flag
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateGoalProgress({ userId, goalId, currentValue, isComplete }) {
  if (!userId || !goalId) {
    return { success: false, error: 'User ID and Goal ID are required.' };
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (currentValue !== undefined) {
    updates.current_value = Number(currentValue) || 0;
  }
  if (isComplete !== undefined) {
    updates.is_complete = Boolean(isComplete);
  }

  try {
    const { data, error } = await supabase
      .from('dexos_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update goal progress.' };
  }
}
