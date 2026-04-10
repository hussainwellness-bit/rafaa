import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { SubscriptionPlan } from '../../types'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLANS: { id: SubscriptionPlan; label: string; price: number; tag: string }[] = [
  { id: '3_months', label: '3 MONTHS',  price: 1500, tag: 'Best to start' },
  { id: '6_months', label: '6 MONTHS',  price: 2900, tag: 'Save 3%' },
  { id: '1_year',   label: '1 YEAR',    price: 5500, tag: 'Best value' },
]

// ─── Submitted screen ─────────────────────────────────────────────────────────

function SubmittedScreen() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center text-4xl mx-auto">
          ✅
        </div>
        <div className="space-y-3">
          <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">APPLICATION SUBMITTED! 🎉</h1>
          <p className="text-[#666] text-[15px] leading-relaxed">
            Your application has been received. Our team will review it and get back to you within 24–48 hours.
          </p>
        </div>

        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-[16px] p-6 text-left space-y-3">
          <p className="text-[#888] text-xs font-bold uppercase tracking-widest">What happens next</p>
          {[
            'We review your application',
            'You receive an approval notification',
            'Complete payment to activate your account',
            'Set up your profile and start coaching',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[#aaa] text-[14px] leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        <Button onClick={() => navigate('/')} className="w-full">Back to Home</Button>
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function CoachApply() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    years_experience: '',
    bio: '',
    subscription_plan: '' as SubscriptionPlan | '',
    terms: false,
    privacy: false,
  })

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const selectedPlan = PLANS.find(p => p.id === form.subscription_plan)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.subscription_plan) { setError('Please select a subscription plan'); return }
    if (!form.terms || !form.privacy) { setError('Please accept both Terms & Conditions and Privacy Policy'); return }

    setSubmitting(true)
    try {
      const { error: insertErr } = await supabase.from('coach_requests').insert({
        full_name:         form.full_name.trim(),
        email:             form.email.trim().toLowerCase(),
        phone:             form.phone.trim() || null,
        specialty:         form.specialty.trim() || null,
        years_experience:  form.years_experience ? parseInt(form.years_experience) : null,
        bio:               form.bio.trim() || null,
        subscription_plan: form.subscription_plan,
        subscription_price: selectedPlan?.price ?? null,
        terms_accepted:    true,
        consent_timestamp: new Date().toISOString(),
        status:            'pending',
      })
      if (insertErr) throw new Error(insertErr.message)
      setSubmitted(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <SubmittedScreen />

  return (
    <div className="min-h-screen bg-[#080808] pb-20">
      <div className="max-w-lg mx-auto px-5 pt-10 pb-10 space-y-8">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/')} className="text-[#555] hover:text-white text-sm transition-colors mb-6 block">
            ← Back
          </button>
          <h1 className="font-[Bebas_Neue] text-5xl text-white tracking-wide leading-none">JOIN AS A COACH</h1>
          <p className="text-[#555] text-[14px] mt-2 font-[DM_Mono]">Apply to become a RafaaTech coach</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Personal Info */}
          <div className="space-y-4">
            <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Personal Info</p>
            <Input label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            <Input label="Email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+966..." />
          </div>

          {/* Professional Info */}
          <div className="space-y-4">
            <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Professional Info</p>
            <Input
              label="Specialty"
              required
              value={form.specialty}
              onChange={e => set('specialty', e.target.value)}
              placeholder="e.g. Fat Loss · Muscle Building"
            />
            <Input
              label="Years of Experience"
              type="number"
              required
              min={0}
              max={50}
              value={form.years_experience}
              onChange={e => set('years_experience', e.target.value)}
              placeholder="e.g. 5"
            />
            <div className="flex flex-col gap-2">
              <label className="text-[15px] text-[#888] font-semibold">Bio <span className="text-[#ff3d3d]">*</span></label>
              <textarea
                required
                rows={4}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Tell heroes about yourself and your coaching approach..."
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#333] rounded-[14px] text-white text-[15px] placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none transition-colors"
              />
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="space-y-4">
            <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Subscription Plan</p>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map(plan => {
                const selected = form.subscription_plan === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set('subscription_plan', plan.id)}
                    className="rounded-[14px] border p-4 text-left space-y-2 transition-all active:scale-[0.98]"
                    style={selected
                      ? { borderColor: '#c8ff00', background: 'rgba(200,255,0,0.06)' }
                      : { borderColor: '#222', background: '#0e0e0e' }
                    }
                  >
                    <p className="font-[Bebas_Neue] text-white text-[15px] tracking-wide leading-tight">{plan.label}</p>
                    <p className="font-[DM_Mono] font-bold text-[13px]"
                      style={{ color: selected ? '#c8ff00' : '#aaa' }}>
                      {plan.price.toLocaleString()} SAR
                    </p>
                    <p className="text-[#555] text-[10px]">{plan.tag}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-3">
            <p className="text-[#888] text-xs font-bold uppercase tracking-widest">Consent</p>
            {[
              { key: 'terms' as const, label: 'I have read and agree to the Terms & Conditions' },
              { key: 'privacy' as const, label: 'I have read and agree to the Privacy Policy' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => set(key, !form[key])}
                  className="w-5 h-5 rounded-[5px] border flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={form[key]
                    ? { background: '#c8ff00', borderColor: '#c8ff00' }
                    : { background: 'transparent', borderColor: '#444' }
                  }
                >
                  {form[key] && <span className="text-[#080808] text-xs font-bold">✓</span>}
                </div>
                <span className="text-[#aaa] text-[14px] leading-relaxed">{label}</span>
              </label>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-[12px]">
              <p className="text-[#ff3d3d] text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </div>
    </div>
  )
}
