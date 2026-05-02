import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog, SleepQuality, Mood, Soreness, CardioType } from '../../types'
import WeekStrip, { getWeekDates } from '../../components/ui/WeekStrip'

const TODAY = new Date().toISOString().slice(0, 10)

const SLEEP_OPTS: { value: SleepQuality; label: string; emoji: string }[] = [
  { value: 'deep',   label: 'Deep',   emoji: '😴' },
  { value: 'normal', label: 'Normal', emoji: '🛌' },
  { value: 'light',  label: 'Light',  emoji: '😪' },
  { value: 'broken', label: 'Broken', emoji: '😫' },
]

const MOOD_OPTS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'pumped',    label: 'Pumped',    emoji: '🔥' },
  { value: 'good',      label: 'Good',      emoji: '😊' },
  { value: 'normal',    label: 'Normal',    emoji: '😐' },
  { value: 'tired',     label: 'Tired',     emoji: '😓' },
  { value: 'exhausted', label: 'Exhausted', emoji: '💀' },
]

const SORENESS_OPTS: { value: Soreness; label: string; emoji: string }[] = [
  { value: 'none',     label: 'None',     emoji: '✅' },
  { value: 'light',    label: 'Light',    emoji: '😊' },
  { value: 'moderate', label: 'Moderate', emoji: '🔥' },
  { value: 'heavy',    label: 'Heavy',    emoji: '💀' },
]

const CARDIO_TYPES: CardioType[] = ['Stairs', 'Elliptical', 'Cycling', 'HIIT', 'Running', 'Other']

