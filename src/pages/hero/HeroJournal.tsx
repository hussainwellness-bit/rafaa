import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { JournalLog, SleepQuality, Mood, Soreness, CardioType } from '../../types'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

const TODAY = new Date().toISOString().slice(0, 10)

const SLEEP_OPTS: { value: SleepQuality; label: string; emoji: string }[] = [
  { value: 'deep', label: 'Deep', emoji: '😴' },
  { value: 'normal', label: 'Normal', emoji: '🛌' },
  { value: 'light', label: 'Light', emoji: '😪' },
  { value: 'broken', label: 'Broken', emoji: '😫' },
]

const MOOD_OPTS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'pumped', label: 'Pumped', emoji: '🔥' },
  { value: 'good', label: 'Good', emoji: '😊' },
  { value: 'normal', label: 'Normal', emoji: '😐' },
  { value: 'tired', label: 'Tired', emoji: '😓' },
  { value: 'exhausted', label: 'Exhausted', emoji: '💀' },
]

const SORENESS_OPTS: { value: Soreness; label: string; emoji: string }[] = [
  { value: 'none', label: 'None', emoji: '✅' },
  { value: 'light', label: 'Light', emoji: '😊' },
  { value: 'moderate', label: 'Moderate', emoji: '🔥' },
  { value: 'heavy', label: 'Heavy', emoji: '💀' },
]

const CARDIO_TYPES: CardioType[] = ['Stairs', 'Elliptical', 'Cycling', 'HIIT', 'Running', 'Other']

