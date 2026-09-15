-- ─────────────────────────────────────────────────────────────────────────────
--  ZYRBIT V1 — PHASE 10.1 GROWTH TASK DEPENDENCIES MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.growth_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.growth_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.growth_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_different_tasks CHECK (task_id <> depends_on_task_id),
  CONSTRAINT unique_user_task_dep UNIQUE(user_id, task_id, depends_on_task_id)
);

-- Enable RLS
ALTER TABLE public.growth_task_dependencies ENABLE ROW LEVEL SECURITY;

-- Ownership & Task Validation RLS Policy (Enforced for SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "own_task_dependencies" ON public.growth_task_dependencies;
CREATE POLICY "own_task_dependencies" ON public.growth_task_dependencies
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = task_id AND user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = depends_on_task_id AND user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = task_id AND user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = depends_on_task_id AND user_id = auth.uid())
  );

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_growth_deps_user_task ON public.growth_task_dependencies(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_growth_deps_user_dep ON public.growth_task_dependencies(user_id, depends_on_task_id);
