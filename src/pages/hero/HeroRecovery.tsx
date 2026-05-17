import type React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog } from '../../types'
import { calcRecoveryScore, recoveryLabel } from '../../utils/recovery'

const MAX_BACK = 30

function getToday() { return new Date().toISOString().slice(0, 10) }
function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() - MAX_BACK)
  return d.toISOString().slice(0, 10)
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div style={{ position: 'relative', width: 144, height: 144, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="144" height="144" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="72" cy="72" r={r} stroke="var(--lift2)" strokeWidth="10" fill="none" />
        <circle cx="72" cy="72" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, color: 'var(--text)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>/100</span>
      </div>
    </div>
  )
}

export default function HeroRecovery() {
  const { profile } = useAuthStore()
  const today = getToday()
  const minDate = getMinDate()
  const [selectedDate, setSelectedDate] = useState(today)

  // Shared 30-day range query (same cache as HeroJournal — no duplicate fetch)
  const { data: rangeLogs = [], isLoading } = useQuery({
    queryKey: ['journal-range', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('journal_logs').select('*')
        .eq('user_id', profile!.id)
        .gte('logged_at', minDate)
        .lte('logged_at', today)
        .order('logged_at')
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })

  const { data: monthSessions = [] } = useQuery({
    queryKey: ['hero-month-sessions', profile?.id],
    queryFn: async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
      const { data } = await supabase.from('sessions_v2').select('logged_at').eq('user_id', profile!.id).gte('logged_at', monthStart)
      return (data ?? [])
    },
    enabled: !!profile?.id,
  })

  const { data: weekSessions = [] } = useQuery({
    queryKey: ['hero-week-sessions', profile?.id],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const { data: sessions } = await supabase
        .from('sessions_v2').select('id')
        .eq('user_id', profile!.id).gte('logged_at', weekAgo)
      if (!sessions?.length) return []
      const ids = sessions.map(s => s.id)
      const { data } = await supabase
        .from('session_sets').select('weight').in('session_id', ids)
      return (data ?? []) as { weight: number | null }[]
    },
    enabled: !!profile?.id,
  })

  function prevDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const next = d.toISOString().slice(0, 10)
    if (next >= minDate) setSelectedDate(next)
  }

  function nextDay() {
    if (selectedDate < today) {
      const d = new Date(selectedDate + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      setSelectedDate(d.toISOString().slice(0, 10))
    }
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 13, letterSpacing: 2 }}>LOADING...</p>
    </div>
  )

  // Selected date's log — and the day before for fallback
  const selectedLog = rangeLogs.find(l => l.logged_at === selectedDate) ?? null
  const prevDate = (() => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const prevLog = rangeLogs.find(l => l.logged_at === prevDate) ?? null
  // Use selected date if it has sleep data; otherwise fall back to previous day
  const recoveryLog = (selectedLog?.sleep_hours != null) ? selectedLog : (prevLog ?? selectedLog)

  // 7-day window ending at selectedDate for weekly stats
  const weekStart = (() => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })()
  const weekLogs = rangeLogs.filter(l => l.logged_at >= weekStart && l.logged_at <= selectedDate)

  const score = recoveryLog ? calcRecoveryScore(recoveryLog) : 0
  const { label, color, dot } = recoveryLabel(score)

  const isToday = selectedDate === today
  const atMinDate = selectedDate <= minDate
  const selectedDObj = new Date(selectedDate + 'T12:00:00')

  const avgSleep = weekLogs.length
    ? weekLogs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / weekLogs.length
    : 0

  const bodyWeights = weekLogs.filter(l => l.body_weight).map(l => l.body_weight!)
  const avgWeight = bodyWeights.length ? bodyWeights.reduce((a, b) => a + b, 0) / bodyWeights.length : 0
  const weightTrend = bodyWeights.length >= 2
    ? bodyWeights[bodyWeights.length - 1] > bodyWeights[0] ? '↑'
    : bodyWeights[bodyWeights.length - 1] < bodyWeights[0] ? '↓' : '→'
    : '→'

  // Streak: consecutive days with journal logged, counting back from selectedDate
  const logDates = new Set(rangeLogs.map(l => l.logged_at))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (logDates.has(ds)) streak++
    else break
  }

  const daysInMonth = new Date().getDate()
  const consistency = daysInMonth > 0 ? Math.round((monthSessions.length / daysInMonth) * 100) : 0

  const totalSets = weekSessions.length
  const avgWeightWeek = weekSessions.length
    ? weekSessions.reduce((s, ws: { weight: number | null }) => s + (ws.weight ?? 0), 0) / weekSessions.length
    : 0
  const trainingLoad = Math.round(totalSets * avgWeightWeek)

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 9, border: '1px solid var(--border2)',
    background: 'none', color: disabled ? 'var(--text3)' : 'var(--text2)',
    cursor: disabled ? 'default' : 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.3 : 1, flexShrink: 0,
  })

  const statCard = (lbl: string, value: React.ReactNode) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{lbl}</p>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28 }}>{value}</div>
    </div>
  )

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, letterSpacing: 4, lineHeight: 1, color: 'var(--text)', margin: 0 }}>
          RECOVERY
        </h1>
      </div>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', marginBottom: 16 }}>
        <button onClick={prevDay} disabled={atMinDate} style={navBtnStyle(atMinDate)}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: isToday ? 'var(--accent)' : 'var(--text2)', letterSpacing: 1, margin: 0 }}>
            {isToday ? 'Today' : selectedDObj.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2, letterSpacing: 0.5 }}>
            {selectedDObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={nextDay} disabled={selectedDate >= today} style={navBtnStyle(selectedDate >= today)}>→</button>
      </div>

      {/* Recovery score card */}
      {!recoveryLog ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 11 }}>
            {isToday
              ? 'Log your morning check-in to see your recovery score.'
              : 'No journal entry found for this date.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: `1px solid ${color}30`, borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <ScoreRing score={score} color={color} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 24, marginBottom: 4 }}>{dot}</p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color }}>{label}</p>
          </div>
          {recoveryLog.logged_at !== selectedDate && (
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>
              Based on previous day's log
            </p>
          )}
        </div>
      )}

      {/* Stats — 7d window ending at selected date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {statCard('Avg Sleep (7d)', <><span style={{ color: 'var(--text)' }}>{avgSleep.toFixed(1)}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>h</span></>)}
        {statCard('Avg Weight (7d)', <><span style={{ color: 'var(--text)' }}>{avgWeight ? avgWeight.toFixed(1) : '—'}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>{avgWeight ? ` kg ${weightTrend}` : ''}</span></>)}
        {statCard('Hydration', <><span style={{ color: 'var(--blue)' }}>{recoveryLog?.water_glasses ?? 0}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>/8</span></>)}
        {statCard('Journal Streak', <><span style={{ color: 'var(--accent)' }}>{streak}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}> days</span></>)}
        {statCard('Consistency (month)', <><span style={{ color: 'var(--text)' }}>{consistency}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>%</span></>)}
        {statCard('Training Load (7d)', <span style={{ color: 'var(--purple)' }}>{trainingLoad > 0 ? trainingLoad.toLocaleString() : '—'}</span>)}
      </div>
    </div>
  )
}
