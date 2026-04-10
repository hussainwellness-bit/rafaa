import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { PlanType, PlanBilling, PlansConfig, PlanConfig } from '../../types'
import { DEFAULT_PLAN_CONFIG } from '../../types'
import Toast, { useToast } from '../../components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanForm {
  enabled: boolean
  name: string
  description: string
  featuresText: string
  monthly: string
  semi_annual: string
  annual: string
  discount_active: boolean
  discount_percent: string
  discount_label: string
  discount_expiry: string
}

function configToForm(cfg: PlanConfig): PlanForm {
  return {
    enabled: cfg.enabled,
    name: cfg.name,
    description: cfg.description,
    featuresText: cfg.features.join('\n'),
    monthly: String(cfg.monthly),
    semi_annual: String(cfg.semi_annual),
    annual: String(cfg.annual),
    discount_active: cfg.discount_active,
    discount_percent: String(cfg.discount_percent),
    discount_label: cfg.discount_label,
    discount_expiry: cfg.discount_expiry ?? '',
  }
}

function formToConfig(form: PlanForm): PlanConfig {
  return {
    enabled: form.enabled,
    name: form.name,
    description: form.description,
    features: form.featuresText.split('\n').map(s => s.trim()).filter(Boolean),
    monthly: parseFloat(form.monthly) || 0,
    semi_annual: parseFloat(form.semi_annual) || 0,
    annual: parseFloat(form.annual) || 0,
    discount_active: form.discount_active,
    discount_percent: parseFloat(form.discount_percent) || 0,
    discount_label: form.discount_label,
    discount_expiry: form.discount_expiry || null,
  }
}

function isDiscountExpired(expiry: string | null): boolean {
  if (!expiry) return false
  return new Date(expiry) < new Date()
}

// ─── Plan color map ───────────────────────────────────────────────────────────

const PLAN_COLOR: Record<PlanType, string> = {
  A: '#3d9fff',
  B: '#c8ff00',
  C: '#a855f7',
}

// ─── Live Preview Card ────────────────────────────────────────────────────────

function LivePreview({ planKey, form, billing }: { planKey: PlanType; form: PlanForm; billing: PlanBilling }) {
  const monthly = parseFloat(form.monthly) || 0
  const semi = parseFloat(form.semi_annual) || 0
  const annual = parseFloat(form.annual) || 0
  const discountPct = parseFloat(form.discount_percent) || 0
  const discountActive = form.discount_active && !isDiscountExpired(form.discount_expiry)

  const basePrice = billing === 'monthly' ? monthly : billing === 'semi_annual' ? Math.round(semi / 6) : Math.round(annual / 12)
  // Custom discount only applies to the monthly price — semi-annual/annual are independent pricing tiers
  const discountApplies = discountActive && billing === 'monthly'
  const discountedMonthly = discountApplies ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice

  const color = PLAN_COLOR[planKey]
  const features = form.featuresText.split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <div className="rounded-[16px] border p-5 space-y-4" style={{ borderColor: color + '40', background: color + '06' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-[Bebas_Neue] tracking-wide" style={{ fontSize: 40, color, lineHeight: 1 }}>
              {planKey}
            </span>
            {discountApplies && form.discount_label && (
              <span className="text-[9px] font-[DM_Mono] font-bold uppercase tracking-widest px-2 py-1 rounded-[4px]"
                style={{ background: '#c8ff00', color: '#000' }}>
                {form.discount_label}
              </span>
            )}
          </div>
          <p className="text-[#aaa] text-sm font-[Syne] font-bold">{form.name || `Plan ${planKey}`}</p>
        </div>
        <div className="text-right">
          {discountApplies && (
            <p className="text-[#555] text-xs font-[DM_Mono] line-through">{basePrice} SAR</p>
          )}
          <p className="font-[Bebas_Neue] text-white" style={{ fontSize: 28, lineHeight: 1 }}>
            {discountedMonthly} <span className="text-base font-normal text-[#555]">SAR</span>
          </p>
          <p className="text-[#444] text-xs font-[DM_Mono] mt-0.5">
            {billing === 'monthly' ? '/month' : billing === 'semi_annual' ? '/mo · billed semi-annually' : '/mo · billed annually'}
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {features.slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[#666]">
            <span style={{ color }}>✓</span>
            {f}
          </li>
        ))}
        {features.length === 0 && <li className="text-[#333] text-xs font-[DM_Mono]">Add features above…</li>}
      </ul>
      <button
        className="w-full py-2.5 rounded-[100px] text-[11px] font-[DM_Mono] font-bold uppercase tracking-[2px] transition-all"
        style={{ border: `1px solid ${color}50`, color, background: color + '12' }}
      >
        SELECT PLAN {planKey}
      </button>
    </div>
  )
}

