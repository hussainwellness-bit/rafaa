import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Exercise } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Lats', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Full Body',
]

const EMPTY: Partial<Exercise> = { name: '', muscle_groups: [], kind: 'Compound', video_url: '', instructions: '' }

// ─── Quick Video Edit ─────────────────────────────────────────────────────────

function VideoCell({ ex, onSaved }: { ex: Exercise; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(ex.video_url ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setUrl(ex.video_url ?? '') }, [ex.video_url])

  async function save() {
    setSaving(true)
    await supabase.from('exercises').update({ video_url: url || null }).eq('id', ex.id)
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://..."
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-48 px-2 py-1 bg-[#1e1e1e] border border-[#c8ff00]/40 rounded-[6px] text-white text-xs focus:outline-none"
        />
        <button onClick={save} disabled={saving}
          className="text-xs text-[#c8ff00] px-2 py-1 border border-[#c8ff00]/30 rounded-[6px] hover:bg-[#c8ff00]/10">
          {saving ? '…' : '✓'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-[#555] px-1">✕</button>
      </div>
    )
  }

  if (ex.video_url) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={ex.video_url} target="_blank" rel="noreferrer"
          className="text-xs text-[#3d9fff] border border-[#3d9fff]/30 px-2.5 py-1 rounded-[100px] hover:bg-[#3d9fff]/10 transition-all"
        >
          ▶ Video
        </a>
        <button onClick={() => setEditing(true)}
          className="text-[#555] hover:text-white text-xs transition-colors" title="Edit video URL">
          ✎
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-xs text-[#444] border border-[#2a2a2a] px-2.5 py-1 rounded-[100px] hover:border-[#555] hover:text-[#aaa] transition-all"
    >
      + Video
    </button>
  )
}

// ─── Exercise Form ────────────────────────────────────────────────────────────

function ExerciseForm({ initial, onSubmit, loading, error }: {
  initial?: Partial<Exercise>
  onSubmit: (data: Partial<Exercise>) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState<Partial<Exercise>>(initial ?? EMPTY)

  useEffect(() => { setForm(initial ?? EMPTY) }, [initial])

  const setField = (k: keyof Exercise, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleMuscle = (m: string) => {
    const current = form.muscle_groups ?? []
    setField('muscle_groups', current.includes(m) ? current.filter(x => x !== m) : [...current, m])
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <Input label="Exercise Name" required value={form.name ?? ''} onChange={e => setField('name', e.target.value)} />
      <Select
        label="Kind"
        value={form.kind ?? 'Compound'}
        onChange={e => setField('kind', e.target.value)}
        options={[{ value: 'Compound', label: 'Compound' }, { value: 'Isolation', label: 'Isolation' }]}
      />
      <div>
        <label className="text-sm text-[#aaa] font-medium block mb-2">Muscle Groups</label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map(m => (
            <button key={m} type="button" onClick={() => toggleMuscle(m)}
              className={`px-3 py-1 rounded-[100px] text-xs border transition-all ${
                form.muscle_groups?.includes(m)
                  ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]'
                  : 'border-[#2a2a2a] text-[#555] hover:border-[#555]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-[#aaa] font-medium">Video URL</label>
        <input
          value={form.video_url ?? ''}
          onChange={e => setField('video_url', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[12px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#c8ff00] text-[15px]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-[#aaa] font-medium">Instructions</label>
        <textarea rows={3} value={form.instructions ?? ''} onChange={e => setField('instructions', e.target.value)}
          className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[12px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#c8ff00] resize-none" />
      </div>
      {error && <p className="text-[#ff3d3d] text-sm">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Save Exercise'}
      </Button>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminExercises() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editEx, setEditEx] = useState<Exercise | null>(null)
  const [formError, setFormError] = useState('')

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await supabase.from('exercises').select('*').order('name')
      return (data ?? []) as Exercise[]
    },
  })

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_groups?.some(m => m.toLowerCase().includes(search.toLowerCase()))
  )

  const upsertEx = useMutation({
    mutationFn: async (data: Partial<Exercise>) => {
      if (editEx) {
        const { error } = await supabase.from('exercises').update(data).eq('id', editEx.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exercises').insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] })
      setShowAdd(false)
      setEditEx(null)
      setFormError('')
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const deleteEx = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('exercises').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Exercise Library</h2>
          <p className="text-[#555] text-sm mt-1">{exercises.length} exercises</p>
        </div>
        <Button onClick={() => { setEditEx(null); setShowAdd(true) }}>+ Add Exercise</Button>
      </div>

      <input
        type="text"
        placeholder="Search exercises or muscle groups..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-[12px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#c8ff00]"
      />

      <div className="grid gap-2">
        {filtered.map(ex => (
          <Card key={ex.id} className="p-4 flex items-center gap-4">
            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">{ex.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={ex.kind === 'Compound' ? 'purple' : 'blue'} size="sm">{ex.kind}</Badge>
                {ex.muscle_groups?.slice(0, 3).map(m => (
                  <Badge key={m} variant="muted" size="sm">{m}</Badge>
                ))}
                {(ex.muscle_groups?.length ?? 0) > 3 && (
                  <Badge variant="muted" size="sm">+{(ex.muscle_groups?.length ?? 0) - 3}</Badge>
                )}
              </div>
            </div>

            {/* Video cell — inline quick edit */}
            <VideoCell ex={ex} onSaved={() => qc.invalidateQueries({ queryKey: ['exercises'] })} />

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setEditEx(ex); setShowAdd(true) }}
                className="text-xs text-[#555] hover:text-white px-3 py-1.5 border border-[#2a2a2a] rounded-[100px] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { if (confirm('Delete this exercise?')) deleteEx.mutate(ex.id) }}
                className="text-xs text-[#ff3d3d]/60 hover:text-[#ff3d3d] px-3 py-1.5 border border-[#ff3d3d]/20 rounded-[100px] transition-colors"
              >
                Del
              </button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-[#555]">No exercises match your search.</p>
          </Card>
        )}
      </div>

      <Modal
        open={showAdd || !!editEx}
        onClose={() => { setShowAdd(false); setEditEx(null); setFormError('') }}
        title={editEx ? 'Edit Exercise' : 'Add Exercise'}
      >
        <ExerciseForm
          initial={editEx ?? EMPTY}
          onSubmit={data => upsertEx.mutate(data)}
          loading={upsertEx.isPending}
          error={formError}
        />
      </Modal>
    </div>
  )
}
