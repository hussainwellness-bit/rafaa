import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { Profile, PlanType, PlanBilling, Goal, JournalConfig } from '../../types'
import { PLAN_NAMES, PLAN_PRICES } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

const DEFAULT_JOURNAL_CONFIG: JournalConfig = {
  steps: true, sleep: true, cardio: true, water: true, body_weight: true, mood: true, soreness: true,
}

interface HeroForm {
  full_name: string
  email: string
  phone: string
  plan_type: PlanType
  plan_billing: PlanBilling
  plan_start: string
  plan_end: string
  goal: Goal
  start_weight: string
  target_weight: string
  height: string
  steps_target: string
  notes: string
  journal_config: JournalConfig
  nutrition_targets: { calories: string; protein: string; carbs: string; fats: string }
  is_physical: boolean
}

const EMPTY_FORM: HeroForm = {
  full_name: '', email: '', phone: '',
  plan_type: 'A', plan_billing: 'monthly',
  plan_start: new Date().toISOString().slice(0, 10),
  plan_end: '',
  goal: 'cutting',
  start_weight: '', target_weight: '', height: '',
  steps_target: '10000', notes: '',
  journal_config: DEFAULT_JOURNAL_CONFIG,
  nutrition_targets: { calories: '', protein: '', carbs: '', fats: '' },
  is_physical: false,
}

