import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { NutritionLog, NutritionIngredient, NutritionTotals } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const TODAY = new Date().toISOString().slice(0, 10)

interface AIResult {
  total: NutritionTotals
  breakdown: NutritionIngredient[]
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#888]">{label}</span>
        <span className="font-[DM_Mono]" style={{ color }}>{Math.round(value)}<span className="text-[#555]">/{target}{label === 'Calories' ? ' kcal' : 'g'}</span></span>
      </div>
      <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function HeroNutrition() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const targets = profile?.nutrition_targets
  console.log('[NutritionDebug] HeroNutrition — profile.plan_type:', profile?.plan_type, 'nutrition_targets:', targets)
  const [input, setInput] = useState('')
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [mealName, setMealName] = useState('')
  const [saveFav, setSaveFav] = useState(false)
  const [favName, setFavName] = useState('')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['nutrition-today', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('nutrition_logs').select('*').eq('user_id', profile!.id).eq('logged_at', TODAY).order('created_at')
      return (data ?? []) as NutritionLog[]
    },
    enabled: !!profile?.id,
  })

  const { data: favourites = [] } = useQuery({
    queryKey: ['nutrition-favourites', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('nutrition_logs').select('*').eq('user_id', profile!.id).eq('is_favourite', true).order('created_at')
      return (data ?? []) as NutritionLog[]
    },
    enabled: !!profile?.id,
  })

  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + l.calories,
    protein: acc.protein + l.protein,
    carbs: acc.carbs + l.carbs,
    fats: acc.fats + l.fats,
    fiber: acc.fiber + l.fiber,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 })

  async function analyse() {
    if (!input.trim()) return
    setAnalysing(true)
    setAiError('')
    setAiResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('analyse-nutrition', {
        body: { meal: input },
      })
      if (error) throw error
      setAiResult(data as AIResult)
      setShowLog(true)
    } catch (e) {
      setAiError('Could not analyse meal. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }

  const saveLog = useMutation({
    mutationFn: async () => {
      if (!aiResult) return
      await supabase.from('nutrition_logs').insert({
        user_id: profile!.id,
        logged_at: TODAY,
        meal_name: mealName || input.slice(0, 50),
        raw_text: input,
        calories: aiResult.total.calories,
        protein: aiResult.total.protein,
        carbs: aiResult.total.carbs,
        fats: aiResult.total.fats,
        fiber: aiResult.total.fiber,
        breakdown: aiResult.breakdown,
        is_favourite: saveFav,
        favourite_name: saveFav ? favName : null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition-today', profile?.id] })
      qc.invalidateQueries({ queryKey: ['nutrition-favourites', profile?.id] })
      setInput('')
      setAiResult(null)
      setShowLog(false)
      setMealName('')
      setSaveFav(false)
      setFavName('')
    },
  })

  const addFavourite = useMutation({
    mutationFn: async (fav: NutritionLog) => {
      await supabase.from('nutrition_logs').insert({
        user_id: profile!.id,
        logged_at: TODAY,
        meal_name: fav.favourite_name || fav.meal_name,
        raw_text: fav.raw_text,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fats: fav.fats,
        fiber: fav.fiber,
        breakdown: fav.breakdown,
        is_favourite: false,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-today', profile?.id] }),
  })

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('nutrition_logs').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-today', profile?.id] }),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 13, letterSpacing: 2 }}>LOADING...</p>
    </div>
  )

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div className="pt-4">
        <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">NUTRITION</h1>
        <p className="text-[#555] text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Daily Targets Summary */}
      {targets && (
        <Card className="p-5 space-y-4">
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider">Daily Progress</p>
          <MacroBar label="Calories" value={totals.calories} target={targets.calories} color="#c8ff00" />
          <MacroBar label="Protein" value={totals.protein} target={targets.protein} color="#3d9fff" />
          <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} color="#f59e0b" />
          <MacroBar label="Fats" value={totals.fats} target={targets.fats} color="#a855f7" />
          <div className="border-t border-[#1a1a1a] pt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Cal left', value: Math.max(0, targets.calories - totals.calories), unit: 'kcal', color: '#c8ff00' },
              { label: 'Protein', value: Math.max(0, targets.protein - totals.protein), unit: 'g', color: '#3d9fff' },
              { label: 'Carbs', value: Math.max(0, targets.carbs - totals.carbs), unit: 'g', color: '#f59e0b' },
              { label: 'Fats', value: Math.max(0, targets.fats - totals.fats), unit: 'g', color: '#a855f7' },
            ].map(m => (
              <div key={m.label}>
                <p className="font-[DM_Mono] text-sm" style={{ color: m.color }}>{Math.round(m.value)}{m.unit}</p>
                <p className="text-[#444] text-xs">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Food Logger */}
      <Card className="p-5 space-y-3">
        <p className="text-white font-medium text-sm">Log a Meal</p>
        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. 2 eggs, toast with butter, orange juice..."
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] resize-none text-sm"
        />
        {aiError && <p className="text-[#ff3d3d] text-xs">{aiError}</p>}
        <Button onClick={analyse} disabled={analysing || !input.trim()} className="w-full">
          {analysing ? 'Analysing...' : '🔍 Calculate Nutrition'}
        </Button>
      </Card>

      {/* Favourites */}
      {favourites.length > 0 && (
        <div>
          <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-3">Quick Add — Favourites</p>
          <div className="flex flex-wrap gap-2">
            {favourites.map(fav => (
              <button
                key={fav.id}
                onClick={() => addFavourite.mutate(fav)}
                className="px-3 py-2 bg-[#111] border border-[#222] rounded-[100px] text-sm text-white hover:border-[#c8ff00]/40 transition-all"
              >
                ⚡ {fav.favourite_name || fav.meal_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Meals */}
      <div>
        <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-3">Today's Meals ({logs.length})</p>
        <div className="space-y-2">
          {logs.map(log => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{log.meal_name || log.raw_text}</p>
                  <div className="flex gap-3 mt-1.5 font-[DM_Mono] text-xs">
                    <span className="text-[#c8ff00]">{Math.round(log.calories)}kcal</span>
                    <span className="text-[#3d9fff]">P{Math.round(log.protein)}g</span>
                    <span className="text-[#f59e0b]">C{Math.round(log.carbs)}g</span>
                    <span className="text-[#a855f7]">F{Math.round(log.fats)}g</span>
                  </div>
                </div>
                <button onClick={() => deleteMeal.mutate(log.id)} className="text-[#444] hover:text-[#ff3d3d] text-sm ml-2 shrink-0">✕</button>
              </div>
            </Card>
          ))}
          {logs.length === 0 && <p className="text-[#333] text-sm">No meals logged today.</p>}
        </div>
      </div>

      {/* AI Result Modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Nutrition Breakdown">
        {aiResult && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calories', value: `${Math.round(aiResult.total.calories)} kcal`, color: '#c8ff00' },
                { label: 'Protein', value: `${Math.round(aiResult.total.protein)}g`, color: '#3d9fff' },
                { label: 'Carbs', value: `${Math.round(aiResult.total.carbs)}g`, color: '#f59e0b' },
                { label: 'Fats', value: `${Math.round(aiResult.total.fats)}g`, color: '#a855f7' },
              ].map(m => (
                <div key={m.label} className="bg-[#1a1a1a] rounded-[12px] p-3 text-center">
                  <p className="font-[Bebas_Neue] text-2xl" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[#555] text-xs">{m.label}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Breakdown</p>
              <div className="space-y-1.5">
                {aiResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[#1a1a1a] rounded-[8px] px-3 py-2">
                    <span className="text-white">{item.item} <span className="text-[#555]">({item.amount})</span></span>
                    <span className="text-[#c8ff00] font-[DM_Mono]">{Math.round(item.calories)} kcal</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#888]">Meal Name (optional)</label>
                <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder={input.slice(0, 40)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] text-sm" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setSaveFav(!saveFav)}
                  className={`w-5 h-5 rounded-[4px] border transition-all flex items-center justify-center ${saveFav ? 'bg-[#c8ff00] border-[#c8ff00]' : 'border-[#444]'}`}>
                  {saveFav && <span className="text-[#080808] text-xs font-bold">✓</span>}
                </div>
                <span className="text-[#888] text-sm">Save as favourite</span>
              </label>
              {saveFav && (
                <input value={favName} onChange={e => setFavName(e.target.value)} placeholder="Favourite name..."
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00] text-sm" />
              )}
            </div>

            <Button className="w-full" onClick={() => saveLog.mutate()} disabled={saveLog.isPending}>
              {saveLog.isPending ? 'Saving...' : 'Add to Log'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
