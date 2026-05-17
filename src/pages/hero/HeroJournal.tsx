import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog, SleepQuality, Mood, Soreness, CardioType } from '../../types'

const TODAY = new Date().toISOString().slice(0, 10)
const MAX_BACK = 30

function getMinDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - MAX_BACK)
  return d.toISOString().slice(0, 10)
}

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

  const minDate = getMinDate()
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<JournalLog>>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})

  // Fetch last 30 days of logs — stable query key, refetch only on user change
  const { data: rangeLogs = [], isLoading } = useQuery({
    queryKey: ['journal-range', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('journal_logs').select('*')
        .eq('user_id', profile!.id)
        .gte('logged_at', minDate)
        .lte('logged_at', TODAY)
        .order('logged_at')
      return (data ?? []) as JournalLog[]
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })

  const dbLog = rangeLogs.find(l => l.logged_at === selectedDate) ?? null
  const log: Partial<JournalLog> = { ...dbLog, ...(localChanges[selectedDate] ?? {}) }

  function prevDay() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const next = d.toISOString().slice(0, 10)
    if (next >= minDate) setSelectedDate(next)
  }

  function nextDay() {
    if (selectedDate < TODAY) {
      const d = new Date(selectedDate + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      setSelectedDate(d.toISOString().slice(0, 10))
    }
  }

  function set<K extends keyof JournalLog>(k: K, v: JournalLog[K]) {
    setLocalChanges(prev => ({
      ...prev,
      [selectedDate]: { ...(prev[selectedDate] ?? {}), [k]: v },
    }))
  }

  function markSaved(key: string) {
    setSavedMap(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setSavedMap(prev => ({ ...prev, [key]: false })), 2000)
  }

  async function saveSection(key: string, sectionFields: (keyof JournalLog)[]) {
    const changes = localChanges[selectedDate] ?? {}
    const overrides: Partial<JournalLog> = {}
    for (const f of sectionFields) {
      if (f in changes) (overrides as Record<string, unknown>)[f] = changes[f]
    }
    await persist({ ...(dbLog ?? {}), ...overrides })
    markSaved(key)
  }

  async function persist(data: Partial<JournalLog>) {
    const existingId = rangeLogs.find(l => l.logged_at === selectedDate)?.id
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
          ['journal-range', profile?.id],
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
  const atMinDate = selectedDate <= minDate
  const selectedDObj = new Date(selectedDate + 'T12:00:00')

  // Inline save button component
  function SaveBtn({ sKey, fields }: { sKey: string; fields: (keyof JournalLog)[] }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {savedMap[sKey] && (
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--green-pr)', letterSpacing: 1 }}>
            ✓ Saved
          </span>
        )}
        <button
          onClick={() => saveSection(sKey, fields)}
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 9,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text3)',
            background: 'none',
            border: '1px solid var(--border2)',
            borderRadius: 100,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          SAVE
        </button>
      </div>
    )
  }

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 9, border: '1px solid var(--border2)',
    background: 'none', color: disabled ? 'var(--text3)' : 'var(--text2)',
    cursor: disabled ? 'default' : 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.3 : 1, flexShrink: 0,
  })

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
          Save each section individually
        </p>
      </div>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px', marginBottom: 16 }}>
        <button onClick={prevDay} disabled={atMinDate} style={navBtnStyle(atMinDate)}>←</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: isToday ? 'var(--accent)' : 'var(--text2)', letterSpacing: 1, margin: 0 }}>
            {isToday ? 'Today' : selectedDObj.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)', marginTop: 2, letterSpacing: 0.5 }}>
            {selectedDObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={nextDay} disabled={selectedDate >= TODAY} style={navBtnStyle(selectedDate >= TODAY)}>→</button>
      </div>

      {/* Logged indicator */}
      {dbLog && !isFuture && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--accent)', letterSpacing: 1 }}>Logged ✓</p>
        </div>
      )}

      {/* Future date */}
      {isFuture ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 12, letterSpacing: 2 }}>// Can't log future days</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Steps */}
          {config?.steps && (
            <div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 12px 0' }}>
                <SaveBtn sKey="steps" fields={['steps_done']} />
              </div>
            </div>
          )}

          {/* Sleep */}
          {config?.sleep && (
            <div className="daily-checklist">
              <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="checklist-title">// SLEEP</p>
                <SaveBtn sKey="sleep" fields={['sleep_hours', 'sleep_quality']} />
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
            <div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 12px 0' }}>
                <SaveBtn sKey="cardio" fields={['cardio_done', 'cardio_type', 'cardio_duration']} />
              </div>
            </div>
          )}

          {/* Water */}
          {config?.water && (
            <div className="daily-checklist">
              <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="checklist-title">// WATER</p>
                <SaveBtn sKey="water" fields={['water_glasses']} />
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
              <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="checklist-title">// BODY WEIGHT</p>
                <SaveBtn sKey="body_weight" fields={['body_weight']} />
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
              <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="checklist-title">// MOOD</p>
                <SaveBtn sKey="mood" fields={['mood']} />
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
              <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="checklist-title">// SORENESS</p>
                <SaveBtn sKey="soreness" fields={['soreness']} />
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
            <div className="checklist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="checklist-title">// NOTES</p>
              <SaveBtn sKey="notes" fields={['notes']} />
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
