import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import type { Profile } from '../../types'
import { PLAN_PRICES } from '../../types'

function calcMRR(heroes: Profile[]) {
  return heroes.filter(h => h.is_active && h.plan_type).reduce((sum, h) => {
    return sum + (PLAN_PRICES[h.plan_type!]?.monthly ?? 0)
  }, 0)
}

export default function AdminDashboard() {
  const { data: coaches = [], isLoading: loadingCoaches } = useQuery({
    queryKey: ['admin-coaches'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'coach')
      return (data ?? []) as Profile[]
    },
  })

  const { data: heroes = [], isLoading: loadingHeroes } = useQuery({
    queryKey: ['admin-heroes'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'hero')
      return (data ?? []) as Profile[]
    },
  })

  const { data: recentHeroes = [] } = useQuery({
    queryKey: ['admin-recent-heroes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hero')
        .order('created_at', { ascending: false })
        .limit(5)
      return (data ?? []) as Profile[]
    },
  })

  const loading = loadingCoaches || loadingHeroes
  const mrr = calcMRR(heroes)
  const activeHeroes = heroes.filter(h => h.is_active)

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Dashboard</h2>
        <p className="text-[#555] text-sm mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Coaches" value={coaches.length} icon="🏋️" />
        <StatCard label="Total Heroes" value={heroes.length} icon="⚡" />
        <StatCard label="Active Heroes" value={activeHeroes.length} accent />
        <StatCard label="Est. Monthly Revenue" value={`${Math.round(mrr).toLocaleString()} SAR`} icon="💰" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">Coaches Overview</h3>
          <div className="space-y-3">
            {coaches.length === 0 && <p className="text-[#555] text-sm">No coaches yet.</p>}
            {coaches.map(coach => {
              const coachHeroes = heroes.filter(h => h.coach_id === coach.id)
              return (
                <div key={coach.id} className="flex items-center justify-between py-2 border-b border-[#1e1e1e] last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{coach.full_name}</p>
                    <p className="text-[#555] text-xs">{coach.email}</p>
                  </div>
                  <Badge variant="muted">{coachHeroes.length} heroes</Badge>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">Recent Heroes</h3>
          <div className="space-y-3">
            {recentHeroes.length === 0 && <p className="text-[#555] text-sm">No heroes yet.</p>}
            {recentHeroes.map(hero => (
              <div key={hero.id} className="flex items-center justify-between py-2 border-b border-[#1e1e1e] last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{hero.full_name}</p>
                  <p className="text-[#555] text-xs">{new Date(hero.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={hero.plan_type === 'C' ? 'accent' : hero.plan_type === 'B' ? 'blue' : 'muted'}>
                    Plan {hero.plan_type}
                  </Badge>
                  <Badge variant={hero.is_active ? 'green' : 'red'}>
                    {hero.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
