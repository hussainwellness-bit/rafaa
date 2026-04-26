import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Bundle, PlanSchedule } from '../../types'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const TODAY = new Date().toISOString().slice(0, 10)

function BundleCard({ bundle, recommended, lastDone }: { bundle: Bundle; recommended: boolean; lastDone?: string }) {
  return (
    <Link to={`/hero/workout/${bundle.id}`}>
      <div
        className="rounded-[16px] border p-6 space-y-4 cursor-pointer active:scale-[0.98] transition-all"
        style={
          recommended
            ? { borderColor: bundle.color + '80', background: bundle.color + '0d' }
            : { borderColor: '#222' }
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: bundle.color }} />
            <span className="text-white font-bold text-lg leading-tight">{bundle.name}</span>
          </div>
          {recommended && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-[100px] uppercase tracking-wide"
              style={{ background: bundle.color + '25', color: bundle.color }}
            >
              Today
            </span>
          )}
        </div>
        {bundle.description && (
          <p className="text-[#666] text-[15px] leading-snug">{bundle.description}</p>
        )}
        <div className="flex items-center justify-between">
          {lastDone
            ? <p className="text-[#444] text-sm font-[DM_Mono]">Last: {new Date(lastDone).toLocaleDateString()}</p>
            : <p className="text-[#333] text-sm">Not done yet</p>
          }
          <span className="text-[15px] font-semibold" style={{ color: bundle.color }}>Start →</span>
        </div>
      </div>
    </Link>
  )
}

