import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Profile } from '../../types'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

const MONTHLY_RATES: Record<string, number> = { A: 99, B: 149, C: 279 }

function planMRR(hero: Profile) {
  return MONTHLY_RATES[hero.plan_type ?? ''] ?? 0
}

export default function CoachDashboard() {
  const { profile, setProfile } = useAuthStore()
  const qc = useQueryClient()

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['coach-requests-count', profile?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const authId = user?.id ?? profile!.id
      const { count } = await supabase
        .from('hero_requests')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', authId)
        .eq('status', 'pending')
      return count ?? 0
    },
    enabled: !!profile?.id,
    refetchInterval: 60_000,
  })

  const toggleAvailability = useMutation({
    mutationFn: async () => {
      const next = !profile?.accepting_heroes
      await supabase.from('profiles').update({ accepting_heroes: next }).eq('id', profile!.id)
      return next
    },
    onSuccess: (next) => {
      if (profile) setProfile({ ...profile, accepting_heroes: next })
      qc.invalidateQueries({ queryKey: ['admin-coaches'] })
    },
  })

  const { data: heroes = [], isLoading } = useQuery({
    queryKey: ['coach-heroes', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hero')
        .eq('coach_id', profile!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as Profile[]
    },
    enabled: !!profile?.id,
  })

  const { data: recentSessions = [] } = useQuery({
    queryKey: ['coach-recent-sessions', profile?.id, heroes.length],
    queryFn: async () => {
      const heroIds = heroes.map(h => h.id)
      if (!heroIds.length) return []
      const { data } = await supabase
        .from('sessions_v2')
        .select('id, user_id, bundle_name, logged_at')
        .in('user_id', heroIds)
        .order('logged_at', { ascending: false })
        .limit(10)
      return (data ?? []) as { id: string; user_id: string; bundle_name: string; logged_at: string }[]
    },
    enabled: heroes.length > 0,
  })

  const activeHeroes = heroes.filter(h => h.is_active)
  const physicalHeroes = heroes.filter(h => h.is_physical)
  const mrr = activeHeroes.reduce((sum, h) => sum + planMRR(h), 0)
  console.log('[MRR] heroes:', heroes.length, 'active:', activeHeroes.length, 'mrr:', mrr)

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  const accepting = profile?.accepting_heroes !== false

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Dashboard</h2>
          <p className="text-[#555] text-sm mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}</p>
        </div>
        {/* Availability toggle */}
        <button
          onClick={() => toggleAvailability.mutate()}
          disabled={toggleAvailability.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-[100px] border text-sm font-medium transition-all shrink-0 ${
            accepting
              ? 'border-green-500/30 bg-green-500/5 text-green-400 hover:border-green-500/50'
              : 'border-[#333] bg-[#111] text-[#555] hover:border-[#555]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${accepting ? 'bg-green-400' : 'bg-[#555]'}`} />
          {accepting ? 'Accepting Heroes' : 'Not Accepting'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Heroes" value={heroes.length} icon="🏆" />
        <StatCard label="Active Heroes" value={activeHeroes.length} accent />
        <StatCard label="Physical Heroes" value={physicalHeroes.length} icon="🏋️" />
        <StatCard label="Est. Monthly Rev." value={`${Math.round(mrr).toLocaleString()} SAR`} icon="💰" />
      </div>

      {/* Profile completion warning — computed from actual fields in real time */}
      {!(
        (profile?.coach_bio ?? '').trim().length > 0 &&
        (profile?.coach_specialty ?? '').trim().length > 0
      ) && (
        <Link
          to="/coach/plans"
          className="flex items-center justify-between p-4 bg-[#ff3d3d]/5 border border-[#ff3d3d]/20 rounded-[14px] hover:bg-[#ff3d3d]/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-white font-semibold text-sm">Complete your profile to appear on hero discovery</p>
              <p className="text-[#555] text-xs">Add your bio and specialty to appear on hero discovery</p>
            </div>
          </div>
          <span className="text-[#ff3d3d] text-sm shrink-0">Complete →</span>
        </Link>
      )}

      {/* Pending requests banner */}
      {pendingCount > 0 && (
        <Link
          to="/coach/requests"
          className="flex items-center justify-between p-4 bg-[#c8ff00]/5 border border-[#c8ff00]/20 rounded-[14px] hover:bg-[#c8ff00]/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <div>
              <p className="text-white font-semibold text-sm">{pendingCount} pending hero request{pendingCount > 1 ? 's' : ''}</p>
              <p className="text-[#555] text-xs">Review and approve new applications</p>
            </div>
          </div>
          <span className="text-[#c8ff00] text-sm">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">My Heroes</h3>
            <Link to="/coach/heroes" className="text-xs text-[#c8ff00] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {heroes.slice(0, 6).map(hero => (
              <Link key={hero.id} to={`/coach/heroes/${hero.id}`} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-sm font-bold text-[#888]">
                    {hero.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{hero.full_name}</p>
                    <p className="text-[#555] text-xs capitalize">{hero.goal ?? '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hero.is_physical && <Badge variant="muted">Physical</Badge>}
                  <Badge variant={hero.plan_type === 'C' ? 'accent' : hero.plan_type === 'B' ? 'blue' : 'muted'}>
                    Plan {hero.plan_type}
                  </Badge>
                </div>
              </Link>
            ))}
            {heroes.length === 0 && <p className="text-[#555] text-sm">No heroes yet. <Link to="/coach/heroes" className="text-[#c8ff00] hover:underline">Add one →</Link></p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(() => {
              // Deduplicate: one entry per hero+bundle+day
              const seen = new Set<string>()
              const deduped = recentSessions.filter(s => {
                const key = `${s.user_id}:${s.bundle_name}:${s.logged_at}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
              }).slice(0, 10)

              if (!deduped.length) return (
                <p className="text-[#444] font-[DM_Mono] text-[12px]">// No activity yet</p>
              )

              return deduped.map(s => {
                const hero = heroes.find(h => h.id === s.user_id)
                const dateLabel = new Date(s.logged_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="text-white text-sm">{hero?.full_name ?? '—'}</p>
                      <p className="text-[#555] text-xs font-[DM_Mono]">{s.bundle_name}</p>
                    </div>
                    <span className="text-[#444] text-xs font-[DM_Mono]">{dateLabel}</span>
                  </div>
                )
              })
            })()}
          </div>
        </Card>
      </div>
    </div>
  )
}
