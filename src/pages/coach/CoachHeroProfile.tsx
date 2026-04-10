import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Profile, Bundle, BundleExercise, Exercise, PlanSchedule, PlanType, PlanBilling, Goal, GhostPreference, JournalConfig, ExerciseKind } from '../../types'
import { DAY_NAMES, PLAN_PRICES } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import Toast, { useToast } from '../../components/ui/Toast'
import Spinner from '../../components/ui/Spinner'

// ─── Types & helpers ──────────────────────────────────────────────────────────

interface HeroEditForm {
  full_name: string; email: string; phone: string
  date_of_birth: string; gender: string; notes: string
  plan_type: PlanType; plan_billing: PlanBilling
  plan_start: string; plan_end: string; is_active: boolean
  goal: Goal
  start_weight: string; target_weight: string; height: string
  journal_config: JournalConfig; steps_target: string
  nutrition_calories: string; nutrition_protein: string
  nutrition_carbs: string; nutrition_fats: string
  ghost_preference: GhostPreference; is_physical: boolean
}

const DEFAULT_JOURNAL_CONFIG: JournalConfig = {
  steps: true, sleep: true, cardio: true, water: true, body_weight: true, mood: true, soreness: true,
}

function heroToForm(h: Profile): HeroEditForm {
  // nutrition_targets is JSONB — read it as a plain record to handle any null/missing keys
  const nt = h.nutrition_targets as Record<string, number | null | undefined> | null | undefined
  console.log('[NutritionDebug] CoachHeroProfile heroToForm — plan_type:', h.plan_type, 'raw nutrition_targets:', h.nutrition_targets, 'parsed nt:', nt)
  return {
    full_name: h.full_name ?? '',
    email: h.email ?? '',
    phone: h.phone ?? '',
    date_of_birth: h.date_of_birth ?? '',
    gender: h.gender ?? '',
    notes: h.notes ?? '',
    plan_type: h.plan_type ?? 'A',
    plan_billing: h.plan_billing ?? 'monthly',
    plan_start: h.plan_start ?? '',
    plan_end: h.plan_end ?? '',
    is_active: h.is_active ?? true,
    goal: h.goal ?? 'cutting',
    start_weight: h.start_weight?.toString() ?? '',
    target_weight: h.target_weight?.toString() ?? '',
    height: h.height?.toString() ?? '',
    journal_config: h.journal_config ?? DEFAULT_JOURNAL_CONFIG,
    steps_target: h.steps_target?.toString() ?? '10000',
    nutrition_calories: nt?.calories != null ? String(nt.calories) : '',
    nutrition_protein:  nt?.protein  != null ? String(nt.protein)  : '',
    nutrition_carbs:    nt?.carbs    != null ? String(nt.carbs)    : '',
    nutrition_fats:     nt?.fats     != null ? String(nt.fats)     : '',
    ghost_preference: h.ghost_preference ?? 'last',
    is_physical: h.is_physical ?? false,
  }
}

function calcPlanEnd(start: string, billing: PlanBilling): string {
  if (!start) return ''
  const d = new Date(start)
  if (billing === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (billing === 'semi_annual') d.setMonth(d.getMonth() + 6)
  else d.setFullYear(d.getFullYear() + 1)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`${!last ? 'border-b border-[#1a1a1a] pb-6 mb-6' : 'pb-4'}`}>
      <p className="text-[#888] text-xs font-bold uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  )
}

// ─── Edit Hero Panel ──────────────────────────────────────────────────────────

