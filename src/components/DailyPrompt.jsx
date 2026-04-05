import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

const PROMPTS = [
  "What's one thing you avoided today — and why?",
  "Where did your energy actually go today?",
  "What would your future self say about today?",
  "What are you pretending not to know right now?",
  "What habit is secretly holding you back?",
  "If today was a percentage, what would it be — and why?",
  "What did you start but not finish — and does it matter?",
  "Who did you compare yourself to today? Was it fair?",
  "What would you do differently if no one was watching?",
  "Write the honest version of how today actually went.",
]

const getTodayPrompt = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return PROMPTS[dayOfYear % PROMPTS.length]
}

export default function DailyPrompt({ user, onEntrySaved }) {
  const todayStr = new Date().toLocaleDateString('en-CA')
  const todayPrompt = getTodayPrompt()

  const [response, setResponse] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved
  const [pastEntries, setPastEntries] = useState([])
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('diary_entries')
      .select('entry_date, content, title, mood, prompt')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(30)

    if (data) {
      // Today's entry
      const todayEntry = data.find(e => e.entry_date === todayStr)
      if (todayEntry?.content) setResponse(todayEntry.content)

      // Past entries (excluding today)
      setPastEntries(data.filter(e => e.entry_date !== todayStr))
    }
    setLoading(false)
  }

  const handleChange = (val) => {
    setResponse(val)
    setSaveStatus('saving')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => autoSave(val), 1000)
  }

  const autoSave = async (text) => {
    if (!text.trim()) { setSaveStatus('idle'); return }
    const { error } = await supabase.from('diary_entries').upsert({
      user_id: user.id,
      entry_date: todayStr,
      content: text,
      prompt: todayPrompt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,entry_date' })

    if (!error) {
      setSaveStatus('saved')
      onEntrySaved?.()
    } else {
      setSaveStatus('idle')
      showToast('Save failed — check connection', 'error')
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 260, borderRadius: 20, marginBottom: 24 }} />

  return (
    <div className="animate-fadeSlideUp" style={{ paddingBottom: 24 }}>

      {/* Prompt Card */}
      <div style={{
        background: '#111', borderLeft: '4px solid #1D9E75',
        border: '1px solid #1e1e2e', borderLeftWidth: 4, borderLeftColor: '#1D9E75',
        borderRadius: 20, padding: 20, marginBottom: 24
      }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: '#1D9E75', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          TODAY'S PROMPT
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#FFF', lineHeight: 1.5, marginBottom: 20 }}>
          "{todayPrompt}"
        </div>

        <textarea
          value={response}
          onChange={e => handleChange(e.target.value)}
          placeholder="Write honestly..."
          style={{
            width: '100%', minHeight: 140,
            background: '#0a0a0a', border: 'none',
            borderRadius: 12, color: '#CCCCDD',
            padding: 16, fontSize: 15, lineHeight: 1.8,
            resize: 'none', outline: 'none',
            fontFamily: '"Crimson Pro", Georgia, serif',
            transition: 'box-shadow 0.2s'
          }}
          onFocus={e => e.target.style.boxShadow = '0 0 0 2px #1D9E7540'}
          onBlur={e => e.target.style.boxShadow = 'none'}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: saveStatus === 'saved' ? '#1D9E75' : saveStatus === 'saving' ? '#FF9800' : '#333344',
            transition: 'background 0.3s'
          }} />
          <div style={{ fontSize: 10, color: '#444', fontWeight: 700 }}>
            {saveStatus === 'saved' ? 'Auto-saved' : saveStatus === 'saving' ? 'Saving...' : 'Not saved yet'}
          </div>
        </div>
      </div>

      {/* Past Entries */}
      {pastEntries.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#333344', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            PAST ENTRIES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastEntries.map(e => {
              const isExpanded = expandedEntry === e.entry_date
              const preview = e.content?.slice(0, 60) + (e.content?.length > 60 ? '…' : '')
              const dateLabel = new Date(e.entry_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
              return (
                <div
                  key={e.entry_date}
                  onClick={() => setExpandedEntry(isExpanded ? null : e.entry_date)}
                  style={{
                    background: '#111', border: '1px solid #1e1e2e',
                    borderRadius: 14, padding: '12px 16px',
                    cursor: 'pointer', transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={el => el.currentTarget.style.borderColor = '#2a2a3a'}
                  onMouseLeave={el => el.currentTarget.style.borderColor = '#1e1e2e'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 10 : 0 }}>
                    <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 800 }}>{dateLabel}</div>
                    <div style={{ fontSize: 10, color: '#444', fontWeight: 700 }}>{isExpanded ? '▲' : '▼'}</div>
                  </div>
                  {!isExpanded && (
                    <div style={{ fontSize: 12, color: '#555566', marginTop: 4, fontStyle: 'italic' }}>{preview || 'No content'}</div>
                  )}
                  {isExpanded && (
                    <div className="animate-fadeSlideUp">
                      {e.prompt && <div style={{ fontSize: 11, color: '#1D9E7580', fontStyle: 'italic', marginBottom: 8 }}>"{e.prompt}"</div>}
                      <div style={{ fontSize: 14, color: '#AAAABC', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: '"Crimson Pro", Georgia, serif' }}>
                        {e.content || 'Nothing written.'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
