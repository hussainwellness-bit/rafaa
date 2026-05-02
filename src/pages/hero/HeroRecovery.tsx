import type React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog } from '../../types'
import { calcRecoveryScore, recoveryLabel } from '../../utils/recovery'

const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

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

  // Fetch today AND yesterday in one query
  const { data: recentLogs = [], isLoading: loadingToday } = useQuery({
    queryKey: ['journal-today', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('journal_logs').select('*')
        .eq('user_id', profile!.id).gte('logged_at', YESTERDAY).lte('logged_at', TODAY)
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
  })
  const todayLog  = recentLogs.find(l => l.logged_at === TODAY) ?? null
  const yesterLog = recentLogs.find(l => l.logged_at === YESTERDAY) ?? null
  // Use today's log if it has sleep data (morning check-in done), otherwise yesterday's
  const recoveryLog = (todayLog?.sleep_hours != null) ? todayLog : (yesterLog ?? todayLog)

  const { data: weekLogs = [] } = useQuery({
    queryKey: ['journal-week', profile?.id],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const { data } = await supabase.from('journal_logs').select('*')
        .eq('user_id', profile!.id).gte('logged_at', weekAgo).order('logged_at')
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
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
      // Get session IDs for this week first, then get their sets
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

  if (loadingToday) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 13, letterSpacing: 2 }}>LOADING...</p>
    </div>
  )

  const score = recoveryLog ? calcRecoveryScore(recoveryLog) : 0
  const { label, color, dot } = recoveryLabel(score)
  const recoveryDateLabel = recoveryLog?.logged_at === TODAY ? 'Today' : recoveryLog?.logged_at === YESTERDAY ? 'Yesterday' : null

  const avgSleep = weekLogs.length
    ? weekLogs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / weekLogs.length
    : 0

  const bodyWeights = weekLogs.filter(l => l.body_weight).map(l => l.body_weight!)
  const avgWeight = bodyWeights.length ? bodyWeights.reduce((a, b) => a + b, 0) / bodyWeights.length : 0
  const weightTrend = bodyWeights.length >= 2
    ? bodyWeights[bodyWeights.length - 1] > bodyWeights[0] ? '↑' : bodyWeights[bodyWeights.length - 1] < bodyWeights[0] ? '↓' : '→'
    : '→'

  const logDates = new Set(weekLogs.map(l => l.logged_at))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    if (logDates.has(d)) streak++
    else break
  }

  const daysInMonth = new Date().getDate()
  const consistency = daysInMonth > 0 ? Math.round((monthSessions.length / daysInMonth) * 100) : 0

  const totalSets = weekSessions.length
  const avgWeightWeek = weekSessions.length
    ? weekSessions.reduce((s, ws: { weight: number | null }) => s + (ws.weight ?? 0), 0) / weekSessions.length
    : 0
  const trainingLoad = Math.round(totalSets * avgWeightWeek)

  const statCard = (label: string, value: React.ReactNode) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{label}</p>
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
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
          {recoveryDateLabel ? `${recoveryDateLabel}'s readiness` : 'Your readiness'}
          {recoveryLog?.logged_at === YESTERDAY && !todayLog?.sleep_hours && ' — log this morning to update'}
        </p>
      </div>

      {!recoveryLog ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 11 }}>Log your morning check-in to see your recovery score.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: `1px solid ${color}30`, borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={score} color={color} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 24, marginBottom: 4 }}>{dot}</p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color }}>{label}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {statCard('Avg Sleep (7d)', <><span style={{ color: 'var(--text)' }}>{avgSleep.toFixed(1)}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>h</span></>)}
        {statCard('Avg Weight (7d)', <><span style={{ color: 'var(--text)' }}>{avgWeight ? avgWeight.toFixed(1) : '—'}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>{avgWeight ? ` kg ${weightTrend}` : ''}</span></>)}
        {statCard('Hydration Today', <><span style={{ color: 'var(--blue)' }}>{recoveryLog?.water_glasses ?? 0}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>/8</span></>)}
        {statCard('Current Streak', <><span style={{ color: 'var(--accent)' }}>{streak}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}> days</span></>)}
        {statCard('Consistency (month)', <><span style={{ color: 'var(--text)' }}>{consistency}</span><span style={{ fontSize: 16, color: 'var(--text3)' }}>%</span></>)}
        {statCard('Training Load (7d)', <span style={{ color: '#a855f7' }}>{trainingLoad > 0 ? trainingLoad.toLocaleString() : '—'}</span>)}
      </div>
    </div>
  )
}