function PillSelector<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; emoji: string }[]
  value?: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{ minHeight: 44 }}
          className={`px-5 py-2.5 rounded-[100px] text-[15px] font-semibold border transition-all flex items-center gap-2 ${
            value === o.value
              ? 'bg-[rgba(200,255,0,0.08)] border-[#c8ff00] text-[#c8ff00]'
              : 'border-[#333] text-[#666] hover:border-[#555] hover:text-[#aaa]'
          }`}
        >
          <span className="text-base">{o.emoji}</span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function HeroJournal() {
  const { profile } = useAuthStore()
  const config = profile?.journal_config
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [logId, setLogId] = useState<string | null>(null)
  // localChanges holds only what the user has typed this session
  // merging with dbLog gives the full state without losing data on tab switch
  const [localChanges, setLocalChanges] = useState<Partial<JournalLog>>({})

  // Fetch today's log — staleTime: Infinity so cached data is used on tab return
  const { data: dbLog, isLoading } = useQuery({
    queryKey: ['journal-today', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('journal_logs').select('*')
        .eq('user_id', profile!.id).eq('logged_at', TODAY).single()
      return data as JournalLog | null
    },
    enabled: !!profile?.id,
    staleTime: Infinity, // Don't re-fetch while navigating tabs
    retry: false,
  })

  // Sync logId from DB when it loads
  useEffect(() => {
    if (dbLog?.id) setLogId(dbLog.id)
  }, [dbLog?.id])

  // Merged view: DB data as base, local changes on top
  const log: Partial<JournalLog> = { ...dbLog, ...localChanges }

  const set = <K extends keyof JournalLog>(k: K, v: JournalLog[K]) => {
    setLocalChanges(prev => {
      const next = { ...prev, [k]: v }
      scheduleSave({ ...dbLog, ...next })
      return next
    })
  }

  function scheduleSave(data: Partial<JournalLog>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persist(data), 800)
  }

  async function persist(data: Partial<JournalLog>) {
    const payload = { ...data, user_id: profile!.id, logged_at: TODAY }
    if (logId) {
      await supabase.from('journal_logs').update(payload).eq('id', logId)
    } else {
      const { data: inserted } = await supabase.from('journal_logs').insert(payload).select().single()
      if (inserted) setLogId((inserted as JournalLog).id)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="p-5 max-w-lg mx-auto space-y-5">
      <div className="pt-4">
        <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">JOURNAL</h1>
        <p className="text-[#888] text-[15px]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <p className="text-[#333] text-sm mt-1">Auto-saves as you go</p>
      </div>

      {/* Steps */}
      {config?.steps && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Steps</p>
              <p className="text-[#555] text-sm">Target: {profile?.steps_target?.toLocaleString() ?? '10,000'} steps</p>
            </div>
            <button
              onClick={() => set('steps_done', !log.steps_done)}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg transition-all ${log.steps_done ? 'bg-[#c8ff00] border-[#c8ff00] text-[#080808]' : 'border-[#333] text-[#444]'}`}
            >
              {log.steps_done ? '✓' : ''}
            </button>
          </div>
        </Card>
      )}

      {/* Sleep */}
      {config?.sleep && (
        <Card className="p-6 space-y-4">
          <p className="text-white font-semibold">Sleep</p>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={24} step={0.5}
              placeholder="7.5"
              value={log.sleep_hours ?? ''}
              onChange={e => set('sleep_hours', parseFloat(e.target.value) || undefined)}
              className="w-24 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white text-center focus:outline-none focus:border-[#c8ff00] font-[DM_Mono] text-[15px]"
            />
            <span className="text-[#555]">hours</span>
          </div>
          <PillSelector options={SLEEP_OPTS} value={log.sleep_quality} onChange={v => set('sleep_quality', v)} />
        </Card>
      )}

      {/* Cardio */}
      {config?.cardio && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold">Cardio</p>
            <button
              onClick={() => set('cardio_done', !log.cardio_done)}
              className={`px-4 py-2 rounded-[100px] text-[15px] border transition-all ${log.cardio_done ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]' : 'border-[#333] text-[#555]'}`}
            >
              {log.cardio_done ? 'Done ✓' : 'Mark Done'}
            </button>
          </div>
          {log.cardio_done && (
            <>
              <div className="flex flex-wrap gap-2">
                {CARDIO_TYPES.map(ct => (
                  <button key={ct} onClick={() => set('cardio_type', ct as CardioType)}
                    className={`px-4 py-2 rounded-[100px] text-[15px] border transition-all ${log.cardio_type === ct ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]' : 'border-[#333] text-[#555]'}`}>
                    {ct}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="number" min={0} placeholder="30"
                  value={log.cardio_duration ?? ''}
                  onChange={e => set('cardio_duration', parseInt(e.target.value) || undefined)}
                  className="w-24 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white text-center focus:outline-none focus:border-[#c8ff00] font-[DM_Mono] text-[15px]"
                />
                <span className="text-[#555]">minutes</span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Water */}
      {config?.water && (
        <Card className="p-6 space-y-4">
          <p className="text-white font-semibold">Water</p>
          <div className="flex items-center gap-6">
            <button onClick={() => set('water_glasses', Math.max(0, (log.water_glasses ?? 0) - 1))}
              className="w-12 h-12 rounded-full border border-[#333] text-[#888] hover:border-[#555] hover:text-white transition-all text-2xl">
              −
            </button>
            <div className="text-center">
              <span className="font-[Bebas_Neue] text-5xl text-white">{log.water_glasses ?? 0}</span>
              <p className="text-[#555] text-sm">/ 8 glasses</p>
            </div>
            <button onClick={() => set('water_glasses', Math.min(20, (log.water_glasses ?? 0) + 1))}
              className="w-12 h-12 rounded-full border border-[#c8ff00]/30 text-[#c8ff00] hover:bg-[#c8ff00]/10 transition-all text-2xl">
              +
            </button>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i < (log.water_glasses ?? 0) ? 'bg-[#3d9fff]' : 'bg-[#222]'}`} />
            ))}
          </div>
        </Card>
      )}

      {/* Body Weight */}
      {config?.body_weight && (
        <Card className="p-6 space-y-3">
          <p className="text-white font-semibold">Body Weight</p>
          <div className="flex items-center gap-3">
            <input type="number" min={0} step={0.1} placeholder="75.0"
              value={log.body_weight ?? ''}
              onChange={e => set('body_weight', parseFloat(e.target.value) || undefined)}
              className="w-28 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white text-center focus:outline-none focus:border-[#c8ff00] font-[DM_Mono] text-[15px]"
            />
            <span className="text-[#555]">kg</span>
          </div>
        </Card>
      )}

      {/* Mood */}
      {config?.mood && (
        <Card className="p-6 space-y-4">
          <p className="text-white font-semibold">Mood</p>
          <PillSelector options={MOOD_OPTS} value={log.mood} onChange={v => set('mood', v)} />
        </Card>
      )}

      {/* Soreness */}
      {config?.soreness && (
        <Card className="p-6 space-y-4">
          <p className="text-white font-semibold">Soreness</p>
          <PillSelector options={SORENESS_OPTS} value={log.soreness} onChange={v => set('soreness', v)} />
        </Card>
      )}

      {/* Notes */}
      <Card className="p-6 space-y-3">
        <p className="text-white font-semibold">Notes</p>
        <textarea rows={3} placeholder="How was your day?"
          value={log.notes ?? ''}
          onChange={e => set('notes', e.target.value)}
          className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] resize-none text-[15px]"
        />
      </Card>
    </div>
  )
}
