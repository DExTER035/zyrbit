/**
 * Zyrbit V1 — Growth Intelligence Engine
 * Pure deterministic task dependency resolution, DAG cycle detection, and goal progress calculation.
 * Zero gamification / Zero AI / Zero LocalStorage dependence.
 */

/**
 * Checks if adding a directed edge (sourceTaskId -> targetTaskId) creates a cycle in the task graph.
 * 
 * @param {Array} edges - Array of [taskId, dependsOnTaskId] or objects with { task_id, depends_on_task_id }
 * @param {string} sourceTaskId - Proposed dependent task ID
 * @param {string} targetTaskId - Proposed prerequisite task ID
 * @returns {boolean} True if cycle would be formed, false otherwise
 */
export function hasCycle(edges = [], sourceTaskId, targetTaskId) {
  if (!sourceTaskId || !targetTaskId || sourceTaskId === targetTaskId) return true;

  const adj = {};

  // Build adjacency list (task_id -> list of prerequisite task_ids)
  (edges || []).forEach(edge => {
    let u, v;
    if (Array.isArray(edge)) {
      [u, v] = edge;
    } else if (edge && typeof edge === 'object') {
      u = edge.task_id;
      v = edge.depends_on_task_id;
    }
    if (u && v) {
      if (!adj[u]) adj[u] = [];
      adj[u].push(v);
    }
  });

  // Add the proposed new edge
  if (!adj[sourceTaskId]) adj[sourceTaskId] = [];
  adj[sourceTaskId].push(targetTaskId);

  const visited = new Set();
  const recStack = new Set();

  function dfs(node) {
    visited.add(node);
    recStack.add(node);

    const neighbors = adj[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(adj)) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/**
 * Returns prerequisites for a specific task.
 */
export function getTaskDependencies(taskId, dependencies = []) {
  if (!taskId) return [];
  return (dependencies || []).filter(d => d && d.task_id === taskId);
}

/**
 * Returns tasks that depend on the specified task.
 */
export function getTaskDependents(taskId, dependencies = []) {
  if (!taskId) return [];
  return (dependencies || []).filter(d => d && d.depends_on_task_id === taskId);
}

/**
 * Resolves the deterministic status of a task ('DONE' | 'BLOCKED' | 'AVAILABLE').
 */
export function resolveTaskState(task, dependencies = [], tasks = []) {
  if (!task) return 'BLOCKED';
  if (task.status === 'done') return 'DONE';

  const taskDeps = getTaskDependencies(task.id, dependencies);
  if (taskDeps.length === 0) return 'AVAILABLE';

  const taskMap = Object.fromEntries((tasks || []).filter(Boolean).map(t => [t.id, t]));
  const hasIncompleteDep = taskDeps.some(dep => {
    const prereq = taskMap[dep.depends_on_task_id];
    return !prereq || prereq.status !== 'done';
  });

  return hasIncompleteDep ? 'BLOCKED' : 'AVAILABLE';
}

/**
 * Returns array of AVAILABLE tasks sorted by priority (1=critical, 2=high, 3=normal).
 */
export function getAvailableTasks(tasks = [], dependencies = []) {
  const safeTasks = (tasks || []).filter(t => t && t.status !== 'done');
  return safeTasks
    .filter(t => resolveTaskState(t, dependencies, tasks) === 'AVAILABLE')
    .sort((a, b) => (a.priority || 3) - (b.priority || 3));
}

/**
 * Returns array of BLOCKED tasks with prerequisite metadata attached.
 */
export function getBlockedTasks(tasks = [], dependencies = []) {
  const safeTasks = (tasks || []).filter(t => t && t.status !== 'done');
  const taskMap = Object.fromEntries((tasks || []).filter(Boolean).map(t => [t.id, t]));

  return safeTasks
    .filter(t => resolveTaskState(t, dependencies, tasks) === 'BLOCKED')
    .map(t => {
      const deps = getTaskDependencies(t.id, dependencies);
      const blockingTasks = deps
        .map(d => taskMap[d.depends_on_task_id])
        .filter(b => b && b.status !== 'done');
      return {
        ...t,
        blockingTasks,
      };
    });
}

/**
 * Calculates percentage completion for a set of tasks.
 */
export function calculateTaskProgress(tasks = []) {
  const safe = (tasks || []).filter(Boolean);
  if (safe.length === 0) return 0;
  const doneCount = safe.filter(t => t.status === 'done').length;
  return Math.round((doneCount / safe.length) * 100);
}

/**
 * Calculates percentage completion for a specific project ID.
 */
export function calculateProjectProgress(projectId, tasks = []) {
  if (!projectId) return 0;
  const projectTasks = (tasks || []).filter(t => t && t.project_id === projectId);
  return calculateTaskProgress(projectTasks);
}

/**
 * Calculates overall goal progress across projects.
 */
export function calculateGoalProgress(projects = [], tasks = []) {
  const safeProjects = (projects || []).filter(Boolean);
  if (safeProjects.length === 0) return 0;
  const progressSum = safeProjects.reduce((sum, p) => sum + calculateProjectProgress(p.id, tasks), 0);
  return Math.round(progressSum / safeProjects.length);
}
