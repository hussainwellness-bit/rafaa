import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog } from '../../types'
import { calcRecoveryScore, recoveryLabel } from '../../utils/recovery'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} stroke="#1a1a1a" strokeWidth="10" fill="none" />
        <circle cx="72" cy="72" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[Bebas_Neue] text-5xl text-white leading-none">{score}</span>
        <span className="text-[#555] text-xs">/100</span>
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

  if (loadingToday) return <div className="flex items-center justify-center h-screen"><Spinner size={32} className="text-[#c8ff00]" /></div>

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

  // Streak: consecutive days with any log
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

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div className="pt-4">
        <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">RECOVERY</h1>
        <p className="text-[#555] text-sm">
          {recoveryDateLabel ? `${recoveryDateLabel}'s readiness` : 'Your readiness'}
          {recoveryLog?.logged_at === YESTERDAY && !todayLog?.sleep_hours && (
            <span className="text-[#444]"> — log this morning to update</span>
          )}
        </p>
      </div>

      {!recoveryLog ? (
        <Card className="p-8 text-center space-y-2">
          <p className="text-[#555]">Log your morning check-in to see your recovery score.</p>
        </Card>
      ) : (
        <Card className="p-6 flex flex-col items-center gap-4" style={{ borderColor: color + '30' }}>
          <ScoreRing score={score} color={color} />
          <div className="text-center">
            <p className="text-2xl mb-1">{dot}</p>
            <p className="text-white font-semibold" style={{ color }}>{label}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Avg Sleep (7d)</p>
          <p className="font-[Bebas_Neue] text-3xl text-white">{avgSleep.toFixed(1)}<span className="text-lg text-[#555]">h</span></p>
        </Card>

        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Avg Weight (7d)</p>
          <p className="font-[Bebas_Neue] text-3xl text-white">
            {avgWeight ? `${avgWeight.toFixed(1)}` : '—'}
            <span className="text-lg text-[#555]"> {avgWeight ? 'kg' : ''} {weightTrend}</span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Hydration Today</p>
          <p className="font-[Bebas_Neue] text-3xl text-[#3d9fff]">{recoveryLog?.water_glasses ?? 0}<span className="text-lg text-[#555]">/8</span></p>
        </Card>

        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Current Streak</p>
          <p className="font-[Bebas_Neue] text-3xl text-[#c8ff00]">{streak}<span className="text-lg text-[#555]"> days</span></p>
        </Card>

        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Consistency (month)</p>
          <p className="font-[Bebas_Neue] text-3xl text-white">{consistency}<span className="text-lg text-[#555]">%</span></p>
        </Card>

        <Card className="p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Training Load (7d)</p>
          <p className="font-[Bebas_Neue] text-3xl text-[#a855f7]">{trainingLoad > 0 ? trainingLoad.toLocaleString() : '—'}</p>
        </Card>
      </div>
    </div>
  )
}
