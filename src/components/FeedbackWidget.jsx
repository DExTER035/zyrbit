import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { showToast } from './Toast.jsx'
import { trackFeedbackSubmitted } from '../lib/analytics.js'

const CATEGORIES = [
  { id: 'bug',     label: '🐛 Bug Report',       desc: 'Something is broken or not working.' },
  { id: 'feature', label: '✨ Feature Request',   desc: 'Suggest an improvement or new capability.' },
  { id: 'general', label: '💬 General Feedback',  desc: 'Share a thought, idea, or experience.' },
]

export default function FeedbackWidget({ userId, currentPage }) {
  const [open, setOpen]         = useState(false)
  const [category, setCategory] = useState('bug')
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [submitting, setSub]    = useState(false)
  const [submitted, setSubmit]  = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      showToast('⚠️ Please fill in title and description.', 'warning')
      return
    }
    setSub(true)
    try {
      const { error } = await supabase.from('beta_feedback').insert({
        user_id:     userId,
        category,
        title:       title.trim(),
        description: description.trim(),
        page:        currentPage || 'unknown',
      })
      if (error) throw error
      trackFeedbackSubmitted(userId, category)
      setSubmit(true)
      setTimeout(() => {
        setOpen(false)
        setSubmit(false)
        setTitle('')
        setDesc('')
        setCategory('bug')
      }, 2000)
    } catch (e) {
      showToast('❌ Failed to submit feedback. Try again.', 'error')
      console.error(e)
    } finally {
      setSub(false)
    }
  }

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        id="feedback-btn"
        onClick={() => setOpen(true)}
        aria-label="Send Feedback"
        style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 200,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-muted)',
          fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-cyan)'; e.currentTarget.style.color = 'var(--color-accent-cyan)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        💬
      </button>

      {/* Feedback Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '100%', background: 'var(--bg-card)',
              borderTop: '1px solid var(--border-primary)',
              borderRadius: '20px 20px 0 0',
              padding: '28px 20px 40px',
              maxHeight: '85vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 900, color: 'var(--text-primary)' }}>Feedback Received!</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 8 }}>Thanks for helping us improve Zyrbit.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 'var(--fs-md)', fontWeight: 900, color: 'var(--text-primary)' }}>Beta Feedback</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Help us improve Zyrbit.</div>
                  </div>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>

                {/* Category Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-inner)', textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${category === c.id ? 'var(--color-accent-cyan)' : 'var(--border-primary)'}`,
                        background: category === c.id ? 'var(--color-accent-cyan-dim)' : 'var(--bg-elevated)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>{c.label}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{c.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Title</div>
                  <input
                    id="feedback-title"
                    className="input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Brief summary..."
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Details</div>
                  <textarea
                    id="feedback-description"
                    className="input"
                    value={description}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe the issue or idea in detail..."
                    rows={4}
                    maxLength={1000}
                    style={{ resize: 'vertical', minHeight: 100, fontFamily: 'inherit' }}
                  />
                </div>

                <button
                  id="feedback-submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
