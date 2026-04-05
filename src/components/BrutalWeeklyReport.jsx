import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BrutalWeeklyReport({ user }) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [isSunday] = useState(new Date().getDay() === 0)

  useEffect(() => {
    if (!user) return
    const cached = localStorage.getItem('zyrbit_weekly_report_' + user.id)
    const cachedDate = localStorage.getItem('zyrbit_weekly_report_date_' + user.id)

    // Reset if it's a new week (crude check: if cached was more than 6 days ago)
    if (cached && cachedDate) {
      const diff = (Date.now() - new Date(cachedDate).getTime()) / 86400000
      if (diff < 6) {
        setReport(cached)
      }
    }
  }, [user])

  const generateReport = async () => {
    if (loading) return
    setLoading(true)

    const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!API_KEY) {
      setReport("API Key missing.")
      setLoading(false)
      return
    }

    // 1. Fetch last 7 days of data
    const weekAgoStr = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-CA')
    
    // Habits
    const { data: habits } = await supabase.from('habits').select('id, name')
    const { data: logs } = await supabase.from('activity_log')
       .select('*').eq('user_id', user.id).gte('completed_date', weekAgoStr)

    // Study
    const { data: study } = await supabase.from('study_sessions')
       .select('duration_minutes, session_date').eq('user_id', user.id).gte('session_date', weekAgoStr)

    // Money
    const { data: expenses } = await supabase.from('expense_logs')
       .select('amount, date').eq('user_id', user.id).gte('date', weekAgoStr)

    let totalStudyMins = 0
    study?.forEach(s => totalStudyMins += (s.duration_minutes || 0))
    let totalSpent = 0
    expenses?.forEach(e => totalSpent += Number(e.amount || 0))

    const habitPerformance = habits?.map(h => {
       const done = logs?.filter(l => l.habit_id === h.id && l.status === 'completed').length || 0
       return `${h.name}: ${done}/7 days`
    }).join('\n') || 'No habits tracked.'

    const contextData = `
Study Time: ${(totalStudyMins / 60).toFixed(1)} hours
Money Spent: ₹${totalSpent}
Habits Completed:
${habitPerformance}
`

    const sysPrompt = `You are a brutal, highly observant AI performance coach for Indian college students.
It is Sunday. You are looking at their raw data from the past 7 days.
You despise excuses and motivational fluff.

Context Data for the past 7 days:
${contextData}

Task: Write a short, piercing 3-paragraph "Truth Serum" report.
1. The brutal reality of their week (did they actually work, or did they pretend?).
2. Address their biggest failure point shown in the data.
3. One non-negotiable instruction for Monday.

Use simple, sharp language. Be ruthless if the data is weak.`

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
          max_tokens: 300,
          system: sysPrompt,
          messages: [{ role: 'user', content: "Generate my weekly truth serum." }],
        })
      })

      if (response.ok) {
        const d = await response.json()
        const txt = d.content?.find(c => c.type === 'text')?.text || "No response."
        setReport(txt)
        localStorage.setItem('zyrbit_weekly_report_' + user.id, txt)
        localStorage.setItem('zyrbit_weekly_report_date_' + user.id, new Date().toISOString())
      } else {
        setReport("Connection failed.")
      }
    } catch (e) {
      setReport("Network error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-elite animate-eliteGlow" style={{ padding: 24, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -50, width: 100, height: 100, background: 'radial-gradient(circle, rgba(127,119,221,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase' }}>
          WEEKLY TRUTH SERUM <span style={{ background: '#7F77DD20', border: '1px solid #7F77DD40', color: '#7F77DD', fontSize: 8, padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>ELITE</span>
        </div>
      </div>

      {!report ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
           <div style={{ fontSize: 24, marginBottom: 12 }}>🩸</div>
           <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
             A brutal, AI-generated reality check on your data from the last 7 days.
           </div>
           
           {!isSunday ? (
              <div style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #1a1a24', borderRadius: 12, fontSize: 12, color: '#555566', fontWeight: 800 }}>
                This serum only unlocks on Sundays. Check back at the end of the week.
              </div>
           ) : (
              <button
                onClick={generateReport}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #7F77DD, #9FA0FF)',
                  color: '#000', border: 'none', borderRadius: 100,
                  padding: '12px 24px', fontSize: 14, fontWeight: 900,
                  cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 4px 14px #7F77DD40',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Analyzing your week...' : 'Take the Truth Serum'}
              </button>
           )}
        </div>
      ) : (
        <div className="animate-fadeSlideUp">
          <div style={{ padding: '0 4px' }}>
            {report.split('\n').map((para, i) => para.trim() && (
              <p key={i} style={{ fontSize: 14, color: '#DDDDEE', lineHeight: 1.7, marginBottom: 16, fontFamily: '"Inter", sans-serif' }}>
                {para}
              </p>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1a1a24', paddingTop: 12, marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
             <span style={{ fontSize: 10, color: '#444', fontWeight: 800, textTransform: 'uppercase' }}>Generated on {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