// ─── Single Plan Editor ───────────────────────────────────────────────────────

function PlanEditor({ planKey, form, onChange }: {
  planKey: PlanType
  form: PlanForm
  onChange: (updated: PlanForm) => void
}) {
  const [billingPreview, setBillingPreview] = useState<PlanBilling>('monthly')
  const color = PLAN_COLOR[planKey]

  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => onChange({ ...form, [k]: v })

  function autoCalculate() {
    const m = parseFloat(form.monthly) || 0
    onChange({
      ...form,
      semi_annual: String(Math.round(m * 6 * 0.9)),
      annual: String(Math.round(m * 12 * 0.8)),
    })
  }

  const discountExpired = isDiscountExpired(form.discount_expiry)

  return (
    <div className={`rounded-[16px] border transition-all ${form.enabled ? 'border-[#1e1e1e]' : 'border-[#111] opacity-60'} bg-[#111]`}>
      {/* Plan header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <span className="font-[Bebas_Neue] tracking-wide" style={{ fontSize: 36, color, lineHeight: 1 }}>
            PLAN {planKey}
          </span>
          <span className="text-[#555] text-xs font-[DM_Mono] uppercase tracking-widest">
            {form.name || DEFAULT_PLAN_CONFIG[planKey].name}
          </span>
        </div>
        {/* Enable toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-[DM_Mono] text-[#555] uppercase tracking-widest">
            {form.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={() => set('enabled', !form.enabled)}
            className="relative transition-colors"
            style={{
              width: 40, height: 22, borderRadius: 100,
              background: form.enabled ? '#c8ff00' : '#2a2a2a',
            }}
          >
            <span className="absolute top-[3px] transition-transform rounded-full bg-white"
              style={{
                width: 16, height: 16,
                left: 3,
                transform: form.enabled ? 'translateX(18px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>

      {form.enabled && (
        <div className="divide-y divide-[#1a1a1a]">
          {/* Plan Info */}
          <div className="px-5 py-5 space-y-3">
            <p className="text-[9px] font-[DM_Mono] font-bold text-[#444] uppercase tracking-[2px] mb-4">Plan Info</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#555] font-[DM_Mono]">Plan Name</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder={DEFAULT_PLAN_CONFIG[planKey].name}
                className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#555] font-[DM_Mono]">Short Description (shown below plan name)</label>
              <input
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional tagline for this plan"
                className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#555] font-[DM_Mono]">Features (one per line)</label>
              <textarea
                rows={4}
                value={form.featuresText}
                onChange={e => set('featuresText', e.target.value)}
                placeholder={DEFAULT_PLAN_CONFIG[planKey].features.join('\n')}
                className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[13px] resize-none"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="px-5 py-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-[DM_Mono] font-bold text-[#444] uppercase tracking-[2px]">Pricing (SAR)</p>
              <button
                type="button"
                onClick={autoCalculate}
                className="text-[10px] font-[DM_Mono] text-[#c8ff00]/70 hover:text-[#c8ff00] border border-[#c8ff00]/20 hover:border-[#c8ff00]/40 px-3 py-1.5 rounded-[100px] transition-all uppercase tracking-widest"
              >
                Auto-calc ↻
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'monthly' as const, label: 'Monthly' },
                { key: 'semi_annual' as const, label: 'Semi-Annual' },
                { key: 'annual' as const, label: 'Annual' },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-[DM_Mono] text-[#444] uppercase tracking-widest">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      className="w-full px-3 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[15px] pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] text-xs font-[DM_Mono]">SAR</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[#333] text-[10px] font-[DM_Mono]">
              Auto-calc: semi-annual = monthly × 6 × 0.90 · annual = monthly × 12 × 0.80
            </p>
          </div>

          {/* Discount */}
          <div className="px-5 py-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-[DM_Mono] font-bold text-[#444] uppercase tracking-[2px]">Discount</p>
              <div className="flex items-center gap-2">
                {discountExpired && form.discount_active && (
                  <span className="text-[9px] font-[DM_Mono] text-[#ff3d3d] uppercase tracking-widest">Expired</span>
                )}
                <button
                  type="button"
                  onClick={() => set('discount_active', !form.discount_active)}
                  className="relative transition-colors"
                  style={{
                    width: 36, height: 20, borderRadius: 100,
                    background: form.discount_active && !discountExpired ? '#c8ff00' : '#2a2a2a',
                  }}
                >
                  <span className="absolute top-[2px] transition-transform rounded-full bg-white"
                    style={{
                      width: 16, height: 16,
                      left: 2,
                      transform: form.discount_active ? 'translateX(16px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>
            </div>

            {form.discount_active && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-[DM_Mono] text-[#444] uppercase tracking-widest">Discount %</label>
                  <input
                    type="number" min={0} max={100}
                    value={form.discount_percent}
                    onChange={e => set('discount_percent', e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#c8ff00] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[15px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-[DM_Mono] text-[#444] uppercase tracking-widest">Expiry (optional)</label>
                  <input
                    type="date"
                    value={form.discount_expiry}
                    onChange={e => set('discount_expiry', e.target.value)}
                    className="w-full px-3 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[13px]"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] font-[DM_Mono] text-[#444] uppercase tracking-widest">Discount Label</label>
                  <input
                    value={form.discount_label}
                    onChange={e => set('discount_label', e.target.value)}
                    placeholder='e.g. "Ramadan Special" or "Launch Offer"'
                    className="w-full px-3 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[13px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="px-5 py-5 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-[DM_Mono] font-bold text-[#444] uppercase tracking-[2px]">Preview</p>
              <div className="flex gap-1 bg-[#0d0d0d] rounded-[8px] p-0.5">
                {(['monthly', 'semi_annual', 'annual'] as PlanBilling[]).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBillingPreview(b)}
                    className="px-2.5 py-1 rounded-[6px] text-[9px] font-[DM_Mono] uppercase tracking-widest transition-all"
                    style={{
                      background: billingPreview === b ? '#1e1e1e' : 'transparent',
                      color: billingPreview === b ? '#f2f2f2' : '#555',
                    }}
                  >
                    {b === 'monthly' ? 'Mo' : b === 'semi_annual' ? '6Mo' : 'Yr'}
                  </button>
                ))}
              </div>
            </div>
            <LivePreview planKey={planKey} form={form} billing={billingPreview} />
          </div>
        </div>
      )}

      {!form.enabled && (
        <div className="px-5 py-4 text-[#333] text-xs font-[DM_Mono]">
          This plan is hidden from heroes on the discovery page.
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PLAN_KEYS: PlanType[] = ['A', 'B', 'C']

function initForms(plansConfig?: PlansConfig | null): Record<PlanType, PlanForm> {
  return {
    A: configToForm(plansConfig?.A ?? DEFAULT_PLAN_CONFIG.A),
    B: configToForm(plansConfig?.B ?? DEFAULT_PLAN_CONFIG.B),
    C: configToForm(plansConfig?.C ?? DEFAULT_PLAN_CONFIG.C),
  }
}

export default function CoachPlanSettings() {
  const { profile, setProfile } = useAuthStore()
  const qc = useQueryClient()
  const { toast, showToast } = useToast()

  const [plans, setPlans] = useState<Record<PlanType, PlanForm>>(() =>
    initForms(profile?.plans_config)
  )
  const [bio, setBio] = useState(profile?.coach_bio ?? '')
  const [specialty, setSpecialty] = useState(profile?.coach_specialty ?? '')
  const [years, setYears] = useState(String(profile?.years_experience ?? ''))
  const [accepting, setAccepting] = useState(profile?.accepting_heroes !== false)
  useEffect(() => {
    if (profile) {
      setPlans(initForms(profile.plans_config))
      setBio(profile.coach_bio ?? '')
      setSpecialty(profile.coach_specialty ?? '')
      setYears(String(profile.years_experience ?? ''))
      setAccepting(profile.accepting_heroes !== false)
    }
  }, [profile?.id])

  function updatePlan(planKey: PlanType, updated: PlanForm) {
    setPlans(prev => ({ ...prev, [planKey]: updated }))
  }

  const save = useMutation({
    mutationFn: async () => {
      const plans_config: PlansConfig = {
        A: formToConfig(plans.A),
        B: formToConfig(plans.B),
        C: formToConfig(plans.C),
      }
      const { error } = await supabase.from('profiles').update({
        plans_config,
        coach_bio: bio || null,
        coach_specialty: specialty || null,
        years_experience: parseInt(years) || null,
        accepting_heroes: accepting,
      }).eq('id', profile!.id)
      if (error) throw error
      return plans_config
    },
    onSuccess: (plans_config) => {
      if (profile) {
        setProfile({
          ...profile,
          plans_config,
          coach_bio: bio || undefined,
          coach_specialty: specialty || undefined,
          years_experience: parseInt(years) || undefined,
          accepting_heroes: accepting,
        })
      }
      qc.invalidateQueries({ queryKey: ['admin-coaches'] })
      showToast('success', 'Plan settings saved ✓')
    },
    onError: (e: Error) => {
      const msg = e.message ?? ''
      if (msg.includes('column') || msg.includes('schema') || msg.includes('accepting_heroes') || msg.includes('plans_config')) {
        showToast('error', 'Please refresh the page and try again')
      } else {
        showToast('error', msg)
      }
    },
  })

  // Profile completion check — only bio and specialty are required
  const isComplete = bio.trim().length > 0 && specialty.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Plan Settings</h2>
        <p className="text-[#555] text-sm mt-1">Configure your plans, pricing, and public profile</p>
      </div>

      {/* Profile completion warning */}
      {!isComplete && (
        <div className="flex items-center gap-3 p-4 bg-[#ff3d3d]/5 border border-[#ff3d3d]/20 rounded-[14px]">
          <span className="text-[#ff3d3d] text-xl">⚠</span>
          <div>
            <p className="text-white text-sm font-semibold">Profile incomplete</p>
            <p className="text-[#555] text-xs mt-0.5">
              Add your bio and specialty to appear on the hero discovery page.
            </p>
          </div>
        </div>
      )}

      {/* Public Profile section */}
      <div className="rounded-[16px] border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
        <p className="text-[9px] font-[DM_Mono] font-bold text-[#555] uppercase tracking-[2px]">Public Profile</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#555] font-[DM_Mono]">Years of Experience</label>
            <input
              type="number" min={0} max={50}
              value={years}
              onChange={e => setYears(e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[14px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#555] font-[DM_Mono]">Specialty <span className="text-[#ff3d3d]">*</span></label>
            <input
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="e.g. Fat Loss · Muscle Building"
              className={`w-full px-4 py-3 bg-[#1e1e1e] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none font-[DM_Mono] text-[14px] border ${
                specialty.trim().length === 0 ? 'border-[#ff3d3d]/50 focus:border-[#ff3d3d]' : 'border-[#2a2a2a] focus:border-[#c8ff00]/40'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#555] font-[DM_Mono]">Bio <span className="text-[#ff3d3d]">*</span></label>
          <textarea
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell heroes about yourself and your coaching approach..."
            className={`w-full px-4 py-3 bg-[#1e1e1e] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none font-[DM_Mono] text-[13px] resize-none border ${
              bio.trim().length === 0 ? 'border-[#ff3d3d]/50 focus:border-[#ff3d3d]' : 'border-[#2a2a2a] focus:border-[#c8ff00]/40'
            }`}
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-[#1a1a1a]">
          <div>
            <p className="text-white text-sm">Accepting New Heroes</p>
            <p className="text-[#555] text-xs mt-0.5">When off, your card shows "Full" on the discovery page</p>
          </div>
          <button
            type="button"
            onClick={() => setAccepting(v => !v)}
            className="relative transition-colors"
            style={{
              width: 40, height: 22, borderRadius: 100,
              background: accepting ? '#c8ff00' : '#2a2a2a',
            }}
          >
            <span className="absolute top-[3px] transition-transform rounded-full bg-white"
              style={{ width: 16, height: 16, left: 3, transform: accepting ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* Plan editors */}
      <div className="space-y-5">
        {PLAN_KEYS.map(key => (
          <PlanEditor
            key={key}
            planKey={key}
            form={plans[key]}
            onChange={updated => updatePlan(key, updated)}
          />
        ))}
      </div>

      {/* Save */}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="w-full py-4 rounded-[100px] bg-[#c8ff00] text-[#080808] font-[DM_Mono] font-bold text-[12px] uppercase tracking-[3px] hover:bg-[#d4ff33] transition-all disabled:opacity-40"
      >
        {save.isPending ? 'SAVING...' : 'SAVE PLAN SETTINGS'}
      </button>

      <Toast toast={toast} />
    </div>
  )
}
