import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Bundle, BundleExercise } from '../../types'
import Button from '../../components/ui/Button'
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

const COL = '28px 1fr 1fr 44px'

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
    <div className="pb-40 max-w-lg mx-auto">
      <Toast toast={toast} />

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/hero')}
          className="w-10 h-10 rounded-[10px] border border-[#333] flex items-center justify-center text-[#888] hover:text-white hover:border-[#555] transition-all shrink-0"
        >←</button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: bundle.color }} />
          <div className="min-w-0">
            <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide leading-none truncate">
              {bundle.name}
            </h1>
            {logDate !== today && (
              <p className="text-[#c8ff00] font-[DM_Mono] text-[10px] tracking-[1px] mt-0.5">
                Logging for {new Date(logDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Exercise cards */}
      <div className="px-5 space-y-4 mt-2">
        {exerciseGroups.map(({ be, sets: exSets }) => {
          const lastSets = lastSessionData[be.exercise_id] ?? []

          return (
            <div key={be.id} className="ex-card">
              {/* Exercise name + video */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="ex-card-name">{be.exercise?.name}</p>
                {be.exercise?.video_url && (
                  <a
                    href={be.exercise.video_url} target="_blank" rel="noreferrer"
                    className="shrink-0 text-sm text-[#3d9fff] border border-[#3d9fff]/30 px-3 py-1.5 rounded-[100px] hover:bg-[#3d9fff]/10 transition-all"
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

              {/* Column headers */}
              <div className="grid gap-2 mb-1 px-1" style={{ gridTemplateColumns: COL }}>
                <span className="set-col-header">#</span>
                <span className="set-col-header">KG</span>
                <span className="set-col-header">REPS</span>
                <span className="set-col-header">✓</span>
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {exSets.map((set, i) => {
                  const globalIdx = sets.indexOf(set)
                  const lastSet = lastSets[i] // same index = same set number
                  const cw = parseFloat(set.weight) || 0
                  const cr = parseInt(set.reps)    || 0
                  const lw = lastSet?.weight ?? 0
                  const lr = lastSet?.reps   ?? 0
                  // Green only when genuinely beating the previous session
                  const weightPR = !!set.weight && lw > 0 && cw > lw
                  const repsPR   = !!set.reps   && lr > 0 && cr > lr && cw >= lw

                  return (
                    <div key={i} className={`set-row${set.done ? ' done' : ''}`}>
                      <span className="set-num">{set.set_number}</span>

                      {/* KG — pr > filled > empty */}
                      <input
                        type="number" min={0} step={0.5}
                        placeholder={lw ? String(lw) : '—'}
                        value={set.weight}
                        onChange={e => updateSet(globalIdx, 'weight', e.target.value)}
                        className={`set-input${weightPR ? ' pr' : set.weight ? ' filled' : ''}`}
                      />

                      {/* REPS — pr > filled > empty */}
                      <input
                        type="number" min={0}
                        placeholder={lr ? String(lr) : '—'}
                        value={set.reps}
                        onChange={e => updateSet(globalIdx, 'reps', e.target.value)}
                        className={`set-input${repsPR ? ' pr' : set.reps ? ' filled' : ''}`}
                      />

                      {/* Done */}
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
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div className="px-5 mt-8 space-y-3">
        <label className="text-[#555] text-sm font-bold uppercase tracking-wider">Session Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => { setNotes(e.target.value); saveDraft(sets, e.target.value) }}
          placeholder="How did it feel? Any PRs?"
          className="w-full px-5 py-4 bg-[#111] border border-[#222] rounded-[14px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] resize-none"
          style={{ fontSize: 15 }}
        />
      </div>

      {/* Finish — fixed bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-5 pt-8 pb-2 bg-gradient-to-t from-[#080808] via-[#080808]/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full"
            onClick={() => saveSession.mutate()}
            disabled={saveSession.isPending || saved}
            size="lg"
          >
            {saved ? '✓ Session Saved!' : saveSession.isPending ? 'Saving...' : 'Finish Session'}
          </Button>
        </div>
      </div>
    </div>
  )
}