export default function HeroHome() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const todayIndex = new Date().getDay()
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [conflictId, setConflictId] = useState<string | null>(null)
  const [savingRest, setSavingRest] = useState(false)

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['hero-bundles', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('bundles').select('*').eq('client_id', profile!.id).order('sort_order')
      return (data ?? []) as Bundle[]
    },
    enabled: !!profile?.id,
  })

  const { data: schedule = [] } = useQuery({
    queryKey: ['hero-schedule', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('plan_schedule').select('*').eq('client_id', profile!.id)
      return (data ?? []) as PlanSchedule[]
    },
    enabled: !!profile?.id,
  })

  const { data: coach } = useQuery({
    queryKey: ['hero-coach', profile?.coach_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles').select('full_name, coach_bio, coach_specialty')
        .eq('id', profile!.coach_id!).single()
      return data as { full_name: string; coach_bio?: string; coach_specialty?: string } | null
    },
    enabled: !!profile?.coach_id,
  })

  const { data: lastSessions = [] } = useQuery({
    queryKey: ['hero-last-sessions', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions_v2').select('bundle_id, logged_at')
        .eq('user_id', profile!.id).order('logged_at', { ascending: false })
      return (data ?? []) as { bundle_id: string; logged_at: string }[]
    },
    enabled: !!profile?.id,
  })

  const todaySchedule = schedule.find(s => s.day_index === todayIndex)
  const recommendedBundle = bundles.find(b => b.id === todaySchedule?.bundle_id)

  const lastDoneMap: Record<string, string> = {}
  for (const s of lastSessions) {
    if (s.bundle_id && !lastDoneMap[s.bundle_id]) lastDoneMap[s.bundle_id] = s.logged_at
  }

  async function handleRestDay() {
    if (!profile?.id) return

    // Find any workout session today that has done sets
    const { data: todaySessions } = await supabase
      .from('sessions_v2')
      .select('id, sets:session_sets(done)')
      .eq('user_id', profile.id)
      .eq('logged_at', TODAY)
      .neq('session_type', 'rest')

    type RawSession = { id: string; sets: { done: boolean }[] }
    const realWorkout = (todaySessions as RawSession[] ?? []).find(s =>
      s.sets.some(set => set.done)
    )

    if (realWorkout) {
      setConflictId(realWorkout.id)
      setConfirmOpen(true)
    } else {
      await doSaveRestDay(null)
    }
  }

  async function doSaveRestDay(deleteId: string | null) {
    if (!profile?.id) return
    setSavingRest(true)
    setConfirmOpen(false)

    if (deleteId) {
      await supabase.from('session_sets').delete().eq('session_id', deleteId)
      await supabase.from('sessions_v2').delete().eq('id', deleteId)
    }

    // Avoid duplicate rest day entries
    const { data: existing } = await supabase
      .from('sessions_v2').select('id')
      .eq('user_id', profile.id).eq('logged_at', TODAY).eq('session_type', 'rest')
      .maybeSingle()

    if (!existing) {
      await supabase.from('sessions_v2').insert({
        user_id: profile.id,
        session_type: 'rest',
        bundle_name: 'Rest Day',
        logged_at: TODAY,
      })
    }

    setSavingRest(false)
    navigate('/hero/journal')
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size={36} className="text-[#c8ff00]" />
    </div>
  )

  return (
    <div className="px-5 pt-6 pb-32 max-w-lg mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-[#555] text-[15px] font-semibold uppercase tracking-widest">{DAYS[todayIndex]}</p>
        <h1 className="font-[Bebas_Neue] text-6xl text-white tracking-wide mt-1 leading-none">HUSSAIN.LIFT</h1>
        <p className="text-[#555] text-[15px] mt-2">Hey {profile?.full_name?.split(' ')[0]} 👊</p>
      </div>

      {/* Today's Recommendation */}
      {recommendedBundle && (
        <div className="space-y-3">
          <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Today's Plan</p>
          <BundleCard bundle={recommendedBundle} recommended lastDone={lastDoneMap[recommendedBundle.id]} />
        </div>
      )}

      {/* All Bundles */}
      {bundles.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Your Workouts</p>
          <div className="space-y-3">
            {bundles.map(b => (
              <BundleCard key={b.id} bundle={b} recommended={false} lastDone={lastDoneMap[b.id]} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[#1e1e1e] bg-[#111] p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-[14px] flex items-center justify-center text-3xl mx-auto"
            style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.12)' }}>
            ⏳
          </div>
          <div>
            <h2 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[2px] text-2xl">YOUR PLAN IS BEING PREPARED</h2>
            <p className="text-[#555] font-[DM_Mono] text-[12px] mt-2 leading-relaxed max-w-xs mx-auto">
              {coach?.full_name
                ? `Your coach ${coach.full_name} is building your personalized training plan. You'll be notified when it's ready.`
                : "Your coach is building your personalized training plan. You'll be notified when it's ready."
              }
            </p>
          </div>
          {profile?.plan_type && (
            <span className="inline-block text-[10px] font-[DM_Mono] font-bold uppercase tracking-[2px] px-3 py-1.5 rounded-[100px] border"
              style={{
                borderColor: profile.plan_type === 'C' ? 'rgba(168,85,247,0.4)' : profile.plan_type === 'B' ? 'rgba(61,159,255,0.4)' : 'rgba(200,255,0,0.3)',
                color: profile.plan_type === 'C' ? '#a855f7' : profile.plan_type === 'B' ? '#3d9fff' : '#c8ff00',
                background: profile.plan_type === 'C' ? 'rgba(168,85,247,0.06)' : profile.plan_type === 'B' ? 'rgba(61,159,255,0.06)' : 'rgba(200,255,0,0.06)',
              }}>
              Plan {profile.plan_type}
            </span>
          )}
        </div>
      )}

      {/* Rest Day */}
      <div className="space-y-3">
        <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Or</p>
        <button
          onClick={handleRestDay}
          disabled={savingRest}
          className="w-full rounded-[16px] border border-[#222] border-dashed p-6 flex items-center justify-center gap-4 hover:border-[#333] hover:bg-[#111] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <span className="text-3xl">🛋️</span>
          <div className="text-left">
            <p className="text-white font-bold text-lg">{savingRest ? 'Saving…' : 'Rest Day'}</p>
            <p className="text-[#555] text-[15px]">Recovery is part of the plan.</p>
          </div>
        </button>
      </div>

      {/* Confirm overwrite modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-5">
          <div className="text-4xl text-center">⚠️</div>
          <p className="text-white font-semibold text-center text-lg">Switch to Rest Day?</p>
          <p className="text-[#666] text-[15px] text-center leading-relaxed">
            You already logged a workout today. Switching to Rest Day will delete that session.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => doSaveRestDay(conflictId)}
            >
              Yes, Switch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