function AddHeroModal({ open, onClose, coachId, isPhysicalCoach }: {
  open: boolean
  onClose: () => void
  coachId: string
  isPhysicalCoach: boolean
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<HeroForm>({ ...EMPTY_FORM, is_physical: isPhysicalCoach })
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const set = (k: keyof HeroForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const addHero = useMutation({
    mutationFn: async () => {
      if (form.is_physical) {
        // Physical hero: no auth account needed — insert profile directly with a generated UUID
        const heroId = crypto.randomUUID()
        const fakeEmail = `physical.${heroId.replace(/-/g, '').slice(0, 12)}@nologin.internal`
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: heroId,
          email: fakeEmail,
          full_name: form.full_name,
          phone: form.phone || null,
          role: 'hero',
          coach_id: coachId,
          is_physical: true,
          plan_type: form.plan_type,
          plan_billing: form.plan_billing,
          plan_start: form.plan_start || null,
          plan_end: form.plan_end || null,
          goal: form.goal,
          start_weight: form.start_weight ? parseFloat(form.start_weight) : null,
          target_weight: form.target_weight ? parseFloat(form.target_weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          steps_target: parseInt(form.steps_target) || 10000,
          notes: form.notes || null,
          is_active: true,
          journal_config: form.journal_config,
        })
        if (profileErr) throw profileErr
      } else {
        // Online hero: create auth account + profile + send password reset email
        const { data: { session: coachSession } } = await supabase.auth.getSession()
        const tempPassword = crypto.randomUUID() + crypto.randomUUID()
        const { data: signupData, error: signupErr } = await supabase.auth.signUp({
          email: form.email,
          password: tempPassword,
          options: { data: { full_name: form.full_name } },
        })
        if (signupErr) throw signupErr
        const userId = signupData.user?.id
        if (!userId) throw new Error('User creation failed')

        if (coachSession) {
          await supabase.auth.setSession({
            access_token: coachSession.access_token,
            refresh_token: coachSession.refresh_token,
          })
        }

        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: userId,
          email: form.email,
          full_name: form.full_name,
          phone: form.phone || null,
          role: 'hero',
          coach_id: coachId,
          is_physical: false,
          plan_type: form.plan_type,
          plan_billing: form.plan_billing,
          plan_start: form.plan_start || null,
          plan_end: form.plan_end || null,
          goal: form.goal,
          start_weight: form.start_weight ? parseFloat(form.start_weight) : null,
          target_weight: form.target_weight ? parseFloat(form.target_weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          steps_target: parseInt(form.steps_target) || 10000,
          notes: form.notes || null,
          is_active: true,
          journal_config: form.journal_config,
          nutrition_targets: (() => {
            const nt = form.plan_type === 'C' ? {
              calories: parseFloat(form.nutrition_targets.calories) || 0,
              protein: parseFloat(form.nutrition_targets.protein) || 0,
              carbs: parseFloat(form.nutrition_targets.carbs) || 0,
              fats: parseFloat(form.nutrition_targets.fats) || 0,
            } : null
            console.log('[NutritionDebug] CoachHeroes AddHero — plan_type:', form.plan_type, 'nutrition_targets being saved:', nt)
            return nt
          })(),
        })
        if (profileErr) throw profileErr

        await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-heroes'] })
      onClose()
      setForm({ ...EMPTY_FORM, is_physical: isPhysicalCoach })
      setStep(1)
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  const journalFields: (keyof JournalConfig)[] = ['steps', 'sleep', 'cardio', 'water', 'body_weight', 'mood', 'soreness']

  return (
    <Modal open={open} onClose={onClose} title="Add Hero" width="max-w-xl">
      {/* Hero type toggle — only shown for online coaches who can create both */}
      {!isPhysicalCoach && (
        <div className="flex gap-2 mb-6">
          {(['online', 'physical'] as const).map(t => (
            <button
              key={t}
              onClick={() => { set('is_physical', t === 'physical'); setStep(1) }}
              className={`flex-1 py-2.5 rounded-[100px] text-sm font-semibold border transition-all ${
                (form.is_physical ? 'physical' : 'online') === t
                  ? 'bg-[#c8ff00] border-[#c8ff00] text-[#080808]'
                  : 'border-[#333] text-[#555] hover:border-[#555]'
              }`}
            >
              {t === 'online' ? '🌐 Online Hero' : '🏋️ Physical Hero'}
            </button>
          ))}
        </div>
      )}

      {form.is_physical && (
        <div className="mb-5 bg-[#1a1a1a] border border-[#333] rounded-[12px] px-4 py-3 text-sm text-[#888]">
          Physical heroes have no app access. You log all their data on their behalf.
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-[#c8ff00]' : 'bg-[#222]'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-[#888] text-sm font-medium uppercase tracking-wider">Basic Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} className="col-span-2" />
            {!form.is_physical && (
              <Input label="Email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} className="col-span-2" />
            )}
            <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+966..." />
            <Select label="Goal" value={form.goal} onChange={e => set('goal', e.target.value as Goal)} options={[
              { value: 'cutting', label: 'Cutting' },
              { value: 'bulking', label: 'Bulking' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'recomp', label: 'Recomp' },
            ]} />
            <Input label="Height (cm)" type="number" value={form.height} onChange={e => set('height', e.target.value)} />
            <Input label="Start Weight (kg)" type="number" value={form.start_weight} onChange={e => set('start_weight', e.target.value)} />
            <Input label="Target Weight (kg)" type="number" value={form.target_weight} onChange={e => set('target_weight', e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => setStep(2)}>Next →</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-[#888] text-sm font-medium uppercase tracking-wider">Plan & Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Plan Type" value={form.plan_type} onChange={e => set('plan_type', e.target.value as PlanType)} options={[
              { value: 'A', label: `Plan A — ${PLAN_NAMES.A}` },
              { value: 'B', label: `Plan B — ${PLAN_NAMES.B}` },
              { value: 'C', label: `Plan C — ${PLAN_NAMES.C}` },
            ]} />
            <Select label="Billing" value={form.plan_billing} onChange={e => set('plan_billing', e.target.value as PlanBilling)} options={[
              { value: 'monthly', label: `Monthly — ${PLAN_PRICES[form.plan_type].monthly} SAR` },
              { value: 'semi_annual', label: `6 Months — ${PLAN_PRICES[form.plan_type].semi_annual} SAR` },
              { value: 'annual', label: `Annual — ${PLAN_PRICES[form.plan_type].annual} SAR` },
            ]} />
            <Input label="Plan Start" type="date" value={form.plan_start} onChange={e => set('plan_start', e.target.value)} />
            <Input label="Plan End" type="date" value={form.plan_end} onChange={e => set('plan_end', e.target.value)} />
            <Input label="Steps Target / Day" type="number" value={form.steps_target} onChange={e => set('steps_target', e.target.value)} className="col-span-2" />
          </div>

          {(form.plan_type === 'B' || form.plan_type === 'C') && (
            <div>
              <label className="text-sm text-[#888] font-medium block mb-2">Journal Fields</label>
              <div className="flex flex-wrap gap-2">
                {journalFields.map(field => (
                  <button key={field} type="button"
                    onClick={() => set('journal_config', { ...form.journal_config, [field]: !form.journal_config[field] })}
                    className={`px-3 py-1 rounded-[100px] text-xs border transition-all capitalize ${
                      form.journal_config[field] ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]' : 'border-[#333] text-[#555]'
                    }`}
                  >
                    {field.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.plan_type === 'C' && !form.is_physical && (
            <div className="space-y-3">
              <label className="text-sm text-[#888] font-medium block">Nutrition Targets</label>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Calories (kcal)" type="number" value={form.nutrition_targets.calories} onChange={e => set('nutrition_targets', { ...form.nutrition_targets, calories: e.target.value })} />
                <Input label="Protein (g)" type="number" value={form.nutrition_targets.protein} onChange={e => set('nutrition_targets', { ...form.nutrition_targets, protein: e.target.value })} />
                <Input label="Carbs (g)" type="number" value={form.nutrition_targets.carbs} onChange={e => set('nutrition_targets', { ...form.nutrition_targets, carbs: e.target.value })} />
                <Input label="Fats (g)" type="number" value={form.nutrition_targets.fats} onChange={e => set('nutrition_targets', { ...form.nutrition_targets, fats: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Internal Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none text-sm" />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">← Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Next →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h3 className="text-[#888] text-sm font-medium uppercase tracking-wider">Confirm</h3>
          <div className="bg-[#1a1a1a] rounded-[12px] p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#555]">Name</span><span className="text-white">{form.full_name}</span></div>
            {!form.is_physical && (
              <div className="flex justify-between"><span className="text-[#555]">Email</span><span className="text-white">{form.email}</span></div>
            )}
            <div className="flex justify-between">
              <span className="text-[#555]">Type</span>
              <span className={form.is_physical ? 'text-[#f59e0b]' : 'text-[#3d9fff]'}>
                {form.is_physical ? 'Physical (coach-managed)' : 'Online'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-[#555]">Goal</span><span className="text-white capitalize">{form.goal}</span></div>
            <div className="flex justify-between">
              <span className="text-[#555]">Plan</span>
              <span className="text-[#c8ff00]">Plan {form.plan_type} · {form.plan_billing} · {PLAN_PRICES[form.plan_type][form.plan_billing]} SAR</span>
            </div>
          </div>
          {!form.is_physical && (
            <div className="bg-[#c8ff00]/5 border border-[#c8ff00]/20 rounded-[12px] p-4 text-sm text-[#888]">
              📧 A password setup email will be sent to <span className="text-white">{form.email}</span>. They click the link to set their own password and access the app.
            </div>
          )}
          {form.is_physical && (
            <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-[12px] p-4 text-sm text-[#888]">
              🏋️ This hero has no app access. You will log all workouts and journal entries on their behalf.
            </div>
          )}
          {error && <p className="text-[#ff3d3d] text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">← Back</Button>
            <Button className="flex-1" disabled={addHero.isPending} onClick={() => addHero.mutate()}>
              {addHero.isPending ? 'Creating...' : 'Create Hero'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function CoachHeroes() {
  const { profile } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const isPhysicalCoach = profile?.coach_type === 'physical'

  const { data: heroes = [], isLoading } = useQuery({
    queryKey: ['coach-heroes', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles').select('*').eq('role', 'hero').eq('coach_id', profile!.id)
        .order('full_name')
      return (data ?? []) as Profile[]
    },
    enabled: !!profile?.id,
  })

  const filtered = heroes.filter(h =>
    h.full_name.toLowerCase().includes(search.toLowerCase()) ||
    h.email.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">My Heroes</h2>
          <p className="text-[#555] text-sm mt-1">
            {heroes.length} heroes{isPhysicalCoach && <span className="ml-2 text-[#f59e0b]">· Physical Coach</span>}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Hero</Button>
      </div>

      <input type="text" placeholder="Search heroes..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 bg-[#111] border border-[#222] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00]" />

      <div className="grid gap-3">
        {filtered.map(hero => (
          <Link key={hero.id} to={`/coach/heroes/${hero.id}`}>
            <Card className="p-5 flex items-center justify-between hover:border-[#333] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] font-bold">
                  {hero.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold">{hero.full_name}</p>
                  <p className="text-[#555] text-sm">
                    {hero.is_physical
                      ? <span className="text-[#f59e0b]">Physical · No Login</span>
                      : hero.email
                    }
                  </p>
                  <p className="text-[#444] text-xs capitalize mt-0.5">
                    {hero.goal} · {hero.start_weight ? `${hero.start_weight}kg → ${hero.target_weight}kg` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hero.is_physical && <Badge variant="muted">Physical</Badge>}
                <Badge variant={hero.plan_type === 'C' ? 'accent' : hero.plan_type === 'B' ? 'blue' : 'muted'}>
                  Plan {hero.plan_type}
                </Badge>
                <Badge variant={hero.is_active ? 'green' : 'red'}>
                  {hero.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-[#444] ml-2">→</span>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-[#555] text-lg">No heroes yet.</p>
            <p className="text-[#333] text-sm mt-1">Add your first hero to get started.</p>
          </Card>
        )}
      </div>

      {profile && (
        <AddHeroModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          coachId={profile.id}
          isPhysicalCoach={isPhysicalCoach}
        />
      )}
    </div>
  )
}