function EditHeroPanel({ hero, open, onClose, showToast }: {
  hero: Profile
  open: boolean
  onClose: () => void
  showToast: (type: 'success' | 'error', message: string) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<HeroEditForm>(() => heroToForm(hero))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const f = heroToForm(hero)
      console.log('[EditHeroPanel] open — hero.plan_type:', hero.plan_type, '→ form.plan_type:', f.plan_type, '| nutrition_targets:', hero.nutrition_targets)
      setForm(f)
    }
  }, [hero.id, hero.plan_type, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof HeroEditForm>(k: K, v: HeroEditForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const journalFields: (keyof JournalConfig)[] = ['sleep', 'cardio', 'water', 'body_weight', 'mood', 'soreness']
  const showJournal = form.plan_type === 'B' || form.plan_type === 'C' || hero.plan_type === 'B' || hero.plan_type === 'C'
  const showNutrition = form.plan_type === 'C' || hero.plan_type === 'C'

  async function save() {
    setSaving(true)
    try {
      // Re-derive showNutrition from current form state inside save to avoid stale closure
      const isPlanC = form.plan_type === 'C'
      const nutritionPayload = isPlanC ? {
        calories: Number(form.nutrition_calories) || 0,
        protein:  Number(form.nutrition_protein)  || 0,
        carbs:    Number(form.nutrition_carbs)    || 0,
        fats:     Number(form.nutrition_fats)     || 0,
      } : null

      console.log('[EditHero] saving — plan_type:', form.plan_type, 'nutrition_targets:', nutritionPayload)

      const { error } = await supabase.from('profiles').update({
        full_name:         form.full_name,
        email:             form.email || null,
        phone:             form.phone || null,
        date_of_birth:     form.date_of_birth || null,
        gender:            form.gender || null,
        notes:             form.notes || null,
        plan_type:         form.plan_type,
        plan_billing:      form.plan_billing,
        plan_start:        form.plan_start || null,
        plan_end:          form.plan_end || null,
        is_active:         form.is_active,
        goal:              form.goal,
        start_weight:      parseFloat(form.start_weight) || null,
        target_weight:     parseFloat(form.target_weight) || null,
        height:            parseFloat(form.height) || null,
        journal_config:    form.journal_config,
        steps_target:      parseInt(form.steps_target) || 10000,
        nutrition_targets: nutritionPayload,
        ghost_preference:  form.ghost_preference,
        is_physical:       form.is_physical,
      }).eq('id', hero.id)

      if (error) {
        console.error('[EditHero] save error:', error.message, error.code)
        throw new Error(error.message)
      }

      console.log('[EditHero] save OK')
      qc.invalidateQueries({ queryKey: ['hero-profile', hero.id] })
      qc.invalidateQueries({ queryKey: ['coach-heroes'] })
      showToast('success', 'Hero updated ✓')
      onClose()
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Edit Hero"
      subtitle={hero.full_name}
    >
      <div className="px-6 py-6 space-y-0">
        {/* PERSONAL INFO */}
        <Section title="Personal Info">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={form.full_name} onChange={e => set('full_name', e.target.value)} className="col-span-2" />
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Email</label>
              <input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                disabled={hero.is_physical}
                title={hero.is_physical ? 'Physical hero — no login' : undefined}
                className={`w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-[15px] font-[DM_Mono] focus:outline-none focus:border-[#c8ff00] transition-colors ${hero.is_physical ? 'opacity-40 cursor-not-allowed text-[#555]' : 'text-white'}`}
              />
              {hero.is_physical && <p className="text-xs text-[#444]">Physical hero — no app login</p>}
            </div>
            <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Gender</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] focus:outline-none focus:border-[#c8ff00]"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Internal Notes</label>
              <textarea
                rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full px-5 py-3 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none"
              />
            </div>
          </div>
        </Section>

        {/* PLAN DETAILS */}
        <Section title="Plan Details">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Plan Type</label>
              <select value={form.plan_type} onChange={e => set('plan_type', e.target.value as PlanType)}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] focus:outline-none focus:border-[#c8ff00]">
                <option value="A">Plan A — Fixed Tracker</option>
                <option value="B">Plan B — Tracker + Journal</option>
                <option value="C">Plan C — Ultimate</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Billing Cycle</label>
              <select
                value={form.plan_billing}
                onChange={e => {
                  const billing = e.target.value as PlanBilling
                  setForm(f => ({ ...f, plan_billing: billing, plan_end: calcPlanEnd(f.plan_start, billing) }))
                }}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] focus:outline-none focus:border-[#c8ff00]"
              >
                <option value="monthly">Monthly — {PLAN_PRICES[form.plan_type].monthly} SAR</option>
                <option value="semi_annual">6 Months — {PLAN_PRICES[form.plan_type].semi_annual} SAR</option>
                <option value="annual">Annual — {PLAN_PRICES[form.plan_type].annual} SAR</option>
              </select>
            </div>
            <Input label="Plan Start" type="date" value={form.plan_start}
              onChange={e => setForm(f => ({ ...f, plan_start: e.target.value, plan_end: calcPlanEnd(e.target.value, f.plan_billing) }))} />
            <Input label="Plan End" type="date" value={form.plan_end} onChange={e => set('plan_end', e.target.value)} />
            <div className="col-span-2 flex items-center justify-between py-3 px-4 bg-[#1a1a1a] rounded-[12px] border border-[#333]">
              <div>
                <p className="text-white text-sm font-semibold">Active Status</p>
                <p className="text-[#555] text-xs mt-0.5">{form.is_active ? 'Hero can access the app' : 'Hero is deactivated'}</p>
              </div>
              <button
                onClick={() => set('is_active', !form.is_active)}
                className={`w-12 h-6 rounded-full transition-all relative ${form.is_active ? 'bg-[#c8ff00]' : 'bg-[#333]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </Section>

        {/* BODY & GOALS */}
        <Section title="Body & Goals">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Goal</label>
              <select value={form.goal} onChange={e => set('goal', e.target.value as Goal)}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] focus:outline-none focus:border-[#c8ff00]">
                <option value="cutting">Cutting</option>
                <option value="bulking">Bulking</option>
                <option value="maintenance">Maintenance</option>
                <option value="recomp">Recomp</option>
              </select>
            </div>
            <Input label="Height (cm)" type="number" value={form.height} onChange={e => set('height', e.target.value)} />
            <Input label="Start Weight (kg)" type="number" step={0.1} value={form.start_weight} onChange={e => set('start_weight', e.target.value)} />
            <Input label="Target Weight (kg)" type="number" step={0.1} value={form.target_weight} onChange={e => set('target_weight', e.target.value)} />
          </div>
        </Section>

        {/* JOURNAL CONFIG */}
        <Section title="Journal Config">
          {!showJournal ? (
            <p className="text-[#444] text-sm">Available on Plan B and C only. Upgrade the plan to enable journal tracking.</p>
          ) : (
            <div className="space-y-3">
              {/* Steps — special: has a steps target input */}
              <div className="flex items-center justify-between py-2.5 px-4 bg-[#1a1a1a] rounded-[10px] border border-[#222]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => set('journal_config', { ...form.journal_config, steps: !form.journal_config.steps })}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${form.journal_config.steps ? 'bg-[#c8ff00]' : 'bg-[#333]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.journal_config.steps ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-white text-sm">Steps</span>
                </div>
                {form.journal_config.steps && (
                  <input
                    type="number"
                    value={form.steps_target}
                    onChange={e => set('steps_target', e.target.value)}
                    placeholder="10000"
                    className="w-28 px-3 py-1.5 bg-[#111] border border-[#333] rounded-[8px] text-white text-sm text-center font-[DM_Mono] focus:outline-none focus:border-[#c8ff00]"
                  />
                )}
              </div>

              {/* Other journal fields */}
              {journalFields.map(field => (
                <div key={field} className="flex items-center justify-between py-2.5 px-4 bg-[#1a1a1a] rounded-[10px] border border-[#222]">
                  <span className="text-white text-sm capitalize">{field.replace('_', ' ')}</span>
                  <button
                    onClick={() => set('journal_config', { ...form.journal_config, [field]: !form.journal_config[field] })}
                    className={`w-10 h-5 rounded-full transition-all relative ${form.journal_config[field] ? 'bg-[#c8ff00]' : 'bg-[#333]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.journal_config[field] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* NUTRITION TARGETS — always show inputs, gated only by plan type */}
        <Section title="Nutrition Targets">
          {showNutrition ? (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Calories (kcal)" type="number" min={0} step={1}
                value={form.nutrition_calories}
                onChange={e => set('nutrition_calories', e.target.value)}
                placeholder="e.g. 2000" />
              <Input label="Protein (g)" type="number" min={0} step={1}
                value={form.nutrition_protein}
                onChange={e => set('nutrition_protein', e.target.value)}
                placeholder="e.g. 150" />
              <Input label="Carbs (g)" type="number" min={0} step={1}
                value={form.nutrition_carbs}
                onChange={e => set('nutrition_carbs', e.target.value)}
                placeholder="e.g. 200" />
              <Input label="Fats (g)" type="number" min={0} step={1}
                value={form.nutrition_fats}
                onChange={e => set('nutrition_fats', e.target.value)}
                placeholder="e.g. 70" />
            </div>
          ) : (
            <p className="text-[#444] text-sm">Available on Plan C only.</p>
          )}
        </Section>

        {/* SETTINGS */}
        <Section title="Settings" last>
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Ghost Numbers</label>
              <div className="flex gap-2">
                {(['last', 'best'] as GhostPreference[]).map(pref => (
                  <button
                    key={pref}
                    onClick={() => set('ghost_preference', pref)}
                    className={`flex-1 py-2.5 rounded-[100px] text-sm font-semibold border transition-all capitalize ${
                      form.ghost_preference === pref ? 'bg-[#c8ff00] border-[#c8ff00] text-[#080808]' : 'border-[#333] text-[#555] hover:border-[#555]'
                    }`}
                  >
                    {pref === 'last' ? 'Last Session' : 'Personal Best'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-4 bg-[#1a1a1a] rounded-[10px] border border-[#222]">
              <div>
                <p className="text-white text-sm font-semibold">Physical Hero</p>
                <p className="text-[#555] text-xs mt-0.5">No app access — coach logs everything</p>
              </div>
              <button
                onClick={() => set('is_physical', !form.is_physical)}
                className={`w-10 h-5 rounded-full transition-all relative ${form.is_physical ? 'bg-[#f59e0b]' : 'bg-[#333]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_physical ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </Section>

        {/* Save / Cancel */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </SlidePanel>
  )
}

// ─── Exercise Picker ──────────────────────────────────────────────────────────

function groupExercises(exercises: Exercise[]): Map<string, Exercise[]> {
  const map = new Map<string, Exercise[]>()
  for (const ex of exercises) {
    const key = ex.muscle_groups?.[0] ?? 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ex)
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length))
}

function ExercisePicker({ bundleId, bundleExercises, refetchBE, coachId }: {
  bundleId: string
  bundleExercises: BundleExercise[]
  refetchBE: () => void
  coachId: string
}) {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  const { toast, showToast } = useToast()
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [showCustom, setShowCustom] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', muscle_groups: '', kind: 'Compound' as ExerciseKind, video_url: '', instructions: '' })
  const [customErr, setCustomErr] = useState('')
  const [customSaving, setCustomSaving] = useState(false)
  const [adding, setAdding] = useState(false)

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data } = await supabase.from('exercises').select('*').order('name')
      return (data ?? []) as Exercise[]
    },
  })

  const standardExercises = exercises.filter(e => !e.is_custom)
  const customExercises   = exercises.filter(e => e.is_custom)

  const filtered = search.trim()
    ? standardExercises.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscle_groups?.some(m => m.toLowerCase().includes(search.toLowerCase()))
      )
    : standardExercises

  const grouped = groupExercises(filtered)

  useEffect(() => {
    if (search.trim()) setOpenGroups(new Set(grouped.keys()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const toggleGroup = (g: string) =>
    setOpenGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })

  const toggleCheck = (id: string) =>
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function addSelected() {
    const toAdd = exercises.filter(e => checked.has(e.id) && !bundleExercises.some(be => be.exercise_id === e.id))
    if (!toAdd.length) { setChecked(new Set()); return }
    setAdding(true)
    let maxOrder = bundleExercises.reduce((m, be) => Math.max(m, be.sort_order), -1)
    for (const ex of toAdd) {
      maxOrder++
      await supabase.from('bundle_exercises').insert({ bundle_id: bundleId, exercise_id: ex.id, sets: 3, reps: '8-12', sort_order: maxOrder })
    }
    setChecked(new Set()); setAdding(false); refetchBE()
  }

  async function createCustom() {
    if (!customForm.name.trim()) { setCustomErr('Name is required'); return }
    setCustomErr(''); setCustomSaving(true)
    const mg = customForm.muscle_groups.split(',').map(s => s.trim()).filter(Boolean)
    const { data, error } = await supabase.from('exercises').insert({
      name:            customForm.name.trim(),
      muscle_groups:   mg.length ? mg : ['Other'],
      kind:            customForm.kind,
      video_url:       customForm.video_url || null,
      instructions:    customForm.instructions || null,
      created_by:      coachId,
      created_by_name: profile?.full_name ?? 'Coach',
      is_custom:       true,
    }).select().single()
    setCustomSaving(false)
    if (error) { setCustomErr(error.message); return }

    // Add directly to the bundle
    const newEx = data as Exercise
    const maxOrder = bundleExercises.reduce((m, be) => Math.max(m, be.sort_order), -1)
    await supabase.from('bundle_exercises').insert({
      bundle_id: bundleId, exercise_id: newEx.id, sets: 3, reps: '8-12', sort_order: maxOrder + 1,
    })

    qc.invalidateQueries({ queryKey: ['exercises'] })
    setShowCustom(false)
    setCustomForm({ name: '', muscle_groups: '', kind: 'Compound', video_url: '', instructions: '' })
    refetchBE()
    showToast('success', 'Exercise added ✓')
  }

  const newCount = [...checked].filter(id => !bundleExercises.some(be => be.exercise_id === id)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[#888] text-sm font-medium uppercase tracking-wider">Add Exercises</h4>
        <button onClick={() => { setShowCustom(v => !v); setCustomErr('') }}
          className="text-xs text-[#c8ff00] border border-[#c8ff00]/30 px-3 py-1.5 rounded-[100px] hover:bg-[#c8ff00]/10 transition-all">
          + Custom
        </button>
      </div>

      {showCustom && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-4 mb-4 space-y-2">
          <p className="text-[#888] text-[10px] font-bold uppercase tracking-widest mb-1">New Custom Exercise</p>
          <input placeholder="Exercise name *" value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-[8px] text-white text-sm placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00]" />
          <input placeholder="Muscle groups (e.g. Chest, Shoulders)" value={customForm.muscle_groups} onChange={e => setCustomForm(f => ({ ...f, muscle_groups: e.target.value }))}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-[8px] text-white text-sm placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00]" />
          <div className="flex gap-2">
            {(['Compound', 'Isolation'] as ExerciseKind[]).map(k => (
              <button key={k} type="button" onClick={() => setCustomForm(f => ({ ...f, kind: k }))}
                className={`flex-1 py-1.5 rounded-[100px] text-xs font-semibold border transition-all ${customForm.kind === k ? 'bg-[#c8ff00] border-[#c8ff00] text-[#080808]' : 'border-[#333] text-[#555]'}`}>
                {k}
              </button>
            ))}
          </div>
          <input placeholder="Video URL (optional)" value={customForm.video_url} onChange={e => setCustomForm(f => ({ ...f, video_url: e.target.value }))}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-[8px] text-white text-sm placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00]" />
          <textarea rows={2} placeholder="Instructions (optional)" value={customForm.instructions} onChange={e => setCustomForm(f => ({ ...f, instructions: e.target.value }))}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-[8px] text-white text-sm placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none" />
          {customErr && <p className="text-[#ff3d3d] text-xs">{customErr}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowCustom(false); setCustomErr('') }}
              className="flex-1 py-2.5 text-xs text-[#555] border border-[#333] rounded-[10px] hover:text-white transition-colors">
              Cancel
            </button>
            <button type="button" onClick={createCustom} disabled={customSaving}
              className="flex-1 py-2.5 text-xs text-[#080808] bg-[#c8ff00] rounded-[10px] font-bold hover:bg-[#d4ff33] transition-colors disabled:opacity-50 uppercase tracking-wider">
              {customSaving ? 'Adding…' : 'ADD EXERCISE'}
            </button>
          </div>
        </div>
      )}

      <input type="text" placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] text-sm mb-3" />

      <div className="max-h-[380px] overflow-y-auto border border-[#1a1a1a] rounded-[10px]">
        {[...grouped.entries()].map(([group, exs]) => (
          <div key={group} className="border-b border-[#1a1a1a] last:border-0">
            <button onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1a1a1a] transition-all text-left">
              <span className="text-[#888] text-xs font-bold uppercase tracking-wider">
                {group} <span className="text-[#444]">({exs.length})</span>
              </span>
              <span className="text-[#444] text-xs">{openGroups.has(group) ? '▼' : '▶'}</span>
            </button>
            {openGroups.has(group) && (
              <div className="pb-1">
                {exs.map(ex => {
                  const already = bundleExercises.some(be => be.exercise_id === ex.id)
                  return (
                    <label key={ex.id}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-all ${already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#1a1a1a]'}`}>
                      <input type="checkbox" checked={checked.has(ex.id) || already} disabled={already}
                        onChange={() => !already && toggleCheck(ex.id)} className="w-4 h-4 accent-[#c8ff00] cursor-pointer" />
                      <span className="text-white text-sm flex-1">{ex.name}</span>
                      {already && <span className="text-[#444] text-xs">✓</span>}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Custom exercises section */}
        <div className="border-t border-[#1a1a1a]">
          <button onClick={() => toggleGroup('__custom__')}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1a1a1a] transition-all text-left">
            <span className="text-[#c8ff00]/60 text-xs font-bold uppercase tracking-wider">
              // CUSTOM EXERCISES <span className="text-[#444]">({customExercises.length})</span>
            </span>
            <span className="text-[#444] text-xs">{openGroups.has('__custom__') ? '▼' : '▶'}</span>
          </button>
          {openGroups.has('__custom__') && (
            <div className="pb-1">
              {customExercises.length === 0 && (
                <p className="text-[#444] text-xs text-center py-4 px-4">No custom exercises yet — add one above</p>
              )}
              {customExercises.map(ex => {
                const already = bundleExercises.some(be => be.exercise_id === ex.id)
                return (
                  <label key={ex.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-all ${already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#1a1a1a]'}`}>
                    <input type="checkbox" checked={checked.has(ex.id) || already} disabled={already}
                      onChange={() => !already && toggleCheck(ex.id)} className="w-4 h-4 accent-[#c8ff00] cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{ex.name}</p>
                      {ex.created_by_name && (
                        <p className="text-[#444] text-[10px]">Added by {ex.created_by_name}</p>
                      )}
                    </div>
                    {already && <span className="text-[#444] text-xs">✓</span>}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {filtered.length === 0 && search.trim() && <p className="text-[#444] text-sm text-center py-6">No matches for "{search}"</p>}
      </div>

      {newCount > 0 && (
        <button onClick={addSelected} disabled={adding}
          className="w-full mt-3 py-3 rounded-[10px] bg-[#c8ff00] text-[#080808] font-bold text-sm hover:bg-[#d4ff33] transition-all disabled:opacity-50">
          {adding ? 'Adding…' : `Add Selected (${newCount})`}
        </button>
      )}

      <Toast toast={toast} />
    </div>
  )
}

// ─── Bundle Builder ──────────────────────────────────────────────────────────

function BundleBuilderModal({ open, onClose, heroId, bundle, coachId }: {
  open: boolean; onClose: () => void; heroId: string; bundle?: Bundle; coachId: string
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(bundle?.name ?? '')
  const [color, setColor] = useState(bundle?.color ?? '#c8ff00')
  const [desc, setDesc] = useState(bundle?.description ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(bundle?.name ?? ''); setColor(bundle?.color ?? '#c8ff00')
    setDesc(bundle?.description ?? ''); setError('')
  }, [bundle?.id])

  const { data: bundleExercises = [], refetch: refetchBE } = useQuery({
    queryKey: ['bundle-exercises', bundle?.id],
    queryFn: async () => {
      if (!bundle?.id) return []
      const { data } = await supabase.from('bundle_exercises').select('*, exercise:exercises(*)').eq('bundle_id', bundle.id).order('sort_order')
      return (data ?? []) as BundleExercise[]
    },
    enabled: !!bundle?.id,
  })

  const saveBundle = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Bundle name required')
      if (bundle) {
        const { error } = await supabase.from('bundles').update({ name, color, description: desc }).eq('id', bundle.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bundles').insert({ client_id: heroId, name, color, description: desc, created_by: coachId, sort_order: 0 })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hero-bundles', heroId] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const updateBE = useMutation({
    mutationFn: async ({ id, sets, reps }: { id: string; sets: number; reps: string }) => {
      await supabase.from('bundle_exercises').update({ sets, reps }).eq('id', id); refetchBE()
    },
  })

  const removeBE = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('bundle_exercises').delete().eq('id', id); refetchBE()
    },
  })

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragEnd   = () => { setDragIdx(null); setOverIdx(null) }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (idx !== overIdx) setOverIdx(idx)
  }

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { handleDragEnd(); return }
    const newList = [...bundleExercises]
    const [item] = newList.splice(dragIdx, 1)
    newList.splice(dropIdx, 0, item)
    setDragIdx(null); setOverIdx(null)
    for (let i = 0; i < newList.length; i++) {
      await supabase.from('bundle_exercises').update({ sort_order: i }).eq('id', newList[i].id)
    }
    refetchBE()
  }

  return (
    <Modal open={open} onClose={onClose} title={bundle ? 'Edit Bundle' : 'New Bundle'} width="max-w-3xl">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Bundle Name" required value={name} onChange={e => setName(e.target.value)} placeholder="Upper Destroyer" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-12 w-14 rounded-[10px] bg-[#1a1a1a] border border-[#333] cursor-pointer p-1" />
              <span className="font-[DM_Mono] text-[#888] text-sm">{color}</span>
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Description</label>
            <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none text-sm" />
          </div>
        </div>
        {error && <p className="text-[#ff3d3d] text-sm">{error}</p>}
        <Button onClick={() => saveBundle.mutate()} disabled={saveBundle.isPending} className="w-full">
          {saveBundle.isPending ? 'Saving...' : bundle ? 'Save Changes' : 'Create Bundle'}
        </Button>

        {bundle && (
          <div className="grid grid-cols-2 gap-6 border-t border-[#1a1a1a] pt-5">
            <div>
              <h4 className="text-[#888] text-sm font-medium uppercase tracking-wider mb-3">In Bundle ({bundleExercises.length})</h4>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {bundleExercises.length === 0 && <p className="text-[#444] text-sm">No exercises yet.</p>}
                {bundleExercises.map((be, idx) => (
                  <div
                    key={be.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center gap-2 rounded-[10px] p-2.5 transition-all select-none ${
                      dragIdx === idx
                        ? 'opacity-40 bg-[#2a2a2a]'
                        : overIdx === idx && dragIdx !== null
                        ? 'bg-[#c8ff00]/10 border border-[#c8ff00]/30'
                        : 'bg-[#1a1a1a] border border-transparent'
                    }`}
                  >
                    {/* Drag handle */}
                    <span className="text-[#444] hover:text-[#888] cursor-grab active:cursor-grabbing shrink-0 text-sm select-none px-0.5" title="Drag to reorder">
                      ⠿
                    </span>
                    <span className="text-[#444] text-[10px] font-[DM_Mono] w-4 shrink-0 text-center">{idx + 1}</span>
                    <p className="text-white text-sm flex-1 min-w-0 truncate">{be.exercise?.name ?? '—'}</p>
                    <input type="number" min={1} max={20} defaultValue={be.sets}
                      onChange={e => updateBE.mutate({ id: be.id, sets: parseInt(e.target.value) || 3, reps: be.reps })}
                      className="w-12 px-1.5 py-1 bg-[#111] border border-[#333] rounded-[6px] text-white text-center text-xs" />
                    <span className="text-[#555] text-[10px]">×</span>
                    <input type="text" defaultValue={be.reps}
                      onChange={e => updateBE.mutate({ id: be.id, sets: be.sets, reps: e.target.value })}
                      className="w-14 px-1.5 py-1 bg-[#111] border border-[#333] rounded-[6px] text-white text-center text-xs" placeholder="8-12" />
                    <button onClick={() => removeBE.mutate(be.id)} className="text-[#ff3d3d]/40 hover:text-[#ff3d3d] text-sm shrink-0">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <ExercisePicker bundleId={bundle.id} bundleExercises={bundleExercises} refetchBE={refetchBE} coachId={coachId} />
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Schedule Builder ─────────────────────────────────────────────────────────

function ScheduleBuilder({ heroId, bundles }: { heroId: string; bundles: Bundle[] }) {
  const qc = useQueryClient()
  const { data: schedule = [] } = useQuery({
    queryKey: ['hero-schedule', heroId],
    queryFn: async () => {
      const { data } = await supabase.from('plan_schedule').select('*').eq('client_id', heroId)
      return (data ?? []) as PlanSchedule[]
    },
  })

  const setDay = useMutation({
    mutationFn: async ({ day_index, bundle_id }: { day_index: number; bundle_id: string | null }) => {
      if (bundle_id) await supabase.from('plan_schedule').upsert({ client_id: heroId, day_index, bundle_id }, { onConflict: 'client_id,day_index' })
      else await supabase.from('plan_schedule').delete().eq('client_id', heroId).eq('day_index', day_index)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero-schedule', heroId] }),
  })

  return (
    <div className="space-y-3">
      {DAY_NAMES.map((day, idx) => {
        const entry = schedule.find(s => s.day_index === idx)
        const assigned = bundles.find(b => b.id === entry?.bundle_id)
        return (
          <div key={day} className="flex items-center gap-4">
            <span className="text-[#555] text-sm w-24 font-medium">{day}</span>
            <select value={entry?.bundle_id ?? ''} onChange={e => setDay.mutate({ day_index: idx, bundle_id: e.target.value || null })}
              className="flex-1 px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-[10px] text-sm focus:outline-none focus:border-[#c8ff00] appearance-none cursor-pointer"
              style={{ color: assigned ? assigned.color : '#888' }}>
              <option value="">Rest Day</option>
              {bundles.map(b => <option key={b.id} value={b.id} style={{ color: b.color }}>{b.name}</option>)}
            </select>
          </div>
        )
      })}
    </div>
  )
}

// ─── Log for Hero bundle picker ───────────────────────────────────────────────

function LogForHeroModal({ open, onClose, heroName, bundles, heroId }: {
  open: boolean; onClose: () => void; heroName: string; bundles: Bundle[]; heroId: string
}) {
  const navigate = useNavigate()
  return (
    <Modal open={open} onClose={onClose} title={`Log for ${heroName}`}>
      <p className="text-[#555] text-sm mb-5">Select a workout to log</p>
      {bundles.length === 0 ? (
        <p className="text-[#444] text-sm">No bundles created for this hero yet.</p>
      ) : (
        <div className="space-y-3">
          {bundles.map(b => (
            <button key={b.id} onClick={() => { onClose(); navigate(`/coach/heroes/${heroId}/log/${b.id}`) }}
              className="w-full flex items-center gap-4 p-4 rounded-[12px] border border-[#222] hover:border-[#333] hover:bg-[#111] transition-all text-left active:scale-[0.98]"
              style={{ borderColor: b.color + '30' }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: b.color }} />
              <div>
                <p className="text-white font-semibold">{b.name}</p>
                {b.description && <p className="text-[#555] text-sm">{b.description}</p>}
              </div>
              <span className="ml-auto" style={{ color: b.color }}>→</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Bundles', 'Schedule', 'History']

export default function CoachHeroProfile() {
  const { heroId } = useParams<{ heroId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile: coachProfile, setProfile } = useAuthStore()
  const [tab, setTab] = useState('Overview')
  const [showBundle, setShowBundle] = useState(false)
  const [editBundle, setEditBundle] = useState<Bundle | undefined>()
  const [showLogModal, setShowLogModal] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [activating, setActivating] = useState(false)
  const [resending, setResending] = useState(false)
  const { toast, showToast } = useToast()

  const isPhysicalCoach = coachProfile?.coach_type === 'physical'

  const { data: hero, isLoading } = useQuery({
    queryKey: ['hero-profile', heroId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', heroId).single()
      return data as Profile
    },
    enabled: !!heroId,
  })

  const { data: bundles = [] } = useQuery({
    queryKey: ['hero-bundles', heroId],
    queryFn: async () => {
      const { data } = await supabase.from('bundles').select('*').eq('client_id', heroId).order('sort_order')
      return (data ?? []) as Bundle[]
    },
    enabled: !!heroId,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['hero-sessions', heroId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions_v2').select('*, sets:session_sets(*)')
        .eq('user_id', heroId).order('logged_at', { ascending: false }).limit(20)
      return (data ?? []) as Array<{
        id: string; bundle_name: string; logged_at: string; notes?: string
        sets?: Array<{ exercise_name: string; set_number: number; weight: number; reps: number; done: boolean }>
      }>
    },
    enabled: !!heroId && tab === 'History',
  })

  const deleteBundle = useMutation({
    mutationFn: async (bundleId: string) => {
      await supabase.from('bundles').delete().eq('id', bundleId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hero-bundles', heroId] }),
  })

  const deleteHero = useMutation({
    // Returns { heroId, newCount } so onSuccess can update auth store without re-reading stale closure
    mutationFn: async (): Promise<{ heroId: string; newCount: number }> => {
      if (!hero || !coachProfile) throw new Error('Missing hero or coach data')
      const heroId = hero.id
      console.log('[DeleteHero] start — heroId:', heroId)

      // 1. session_sets (fetch session IDs from sessions_v2 first)
      const { data: heroSessions, error: sessErr } = await supabase
        .from('sessions_v2').select('id').eq('user_id', heroId)
      console.log('[DeleteHero] step 1 session_sets:', sessErr?.message ?? 'ok', `(${(heroSessions ?? []).length} sessions)`)
      const sessionIds = (heroSessions ?? []).map(s => (s as { id: string }).id)
      if (sessionIds.length) {
        const { error: ssErr } = await supabase.from('session_sets').delete().in('session_id', sessionIds)
        console.log('[DeleteHero] step 1b session_sets delete:', ssErr?.message ?? 'ok')
      }

      // 2. sessions_v2
      const { error: sv2Err } = await supabase.from('sessions_v2').delete().eq('user_id', heroId)
      console.log('[DeleteHero] step 2 sessions_v2:', sv2Err?.message ?? 'ok')

      // 3. journal_logs
      const { error: jlErr } = await supabase.from('journal_logs').delete().eq('user_id', heroId)
      console.log('[DeleteHero] step 3 journal_logs:', jlErr?.message ?? 'ok')

      // 4. nutrition_logs
      const { error: nlErr } = await supabase.from('nutrition_logs').delete().eq('user_id', heroId)
      console.log('[DeleteHero] step 4 nutrition_logs:', nlErr?.message ?? 'ok')

      // 5. bundle_exercises
      const { data: heroBundles } = await supabase.from('bundles').select('id').eq('client_id', heroId)
      const bundleIds = (heroBundles ?? []).map(b => (b as { id: string }).id)
      if (bundleIds.length) {
        const { error: beErr } = await supabase.from('bundle_exercises').delete().in('bundle_id', bundleIds)
        console.log('[DeleteHero] step 5 bundle_exercises:', beErr?.message ?? 'ok')
      } else {
        console.log('[DeleteHero] step 5 bundle_exercises: skipped (no bundles)')
      }

      // 6. bundles
      const { error: bErr } = await supabase.from('bundles').delete().eq('client_id', heroId)
      console.log('[DeleteHero] step 6 bundles:', bErr?.message ?? 'ok')

      // 7. plan_schedule
      const { error: psErr } = await supabase.from('plan_schedule').delete().eq('client_id', heroId)
      console.log('[DeleteHero] step 7 plan_schedule:', psErr?.message ?? 'ok')

      // 8. profiles — delete hero row (requires "coach delete own heroes" RLS policy)
      const { error: deleteErr } = await supabase.from('profiles').delete().eq('id', heroId)
      if (deleteErr) throw new Error(`Profile delete failed: ${deleteErr.message}`)
      console.log('[DeleteHero] step 8 profiles delete: ok')

      // 9. Decrement coach hero_count in DB
      const newCount = Math.max(0, (coachProfile.hero_count ?? 1) - 1)
      const { error: hcErr } = await supabase.from('profiles').update({ hero_count: newCount }).eq('id', coachProfile.id)
      console.log('[DeleteHero] step 9 hero_count update:', hcErr?.message ?? `ok → ${newCount}`)

      return { heroId, newCount }
    },
    onSuccess: ({ heroId: deletedId, newCount }) => {
      // Update coach hero_count in auth store immediately
      if (coachProfile) setProfile({ ...coachProfile, hero_count: newCount })

      // Immediately remove from coach-heroes cache
      qc.setQueryData(
        ['coach-heroes', coachProfile?.id],
        (old: Profile[] | undefined) => (old ?? []).filter(h => h.id !== deletedId)
      )

      // Immediately remove from recent-sessions cache
      qc.setQueriesData(
        { queryKey: ['coach-recent-sessions'] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old
          return (old as { user_id: string }[]).filter(s => s.user_id !== deletedId)
        }
      )

      // Background sync with DB
      qc.invalidateQueries({ queryKey: ['coach-heroes'] })
      qc.invalidateQueries({ queryKey: ['coach-recent-sessions'] })

      showToast('success', 'Hero deleted ✓')
      navigate('/coach/heroes')
    },
    onError: (e: Error) => showToast('error', e.message),
  })

  async function invokeActivateHero(): Promise<{ success: boolean; emailSent: boolean; emailError?: string }> {
    const { data, error } = await supabase.functions.invoke('activate-hero', {
      body: { heroId: hero!.id, coachId: coachProfile?.id },
    })
    if (error) throw new Error(error.message)
    return data as { success: boolean; emailSent: boolean; emailError?: string }
  }

  async function activateHero() {
    if (!hero) return
    setActivating(true)
    try {
      const result = await invokeActivateHero()
      console.log('[ActivateHero] result:', result)

      if (result.emailSent) {
        showToast('success', `Invitation sent to ${hero.email} ✓`)
      } else {
        showToast('error', `Plan activated but email failed — ${result.emailError ?? 'check Resend config'}`)
      }

      // Update local cache so button swaps immediately
      qc.setQueryData(['hero-profile', heroId], (old: Profile | undefined) =>
        old ? { ...old, is_active: true } : old
      )
      qc.setQueryData(
        ['coach-heroes', coachProfile?.id],
        (old: Profile[] | undefined) =>
          (old ?? []).map(h => h.id === hero.id ? { ...h, is_active: true } : h)
      )

      // Update linked hero_request status to 'active'
      await supabase
        .from('hero_requests')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('linked_hero_id', hero.id)

      qc.invalidateQueries({ queryKey: ['hero-profile', heroId] })
      qc.invalidateQueries({ queryKey: ['coach-heroes'] })
    } catch (e) {
      console.error('[ActivateHero] error:', e)
      showToast('error', (e as Error).message)
    } finally {
      setActivating(false)
    }
  }

  async function resendLoginEmail() {
    if (!hero) return
    setResending(true)
    try {
      const result = await invokeActivateHero()
      console.log('[ResendLoginEmail] result:', result)

      if (result.emailSent) {
        showToast('success', 'Activation email resent ✓')
      } else {
        showToast('error', `Hero active but email failed — ${result.emailError ?? 'check Resend config'}`)
      }
    } catch (e) {
      console.error('[ResendLoginEmail] error:', e)
      showToast('error', 'Failed: ' + (e as Error).message)
    } finally {
      setResending(false)
    }
  }

  if (isLoading || !hero) return (
    <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>
  )

  const canLogForHero = isPhysicalCoach || hero.is_physical

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/coach/heroes" className="text-[#555] hover:text-white text-sm transition-colors">← Heroes</Link>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] font-bold text-lg">
            {hero.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-[Bebas_Neue] text-3xl text-white tracking-wide">{hero.full_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={hero.plan_type === 'C' ? 'accent' : hero.plan_type === 'B' ? 'blue' : 'muted'}>Plan {hero.plan_type}</Badge>
              <Badge variant={hero.is_active ? 'green' : 'accent'}>{hero.is_active ? 'Active' : 'Pending Activation'}</Badge>
              {hero.is_physical && <Badge variant="muted">Physical</Badge>}
              <span className="text-[#444] text-xs capitalize">{hero.goal}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!hero.is_active && !hero.is_physical && (
            <button
              onClick={activateHero}
              disabled={activating}
              className="font-[DM_Mono] font-bold uppercase transition-all disabled:opacity-50"
              style={{
                background: '#c8ff00',
                color: '#000',
                border: 'none',
                borderRadius: '100px',
                padding: '11px 20px',
                fontSize: '12px',
                letterSpacing: '2px',
                cursor: activating ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {activating ? 'Sending...' : 'Activate Plan & Send Login'}
            </button>
          )}
          {hero.is_active && !hero.is_physical && (
            <button
              onClick={resendLoginEmail}
              disabled={resending}
              className="font-[DM_Mono] font-bold uppercase transition-all disabled:opacity-50"
              style={{
                background: 'transparent',
                color: resending ? '#555' : '#888',
                border: '1px solid #333',
                borderRadius: '100px',
                padding: '9px 18px',
                fontSize: '10px',
                letterSpacing: '2px',
                cursor: resending ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!resending) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8ff00'; (e.currentTarget as HTMLButtonElement).style.color = '#c8ff00' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'; (e.currentTarget as HTMLButtonElement).style.color = resending ? '#555' : '#888' }}
            >
              {resending ? 'Sending...' : 'Resend Login Email'}
            </button>
          )}
          {canLogForHero && (
            <Button size="sm" onClick={() => setShowLogModal(true)}>🏋️ Log Workout</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowEdit(true)}>Edit Profile</Button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-3 py-1.5 rounded-[100px] text-xs font-[DM_Mono] font-bold uppercase tracking-[1.5px] border transition-all"
            style={{ background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.25)', color: '#ff6b6b' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-[100px] p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-[100px] text-sm font-medium transition-all ${tab === t ? 'bg-[#c8ff00] text-[#080808]' : 'text-[#555] hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5 space-y-3">
            <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider">Body Stats</h3>
            {[
              ['Height', hero.height ? `${hero.height} cm` : '—'],
              ['Start Weight', hero.start_weight ? `${hero.start_weight} kg` : '—'],
              ['Target Weight', hero.target_weight ? `${hero.target_weight} kg` : '—'],
              ['Goal', hero.goal ?? '—'],
              ['Steps Target', hero.steps_target?.toLocaleString() ?? '10,000'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-[#555]">{k}</span><span className="text-white capitalize">{v}</span>
              </div>
            ))}
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider">Plan Details</h3>
            {[
              ['Plan', `Plan ${hero.plan_type} — ${hero.plan_billing}`],
              ['Start', hero.plan_start ?? '—'],
              ['End', hero.plan_end ?? '—'],
              ['Contact', hero.is_physical ? (hero.phone ?? '—') : hero.email],
              ['Phone', hero.phone ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-[#555]">{k}</span><span className="text-white">{v}</span>
              </div>
            ))}
          </Card>

          {hero.plan_type === 'C' && hero.nutrition_targets && (
            <Card className="p-5 space-y-3">
              <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider">Nutrition Targets</h3>
              {Object.entries(hero.nutrition_targets).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-[#555] capitalize">{k}</span>
                  <span className="text-[#c8ff00] font-[DM_Mono]">{v}{k === 'calories' ? ' kcal' : 'g'}</span>
                </div>
              ))}
            </Card>
          )}

          {hero.notes && (
            <Card className="p-5">
              <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-2">Internal Notes</h3>
              <p className="text-[#888] text-sm">{hero.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* Bundles */}
      {tab === 'Bundles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[#555] text-sm">{bundles.length} bundles</p>
            <Button size="sm" onClick={() => { setEditBundle(undefined); setShowBundle(true) }}>+ New Bundle</Button>
          </div>
          <div className="grid gap-3">
            {bundles.map(b => (
              <Card key={b.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ background: b.color }} />
                  <div>
                    <p className="text-white font-medium">{b.name}</p>
                    {b.description && <p className="text-[#555] text-xs mt-0.5">{b.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditBundle(b); setShowBundle(true) }}
                    className="text-xs text-[#555] hover:text-white px-3 py-1.5 border border-[#333] rounded-[100px] transition-colors">Edit</button>
                  <button onClick={() => { if (confirm('Delete bundle?')) deleteBundle.mutate(b.id) }}
                    className="text-xs text-[#ff3d3d]/60 hover:text-[#ff3d3d] px-3 py-1.5 border border-[#ff3d3d]/20 rounded-[100px] transition-colors">Delete</button>
                </div>
              </Card>
            ))}
            {bundles.length === 0 && (
              <Card className="p-8 text-center"><p className="text-[#555]">No bundles yet. Create the first one.</p></Card>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      {tab === 'Schedule' && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-white font-semibold">Weekly Schedule</h3>
            <p className="text-[#555] text-sm mt-0.5">Assign a recommended bundle per day</p>
          </div>
          {bundles.length === 0
            ? <p className="text-[#555] text-sm">Create bundles first before building a schedule.</p>
            : <ScheduleBuilder heroId={hero.id} bundles={bundles} />}
        </Card>
      )}

      {/* History */}
      {tab === 'History' && (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">{s.bundle_name}</p>
                  <p className="text-[#555] text-sm">{new Date(s.logged_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>
                <Badge variant="muted">{s.sets?.filter(set => set.done).length ?? 0} done</Badge>
              </div>
              {s.notes && <p className="text-[#888] text-sm italic mb-3">"{s.notes}"</p>}
              <div className="space-y-1">
                {(s.sets ?? []).filter(set => set.done).slice(0, 8).map((set, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-[DM_Mono]">
                    <span className="text-[#444] w-5">{set.set_number}</span>
                    <span className="text-[#888] flex-1">{set.exercise_name}</span>
                    <span className="text-white">{set.weight}kg × {set.reps}</span>
                    <span className="text-[#c8ff00]">✓</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {sessions.length === 0 && (
            <Card className="p-8 text-center"><p className="text-[#555]">No sessions logged yet.</p></Card>
          )}
        </div>
      )}

      {/* Bundle Modal */}
      {coachProfile && (
        <BundleBuilderModal
          open={showBundle}
          onClose={() => { setShowBundle(false); setEditBundle(undefined) }}
          heroId={hero.id} bundle={editBundle} coachId={coachProfile.id}
        />
      )}

      {/* Log for Hero Modal */}
      <LogForHeroModal
        open={showLogModal} onClose={() => setShowLogModal(false)}
        heroName={hero.full_name} bundles={bundles} heroId={hero.id}
      />

      {/* Edit Hero Panel */}
      <EditHeroPanel
        hero={hero}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        showToast={showToast}
      />

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-[#111] border border-[#222] rounded-[20px] w-full max-w-sm p-6 space-y-5">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl mx-auto"
                style={{ background: 'rgba(255,61,61,0.08)', border: '1px solid rgba(255,61,61,0.2)' }}>
                🗑️
              </div>
              <h3 className="font-[Bebas_Neue] text-2xl text-white tracking-wide text-center">
                Delete {hero.full_name}?
              </h3>
              <p className="text-[#555] text-[13px] font-[DM_Mono] text-center leading-relaxed">
                This will permanently remove all their data including sessions, journal logs, and nutrition history. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleteHero.isPending}
                className="flex-1 py-3 rounded-[100px] border border-[#333] text-[#888] font-[DM_Mono] text-[11px] uppercase tracking-[2px] hover:border-[#555] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteHero.mutate()}
                disabled={deleteHero.isPending}
                className="flex-1 py-3 rounded-[100px] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] transition-all disabled:opacity-50"
                style={{ background: '#ff3d3d', color: '#fff' }}
              >
                {deleteHero.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
