import { useState } from 'react'
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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

export default function CoachDashboard() {
  const { profile, setProfile } = useAuthStore()
  const qc = useQueryClient()
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
  const monthEnd   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth(calYear, calMonth)).padStart(2, '0')}`

  const { data: monthSessions = [] } = useQuery({
    queryKey: ['coach-month-sessions', profile?.id, heroes.length, calYear, calMonth],
    queryFn: async () => {
      const heroIds = heroes.map(h => h.id)
      if (!heroIds.length) return []
      const { data } = await supabase
        .from('sessions_v2')
        .select('id, user_id, bundle_name, logged_at')
        .in('user_id', heroIds)
        .gte('logged_at', monthStart)
        .lte('logged_at', monthEnd)
        .order('logged_at', { ascending: false })
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

        <Card className="p-5">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Hero Activity</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1); setSelectedDay(null) }}
                className="w-7 h-7 rounded-[8px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm"
              >←</button>
              <span className="font-[Bebas_Neue] text-lg text-white tracking-wide">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button
                onClick={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1); setSelectedDay(null) }}
                disabled={calYear === today.getFullYear() && calMonth === today.getMonth()}
                className="w-7 h-7 rounded-[8px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm disabled:opacity-30"
              >→</button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[#444] text-[9px] font-[DM_Mono] pb-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfMonth(calYear, calMonth) }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth(calYear, calMonth) }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const daySessions = monthSessions.filter(s => s.logged_at === dateStr)
              // Unique heroes who trained this day
              const heroIds = [...new Set(daySessions.map(s => s.user_id))]
              const isToday = dateStr === today.toISOString().slice(0, 10)
              const isSelected = dateStr === selectedDay

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-[6px] transition-all ${
                    isSelected ? 'bg-[#c8ff00]/10 border border-[#c8ff00]/40' :
                    isToday ? 'border border-[#333]' : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className={`text-[11px] leading-none ${isToday ? 'text-[#c8ff00] font-bold' : 'text-[#666]'}`}>{day}</span>
                  {heroIds.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {heroIds.slice(0, 3).map(hid => {
                        const h = heroes.find(x => x.id === hid)
                        const color = h?.plan_type === 'C' ? '#c8ff00' : h?.plan_type === 'B' ? '#3d9fff' : '#888'
                        return <div key={hid} className="w-1 h-1 rounded-full" style={{ background: color }} />
                      })}
                      {heroIds.length > 3 && <div className="w-1 h-1 rounded-full bg-[#555]" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (() => {
            const daySessions = monthSessions.filter(s => s.logged_at === selectedDay)
            const heroIds = [...new Set(daySessions.map(s => s.user_id))]
            if (!heroIds.length) return (
              <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                <p className="text-[#444] font-[DM_Mono] text-[11px]">// No sessions logged</p>
              </div>
            )
            return (
              <div className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-2">
                <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[2px]">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {heroIds.map(hid => {
                  const hero = heroes.find(h => h.id === hid)
                  const heroSessions = daySessions.filter(s => s.user_id === hid)
                  return (
                    <Link key={hid} to={`/coach/heroes/${hid}`} className="flex items-center justify-between py-2 hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[10px] font-bold text-[#888]">
                          {hero?.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium leading-none">{hero?.full_name ?? 'Unknown'}</p>
                          <p className="text-[#555] text-[10px] font-[DM_Mono] mt-0.5">
                            {heroSessions.map(s => s.bundle_name).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#333] text-[10px] font-[DM_Mono]">→</span>
                    </Link>
                  )
                })}
              </div>
            )
          })()}

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#888]" /><span className="text-[#444] font-[DM_Mono] text-[9px]">Plan A</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3d9fff]" /><span className="text-[#444] font-[DM_Mono] text-[9px]">Plan B</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#c8ff00]" /><span className="text-[#444] font-[DM_Mono] text-[9px]">Plan C</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
