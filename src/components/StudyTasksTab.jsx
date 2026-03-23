import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

const PRIORITIES = [
  { id: 'high',   label: 'High',   color: '#ef4444', dot: '#ef4444' },
  { id: 'medium', label: 'Medium', color: '#ff9800', dot: '#ff9800' },
  { id: 'low',    label: 'Low',    color: '#4caf50', dot: '#4caf50' },
]

export default function StudyTasksTab({ user }) {
  const [tasks, setTasks] = useState([])
  const [newText, setNewText] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_date', today)
      .order('created_at', { ascending: true })
    setTasks(data || [])
  }

  const addTask = async () => {
    const text = newText.trim()
    if (!text) return
    setLoading(true)
    await supabase.from('daily_tasks').insert({
      user_id: user.id,
      text,
      priority: newPriority,
      task_date: new Date().toISOString().split('T')[0]
    })
    setNewText('')
    await fetchTasks()
    setLoading(false)
    showToast('✅ Task added!', 'success')
  }

  const toggleTask = async (id, done) => {
    await supabase.from('daily_tasks').update({ done: !done }).eq('id', id)
    await fetchTasks()
  }

  const deleteTask = async (id) => {
    await supabase.from('daily_tasks').delete().eq('id', id)
    await fetchTasks()
  }

  const doneCount = tasks.filter(t => t.done).length
  const pendingCount = tasks.length - doneCount
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 80 }}>
      {/* Stats Row */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Done', val: doneCount, color: '#4caf50' },
            { label: 'Pending', val: pendingCount, color: '#ff9800' },
            { label: 'Complete', val: `${pct}%`, color: pct === 100 ? '#4caf50' : '#00bcd4' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#333344', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div style={{ height: 6, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4caf50' : '#ff9800', borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      )}

      {/* Add Task Input */}
      <div style={{ background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 9, color: '#444', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>ADD TASK</div>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="What needs to be done today?"
          style={{ width: '100%', background: '#0d0d18', border: '1px solid #1e1e2a', borderRadius: 10, padding: '10px 12px', color: '#e8e8f0', fontSize: 13, outline: 'none', marginBottom: 10 }}
        />
        {/* Priority Selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {PRIORITIES.map(p => (
            <button key={p.id} onClick={() => setNewPriority(p.id)} style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: newPriority === p.id ? `${p.color}20` : '#0d0d18',
              border: `1px solid ${newPriority === p.id ? p.color : '#1e1e2a'}`,
              color: newPriority === p.id ? p.color : '#444'
            }}>{p.label}</button>
          ))}
        </div>
        <button
          onClick={addTask}
          disabled={loading || !newText.trim()}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: '#4caf50', border: 'none', color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: newText.trim() ? 1 : 0.4, transition: 'opacity 0.2s' }}
        >
          + Add Task
        </button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#333' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 13 }}>No tasks today. Add one above!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...tasks].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 }
            return (order[a.priority] || 1) - (order[b.priority] || 1)
          }).map(task => {
            const p = PRIORITIES.find(x => x.id === task.priority) || PRIORITIES[1]
            return (
              <div key={task.id} style={{
                background: '#0a0a12',
                border: '1px solid #1e1e2a',
                borderLeft: `3px solid ${p.color}`,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: task.done ? 0.5 : 1,
                transition: 'all 0.2s',
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleTask(task.id, task.done)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                    border: task.done ? 'none' : `2px solid ${p.color}40`,
                    background: task.done ? p.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {task.done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e8e8f0', fontWeight: 600, textDecoration: task.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.text}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: p.color, textTransform: 'uppercase', marginTop: 2 }}>{p.label}</div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteTask(task.id)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#1a1a24', border: 'none',
                  color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
