import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Bundle, BundleExercise, Profile } from '../../types'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

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

const COL = '32px 1fr 1fr 52px'
const INPUT_H = 56
const INPUT_FS = 18

export default function CoachLogForHero() {
  const { heroId, bundleId } = useParams<{ heroId: string; bundleId: string }>()
  const navigate = useNavigate()
  const sessionIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sets, setSets] = useState<LocalSet[]>([])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [ghostData, setGhostData] = useState<GhostData>({})

  const { data: hero } = useQuery({
    queryKey: ['hero-profile', heroId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name, ghost_preference').eq('id', heroId!).single()
      return data as Pick<Profile, 'full_name' | 'ghost_preference'>
    },
    enabled: !!heroId,
  })

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

  // Load ghost data from hero's previous sessions
  useEffect(() => {
    if (!heroId || !bundleExercises.length) return
    const ghostPref = hero?.ghost_preference ?? 'last'
    const exerciseIds = bundleExercises.map(be => be.exercise_id)

    async function loadGhost() {
      const { data: sessions } = await supabase
        .from('sessions').select('id, logged_at')
        .eq('user_id', heroId!).eq('bundle_id', bundleId!)
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
  }, [bundleExercises, hero, heroId, bundleId])

  // Initialize sets
  useEffect(() => {
    if (!bundleExercises.length) return
    const initial: LocalSet[] = []
    for (const be of bundleExercises) {
      for (let i = 1; i <= be.sets; i++) {
        initial.push({
          exercise_id: be.exercise_id,
          exercise_name: be.exercise?.name ?? '',
          set_number: i,
          weight: '', reps: '', done: false,
        })
      }
    }
    setSets(initial)
  }, [bundleExercises])

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current
    if (!heroId || !bundleId || !bundle) return null
    const { data } = await supabase.from('sessions').insert({
      user_id: heroId,
      bundle_id: bundleId,
      bundle_name: bundle.name,
      logged_at: new Date().toISOString().slice(0, 10),
    }).select().single()
    if (data) sessionIdRef.current = (data as { id: string }).id
    return sessionIdRef.current
  }, [heroId, bundleId, bundle])

  const autoSave = useCallback(async (currentSets: LocalSet[], currentNotes: string) => {
    const sessionId = await ensureSession()
    if (!sessionId) return
    await supabase.from('sessions')
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

  const scheduleAutoSave = useCallback((newSets: LocalSet[], newNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(newSets, newNotes), 3000)
  }, [autoSave])

  const updateSet = (idx: number, field: 'weight' | 'reps' | 'done', value: string | boolean) => {
    setSets(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
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
      setTimeout(() => navigate(`/coach/heroes/${heroId}`), 1200)
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

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button
          onClick={() => navigate(`/coach/heroes/${heroId}`)}
          className="w-10 h-10 rounded-full border border-[#333] flex items-center justify-center text-[#888] hover:text-white hover:border-[#555] transition-all shrink-0"
        >←</button>
        <div className="flex items-start flex-col min-w-0">
          <p className="text-[#555] text-xs font-semibold uppercase tracking-wide">
            Logging for: {hero?.full_name ?? '…'}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: bundle.color }} />
            <h1 className="font-[Bebas_Neue] text-3xl text-white tracking-wide leading-none truncate">
              {bundle.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Exercise cards */}
      <div className="px-5 space-y-4 mt-2">
        {exerciseGroups.map(({ be, sets: exSets }) => {
          const ghost = ghostData[be.exercise_id]
          return (
            <div key={be.id} className="rounded-[16px] border border-[#222] bg-[#111]" style={{ padding: 20 }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-white font-bold leading-snug" style={{ fontSize: 18 }}>
                  {be.exercise?.name}
                </p>
                {be.exercise?.video_url && (
                  <a href={be.exercise.video_url} target="_blank" rel="noreferrer"
                    className="shrink-0 text-sm text-[#3d9fff] border border-[#3d9fff]/30 px-3 py-1.5 rounded-[100px] hover:bg-[#3d9fff]/10 transition-all">
                    ▶ Video
                  </a>
                )}
              </div>

              {ghost?.weight ? (
                <p className="text-[#444] text-sm font-[DM_Mono] mb-4">
                  Ghost: {ghost.weight} kg × {ghost.reps} &nbsp;·&nbsp; {hero?.ghost_preference === 'best' ? 'PB' : 'Last'}
                </p>
              ) : (
                <div className="mb-4" />
              )}

              <div className="grid gap-2 mb-1 px-1" style={{ gridTemplateColumns: COL }}>
                <span className="text-[#444] text-xs font-semibold text-center uppercase tracking-wider">#</span>
                <span className="text-[#555] text-xs font-semibold text-center uppercase tracking-wider">KG</span>
                <span className="text-[#555] text-xs font-semibold text-center uppercase tracking-wider">REPS</span>
                <span className="text-[#444] text-xs text-center">✓</span>
              </div>

              <div className="space-y-2">
                {exSets.map((set, i) => {
                  const globalIdx = sets.indexOf(set)
                  const color = getInputColor(set)
                  const inputBorder = color === 'green' ? '#22c55e' : '#2a2a2a'
                  const inputText = set.weight || set.reps ? '#ffffff' : undefined

                  return (
                    <div
                      key={i}
                      className={`grid gap-2 items-center px-1 rounded-[10px] transition-all ${set.done ? 'bg-[#c8ff00]/5' : ''}`}
                      style={{ gridTemplateColumns: COL, paddingTop: 4, paddingBottom: 4 }}
                    >
                      <span className="text-[#555] font-[DM_Mono] text-center" style={{ fontSize: 15 }}>
                        {set.set_number}
                      </span>
                      <input
                        type="number" min={0} step={0.5}
                        placeholder={ghost?.weight ? String(ghost.weight) : '—'}
                        value={set.weight}
                        onChange={e => updateSet(globalIdx, 'weight', e.target.value)}
                        className="w-full rounded-[10px] text-center font-[DM_Mono] focus:outline-none transition-colors"
                        style={{
                          height: INPUT_H, fontSize: INPUT_FS,
                          background: '#1e1e1e', border: `1px solid ${inputBorder}`,
                          color: color === 'green' ? '#22c55e' : (inputText ?? '#666'),
                        }}
                      />
                      <input
                        type="number" min={0}
                        placeholder={ghost?.reps ? String(ghost.reps) : '—'}
                        value={set.reps}
                        onChange={e => updateSet(globalIdx, 'reps', e.target.value)}
                        className="w-full rounded-[10px] text-center font-[DM_Mono] focus:outline-none transition-colors"
                        style={{
                          height: INPUT_H, fontSize: INPUT_FS,
                          background: '#1e1e1e', border: `1px solid ${inputBorder}`,
                          color: inputText ?? '#666',
                        }}
                      />
                      <button
                        onClick={() => updateSet(globalIdx, 'done', !set.done)}
                        className="rounded-[10px] flex items-center justify-center font-bold transition-all"
                        style={{
                          width: 52, height: INPUT_H, fontSize: 20,
                          background: set.done ? '#c8ff00' : '#1e1e1e',
                          border: `1px solid ${set.done ? '#c8ff00' : '#2a2a2a'}`,
                          color: set.done ? '#080808' : '#444',
                        }}
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
          placeholder="How did the session go?"
          className="w-full px-5 py-4 bg-[#111] border border-[#222] rounded-[14px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] resize-none"
          style={{ fontSize: 15 }}
        />
      </div>

      {/* Finish */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pt-8 pb-6 bg-gradient-to-t from-[#080808] via-[#080808]/90 to-transparent">
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
