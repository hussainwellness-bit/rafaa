import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Bundle, PlanSchedule } from '../../types'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import WeekStrip, { getWeekDates } from '../../components/ui/WeekStrip'

const TODAY = new Date().toISOString().slice(0, 10)

function BundleCard({ bundle, tag, lastDone, selectedDate }: {
  bundle: Bundle
  tag?: string
  lastDone?: string
  selectedDate: string
}) {
  return (
    <Link to={`/hero/workout/${bundle.id}`} state={{ date: selectedDate }} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="split-card">
        <div className="split-card-inner">
          <div className="split-accent-bar" style={{ background: bundle.color }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {tag && (
              <p className="split-tag" style={{ color: bundle.color }}>{tag}</p>
            )}
            <p className="split-name">{bundle.name}</p>
            <p className="split-meta">
              {lastDone
                ? `Last: ${new Date(lastDone + 'T12:00:00').toLocaleDateString()}`
                : 'Not done yet'}
            </p>
          </div>
          <span className="split-arrow">→</span>
        </div>
        {bundle.description && (
          <div className="split-chips">
            <span className="split-chip">{bundle.description}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function HeroHome() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [conflictId, setConflictId] = useState<string | null>(null)
  const [savingRest, setSavingRest] = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const isCurrentWeek = weekDates.includes(TODAY)

  function handlePrevWeek() {
    const newOffset = weekOffset - 1
    setWeekOffset(newOffset)
    const newDates = getWeekDates(newOffset)
    if (!newDates.includes(selectedDate)) setSelectedDate(newDates[6])
  }

  function handleNextWeek() {
    const newOffset = weekOffset + 1
    setWeekOffset(newOffset)
    const newDates = getWeekDates(newOffset)
    if (newDates.includes(TODAY)) setSelectedDate(TODAY)
    else if (!newDates.includes(selectedDate)) setSelectedDate(newDates[0])
  }

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

  const { data: weekSessions = [] } = useQuery({
    queryKey: ['hero-week-sessions-home', profile?.id, weekDates[0]],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions_v2').select('bundle_id, logged_at, session_type')
        .eq('user_id', profile!.id)
        .gte('logged_at', weekDates[0])
        .lte('logged_at', weekDates[6])
      return (data ?? []) as { bundle_id: string; logged_at: string; session_type: string | null }[]
    },
    enabled: !!profile?.id,
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

  const lastDoneMap: Record<string, string> = {}
  for (const s of lastSessions) {
    if (s.bundle_id && !lastDoneMap[s.bundle_id]) lastDoneMap[s.bundle_id] = s.logged_at
  }

  const dotsMap: Record<string, string> = {}
  for (const s of weekSessions) {
    if (!dotsMap[s.logged_at]) {
      if (s.session_type === 'rest') {
        dotsMap[s.logged_at] = '#444'
      } else {
        const b = bundles.find(b => b.id === s.bundle_id)
        dotsMap[s.logged_at] = b?.color ?? '#c8ff00'
      }
    }
  }

  const selectedDayIndex = new Date(selectedDate + 'T12:00:00').getDay()
  const daySchedule = schedule.find(s => s.day_index === selectedDayIndex)
  const recommendedBundle = bundles.find(b => b.id === daySchedule?.bundle_id)

  const selectedDateLabel = selectedDate === TODAY
    ? 'Today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  async function handleRestDay() {
    if (!profile?.id) return
    const { data: daySessions } = await supabase
      .from('sessions_v2')
      .select('id, sets:session_sets(done)')
      .eq('user_id', profile.id)
      .eq('logged_at', selectedDate)
      .neq('session_type', 'rest')

    type RawSession = { id: string; sets: { done: boolean }[] }
    const realWorkout = (daySessions as RawSession[] ?? []).find(s => s.sets.some(set => set.done))

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

    const { data: existing } = await supabase
      .from('sessions_v2').select('id')
      .eq('user_id', profile.id).eq('logged_at', selectedDate).eq('session_type', 'rest')
      .maybeSingle()

    if (!existing) {
      await supabase.from('sessions_v2').insert({
        user_id: profile.id,
        session_type: 'rest',
        bundle_name: 'Rest Day',
        logged_at: selectedDate,
      })
    }

    setSavingRest(false)
    qc.invalidateQueries({ queryKey: ['hero-week-sessions-home', profile.id, weekDates[0]] })
    if (selectedDate === TODAY) navigate('/hero/journal')
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p className="font-[DM_Mono] text-[#555] text-[13px] tracking-[2px]">LOADING...</p>
    </div>
  )

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, letterSpacing: 4, lineHeight: 1, color: 'var(--text)', margin: 0 }}>
          HUSSAIN<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>.LIFT</em>
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          Hey {profile?.full_name?.split(' ')[0]} 👊
        </p>
      </div>

      {/* Week strip */}
      <WeekStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        dotsMap={dotsMap}
        weekOffset={weekOffset}
        onPrev={handlePrevWeek}
        onNext={handleNextWeek}
        disableNext={isCurrentWeek}
      />

      {/* Day label */}
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
        {selectedDateLabel}
      </p>

      {/* Recommended */}
      {recommendedBundle && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            SCHEDULED
          </p>
          <BundleCard
            bundle={recommendedBundle}
            tag={selectedDate === TODAY ? 'Today' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
            lastDone={lastDoneMap[recommendedBundle.id]}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* All bundles */}
      {bundles.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            ALL WORKOUTS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bundles.map(b => (
              <BundleCard
                key={b.id}
                bundle={b}
                lastDone={lastDoneMap[b.id]}
                selectedDate={selectedDate}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 3, color: 'var(--text)', marginBottom: 8 }}>
            YOUR PLAN IS BEING PREPARED
          </h2>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            {coach?.full_name
              ? `Your coach ${coach.full_name} is building your personalized training plan.`
              : 'Your coach is building your personalized training plan.'}
          </p>
        </div>
      )}

      {/* Rest day */}
      <div style={{ marginTop: 8 }}>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          OR
        </p>
        <button
          onClick={handleRestDay}
          disabled={savingRest}
          style={{
            width: '100%', background: 'var(--card)', border: '1px dashed var(--border2)',
            borderRadius: 16, padding: '20px 18px', display: 'flex', alignItems: 'center',
            gap: 14, cursor: 'pointer', opacity: savingRest ? 0.5 : 1,
          }}
        >
          <span style={{ fontSize: 28 }}>🛋️</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: 2, color: 'var(--text2)', margin: 0 }}>
              {savingRest ? 'SAVING…' : 'REST DAY'}
            </p>
            <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              Recovery is part of the plan.
            </p>
          </div>
        </button>
      </div>

      {/* Confirm overwrite modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Switch to Rest Day?</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            You already logged a workout. Switching to Rest Day will delete that session.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => doSaveRestDay(conflictId)}>Yes, Switch</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
