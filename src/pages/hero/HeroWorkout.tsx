import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Bundle, BundleExercise } from '../../types'
import Toast, { useToast } from '../../components/ui/Toast'

interface LocalSet {
  exercise_id: string
  exercise_name: string
  set_number: number
  weight: string
  reps: string
  done: boolean
}

interface LastSet {
  set_number: number
  weight: number | null
  reps: number | null
}

// exerciseId → ordered array of last session sets
type LastSessionData = Record<string, LastSet[]>

// bundleId is passed as prop by HeroLayout (derived via matchPath — no Route/useParams needed)
export default function HeroWorkout({ bundleId }: { bundleId: string | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuthStore()
  const logDate: string =
    (location.state as { date?: string } | null)?.date ?? new Date().toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const { toast, showToast } = useToast()

  const sessionIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Draft key: per-user, per-bundle, per-day
  const draftKey = profile?.id && bundleId ? `draft_${profile.id}_${bundleId}_${today}` : null

  const [sets, setSets] = useState<LocalSet[]>([])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [lastSessionData, setLastSessionData] = useState<LastSessionData>({})

  // Reset session state when bundleId changes (navigating to different bundle)
  useEffect(() => {
    sessionIdRef.current = null
    setSaved(false)
  }, [bundleId])

  const { data: bundle } = useQuery({
    queryKey: ['bundle', bundleId],
    queryFn: async () => {
      const { data } = await supabase.from('bundles').select('*').eq('id', bundleId!).single()
      return data as Bundle
    },
    enabled: !!bundleId,
  })

  const { data: bundleExercises = [], isLoading } = useQuery({
    queryKey: ['bundle-exercises', bundleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bundle_exercises').select('*, exercise:exercises(*)')
        .eq('bundle_id', bundleId!).order('sort_order')
      return (data ?? []) as BundleExercise[]
    },
    enabled: !!bundleId,
  })

  // ── Load ALL sets from last session for this bundle (per exercise) ──────────
  useEffect(() => {
    if (!profile?.id || !bundleExercises.length || !bundleId) return
    const exerciseIds = bundleExercises.map(be => be.exercise_id)

    async function loadLastSession() {
      const { data: sessions } = await supabase
        .from('sessions_v2').select('id')
        .eq('user_id', profile!.id).eq('bundle_id', bundleId!)
        .order('logged_at', { ascending: false }).limit(1)
      if (!sessions?.length) return

      const { data: rawSets } = await supabase
        .from('session_sets').select('exercise_id, set_number, weight, reps')
        .eq('session_id', sessions[0].id)
        .in('exercise_id', exerciseIds)
        .order('set_number', { ascending: true })

      const grouped: LastSessionData = {}
      for (const s of (rawSets ?? []) as (LastSet & { exercise_id: string })[]) {
        if (!grouped[s.exercise_id]) grouped[s.exercise_id] = []
        grouped[s.exercise_id].push({ set_number: s.set_number, weight: s.weight, reps: s.reps })
      }
      setLastSessionData(grouped)
    }
    loadLastSession()
  }, [bundleExercises, profile, bundleId])

  // ── Initialize sets — restore draft from localStorage if available ──────────
  useEffect(() => {
    if (!bundleExercises.length) return
    const initial: LocalSet[] = []
    for (const be of bundleExercises) {
      for (let i = 1; i <= be.sets; i++) {
        initial.push({
          exercise_id: be.exercise_id,
          exercise_name: be.exercise?.name ?? '',
          set_number: i, weight: '', reps: '', done: false,
        })
      }
    }

    if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey)
        if (raw) {
          const draft = JSON.parse(raw) as { sets: LocalSet[]; notes: string }
          const merged = initial.map(s => {
            const d = draft.sets.find(x => x.exercise_id === s.exercise_id && x.set_number === s.set_number)
            return d ? { ...s, weight: d.weight, reps: d.reps, done: d.done } : s
          })
          setSets(merged)
          setNotes(draft.notes ?? '')
          return
        }
      } catch { /* corrupt draft — ignore */ }
    }

    setSets(initial)
    setNotes('')
  }, [bundleExercises]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session DB ops ──────────────────────────────────────────────────────────
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current
    if (!profile?.id || !bundleId || !bundle) return null
    const { data, error } = await supabase.from('sessions_v2').insert({
      user_id: profile.id, bundle_id: bundleId, bundle_name: bundle.name, logged_at: logDate,
    }).select().single()
    if (error) throw new Error('Could not create session: ' + error.message)
    if (data) sessionIdRef.current = (data as { id: string }).id
    return sessionIdRef.current
  }, [profile, bundleId, bundle, logDate])

  const autoSave = useCallback(async (currentSets: LocalSet[], currentNotes: string) => {
    const sessionId = await ensureSession()
    if (!sessionId) return
    await supabase.from('sessions_v2')
      .update({ notes: currentNotes, updated_at: new Date().toISOString() }).eq('id', sessionId)
    const setsToSave = currentSets.filter(s => s.weight || s.reps || s.done)
    await supabase.from('session_sets').delete().eq('session_id', sessionId)
    if (setsToSave.length) {
      await supabase.from('session_sets').insert(
        setsToSave.map(s => ({
          session_id: sessionId,
          exercise_id: s.exercise_id,
          exercise_name: s.exercise_name,
          set_number: s.set_number,
          weight: parseFloat(s.weight) || null,
          reps: parseInt(s.reps) || null,
          done: s.done,
        }))
      )
    }
  }, [ensureSession])

  // ── Draft persistence ───────────────────────────────────────────────────────
  const saveDraft = useCallback((currentSets: LocalSet[], currentNotes: string) => {
    if (!draftKey) return
    try { localStorage.setItem(draftKey, JSON.stringify({ sets: currentSets, notes: currentNotes })) }
    catch { /* storage full */ }
  }, [draftKey])

  const updateSet = (idx: number, field: 'weight' | 'reps' | 'done', value: string | boolean) => {
    setSets(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      saveDraft(next, notes)
      return next
    })
  }

  const saveSession = useMutation({
    mutationFn: async () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await autoSave(sets, notes)
    },
    onSuccess: () => {
      if (draftKey) localStorage.removeItem(draftKey)
      setSaved(true)
      showToast('success', 'Session saved ✓')
      setTimeout(() => navigate('/hero'), 1200)
    },
    onError: (e: Error) => showToast('error', 'Failed to save: ' + e.message),
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  // When hidden (bundleId null), render nothing — display:none is applied by parent
  if (!bundleId) return null

  if (isLoading || !bundle) return (
    <div className="flex items-center justify-center h-screen">
      <p className="font-[DM_Mono] text-[#555] text-[13px] tracking-[2px]">LOADING...</p>
    </div>
  )

  const exerciseGroups = bundleExercises.map(be => ({
    be,
    sets: sets.filter(s => s.exercise_id === be.exercise_id),
  }))

  return (
    <div style={{ paddingBottom: 120, maxWidth: 700, margin: '0 auto' }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ padding: '24px 16px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/hero')}
          style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--lift2)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}
        >←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: bundle.color }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: 3, color: 'var(--text)', margin: 0, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bundle.name}
            </h1>
            {logDate !== today && (
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--accent)', marginTop: 2, letterSpacing: 1 }}>
                Logging for {new Date(logDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Exercise cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {exerciseGroups.map(({ be, sets: exSets }) => {
          const lastSets = lastSessionData[be.exercise_id] ?? []
          const anyDone = exSets.some(s => s.done)

          return (
            <div key={be.id} className={`ex-card${anyDone ? ' logged' : ''}`}>
              {/* Exercise name + video */}
              <div className="ex-card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="ex-card-name">{be.exercise?.name}</p>
                </div>
                {be.exercise?.video_url && (
                  <a
                    href={be.exercise.video_url} target="_blank" rel="noreferrer"
                    style={{ flexShrink: 0, fontSize: 12, color: 'var(--blue)', border: '1px solid rgba(61,159,255,0.3)', padding: '6px 12px', borderRadius: 100, textDecoration: 'none' }}
                  >
                    ▶ Video
                  </a>
                )}
              </div>

              {/* LAST session — all sets as badges */}
              {lastSets.length > 0 && (
                <div className="last-ref">
                  <span className="last-ref-label">LAST:</span>
                  {lastSets.map(s => (
                    <span className="lset" key={s.set_number}>
                      S{s.set_number} {s.weight ?? '—'}kg×{s.reps ?? '—'}
                    </span>
                  ))}
                </div>
              )}

              {/* Set input area */}
              <div className="log-body">
                {/* Column headers */}
                <div className="set-labels">
                  <span className="input-label">#</span>
                  <span className="input-label">KG</span>
                  <span className="input-label">REPS</span>
                  <span className="input-label">✓</span>
                </div>

                {/* Set rows */}
                <div className="sets-grid">
                  {exSets.map((set, i) => {
                    const globalIdx = sets.indexOf(set)
                    const lastSet = lastSets[i]
                    const cw = parseFloat(set.weight) || 0
                    const cr = parseInt(set.reps)    || 0
                    const lw = lastSet?.weight ?? 0
                    const lr = lastSet?.reps   ?? 0
                    const weightPR = !!set.weight && lw > 0 && cw > lw
                    const repsPR   = !!set.reps   && lr > 0 && cr > lr && cw >= lw
                    const isPR = weightPR || repsPR

                    return (
                      <div key={i} className={`set-row${isPR ? ' pr-row' : ''}`}>
                        <span className={`set-num${isPR ? ' pr' : ''}`}>{set.set_number}</span>

                        <input
                          type="number" min={0} step={0.5}
                          placeholder={lw ? String(lw) : '—'}
                          value={set.weight}
                          onChange={e => updateSet(globalIdx, 'weight', e.target.value)}
                          className={`set-input${weightPR ? ' pr' : set.weight ? ' filled' : ''}`}
                        />

                        <input
                          type="number" min={0}
                          placeholder={lr ? String(lr) : '—'}
                          value={set.reps}
                          onChange={e => updateSet(globalIdx, 'reps', e.target.value)}
                          className={`set-input${repsPR ? ' pr' : set.reps ? ' filled' : ''}`}
                        />

                        <button
                          onClick={() => updateSet(globalIdx, 'done', !set.done)}
                          className={`set-check${set.done ? ' done' : ''}`}
                        >
                          {set.done ? '✓' : ''}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Notes per exercise — hidden if no notes, shown inline */}
              </div>
            </div>
          )
        })}
      </div>

      {/* Session notes */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          Session Notes
        </p>
        <textarea
          rows={3}
          value={notes}
          onChange={e => { setNotes(e.target.value); saveDraft(sets, e.target.value) }}
          placeholder="How did it feel? Any PRs?"
          className="notes-input"
        />
      </div>

      {/* Finish — fixed bottom */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: '24px 16px 8px', background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <button
            onClick={() => saveSession.mutate()}
            disabled={saveSession.isPending || saved}
            className="save-btn"
            style={{ width: '100%', justifyContent: 'center', fontSize: 12, letterSpacing: 3, opacity: (saveSession.isPending || saved) ? 0.6 : 1 }}
          >
            {saved ? '✓ SESSION SAVED!' : saveSession.isPending ? 'SAVING...' : 'FINISH SESSION'}
          </button>
        </div>
      </div>
    </div>
  )
}