export default function HeroJournal() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const config = profile?.journal_config
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<JournalLog>>>({})

  const weekDates = getWeekDates(weekOffset)
  const isCurrentWeek = weekDates.includes(TODAY)

  const { data: weekLogs = [], isLoading } = useQuery({
    queryKey: ['journal-week', profile?.id, weekDates[0]],
    queryFn: async () => {
      const { data } = await supabase
        .from('journal_logs').select('*')
        .eq('user_id', profile!.id)
        .gte('logged_at', weekDates[0])
        .lte('logged_at', weekDates[6])
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })

  const dbLog = weekLogs.find(l => l.logged_at === selectedDate) ?? null
  const log: Partial<JournalLog> = { ...dbLog, ...(localChanges[selectedDate] ?? {}) }

  const dotsMap: Record<string, boolean> = {}
  for (const l of weekLogs) dotsMap[l.logged_at] = true

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

  function set<K extends keyof JournalLog>(k: K, v: JournalLog[K]) {
    setLocalChanges(prev => {
      const next = { ...prev, [selectedDate]: { ...(prev[selectedDate] ?? {}), [k]: v } }
      scheduleSave({ ...dbLog, ...next[selectedDate] })
      return next
    })
  }

  function scheduleSave(data: Partial<JournalLog>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persist(data), 800)
  }

  async function persist(data: Partial<JournalLog>) {
    const existingId = weekLogs.find(l => l.logged_at === selectedDate)?.id
    const payload = { ...data, user_id: profile!.id, logged_at: selectedDate }

    if (existingId) {
      await supabase.from('journal_logs').update(payload).eq('id', existingId)
    } else {
      const { data: upserted } = await supabase
        .from('journal_logs')
        .upsert(payload, { onConflict: 'user_id,logged_at' })
        .select().single()
      if (upserted) {
        qc.setQueryData(
          ['journal-week', profile?.id, weekDates[0]],
          (old: JournalLog[] = []) => [
            ...old.filter(l => l.logged_at !== selectedDate),
            upserted as JournalLog,
          ]
        )
        if (selectedDate === TODAY) {
          qc.setQueryData(['journal-today', profile?.id], upserted)
        }
      }
    }
    qc.invalidateQueries({ queryKey: ['journal-today', profile?.id] })
  }

  const isToday = selectedDate === TODAY
  const isFuture = selectedDate > TODAY
  const selectedDObj = new Date(selectedDate + 'T12:00:00')
  const dateLabel = selectedDObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 13, letterSpacing: 2 }}>LOADING...</p>
    </div>
  )

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, letterSpacing: 4, lineHeight: 1, color: 'var(--text)', margin: 0 }}>
          JOURNAL
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 4, letterSpacing: 1 }}>
          Auto-saves as you go
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

      {/* Selected date label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>
          {isToday ? 'Today — ' : ''}{dateLabel}
        </p>
        {dbLog && !isFuture && (
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--accent)', letterSpacing: 1 }}>Logged ✓</p>
        )}
      </div>

      {/* Future date — no editing */}
      {isFuture ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 12, letterSpacing: 2 }}>// Can't log future days</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Steps */}
          {config?.steps && (
            <div className={`check-row${log.steps_done ? ' checked' : ''}`}>
              <div className="check-row-left">
                <div className="check-row-icon-label">
                  <span className="check-row-icon">👟</span>
                  <span className="check-row-label">Steps</span>
                </div>
                <span className={`check-row-sub${log.steps_done ? ' done-sub' : ''}`}>
                  Target: {profile?.steps_target?.toLocaleString() ?? '10,000'} steps
                </span>
              </div>
              <button
                onClick={() => set('steps_done', !log.steps_done)}
                className={`big-check${log.steps_done ? ' done' : ''}`}
              >
                {log.steps_done ? '✓' : ''}
              </button>
            </div>
          )}

          {/* Sleep */}
          {config?.sleep && (
            <div className="daily-checklist">
              <div className="checklist-header">
                <p className="checklist-title">// SLEEP</p>
              </div>
              <div className="checklist-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number" min={0} max={24} step={0.5}
                    placeholder="7.5"
                    value={log.sleep_hours ?? ''}
                    onChange={e => set('sleep_hours', parseFloat(e.target.value) || undefined)}
                    className="set-input"
                    style={{ width: 90, textAlign: 'center' }}
                  />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>hours</span>
                </div>
                <div className="cardio-type-row">
                  {SLEEP_OPTS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => set('sleep_quality', o.value)}
                      className={`cardio-type-btn${log.sleep_quality === o.value ? ' selected' : ''}`}
                      style={log.sleep_quality === o.value ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                      {o.emoji} {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cardio */}
          {config?.cardio && (
            <div className={`cardio-block${log.cardio_done ? ' checked' : ''}`}>
              <div className="cardio-top">
                <div className="cardio-label-row">
                  <span className="cardio-icon">🏃</span>
                  <span className="cardio-label">Cardio</span>
                </div>
                <button
                  onClick={() => set('cardio_done', !log.cardio_done)}
                  className={`big-check${log.cardio_done ? ' done' : ''}`}
                >
                  {log.cardio_done ? '✓' : ''}
                </button>
              </div>
              {log.cardio_done && (
                <>
                  <div className="cardio-type-row">
                    {CARDIO_TYPES.map(ct => (
                      <button
                        key={ct}
                        onClick={() => set('cardio_type', ct as CardioType)}
                        className={`cardio-type-btn${log.cardio_type === ct ? ' selected' : ''}`}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number" min={0} placeholder="30"
                      value={log.cardio_duration ?? ''}
                      onChange={e => set('cardio_duration', parseInt(e.target.value) || undefined)}
                      className={`duration-input${log.cardio_duration ? ' filled' : ''}`}
                      style={{ width: 90 }}
                    />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>minutes</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Water */}
          {config?.water && (
            <div className="daily-checklist">
              <div className="checklist-header">
                <p className="checklist-title">// WATER</p>
              </div>
              <div className="checklist-body">
                <div className="water-track">
                  <button
                    onClick={() => set('water_glasses', Math.max(0, (log.water_glasses ?? 0) - 1))}
                    className="water-btn"
                  >−</button>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <span className="water-count">{log.water_glasses ?? 0}</span>
                    <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>/ 8 glasses</p>
                  </div>
                  <button
                    onClick={() => set('water_glasses', Math.min(20, (log.water_glasses ?? 0) + 1))}
                    className="water-btn"
                    style={{ borderColor: 'rgba(61,159,255,0.3)', color: 'var(--blue)' }}
                  >+</button>
                </div>
                <div className="water-bars">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="water-bar"
                      style={{ background: i < (log.water_glasses ?? 0) ? 'var(--blue)' : 'var(--lift2)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Body Weight */}
          {config?.body_weight && (
            <div className="daily-checklist">
              <div className="checklist-header">
                <p className="checklist-title">// BODY WEIGHT</p>
              </div>
              <div className="checklist-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number" min={0} step={0.1} placeholder="75.0"
                    value={log.body_weight ?? ''}
                    onChange={e => set('body_weight', parseFloat(e.target.value) || undefined)}
                    className="set-input"
                    style={{ width: 110 }}
                  />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>kg</span>
                </div>
              </div>
            </div>
          )}

          {/* Mood */}
          {config?.mood && (
            <div className="daily-checklist">
              <div className="checklist-header">
                <p className="checklist-title">// MOOD</p>
              </div>
              <div className="checklist-body">
                <div className="cardio-type-row">
                  {MOOD_OPTS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => set('mood', o.value)}
                      className={`cardio-type-btn${log.mood === o.value ? ' selected' : ''}`}
                      style={log.mood === o.value ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                      {o.emoji} {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Soreness */}
          {config?.soreness && (
            <div className="daily-checklist">
              <div className="checklist-header">
                <p className="checklist-title">// SORENESS</p>
              </div>
              <div className="checklist-body">
                <div className="cardio-type-row">
                  {SORENESS_OPTS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => set('soreness', o.value)}
                      className={`cardio-type-btn${log.soreness === o.value ? ' selected' : ''}`}
                      style={log.soreness === o.value ? { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                    >
                      {o.emoji} {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="daily-checklist">
            <div className="checklist-header">
              <p className="checklist-title">// NOTES</p>
            </div>
            <div className="checklist-body">
              <textarea
                rows={3}
                placeholder="How was your day?"
                value={log.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                className="notes-input"
                style={{ marginTop: 0 }}
              />
            </div>
          </div>

          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  )
}
