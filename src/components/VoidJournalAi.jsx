import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function VoidJournalAi({ user }) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [daysLogged, setDaysLogged] = useState(0)

  useEffect(() => {
    if (!user) return
    checkEligibility()
  }, [user])

  const checkEligibility = async () => {
    // Check if we already generated one recently
    const lastGen = localStorage.getItem('zyrbit_void_analysis_date_' + user.id)
    const today = new Date().toLocaleDateString('en-CA')
    const savedAnalysis = localStorage.getItem('zyrbit_void_analysis_' + user.id)
    if (savedAnalysis && lastGen === today) {
      setAnalysis(savedAnalysis)
      return
    }

    // Otherwise, check how many entries they have
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA')
    const { data } = await supabase.from('diary_entries').select('id').eq('user_id', user.id).gte('entry_date', thirtyDaysAgo)
    setDaysLogged(data?.length || 0)
  }

  const generateAnalysis = async () => {
    if (loading) return
    setLoading(true)

    const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!API_KEY) {
      setAnalysis("Cannot analyze: Anthropic API Key missing. Please set VITE_ANTHROPIC_API_KEY.")
      setLoading(false)
      return
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA')
    
    // Fetch last 30 days of text entries
    const { data: entries } = await supabase.from('diary_entries')
      .select('entry_date, prompt, content')
      .eq('user_id', user.id)
      .gte('entry_date', thirtyDaysAgo)
      .order('entry_date', { ascending: false })

    const entriesStr = entries?.filter(e => e.content).map(e => `[${e.entry_date}] - Prompt: ${e.prompt || 'None'}\nAnswer: ${e.content}`).join('\n\n') || 'No entries found.'

    const sysPrompt = `You are the Void Journal — a dark, highly intelligent psychological AI built for Indian college students. 
You are analyzing their private diary entries from the last 30 days.

Read their text. Find their contradictions, their hidden fears, their repeated excuses, and their underlying energy.
Write a brutal, piercing, and highly specific 3-paragraph analysis. 
- Paragraph 1: What they are lying to themselves about.
- Paragraph 2: Their recurring behavioral pattern.
- Paragraph 3: The exact pivot they need to make immediately.

Keep the tone sharp, dark, observant, and devoid of toxic positivity. Do not use generic AI buzzwords. Speak directly to them.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 400,
          system: sysPrompt,
          messages: [{ role: 'user', content: `Here is my data for the last 30 days:\n\n${entriesStr}` }],
          stream: false
        })
      })

      if (!response.ok) {
        setAnalysis("[Error communicating with the Void. Connection severed.]")
      } else {
        const d = await response.json()
        const textOutput = d.content.find(c => c.type === 'text')?.text
        setAnalysis(textOutput)
        
        // Cache for today
        const today = new Date().toLocaleDateString('en-CA')
        localStorage.setItem('zyrbit_void_analysis_' + user.id, textOutput)
        localStorage.setItem('zyrbit_void_analysis_date_' + user.id, today)
      }
    } catch (e) {
       console.error(e)
       setAnalysis("[The Void is silent right now. Network error.]")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-elite animate-eliteGlow" style={{ padding: 24, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Dark background particles effect placeholder */}
      <div style={{ position: 'absolute', top: -30, right: -50, width: 100, height: 100, background: 'radial-gradient(circle, rgba(127,119,221,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase' }}>
          VOID JOURNAL <span style={{ background: '#7F77DD20', border: '1px solid #7F77DD40', color: '#7F77DD', fontSize: 8, padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>ELITE</span>
        </div>
      </div>

      {!analysis ? (
        <>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
            A brutal, AI-driven psychological analysis of your last 30 days of entries. No generic advice. Just the hard truth.
          </div>
          
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a24', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👁️</div>
            {daysLogged < 3 ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#EF4444', marginBottom: 6 }}>Not enough data for the Void.</div>
                <div style={{ fontSize: 12, color: '#666' }}>You need at least 3 entries in the last 30 days. You have {daysLogged}.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0', marginBottom: 16 }}>Ready to stare into the Void?</div>
                <button
                  onClick={generateAnalysis}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    color: '#7F77DD', border: '1px solid #7F77DD50',
                    borderRadius: 100, padding: '12px 24px', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#7F77DD15'; e.currentTarget.style.borderColor = '#7F77DD' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#7F77DD50' }}
                >
                  {loading ? 'Analyzing your mind...' : 'Generate 30-Day Analysis'}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="animate-fadeSlideUp">
          <div style={{ padding: '0 4px' }}>
            {analysis.split('\n').map((para, i) => (
              <p key={i} style={{ fontSize: 14, color: '#DDDDEE', lineHeight: 1.7, marginBottom: 16, fontFamily: '"Crimson Pro", Georgia, serif' }}>
                {para}
              </p>
            ))}
          </div>
          <button
             onClick={() => setAnalysis(null)}
             style={{ background: 'transparent', color: '#666', border: 'none', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, cursor: 'pointer' }}
          >
             Hide Analysis
          </button>
        </div>
      )}
    </div>
  )
}
