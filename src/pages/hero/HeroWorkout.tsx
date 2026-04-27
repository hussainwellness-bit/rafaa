import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Bundle, BundleExercise } from '../../types'
import Spinner from '../../components/ui/Spinner'
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

interface GhostData {
  [exerciseId: string]: { weight?: number; reps?: number }
}

const COL = '28px 1fr 1fr 44px'

export default function HeroWorkout() {
  const { bundleId } = useParams<{ bundleId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuthStore()
  // Accept a date passed via Link state (from HeroHome week selector); fall back to today
  const logDate: string = (location.state as { date?: string } | null)?.date ?? new Date().toISOString().slice(0, 10)
  const { toast, showToast } = useToast()
  const sessionIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sets, setSets] = useState<LocalSet[]>([])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [ghostData, setGhostData] = useState<GhostData>({})

  const { data: bundle } = useQuery({
    queryKey: ['bundle', bundleId],
    queryFn: async () => {
      const { data } = await supabase.from('bundles').select('*').eq('id', bundleId).single()
      return data as Bundle
    },
    enabled: !!bundleId,
  })

  const { data: bundleExercises = [], isLoading } = useQuery({
    queryKey: ['bundle-exercises', bundleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bundle_exercises').select('*, exercise:exercises(*)')
        .eq('bundle_id', bundleId).order('sort_order')
      return (data ?? []) as BundleExercise[]
    },
    enabled: !!bundleId,
  })

  // Load ghost data
  useEffect(() => {
    if (!profile?.id || !bundleExercises.length) return
    const ghostPref = profile.ghost_preference ?? 'last'
    const exerciseIds = bundleExercises.map(be => be.exercise_id)

    async function loadGhost() {
      const { data: sessions } = await supabase
        .from('sessions_v2').select('id, logged_at')
        .eq('user_id', profile!.id).eq('bundle_id', bundleId!)
        .order('logged_at', { ascending: false })
      if (!sessions?.length) return

      const ghosts: GhostData = {}
      if (ghostPref === 'last') {
        const { data: lastSets } = await supabase
          .from('session_sets').select('exercise_id, weight, reps')
          .eq('session_id', sessions[0].id).in('exercise_id', exerciseIds)
        for (const s of (lastSets ?? []) as { exercise_id: string; weight: number; reps: number }[]) {
          if (!ghosts[s.exercise_id] || (s.weight ?? 0) > (ghosts[s.exercise_id].weight ?? 0))
            ghosts[s.exercise_id] = { weight: s.weight, reps: s.reps }
        }
      } else {
        const { data: allSets } = await supabase
          .from('session_sets').select('exercise_id, weight, reps')
          .in('session_id', sessions.map(s => s.id)).in('exercise_id', exerciseIds)
        for (const s of (allSets ?? []) as { exercise_id: string; weight: number; reps: number }[]) {
          if (!ghosts[s.exercise_id] || (s.weight ?? 0) > (ghosts[s.exercise_id].weight ?? 0))
            ghosts[s.exercise_id] = { weight: s.weight, reps: s.reps }
        }
      }
      setGhostData(ghosts)
    }
    loadGhost()
  }, [bundleExercises, profile, bundleId])

  // Initialize sets from bundle
  useEffect(() => {
    if (!bundleExercises.length) return
    const initial: LocalSet[] = []
    for (const be of bundleExercises) {
      for (let i = 1; i <= be.sets; i++) {
        initial.push({ exercise_id: be.exercise_id, exercise_name: be.exercise?.name ?? '', set_number: i, weight: '', reps: '', done: false })
      }
    }
    setSets(initial)
  }, [bundleExercises])

  // ── Lazy session creation ─────────────────────────────────────────────────
  // Session is only created when hero explicitly finishes OR marks first set done.
  // Opening a bundle NEVER creates a DB record.
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current
    if (!profile?.id || !bundleId || !bundle) {
      console.error('[Session] ensureSession: missing profile/bundleId/bundle', { profileId: profile?.id, bundleId, bundleName: bundle?.name })
      return null
    }
    console.log('[Session] Creating session_v2 for user:', profile.id, 'bundle:', bundleId)
    const { data, error } = await supabase.from('sessions_v2').insert({
      user_id: profile.id,
      bundle_id: bundleId,
      bundle_name: bundle.name,
      logged_at: logDate,
    }).select().single()
    if (error) {
      console.error('[Session] sessions_v2 insert error:', error.message, error.code, error.details)
      throw new Error('Could not create session: ' + error.message)
    }
    console.log('[Session] Created session_v2:', data)
    if (data) sessionIdRef.current = (data as { id: string }).id
    return sessionIdRef.current
  }, [profile, bundleId, bundle])

  const autoSave = useCallback(async (currentSets: LocalSet[], currentNotes: string) => {
    const sessionId = await ensureSession()
    if (!sessionId) return
    const { error: updErr } = await supabase.from('sessions_v2')
      .update({ notes: currentNotes, updated_at: new Date().toISOString() }).eq('id', sessionId)
    if (updErr) console.error('[Session] sessions_v2 update error:', updErr.message)

    const setsToSave = currentSets.filter(s => s.weight || s.reps || s.done)
    const { error: delErr } = await supabase.from('session_sets').delete().eq('session_id', sessionId)
    if (delErr) console.error('[Session] session_sets delete error:', delErr.message)

    if (setsToSave.length) {
      const { error: insErr } = await supabase.from('session_sets').insert(
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
      if (insErr) console.error('[Session] session_sets insert error:', insErr.message, insErr.code, insErr.details)
      else console.log('[Session] Saved', setsToSave.length, 'sets for session', sessionId)
    }
  }, [ensureSession])

  const scheduleAutoSave = useCallback((newSets: LocalSet[], newNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(newSets, newNotes), 3000)
  }, [autoSave])

  const updateSet = (idx: number, field: 'weight' | 'reps' | 'done', value: string | boolean) => {
    setSets(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      // Only schedule auto-save if there's meaningful data (at least one done or filled set)
      const hasData = next.some(s => s.done || s.weight || s.reps)
      if (hasData) scheduleAutoSave(next, notes)
      return next
    })
  }

  const saveSession = useMutation({
    mutationFn: async () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await autoSave(sets, notes)
    },
    onSuccess: () => {
      setSaved(true)
      showToast('success', 'Session saved ✓')
      setTimeout(() => navigate('/hero'), 1200)
    },
    onError: (e: Error) => {
      showToast('error', 'Failed to save session: ' + e.message)
    },
  })

  function getInputColor(set: LocalSet) {
    const ghost = ghostData[set.exercise_id]
    if (!ghost || !set.weight || !ghost.weight) return null
    return parseFloat(set.weight) > ghost.weight ? 'green' : null
  }

  if (isLoading || !bundle) return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size={32} className="text-[#c8ff00]" />
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
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-[10px] border border-[#333] flex items-center justify-center text-[#888] hover:text-white hover:border-[#555] transition-all shrink-0"
        >←</button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: bundle.color }} />
          <div className="min-w-0">
            <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide leading-none truncate">
              {bundle.name}
            </h1>
            {logDate !== new Date().toISOString().slice(0, 10) && (
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
          const ghost = ghostData[be.exercise_id]
          return (
            <div key={be.id} className="ex-card">
              {/* Exercise name */}
              <div className="flex items-start justify-between gap-3 mb-2">
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

              {/* Ghost line */}
              {ghost?.weight ? (
                <p className="ex-ghost">
                  Ghost: {ghost.weight} kg × {ghost.reps} &nbsp;·&nbsp; {profile?.ghost_preference === 'best' ? 'PB' : 'Last'}
                </p>
              ) : (
                <div className="mb-4" />
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
                  const color = getInputColor(set)

                  return (
                    <div key={i} className={`set-row${set.done ? ' done' : ''}`}>
                      <span className="set-num">{set.set_number}</span>

                      {/* KG */}
                      <input
                        type="number" min={0} step={0.5}
                        placeholder={ghost?.weight ? String(ghost.weight) : '—'}
                        value={set.weight}
                        onChange={e => updateSet(globalIdx, 'weight', e.target.value)}
                        className={`set-input${color === 'green' ? ' pr' : set.weight ? ' has-value' : ''}`}
                      />

                      {/* REPS */}
                      <input
                        type="number" min={0}
                        placeholder={ghost?.reps ? String(ghost.reps) : '—'}
                        value={set.reps}
                        onChange={e => updateSet(globalIdx, 'reps', e.target.value)}
                        className={`set-input${set.reps ? ' has-value' : ''}`}
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
          onChange={e => {
            setNotes(e.target.value)
            const hasData = sets.some(s => s.done || s.weight || s.reps)
            if (hasData) scheduleAutoSave(sets, e.target.value)
          }}
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
