import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Session, JournalLog, Bundle } from '../../types'
import { calcRecoveryScore, recoveryLabel } from '../../utils/recovery'
import Toast, { useToast } from '../../components/ui/Toast'

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

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
        .from('journal_logs').select('*')
        .eq('user_id', profile!.id)
        .gte('logged_at', monthStart)
        .lte('logged_at', monthEnd)
        .order('created_at', { ascending: false })
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
  for (const j of journalLogs) {
    if (!journalByDate[j.logged_at]) journalByDate[j.logged_at] = j
  }

  const validSessions = sessions.filter(s =>
    (s.session_type ?? 'workout') === 'rest' || (s.sets ?? []).some(set => set.done)
  )

  const sessionsByDate: Record<string, Session> = {}
  for (const s of validSessions) {
    const existing = sessionsByDate[s.logged_at]
    const type = s.session_type ?? 'workout'
    if (!existing) {
      sessionsByDate[s.logged_at] = s
    } else {
      const existingType = existing.session_type ?? 'workout'
      if (type === 'workout' && existingType === 'rest') {
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
  const todayStr = today.toISOString().slice(0, 10)

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 13, letterSpacing: 2 }}>LOADING...</p>
    </div>
  )

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, letterSpacing: 4, lineHeight: 1, color: 'var(--text)', margin: 0 }}>
          HISTORY
        </h1>
      </div>

      {/* Calendar Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} className="cal-nav-btn">←</button>
        <span className="cal-month">{MONTH_NAMES[month]} {year}</span>
        <button
          onClick={nextMonth}
          disabled={year === today.getFullYear() && month === today.getMonth()}
          className="cal-nav-btn"
          style={{ opacity: (year === today.getFullYear() && month === today.getMonth()) ? 0.3 : 1 }}
        >→</button>
      </div>

      {/* Calendar Grid */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
        <div className="cal-grid" style={{ marginBottom: 4 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const daySession = sessionsByDate[dateStr]
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selected

            const dotColor = daySession
              ? ((daySession.session_type ?? 'workout') === 'rest'
                ? '#444'
                : bundles.find(b => b.id === daySession.bundle_id)?.color ?? 'var(--accent)')
              : null

            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`cal-cell${isToday ? ' today' : ''}${daySession ? ' has-session' : ''}${isSelected ? ' selected' : ''}`}
              >
                <span className="cal-day-num">{day}</span>
                {dotColor && <div className="cal-dot" style={{ background: dotColor }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Detail */}
      {selected && (
        <div className="cal-detail">
          <div className="cal-detail-header">
            <div>
              <p className="cal-detail-date">
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedSession && (
                <button
                  onClick={() => deleteSession.mutate(selectedSession.id)}
                  disabled={deletingId === selectedSession.id}
                  style={{
                    background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.25)',
                    color: '#ff6b6b', border: '1px solid', borderRadius: 100,
                    fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1.5,
                    textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer',
                    opacity: deletingId === selectedSession.id ? 0.4 : 1,
                  }}
                >
                  {deletingId === selectedSession.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
              <button className="cal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>

          {!selectedSession && !selectedJournal && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 12, letterSpacing: 2 }}>// Nothing logged this day</p>
            </div>
          )}

          {/* Workout or Rest */}
          {selectedSession && (() => {
            const type = selectedSession.session_type ?? 'workout'
            const bundle = bundles.find(b => b.id === selectedSession.bundle_id)

            if (type === 'rest') {
              return (
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20 }}>🔋</span>
                  <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 2, color: 'var(--text2)' }}>REST DAY</p>
                </div>
              )
            }

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
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="history-session-header" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    {bundle && <div style={{ width: 8, height: 8, borderRadius: '50%', background: bundle.color, flexShrink: 0 }} />}
                    <p className="cal-detail-name">{selectedSession.bundle_name}</p>
                  </div>
                </div>

                {exerciseOrder.length === 0 ? (
                  <p style={{ padding: '16px 18px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 12 }}>// No completed sets</p>
                ) : (
                  <div style={{ padding: '12px 18px 16px' }}>
                    {exerciseOrder.map(name => (
                      <div key={name} style={{ marginBottom: 12 }}>
                        <p className="hist-ex-name">{name}</p>
                        <div className="hist-sets">
                          {setsByEx[name]!.map((set, i) => (
                            <span key={i} className="hist-set done">
                              S{set.set_number} {set.weight != null ? `${set.weight}kg` : '—'}×{set.reps ?? '—'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSession.notes && (
                  <p style={{ padding: '0 18px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                    "{selectedSession.notes}"
                  </p>
                )}
              </div>
            )
          })()}

          {/* Journal section */}
          {selectedJournal && (() => {
            const j = selectedJournal
            const rows = [
              j.steps_done != null && { label: 'Steps', value: j.steps_done ? '✓ Done' : '✗ Not done', accent: j.steps_done ? 'var(--accent)' : 'var(--red)' },
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
              <div>
                <div style={{ padding: '14px 18px 12px' }}>
                  <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Journal</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                    {rows.map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: row.accent ?? 'var(--text2)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {j.notes && (
                    <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 8 }}>"{j.notes}"</p>
                  )}
                </div>
                {showRecovery && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 14px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2 }}>Recovery Score</p>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1, color: scoreColor }}>
                      {score} <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 400 }}>{scoreLabel.split(' —')[0]}</span>
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Monthly summary */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-around', textAlign: 'center', marginTop: 12 }}>
        <div>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: 'var(--accent)', lineHeight: 1 }}>{workoutSessions.length}</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Sessions</p>
        </div>
        <div>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: 'var(--blue)', lineHeight: 1 }}>{journalLogs.length}</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Journal Days</p>
        </div>
        <div>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: 'var(--text)', lineHeight: 1 }}>{totalDoneSets}</p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Sets Done</p>
        </div>
      </div>
    </div>
  )
}
