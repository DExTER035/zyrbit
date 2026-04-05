  // ─── RENDER ──────────────────────────────────────────
  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '0 20px 100px', color: '#FFF' }}>
      
      {/* HEADER */}
      <div style={{ padding: '32px 0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Performance data from the last 30 cycles</p>
      </div>

      {/* FILTER PILLS */}
      <div style={{ padding: '0 0 32px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
          return (
            <button key={f.id} onClick={() => f.id === 'all' ? setActiveFilter('all') : scrollTo(f.id)}
              style={{
                flex: '1 1 calc(33% - 8px)', padding: '10px 12px', borderRadius: 100, cursor: 'pointer',
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                background: isActive ? '#FFF' : '#0A0A12',
                color: isActive ? '#000' : '#444',
                fontWeight: 900, fontSize: 12, transition: 'all 0.2s', textAlign: 'center'
              }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* WEEKLY INSIGHT CARD */}
      <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#FFF', letterSpacing: -0.3 }}>Weekly Orbit Report</div>
            <div style={{ fontSize: 10, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>POWERED BY ZYRA AI</div>
          </div>
          <button onClick={refreshReport} style={{ background: '#111', border: '1px solid #222', padding: '8px 16px', borderRadius: 12, color: '#FFF', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
            REFRESH
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <StatBox label="Completion" value={`${completionRate}%`} color="var(--color-cyan)" />
          <StatBox label="Best Streak" value={`${bestStreak}d`} color="var(--color-orange)" />
        </div>

        <div style={{ background: '#000', borderRadius: 16, padding: 16, border: '1px solid #111' }}>
          <div style={{ fontSize: 11, color: '#333', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>INSIGHTS</div>
          <div style={{ fontSize: 13, color: '#FFF', lineHeight: 1.6, fontWeight: 500 }}>
            {generatingReport ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--color-cyan)', animation: 'skeletonPulse 1s infinite' }} />
                <span style={{ color: '#444' }}>Analyzing patterns...</span>
              </div>
            ) : (
              weeklyReport || 'Complete more habits to get automated insights.'
            )}
          </div>
        </div>
      </div>

      {/* SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        
        {/* HABITS */}
        <div id="habits">
          <SectionHeader emoji="🪐" title="Habits" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Active Habits" value={habits.length} color="var(--color-purple)" />
                <StatBox label="Gravity Score" value={gravityScore} color="var(--color-cyan)" />
              </div>
              <Card>
                <CardHeader title="Gravity Score Trend" chartType="LINE" />
                <MiniLine data={gravityData} color="var(--color-cyan)" height={120} />
              </Card>
              <Card>
                <CardHeader title="Daily Completions" chartType="BAR" />
                <MiniBar data={dailyCompletions.slice(habitRange === '7D' ? -7 : -30)} color="var(--color-cyan)" height={100} />
              </Card>
              <Card>
                <CardHeader title="Zone Breakdown" />
                {zoneRows.every(z => z.count === 0) ? <NoData emoji="🧬" label="No zone data" /> : (
                  zoneRows.map(z => (
                    <div key={z.zone} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#333', fontWeight: 800, textTransform: 'uppercase' }}>{z.zone}</span>
                        <span style={{ fontSize: 12, color: z.color, fontWeight: 900 }}>{z.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#111', borderRadius: 100 }}>
                        <div style={{ width: `${z.pct}%`, height: '100%', background: z.color, borderRadius: 100 }} />
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </>
          )}
        </div>

        {/* ZYRONS */}
        <div id="zyrons">
          <SectionHeader emoji="⚡" title="Zyrons" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Balance" value={(wallet?.balance || 0).toLocaleString()} color="var(--color-orange)" />
                <StatBox label="Earned Today" value={(wallet?.daily_earned || 0).toLocaleString()} color="#4CAF50" />
              </div>
              <Card>
                <CardHeader title="Growth Chart" chartType="LINE" />
                <MiniLine data={zyronGrowth} color="var(--color-orange)" height={120} />
              </Card>
            </>
          )}
        </div>

        {/* MONEY */}
        <div id="money">
          <SectionHeader emoji="💰" title="Money" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Total Spent" value={`${sym}${totalSpent.toFixed(0)}`} color="#EF4444" />
                <StatBox label="Remaining" value={`${sym}${remaining.toFixed(0)}`} color={remaining >= 0 ? '#4CAF50' : '#EF4444'} />
              </div>
              <Card>
                <CardHeader title="Spend Trend" chartType="LINE" />
                <MiniLine data={spendByDay} color="#EF4444" height={120} />
              </Card>
              <Card>
                <CardHeader title="Categories" chartType="PIE" />
                <MiniPie data={spendByCategory} height={150} />
              </Card>
            </>
          )}
        </div>

        {/* MOVE */}
        <div id="move">
          <SectionHeader emoji="🏃" title="Move" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Total KM" value={`${totalKm.toFixed(1)}`} color="#4CAF50" />
                <StatBox label="Move Streak" value={`${moveStreak}d`} color="var(--color-orange)" />
              </div>
              <Card>
                <CardHeader title="Distance Trend" chartType="LINE" />
                <MiniLine data={kmByDay} color="#4CAF50" height={120} />
              </Card>
            </>
          )}
        </div>

        {/* STUDY */}
        <div id="study">
          <SectionHeader emoji="📚" title="Study" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Hours" value={`${studyHoursMonth.toFixed(1)}h`} color="var(--color-cyan)" />
                <StatBox label="Streak" value={`${studyStreak}d`} color="var(--color-orange)" />
              </div>
              <Card>
                <CardHeader title="Subject Focus" chartType="PIE" />
                <MiniPie data={subjectPie} height={150} />
              </Card>
            </>
          )}
        </div>

        {/* DIARY */}
        <div id="diary">
          <SectionHeader emoji="📖" title="Diary" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Entries" value={diaryCount} color="var(--color-purple)" />
                <StatBox label="Avg Mood" value={moodEmoji} color="#4CAF50" />
              </div>
              <Card>
                <CardHeader title="Mood Orbit" chartType="LINE" />
                <MiniLine data={moodTrend} color="var(--color-orange)" height={120} />
              </Card>
            </>
          )}
        </div>

      </div>

      <BottomNav activeTab="stats" onTabChange={(t) => window.location.href = `/${t}`} />
    </div>
  )
}
