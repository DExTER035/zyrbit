import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2, Timer, Plus } from 'lucide-react';
import {
  C,
  daysUntil,
  fmtHours,
  Pill,
  Card,
  ProgressBar,
  SectionHeader,
  EmptyState,
  TaskRow,
  Modal,
  FInput,
  FLabel,
  BtnPrimary,
  FSelect
} from './shared.jsx';

export default function ProjectDetailView({
  selectedProject,
  setView,
  setTab,
  prevTab,
  tasks,
  goals,
  sessions,
  projectStatsMap,
  completeTask,
  createTask,
  createGoal,
  setFocusProject,
  setFocusMode,
  updateGoalProgress
}) {
  const ptasks  = tasks.filter(t => t.project_id === selectedProject.id);
  const pgoals  = goals.filter(g => g.project_id === selectedProject.id);
  const psess   = sessions.filter(s => s.project_id === selectedProject.id);
  const stats   = projectStatsMap[selectedProject.id] || { total: 0, done: 0, pct: 0 };
  const todoList = ptasks.filter(t => t.status !== 'done');
  const doneList = ptasks.filter(t => t.status === 'done');
  const days     = daysUntil(selectedProject.deadline);
  const totalFocusMin = psess.reduce((s, x) => s + x.duration_minutes, 0);

  // Modals state
  const [modalTask, setModalTask] = useState(false);
  const [modalGoal, setModalGoal] = useState(false);

  // Forms state
  const [formTask, setFormTask] = useState({ name: '', priority: 3, due_date: '' });
  const [formGoal, setFormGoal] = useState({ name: '', target_value: '1', unit: 'done', deadline: '', project_id: selectedProject.id });

  const handleCreateTask = async () => {
    await createTask(selectedProject.id, formTask);
    setFormTask({ name: '', priority: 3, due_date: '' });
    setModalTask(false);
  };

  const handleCreateGoal = async () => {
    await createGoal({ ...formGoal, project_id: selectedProject.id });
    setFormGoal({ name: '', target_value: '1', unit: 'done', deadline: '', project_id: selectedProject.id });
    setModalGoal(false);
  };

  return (
    <div className="page-enter" style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <div style={{ padding: '28px 20px 0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <button onClick={() => { setView('list'); setTab(prevTab); }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', color: C.sub, flexShrink: 0, marginTop: '2px' }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '22px', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProject.icon} {selectedProject.name}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <Pill label={selectedProject.status} color={selectedProject.status === 'active' ? C.goal : C.muted} />
            {days !== null && <Pill label={days <= 0 ? 'OVERDUE' : `${days}d left`} color={days <= 0 ? C.danger : days <= 3 ? C.warn : C.muted} />}
          </div>
        </div>
      </div>

      {/* Progress card */}
      <div style={{ padding: '16px 20px' }}>
        <Card accent={C.project}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '30px', fontWeight: 900 }}>{stats.pct}%</div>
              <div style={{ fontSize: '11px', color: C.muted }}>{stats.done}/{stats.total} tasks done</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.focus }}>{fmtHours(totalFocusMin)}</div>
              <div style={{ fontSize: '11px', color: C.muted }}>focus logged</div>
            </div>
          </div>
          <ProgressBar value={stats.done} max={Math.max(stats.total, 1)} color={C.project} height={6} />
        </Card>
      </div>

      {/* Goals */}
      <div style={{ padding: '0 20px 16px' }}>
        <SectionHeader title="Goals" action={() => setModalGoal(true)} actionLabel="Add" actionIcon={Plus} />
        {pgoals.length === 0 ? (
          <EmptyState icon="🎯" title="No goals" sub="Add a measurable outcome for this project." action={() => setModalGoal(true)} actionLabel="Add Goal" />
        ) : (
          pgoals.map(g => {
            const pct = g.target_value > 0 ? Math.min((Number(g.current_value) / Number(g.target_value)) * 100, 100) : 0;
            return (
              <Card key={g.id} accent={g.is_complete ? C.muted : C.goal} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: g.is_complete ? C.muted : C.text, textDecoration: g.is_complete ? 'line-through' : 'none', flex: 1 }}>{g.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: g.is_complete ? C.muted : C.goal, marginLeft: '8px' }}>{Math.round(pct)}%</span>
                </div>
                <ProgressBar value={Number(g.current_value)} max={Number(g.target_value)} color={g.is_complete ? C.muted : C.goal} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: C.muted, flexShrink: 0 }}>Progress:</span>
                  {!g.is_complete ? (
                    <FInput type="number" value={String(g.current_value)} onChange={e => updateGoalProgress(g, e.target.value)} style={{ width: '80px', padding: '5px 8px', fontSize: '13px' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: C.goal, fontWeight: 700 }}>✔ Complete</span>
                  )}
                  <span style={{ fontSize: '10px', color: C.muted }}>/ {g.target_value} {g.unit}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Tasks */}
      <div style={{ padding: '0 20px 16px' }}>
        <SectionHeader title={`Tasks (${todoList.length} open)`} action={() => setModalTask(true)} actionLabel="Add" actionIcon={Plus} />
        {ptasks.length === 0 ? (
          <EmptyState icon="📋" title="No tasks" sub="Break this project into small, completable steps." action={() => setModalTask(true)} actionLabel="Add Task" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...todoList, ...doneList].map(t => (
              <TaskRow key={t.id} task={t} onComplete={completeTask} />
            ))}
          </div>
        )}
      </div>

      {/* Focus history */}
      <div style={{ padding: '0 20px 120px' }}>
        <SectionHeader title={`Focus History (${psess.length})`} />
        {psess.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: '12px', padding: '12px 0' }}>No sessions yet.</div>
        ) : (
          psess.slice(0, 7).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>{fmtHours(s.duration_minutes)}</div>
                {s.notes && <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{s.notes}</div>}
              </div>
              <div style={{ fontSize: '11px', color: C.muted }}>{s.session_date}</div>
            </div>
          ))
        )}
      </div>

      {/* Focus FAB */}
      <button onClick={() => { setFocusProject(selectedProject); setFocusMode('setup'); }}
        style={{ position: 'fixed', right: '20px', bottom: '84px', background: `linear-gradient(135deg, ${C.focus}, #5048C8)`, border: 'none', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 8px 24px ${C.focus}50`, zIndex: 50 }}>
        <Timer size={22} color="#fff" />
      </button>

      {/* Task modal */}
      {modalTask && (
        <Modal title="New Task" onClose={() => setModalTask(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Task name..." value={formTask.name} onChange={e => setFormTask(p => ({ ...p, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>PRIORITY</FLabel>
                <FSelect value={formTask.priority} onChange={e => setFormTask(p => ({ ...p, priority: Number(e.target.value) }))}>
                  <option value={1}>🔥 Critical</option>
                  <option value={2}>⬆ High</option>
                  <option value={3}>Normal</option>
                </FSelect>
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>DUE DATE</FLabel>
                <FInput type="date" value={formTask.due_date} onChange={e => setFormTask(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <BtnPrimary label="Add Task" onClick={handleCreateTask} disabled={!formTask.name.trim()} />
          </div>
        </Modal>
      )}

      {/* Goal modal */}
      {modalGoal && (
        <Modal title="New Goal" onClose={() => setModalGoal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Goal name..." value={formGoal.name} onChange={e => setFormGoal(p => ({ ...p, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>TARGET</FLabel>
                <FInput type="number" placeholder="10" value={formGoal.target_value} onChange={e => setFormGoal(p => ({ ...p, target_value: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>UNIT</FLabel>
                <FInput placeholder="problems, hours..." value={formGoal.unit} onChange={e => setFormGoal(p => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
            <FInput type="date" value={formGoal.deadline} onChange={e => setFormGoal(p => ({ ...p, deadline: e.target.value }))} />
            <BtnPrimary label="Set Goal" onClick={handleCreateGoal} color={C.goal} disabled={!formGoal.name.trim()} />
          </div>
        </Modal>
      )}
    </div>
  );
}
