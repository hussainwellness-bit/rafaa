import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Session, JournalLog, Bundle } from '../../types'
import { calcRecoveryScore, recoveryLabel } from '../../utils/recovery'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Toast, { useToast } from '../../components/ui/Toast'

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Main component ────────────────────────────────────────────────────────────
export default function HeroHistory() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const { toast, showToast } = useToast()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['hero-history-sessions', profile?.id, year, month],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('sessions_v2').select('*')
        .eq('user_id', profile!.id).gte('logged_at', monthStart).lte('logged_at', monthEnd).order('logged_at')
      if (!rows?.length) return []
      const ids = rows.map(r => r.id)
      const { data: sets } = await supabase
        .from('session_sets').select('*').in('session_id', ids)
      const setsBySession: Record<string, typeof sets> = {}
      for (const s of (sets ?? [])) {
        if (!setsBySession[s.session_id]) setsBySession[s.session_id] = []
        setsBySession[s.session_id]!.push(s)
      }
      return rows.map(r => ({ ...r, sets: setsBySession[r.id] ?? [] })) as Session[]
    },
    enabled: !!profile?.id,
  })

  const { data: journalLogs = [] } = useQuery({
    queryKey: ['hero-history-journal', profile?.id, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('journal_logs').select('*').eq('user_id', profile!.id).gte('logged_at', monthStart).lte('logged_at', monthEnd)
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
  })

  const { data: bundles = [] } = useQuery({
    queryKey: ['hero-bundles', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('bundles').select('*').eq('client_id', profile!.id)
      return (data ?? []) as Bundle[]
    },
    enabled: !!profile?.id,
  })

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      setDeletingId(sessionId)
      await supabase.from('session_sets').delete().eq('session_id', sessionId)
      const { error } = await supabase.from('sessions_v2').delete().eq('id', sessionId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setSelected(null)
      setDeletingId(null)
      qc.invalidateQueries({ queryKey: ['hero-history-sessions', profile?.id] })
      showToast('success', 'Session deleted')
    },
    onError: (e: Error) => {
      setDeletingId(null)
      showToast('error', 'Failed to delete: ' + e.message)
    },
  })

  const journalByDate: Record<string, JournalLog> = {}
  for (const j of journalLogs) journalByDate[j.logged_at] = j

  // Only keep sessions that are meaningful:
  // - rest days always count
  // - workout sessions only if at least 1 set is done
  const validSessions = sessions.filter(s =>
    (s.session_type ?? 'workout') === 'rest' || (s.sets ?? []).some(set => set.done)
  )

  // ONE session per day: prefer workout over rest; within workouts, keep most done sets
  const sessionsByDate: Record<string, Session> = {}
  for (const s of validSessions) {
    const existing = sessionsByDate[s.logged_at]
    const type = s.session_type ?? 'workout'

    if (!existing) {
      sessionsByDate[s.logged_at] = s
    } else {
      const existingType = existing.session_type ?? 'workout'
      if (type === 'workout' && existingType === 'rest') {
        // workout beats rest
        sessionsByDate[s.logged_at] = s
      } else if (type === 'workout' && existingType === 'workout') {
        const existingDone = existing.sets?.filter(set => set.done).length ?? 0
        const newDone = s.sets?.filter(set => set.done).length ?? 0
        if (newDone > existingDone) sessionsByDate[s.logged_at] = s
      }
    }
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const firstDay = firstDayOfMonth(year, month)
  const totalDays = daysInMonth(year, month)
  const selectedSession = selected ? (sessionsByDate[selected] ?? null) : null
  const selectedJournal = selected ? (journalByDate[selected] ?? null) : null

  const workoutSessions = validSessions.filter(s => (s.session_type ?? 'workout') === 'workout')
  const totalDoneSets = workoutSessions.reduce((acc, s) => acc + (s.sets?.filter(set => set.done).length ?? 0), 0)
  const showRecovery = profile?.plan_type === 'B' || profile?.plan_type === 'C'

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size={32} className="text-[#c8ff00]" />
    </div>
  )

  return (
    <div className="p-5 max-w-lg mx-auto space-y-5">
      <Toast toast={toast} />
      <div className="pt-4">
        <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">HISTORY</h1>
      </div>

      {/* Calendar Nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-9 h-9 rounded-[10px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all">←</button>
        <span className="font-[Bebas_Neue] text-2xl text-white tracking-wide">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth} disabled={year === today.getFullYear() && month === today.getMonth()}
          className="w-9 h-9 rounded-[10px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all disabled:opacity-30">→</button>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center text-[#444] text-[10px] font-[DM_Mono] pb-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const daySession = sessionsByDate[dateStr]
            const isToday = dateStr === today.toISOString().slice(0, 10)
            const isSelected = dateStr === selected

            // ONE dot per day: bundle color for workout, grey for rest, nothing otherwise
            const dotColor = daySession
              ? ((daySession.session_type ?? 'workout') === 'rest'
                ? '#444'
                : bundles.find(b => b.id === daySession.bundle_id)?.color ?? '#c8ff00')
              : null

            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`aspect-square flex flex-col items-center justify-center rounded-[8px] transition-all ${
                  isSelected ? 'bg-[#c8ff00]/10 border border-[#c8ff00]/40' :
                  isToday ? 'border border-[#333]' : 'hover:bg-[#1a1a1a]'
                }`}
              >
                <span className={`text-sm leading-none ${isToday ? 'text-[#c8ff00] font-bold' : 'text-[#888]'}`}>{day}</span>
                <div className="mt-1 h-1.5 flex items-center">
                  {dotColor && <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Day Detail */}
      {selected && (
        <div className="rounded-[16px] border border-[#1e1e1e] bg-[#111] overflow-hidden">
          {/* Date header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#1e1e1e] flex items-center justify-between gap-3">
            <h2 className="font-[Bebas_Neue] text-[22px] text-white tracking-[2px] leading-none">
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </h2>
            {selectedSession && (
              <button
                onClick={() => deleteSession.mutate(selectedSession.id)}
                disabled={deletingId === selectedSession.id}
                className="shrink-0 text-[10px] font-[DM_Mono] font-bold uppercase tracking-[1.5px] px-3 py-1.5 rounded-[100px] border transition-all disabled:opacity-40"
                style={{ background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.25)', color: '#ff6b6b' }}
              >
                {deletingId === selectedSession.id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {!selectedSession && !selectedJournal && (
            <div className="px-5 py-8 text-center">
              <p className="text-[#333] font-[DM_Mono] text-[12px]">// Nothing logged this day</p>
            </div>
          )}

          {/* Workout or Rest */}
          {selectedSession && (() => {
            const type = selectedSession.session_type ?? 'workout'
            const bundle = bundles.find(b => b.id === selectedSession.bundle_id)

            if (type === 'rest') {
              return (
                <div className="px-5 py-4 flex items-center gap-3 border-b border-[#1e1e1e]">
                  <span className="text-xl">🔋</span>
                  <p className="font-[Bebas_Neue] text-[18px] text-[#888] tracking-[2px]">REST DAY</p>
                </div>
              )
            }

            // Group sets by exercise (done only)
            const exerciseOrder: string[] = []
            const setsByEx: Record<string, typeof selectedSession.sets> = {}
            for (const set of (selectedSession.sets ?? []).sort((a, b) => a.set_number - b.set_number)) {
              if (!set.done) continue
              if (!setsByEx[set.exercise_name]) {
                setsByEx[set.exercise_name] = []
                exerciseOrder.push(set.exercise_name)
              }
              setsByEx[set.exercise_name]!.push(set)
            }

            return (
              <div className="border-b border-[#1e1e1e]">
                {/* Session name row */}
                <div className="history-session-header border-b border-[#1a1a1a]">
                  {bundle && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: bundle.color }} />}
                  <p className="history-session-name">{selectedSession.bundle_name}</p>
                </div>

                {exerciseOrder.length === 0 ? (
                  <p className="px-5 py-4 text-[#333] font-[DM_Mono] text-[12px]">// No completed sets</p>
                ) : (
                  <div className="px-5 py-3 space-y-4">
                    {exerciseOrder.map(name => (
                      <div key={name}>
                        <p className="ex-history-label">{name}</p>
                        <div className="space-y-1.5">
                          {setsByEx[name]!.map((set, i) => (
                            <div key={i} className="history-set-row">
                              <span className="history-set-num">Set {set.set_number}</span>
                              <span className="history-set-val">
                                {set.weight != null ? `${set.weight} kg` : '—'} × {set.reps ?? '—'}
                              </span>
                              <span className="history-set-done">✓</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSession.notes && (
                  <p className="px-5 pb-3 text-[#555] font-[DM_Mono] text-[11px] italic">"{selectedSession.notes}"</p>
                )}
              </div>
            )
          })()}

          {/* Journal section */}
          {selectedJournal && (() => {
            const j = selectedJournal
            const rows = [
              j.steps_done != null && { label: 'Steps', value: j.steps_done ? '✓ Done' : '✗ Not done', accent: j.steps_done ? '#c8ff00' : '#ff3d3d' },
              j.sleep_hours != null && { label: 'Sleep', value: `${j.sleep_hours}h${j.sleep_quality ? ` · ${j.sleep_quality}` : ''}` },
              j.mood && { label: 'Mood', value: j.mood },
              j.soreness && { label: 'Soreness', value: j.soreness },
              j.water_glasses != null && { label: 'Water', value: `${j.water_glasses} glasses` },
              j.body_weight != null && { label: 'Weight', value: `${j.body_weight} kg` },
              j.cardio_done && { label: 'Cardio', value: [j.cardio_type, j.cardio_duration ? `${j.cardio_duration}min` : ''].filter(Boolean).join(' · ') + ' ✓' },
            ].filter(Boolean) as { label: string; value: string; accent?: string }[]

            if (!rows.length && !j.notes) return null

            const { score, label: scoreLabel, color: scoreColor } = (() => {
              const s = calcRecoveryScore(j)
              const { label, color } = recoveryLabel(s)
              return { score: s, label, color }
            })()

            return (
              <div className="border-b border-[#1e1e1e]">
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[9px] font-[DM_Mono] font-bold text-[#555] uppercase tracking-[2px] mb-3">Journal</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {rows.map((row, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-2">
                        <span className="text-[#444] font-[DM_Mono] text-[10px] uppercase tracking-[1px] shrink-0 capitalize">{row.label}</span>
                        <span className="font-[DM_Mono] text-[11px] capitalize truncate" style={{ color: row.accent ?? '#888' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {j.notes && (
                    <p className="text-[#444] font-[DM_Mono] text-[11px] italic mt-2">"{j.notes}"</p>
                  )}
                </div>
                {showRecovery && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a]">
                    <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[2px]">Recovery Score</p>
                    <span className="font-[Bebas_Neue] text-[18px] tracking-wide" style={{ color: scoreColor }}>
                      {score} <span className="font-[DM_Mono] text-[10px] font-normal">{scoreLabel.split(' —')[0]}</span>
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Journal-only day (no session) */}
          {!selectedSession && selectedJournal && (() => {
            const j = selectedJournal
            const rows = [
              j.steps_done != null && { label: 'Steps', value: j.steps_done ? '✓ Done' : '✗ Not done', accent: j.steps_done ? '#c8ff00' : '#ff3d3d' },
              j.sleep_hours != null && { label: 'Sleep', value: `${j.sleep_hours}h${j.sleep_quality ? ` · ${j.sleep_quality}` : ''}` },
              j.mood && { label: 'Mood', value: j.mood },
              j.soreness && { label: 'Soreness', value: j.soreness },
              j.water_glasses != null && { label: 'Water', value: `${j.water_glasses} glasses` },
              j.body_weight != null && { label: 'Weight', value: `${j.body_weight} kg` },
            ].filter(Boolean) as { label: string; value: string; accent?: string }[]

            const { score, label: scoreLabel, color: scoreColor } = (() => {
              const s = calcRecoveryScore(j)
              const { label, color } = recoveryLabel(s)
              return { score: s, label, color }
            })()

            return (
              <div>
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[9px] font-[DM_Mono] font-bold text-[#555] uppercase tracking-[2px] mb-3">Journal</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {rows.map((row, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-2">
                        <span className="text-[#444] font-[DM_Mono] text-[10px] uppercase tracking-[1px] shrink-0 capitalize">{row.label}</span>
                        <span className="font-[DM_Mono] text-[11px] capitalize truncate" style={{ color: row.accent ?? '#888' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {showRecovery && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a]">
                    <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[2px]">Recovery Score</p>
                    <span className="font-[Bebas_Neue] text-[18px] tracking-wide" style={{ color: scoreColor }}>
                      {score} <span className="font-[DM_Mono] text-[10px] font-normal">{scoreLabel.split(' —')[0]}</span>
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Monthly summary */}
      <Card className="p-4 flex items-center justify-around text-center">
        <div>
          <p className="font-[Bebas_Neue] text-3xl text-[#c8ff00]">{workoutSessions.length}</p>
          <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[1px]">Sessions</p>
        </div>
        <div>
          <p className="font-[Bebas_Neue] text-3xl text-[#3d9fff]">{journalLogs.length}</p>
          <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[1px]">Journal Days</p>
        </div>
        <div>
          <p className="font-[Bebas_Neue] text-3xl text-white">{totalDoneSets}</p>
          <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[1px]">Sets Done</p>
        </div>
      </Card>
    </div>
  )
}
