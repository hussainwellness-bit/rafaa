import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Profile, PlanType, PlanBilling, PlansConfig } from '../../types'
import { DEFAULT_PLAN_CONFIG } from '../../types'
import { APP_CONFIG } from '../../config/app'
import Spinner from '../../components/ui/Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'splash' | 'why' | 'coaches' | 'coach_profile' | 'plans' | 'consent' | 'survey' | 'submitted'
const STEPS: Step[] = ['splash', 'why', 'coaches', 'coach_profile', 'plans', 'consent', 'survey', 'submitted']

interface FlowData {
  coach: Profile | null
  planType: PlanType | null
  planBilling: PlanBilling
}

interface SurveyData {
  full_name: string; email: string; phone: string; age: string
  gender: 'male' | 'female' | ''; weight: string; height: string
  goal: string; experience_level: string; training_days: number
  steps_target: number
  injuries: string; allergies: string; medications: string
  sleep_average: string; notes: string; health_consent: boolean
}

const EMPTY_SURVEY: SurveyData = {
  full_name: '', email: '', phone: '', age: '', gender: '',
  weight: '', height: '', goal: '', experience_level: '',
  training_days: 3, steps_target: 10000,
  injuries: '', allergies: '', medications: '',
  sleep_average: '', notes: '', health_consent: false,
}

const PLAN_COLOR: Record<PlanType, string> = { A: '#3d9fff', B: '#c8ff00', C: '#a855f7' }

// ─── Shared UI ────────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 text-[#555] hover:text-[#aaa] transition-colors font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-8">
      ← Back
    </button>
  )
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[3px] mb-1" style={{ fontSize: 38 }}>
      {children}
    </h1>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-[DM_Mono] font-bold text-[#555] uppercase tracking-[2px] mb-3">
      {children}
    </p>
  )
}

function FieldWrap({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-[DM_Mono] text-[#555] uppercase tracking-[2px]">
        {label}{required && <span className="text-[#c8ff00] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function TInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[14px]"
    />
  )
}

function PillOpt({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2.5 rounded-[100px] font-[DM_Mono] text-[10px] uppercase tracking-[2px] border transition-all"
      style={{
        borderColor: selected ? '#c8ff00' : '#2a2a2a',
        color: selected ? '#c8ff00' : '#555',
        background: selected ? 'rgba(200,255,0,0.08)' : 'transparent',
      }}>
      {label}
    </button>
  )
}

function AccentBtn({ children, onClick, disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-[100px] bg-[#c8ff00] text-[#080808] font-[DM_Mono] font-bold text-[12px] uppercase tracking-[3px] hover:bg-[#d4ff33] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
      {children}
    </button>
  )
}

// ─── STEP 1: Splash ───────────────────────────────────────────────────────────

function SplashStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden px-6">
      <style>{`
        @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.12)}}
        @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-30px,25px) scale(1.08)}}
        @keyframes splashIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{animation:'blob1 8s ease-in-out infinite',position:'absolute',top:'10%',left:'15%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(200,255,0,0.05) 0%,transparent 70%)'}}/>
        <div style={{animation:'blob2 11s ease-in-out infinite',position:'absolute',bottom:'5%',right:'10%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(200,255,0,0.04) 0%,transparent 70%)'}}/>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3 text-center w-full max-w-sm" style={{animation:'splashIn 0.6s ease-out both'}}>
        <div className="font-[Bebas_Neue] leading-none" style={{fontSize:'clamp(72px,18vw,112px)',letterSpacing:'5px'}}>
          <span className="text-[#f2f2f2]">RAFA</span>
          <span className="text-[#c8ff00]">A</span>
          <span className="text-[#f2f2f2]">TECH</span>
        </div>
        <p className="font-[Bebas_Neue] text-[#aaa]" style={{fontSize:30,direction:'rtl'}}>{APP_CONFIG.nameArabic}</p>
        <p className="font-[DM_Mono] text-[#555] uppercase" style={{fontSize:10,letterSpacing:'4px'}}>{APP_CONFIG.tagline}</p>
        <div className="mt-10 w-full">
          <AccentBtn onClick={onNext}>GET STARTED</AccentBtn>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 2: Why Rafaa ────────────────────────────────────────────────────────

const WHY_FEATURES = [
  { icon: '🎯', title: 'Personalized Plans', desc: 'Every workout designed for you by a real coach who understands your goals.' },
  { icon: '📊', title: 'Track Everything', desc: 'Log workouts, sleep, nutrition and recovery in one place, beautifully.' },
  { icon: '💪', title: 'Real Coaches', desc: 'Work with certified coaches who care about your progress and show up for you.' },
]

const HOW_STEPS = [
  { n: '01', title: 'Choose Your Coach', desc: 'Browse verified coaches and find your perfect match.' },
  { n: '02', title: 'Select Your Plan', desc: 'Pick a plan that fits your goals and budget.' },
  { n: '03', title: 'Complete Your Profile', desc: 'Share your goals, health info, and fitness level.' },
  { n: '04', title: 'Start Training', desc: 'Your coach builds your plan. You execute. Results follow.' },
]

function WhyRafaaStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-5 py-10 space-y-14">
        <BackBtn onClick={onBack} />

        {/* Why Rafaa */}
        <div>
          <PageTitle>WHY RAFAA</PageTitle>
          <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-6">What makes us different</p>
          <div className="space-y-3">
            {WHY_FEATURES.map(f => (
              <div key={f.title} className="rounded-[16px] border border-[#1e1e1e] bg-[#111] p-5"
                style={{ borderLeft: '2px solid #c8ff00' }}>
                <div className="flex items-start gap-4">
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <div>
                    <p className="text-[#f2f2f2] font-[Syne] font-bold text-sm">{f.title}</p>
                    <p className="text-[#555] font-[DM_Mono] text-[11px] mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div>
          <PageTitle>HOW IT WORKS</PageTitle>
          <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-6">Four simple steps</p>
          <div className="space-y-6">
            {HOW_STEPS.map(s => (
              <div key={s.n} className="flex items-start gap-5">
                <span className="font-[Bebas_Neue] text-[#c8ff00] shrink-0" style={{fontSize:48,lineHeight:1}}>
                  {s.n}
                </span>
                <div className="pt-1">
                  <p className="text-[#f2f2f2] font-[Syne] font-bold text-base">{s.title}</p>
                  <p className="text-[#555] font-[DM_Mono] text-[11px] mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Plans */}
        <div>
          <PageTitle>OUR PLANS</PageTitle>
          <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-6">Choose what fits</p>
          <div className="space-y-3 mb-5">
            {([
              { key: 'A' as PlanType, desc: 'For those who want to track their training' },
              { key: 'B' as PlanType, desc: 'For those who want full daily accountability' },
              { key: 'C' as PlanType, desc: 'For those who want the complete experience' },
            ]).map(({ key, desc }) => (
              <div key={key} className="rounded-[14px] border border-[#1e1e1e] bg-[#111] p-4 flex items-center gap-4">
                <span className="font-[Bebas_Neue] shrink-0" style={{fontSize:36,color:PLAN_COLOR[key],lineHeight:1}}>{key}</span>
                <div>
                  <p className="text-[#f2f2f2] font-[Syne] font-semibold text-[13px]">{DEFAULT_PLAN_CONFIG[key].name}</p>
                  <p className="text-[#555] font-[DM_Mono] text-[10px] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="font-[DM_Mono] text-[10px] text-center mb-8" style={{color:'#444'}}>
            Pricing is set by each coach — select a coach to see their rates
          </p>
          <AccentBtn onClick={onNext}>FIND YOUR COACH</AccentBtn>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3: Coach Discovery ──────────────────────────────────────────────────

function CoachDiscoveryStep({ onSelect, onBack }: {
  onSelect: (coach: Profile) => void; onBack: () => void
}) {
  const [search, setSearch] = useState('')

  const { data: coaches = [], isLoading, error: coachQueryError } = useQuery({
    queryKey: ['public-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,coach_bio,coach_specialty,years_experience,hero_count,accepting_heroes,is_active,coach_type,plans_config,is_profile_complete,role,subscription_status')
        .in('role', ['coach', 'super_admin'])
        .eq('subscription_status', 'active')
        .eq('accepting_heroes', true)
        .order('full_name')
      console.log('[CoachDiscovery] rows:', data?.length ?? 0, 'error:', error?.message ?? null)
      if (error) throw error
      return (data ?? []) as Profile[]
    },
    staleTime: 0,        // always re-fetch — never serve a stale empty result
    retry: 2,
  })

  const filtered = coaches.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.coach_specialty ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-5 py-10">
        <BackBtn onClick={onBack} />
        <PageTitle>CHOOSE YOUR COACH</PageTitle>
        <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-6">
          Select the coach you want to train with
        </p>

        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search coaches..."
          className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[13px] mb-5"
        />

        {isLoading && <div className="flex justify-center py-16"><Spinner size={28} className="text-[#c8ff00]"/></div>}
        {coachQueryError && (
          <div className="text-center py-8 text-[#ff3d3d] font-[DM_Mono] text-[11px]">
            Could not load coaches. Please try again.
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(coach => {
            const accepting = coach.accepting_heroes !== false
            return (
              <button key={coach.id} onClick={() => onSelect(coach)}
                className="w-full text-left rounded-[16px] border p-5 transition-all hover:border-[#3a3a3a]"
                style={{
                  borderColor: '#2a2a2a',
                  background: '#111',
                }}>
                <div className="flex items-start gap-4">
                  {/* Avatar — square, NOT circle */}
                  <div className="shrink-0 rounded-[12px] flex items-center justify-center font-[Bebas_Neue] text-[#c8ff00]"
                    style={{width:48,height:48,background:'rgba(200,255,0,0.15)',fontSize:20}}>
                    {coach.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-[#f2f2f2] font-[Syne] font-bold text-[15px]">{coach.full_name}</p>
                      <span className="font-[DM_Mono] text-[9px] uppercase tracking-[1.5px] px-2.5 py-1 rounded-[100px] shrink-0"
                        style={{
                          background: accepting ? 'rgba(200,255,0,0.08)' : 'rgba(255,61,61,0.06)',
                          color: accepting ? '#c8ff00' : '#ff6b6b',
                          border: `1px solid ${accepting ? 'rgba(200,255,0,0.2)' : 'rgba(255,61,61,0.2)'}`,
                        }}>
                        {accepting ? 'Accepting Heroes' : 'Full'}
                      </span>
                    </div>
                    {coach.coach_specialty && (
                      <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[1.5px] mt-0.5">
                        {coach.coach_specialty}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {coach.years_experience && (
                        <span className="text-[#aaa] font-[DM_Mono] text-[10px]">
                          {coach.years_experience} yrs experience
                        </span>
                      )}
                      {(coach.hero_count ?? 0) > 0 && (
                        <span className="text-[#555] font-[DM_Mono] text-[10px]">
                          {coach.hero_count} heroes
                        </span>
                      )}
                    </div>
                    <p className="text-[#555] font-[DM_Mono] text-[11px] mt-2 leading-relaxed line-clamp-2">
                      {coach.coach_bio || 'Coach on Rafaa platform'}
                    </p>
                  </div>
                </div>
                <p className="text-right text-[#c8ff00] font-[DM_Mono] text-[10px] uppercase tracking-[2px] mt-3">
                  View Profile →
                </p>
              </button>
            )
          })}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-[#555] font-[DM_Mono] text-[11px]">No coaches found.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 4: Coach Public Profile ─────────────────────────────────────────────

function CoachProfileStep({ coach, onApply, onBack }: {
  coach: Profile; onApply: () => void; onBack: () => void
}) {
  const plans = coach.plans_config
  const enabledPlans = (['A','B','C'] as PlanType[]).filter(k => plans ? plans[k]?.enabled : true)

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-5 py-10">
        <BackBtn onClick={onBack} />

        {/* Coach hero card */}
        <div className="rounded-[16px] border border-[#1e1e1e] bg-[#111] p-6 mb-6">
          <div className="flex items-start gap-5 mb-5">
            <div className="shrink-0 rounded-[12px] flex items-center justify-center font-[Bebas_Neue] text-[#c8ff00]"
              style={{width:64,height:64,background:'rgba(200,255,0,0.15)',fontSize:28}}>
              {coach.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[2px] leading-none" style={{fontSize:36}}>
                {coach.full_name}
              </h1>
              {coach.coach_specialty && (
                <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[2px] mt-1">
                  {coach.coach_specialty}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {coach.years_experience && (
                  <span className="text-[#aaa] font-[DM_Mono] text-[10px]">{coach.years_experience} yrs experience</span>
                )}
                {(coach.hero_count ?? 0) > 0 && (
                  <span className="text-[#555] font-[DM_Mono] text-[10px]">{coach.hero_count} heroes training</span>
                )}
                <span className="font-[DM_Mono] text-[9px] uppercase tracking-[1.5px] px-2 py-0.5 rounded-[100px]"
                  style={{background:'rgba(200,255,0,0.08)',color:'#c8ff00',border:'1px solid rgba(200,255,0,0.2)'}}>
                  Accepting Heroes
                </span>
              </div>
            </div>
          </div>
          {coach.coach_bio && (
            <p className="text-[#aaa] font-[Syne] text-[14px] leading-relaxed">{coach.coach_bio}</p>
          )}
        </div>

        {/* Available plans preview */}
        <div className="mb-8">
          <Label>Available Plans</Label>
          <div className="space-y-3">
            {enabledPlans.map(key => {
              const cfg = plans ? plans[key] : DEFAULT_PLAN_CONFIG[key]
              const color = PLAN_COLOR[key]
              const monthly = cfg.monthly
              const discountActive = cfg.discount_active && !(cfg.discount_expiry && new Date(cfg.discount_expiry) < new Date())
              const effectiveMonthly = discountActive ? Math.round(monthly * (1 - cfg.discount_percent / 100)) : monthly

              return (
                <div key={key} className="rounded-[14px] border p-4 flex items-center justify-between"
                  style={{borderColor: color + '30', background: color + '06'}}>
                  <div className="flex items-center gap-3">
                    <span className="font-[Bebas_Neue]" style={{fontSize:32,color,lineHeight:1}}>{key}</span>
                    <div>
                      <p className="text-[#f2f2f2] font-[Syne] font-bold text-[13px]">{cfg.name}</p>
                      {discountActive && cfg.discount_label && (
                        <span className="font-[DM_Mono] text-[9px] uppercase tracking-[1px] px-1.5 py-0.5 rounded-[4px]"
                          style={{background:'#c8ff00',color:'#000'}}>
                          {cfg.discount_label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {discountActive && (
                      <p className="text-[#555] text-[11px] font-[DM_Mono] line-through">{monthly} SAR</p>
                    )}
                    <p className="font-[Bebas_Neue] text-[#f2f2f2]" style={{fontSize:22,lineHeight:1}}>
                      {effectiveMonthly} <span className="font-[DM_Mono] text-[11px] text-[#555]">SAR/mo</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <AccentBtn onClick={onApply}>APPLY NOW →</AccentBtn>
      </div>
    </div>
  )
}

// ─── STEP 5: Plan Selection ───────────────────────────────────────────────────

function PlansStep({ coach, onSelect, onBack }: {
  coach: Profile; onSelect: (plan: PlanType, billing: PlanBilling) => void; onBack: () => void
}) {
  const [billing, setBilling] = useState<PlanBilling>('monthly')
  const plans: PlansConfig = coach.plans_config ?? {
    A: DEFAULT_PLAN_CONFIG.A,
    B: DEFAULT_PLAN_CONFIG.B,
    C: DEFAULT_PLAN_CONFIG.C,
  }

  const enabledPlans = (['A','B','C'] as PlanType[]).filter(k => plans[k]?.enabled)

  function getPrice(key: PlanType): number {
    const cfg = plans[key]
    const base = billing === 'monthly' ? cfg.monthly : billing === 'semi_annual' ? Math.round(cfg.semi_annual / 6) : Math.round(cfg.annual / 12)
    const discountActive = cfg.discount_active && !(cfg.discount_expiry && new Date(cfg.discount_expiry) < new Date())
    return discountActive ? Math.round(base * (1 - cfg.discount_percent / 100)) : base
  }

  function getOriginalPrice(key: PlanType): number {
    const cfg = plans[key]
    return billing === 'monthly' ? cfg.monthly : billing === 'semi_annual' ? Math.round(cfg.semi_annual / 6) : Math.round(cfg.annual / 12)
  }

  function hasDiscount(key: PlanType): boolean {
    const cfg = plans[key]
    return cfg.discount_active && !(cfg.discount_expiry && new Date(cfg.discount_expiry) < new Date())
  }

  const billingOpts: { value: PlanBilling; label: string; tag?: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'semi_annual', label: 'Semi-Annual', tag: '10% off' },
    { value: 'annual', label: 'Annual', tag: '20% off' },
  ]

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-5 py-10">
        <BackBtn onClick={onBack} />

        {/* Coach mini header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-[10px] flex items-center justify-center font-[Bebas_Neue] text-[#c8ff00]"
            style={{width:40,height:40,background:'rgba(200,255,0,0.15)',fontSize:18}}>
            {coach.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[#f2f2f2] font-[Syne] font-bold text-[15px]">{coach.full_name}</p>
            {coach.coach_specialty && (
              <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[1.5px]">{coach.coach_specialty}</p>
            )}
          </div>
        </div>

        <PageTitle>SELECT YOUR PLAN</PageTitle>
        <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-6">Choose billing cycle</p>

        {/* Billing toggle */}
        <div className="flex gap-1 bg-[#111] rounded-[12px] p-1 mb-6">
          {billingOpts.map(o => (
            <button key={o.value} type="button" onClick={() => setBilling(o.value)}
              className="flex-1 py-2 rounded-[10px] text-[10px] font-[DM_Mono] uppercase tracking-[1.5px] transition-all relative"
              style={{
                background: billing === o.value ? '#1e1e1e' : 'transparent',
                color: billing === o.value ? '#f2f2f2' : '#555',
              }}>
              {o.label}
              {o.tag && (
                <span className="absolute -top-2 -right-1 text-[8px] font-[DM_Mono] font-bold px-1.5 py-0.5 rounded-[4px]"
                  style={{background:'rgba(200,255,0,0.15)',color:'#c8ff00'}}>
                  {o.tag}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="space-y-4">
          {enabledPlans.map(key => {
            const cfg = plans[key]
            const color = PLAN_COLOR[key]
            const price = getPrice(key)
            const origPrice = getOriginalPrice(key)
            const discounted = hasDiscount(key)
            const features = cfg.features.length ? cfg.features : DEFAULT_PLAN_CONFIG[key].features

            return (
              <div key={key} className="rounded-[16px] border p-5 space-y-4"
                style={{ borderColor: key === 'C' ? color + '40' : '#2a2a2a', background: key === 'C' ? color + '06' : '#111' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-[Bebas_Neue] tracking-wide" style={{fontSize:40,color,lineHeight:1}}>{key}</span>
                      {discounted && cfg.discount_label && (
                        <span className="font-[DM_Mono] text-[9px] uppercase tracking-[1px] px-1.5 py-0.5 rounded-[4px]"
                          style={{background:'#c8ff00',color:'#000',fontWeight:700}}>
                          {cfg.discount_label}
                        </span>
                      )}
                    </div>
                    <p className="text-[#aaa] font-[Syne] font-bold text-sm">{cfg.name}</p>
                    {cfg.description && <p className="text-[#555] font-[DM_Mono] text-[10px] mt-0.5">{cfg.description}</p>}
                  </div>
                  <div className="text-right">
                    {discounted && (
                      <p className="text-[#555] font-[DM_Mono] text-[11px] line-through">{origPrice} SAR</p>
                    )}
                    <p className="font-[Bebas_Neue] text-[#f2f2f2]" style={{fontSize:28,lineHeight:1}}>
                      {price} <span className="font-[DM_Mono] text-[13px] font-normal text-[#555]">SAR</span>
                    </p>
                    <p className="text-[#444] font-[DM_Mono] text-[10px] mt-0.5">
                      {billing === 'monthly' ? '/month' : billing === 'semi_annual' ? '/mo · semi-annually' : '/mo · annually'}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#666] font-[DM_Mono] text-[11px]">
                      <span style={{color}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onSelect(key, billing)}
                  className="w-full py-3 rounded-[100px] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] transition-all"
                  style={
                    key === 'C'
                      ? { background: '#c8ff00', color: '#080808' }
                      : { border: `1px solid ${color}50`, color, background: color + '0f' }
                  }>
                  SELECT PLAN {key}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 6: Consent ──────────────────────────────────────────────────────────

function ConsentStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  function DocModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
            <h3 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[2px]" style={{fontSize:24}}>{title}</h3>
            <button onClick={onClose} className="text-[#555] hover:text-white text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 text-[#555] font-[DM_Mono] text-[12px] leading-relaxed space-y-3">
            {children}
          </div>
          <div className="px-6 py-4 border-t border-[#1a1a1a]">
            <button onClick={onClose}
              className="w-full py-3 rounded-[100px] bg-[#c8ff00] text-[#080808] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px]">
              Accept & Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-5 py-10">
        <BackBtn onClick={onBack} />
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[14px] flex items-center justify-center text-3xl mx-auto mb-4"
            style={{background:'rgba(200,255,0,0.08)',border:'1px solid rgba(200,255,0,0.15)'}}>
            🔒
          </div>
          <h1 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[3px]" style={{fontSize:28}}>BEFORE WE CONTINUE</h1>
        </div>

        <div className="rounded-[16px] border border-[#1e1e1e] bg-[#111] p-5 mb-6">
          <p className="text-[#555] font-[DM_Mono] text-[12px] leading-relaxed">
            We collect your personal information to match you with your coach and deliver your fitness plan. Your data is encrypted and never shared without your consent.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#c8ff00] cursor-pointer shrink-0" />
            <span className="font-[DM_Mono] text-[12px] text-[#555] leading-relaxed">
              I have read and agree to the{' '}
              <button type="button" onClick={() => setShowTerms(true)}
                className="text-[#c8ff00] underline hover:text-[#d4ff33]">Terms & Conditions</button>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#c8ff00] cursor-pointer shrink-0" />
            <span className="font-[DM_Mono] text-[12px] text-[#555] leading-relaxed">
              I have read and agree to the{' '}
              <button type="button" onClick={() => setShowPrivacy(true)}
                className="text-[#c8ff00] underline hover:text-[#d4ff33]">Privacy Policy</button>
            </span>
          </label>
        </div>

        <AccentBtn onClick={onNext} disabled={!(terms && privacy)}>CONTINUE</AccentBtn>

        {showTerms && (
          <DocModal title="TERMS & CONDITIONS" onClose={() => setShowTerms(false)}>
            <p className="text-[#888]">{APP_CONFIG.name} Terms &amp; Conditions</p>
            <p>By using {APP_CONFIG.name}, you agree to use the platform solely for personal fitness tracking. You agree not to misuse the service or share your account with others.</p>
            <p>All content is for informational purposes only and does not constitute medical advice. Consult a physician before starting any fitness program.</p>
            <p className="text-[#333]">Full document available at launch.</p>
          </DocModal>
        )}
        {showPrivacy && (
          <DocModal title="PRIVACY POLICY" onClose={() => setShowPrivacy(false)}>
            <p className="text-[#888]">{APP_CONFIG.name} Privacy Policy</p>
            <p><span className="text-[#888]">What we collect:</span> Name, email, phone, body metrics, fitness goals, health information.</p>
            <p><span className="text-[#888]">Why:</span> To match you with a coach and deliver your fitness plan.</p>
            <p><span className="text-[#888]">Retention:</span> Health data deleted 2 years after plan ends.</p>
            <p><span className="text-[#888]">Your rights (PDPL):</span> Right to access, rectify, and delete your data at any time.</p>
            <p><span className="text-[#888]">Sharing:</span> Only with your assigned coach. Never sold or shared without consent.</p>
            <p className="text-[#333]">Full document available at launch.</p>
          </DocModal>
        )}
      </div>
    </div>
  )
}

// ─── STEP 7: Survey ───────────────────────────────────────────────────────────

function SurveyStep({ coach, planType, planBilling, onSubmit, onBack }: {
  coach: Profile; planType: PlanType; planBilling: PlanBilling
  onSubmit: (data: SurveyData) => Promise<void>; onBack: () => void
}) {
  const [form, setForm] = useState<SurveyData>(EMPTY_SURVEY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof SurveyData>(k: K, v: SurveyData[K]) => setForm(f => ({ ...f, [k]: v }))

  const GOALS = [
    { v: 'cutting', l: 'Cutting' }, { v: 'bulking', l: 'Bulking' },
    { v: 'maintenance', l: 'Maintenance' }, { v: 'recomp', l: 'Body Recomp' },
  ]
  const LEVELS = [
    { v: 'beginner', l: 'Beginner' }, { v: 'intermediate', l: 'Intermediate' },
    { v: 'advanced', l: 'Advanced' }, { v: 'athlete', l: 'Athlete' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.phone || !form.age || !form.gender || !form.weight || !form.height || !form.goal || !form.experience_level) {
      setError('Please fill in all required fields.'); return
    }
    if (!form.health_consent) { setError('Health consent is required to submit.'); return }
    setError(''); setSubmitting(true)
    try { await onSubmit(form) }
    catch (e: unknown) { setError((e as Error).message ?? 'Submission failed.'); setSubmitting(false) }
  }

  const ta = "w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] text-[#f2f2f2] placeholder:text-[#333] focus:outline-none focus:border-[#c8ff00]/40 font-[DM_Mono] text-[13px] resize-none"

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-xl mx-auto px-5 py-10">
        <BackBtn onClick={onBack} />
        <PageTitle>YOUR APPLICATION</PageTitle>
        <p className="text-[#555] font-[DM_Mono] text-[11px] uppercase tracking-[2px] mb-8">
          {coach.full_name} · Plan {planType} · {planBilling.replace('_','-')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Personal */}
          <div>
            <Label>Personal Information</Label>
            <div className="space-y-3">
              <FieldWrap label="Full Name" required><TInput value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Your full name"/></FieldWrap>
              <FieldWrap label="Email" required><TInput type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="your@email.com"/></FieldWrap>
              <FieldWrap label="Phone" required><TInput value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+966 5X XXX XXXX"/></FieldWrap>
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Age" required><TInput type="number" value={form.age} onChange={e=>set('age',e.target.value)} placeholder="25" min={14} max={80}/></FieldWrap>
                <FieldWrap label="Gender" required>
                  <div className="flex gap-2 mt-0.5">
                    {(['male','female'] as const).map(g=>(
                      <PillOpt key={g} label={g==='male'?'♂ Male':'♀ Female'} selected={form.gender===g} onClick={()=>set('gender',g)}/>
                    ))}
                  </div>
                </FieldWrap>
              </div>
            </div>
          </div>

          {/* Body */}
          <div>
            <Label>Body Metrics</Label>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Weight (kg)" required><TInput type="number" value={form.weight} onChange={e=>set('weight',e.target.value)} placeholder="75" step="0.1"/></FieldWrap>
              <FieldWrap label="Height (cm)" required><TInput type="number" value={form.height} onChange={e=>set('height',e.target.value)} placeholder="175"/></FieldWrap>
            </div>
          </div>

          {/* Fitness */}
          <div>
            <Label>Fitness Profile</Label>
            <div className="space-y-4">
              <FieldWrap label="Goal" required>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {GOALS.map(g=><PillOpt key={g.v} label={g.l} selected={form.goal===g.v} onClick={()=>set('goal',g.v)}/>)}
                </div>
              </FieldWrap>
              <FieldWrap label="Experience Level" required>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {LEVELS.map(l=><PillOpt key={l.v} label={l.l} selected={form.experience_level===l.v} onClick={()=>set('experience_level',l.v)}/>)}
                </div>
              </FieldWrap>
              <FieldWrap label="Training Days / Week" required>
                <div className="flex gap-1.5 mt-0.5">
                  {[1,2,3,4,5,6,7].map(d=>(
                    <button key={d} type="button" onClick={()=>set('training_days',d)}
                      className="flex-1 py-2.5 rounded-[100px] font-[DM_Mono] text-[11px] font-bold border transition-all"
                      style={{
                        borderColor:form.training_days===d?'#c8ff00':'#2a2a2a',
                        color:form.training_days===d?'#c8ff00':'#555',
                        background:form.training_days===d?'rgba(200,255,0,0.08)':'transparent',
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </FieldWrap>
              <FieldWrap label="Daily Steps Target">
                <TInput type="number" value={String(form.steps_target)} onChange={e=>set('steps_target',parseInt(e.target.value)||10000)} placeholder="e.g. 10000" min={1000} max={50000} step={500}/>
                <p className="text-[#444] font-[DM_Mono] text-[10px] mt-0.5">Your coach will use this as your daily steps goal</p>
              </FieldWrap>
            </div>
          </div>

          {/* Health */}
          <div>
            <Label>Health & Safety</Label>
            <div className="rounded-[10px] px-[14px] py-3 mb-4 flex items-center gap-2"
              style={{ background: 'rgba(61,159,255,0.1)', border: '1px solid rgba(61,159,255,0.15)' }}>
              <span className="text-[13px] shrink-0">🔒</span>
              <p className="font-[DM_Mono] text-[10px] uppercase tracking-[1.5px]" style={{ color: '#3d9fff' }}>
                This information is confidential and only visible to your coach
              </p>
            </div>
            <div className="space-y-3">
              <FieldWrap label="Injuries (optional)">
                <textarea rows={3} value={form.injuries} onChange={e=>set('injuries',e.target.value)}
                  placeholder="Any current or past injuries we should know about (e.g. knee surgery, lower back pain, shoulder injury)" className={ta}/>
              </FieldWrap>
              <FieldWrap label="Allergies (optional)">
                <textarea rows={2} value={form.allergies} onChange={e=>set('allergies',e.target.value)}
                  placeholder="Food allergies or supplement intolerances" className={ta}/>
              </FieldWrap>
              <FieldWrap label="Current Medications (optional)">
                <textarea rows={2} value={form.medications} onChange={e=>set('medications',e.target.value)}
                  placeholder="Any medications that may affect training or nutrition" className={ta}/>
              </FieldWrap>
              <FieldWrap label="Average Sleep (hours/night)">
                <TInput type="number" value={form.sleep_average} onChange={e=>set('sleep_average',e.target.value)} placeholder="e.g. 7" min={1} max={24} step={0.5}/>
              </FieldWrap>
            </div>
          </div>

          {/* Goals */}
          <div>
            <Label>Your Goals</Label>
            <FieldWrap label="Additional Notes for Your Coach">
              <textarea rows={4} value={form.notes} onChange={e=>set('notes',e.target.value)}
                placeholder="Tell your coach anything — your schedule, preferences, what you want to achieve, any concerns..."
                className={ta}/>
            </FieldWrap>
          </div>

          {/* Health consent */}
          <div className="rounded-[16px] border p-5" style={{borderColor:'rgba(200,255,0,0.12)',background:'rgba(200,255,0,0.03)'}}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.health_consent} onChange={e=>set('health_consent',e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#c8ff00] cursor-pointer shrink-0"/>
              <span className="font-[DM_Mono] text-[12px] text-[#555] leading-relaxed">
                <span className="text-[#c8ff00]">Required: </span>
                I consent to my health information being processed by my coach to deliver my fitness plan, in accordance with the Privacy Policy.
              </span>
            </label>
          </div>

          {error && (() => {
            const isApproved = error.startsWith('APPROVED:')
            const msg = error.replace(/^(PENDING|APPROVED):\s*/, '')
            return (
              <div className={`p-4 rounded-[12px] border font-[DM_Mono] text-[12px] leading-relaxed ${
                isApproved
                  ? 'bg-[#c8ff00]/5 border-[#c8ff00]/30 text-[#c8ff00]'
                  : 'bg-[#ff3d3d]/5 border-[#ff3d3d]/30 text-[#ff3d3d]'
              }`}>
                {msg}
              </div>
            )
          })()}

          <AccentBtn type="submit" disabled={submitting}>
            {submitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
          </AccentBtn>
        </form>
      </div>
    </div>
  )
}

// ─── STEP 8: Submitted ────────────────────────────────────────────────────────

function SubmittedStep({ coachName, onReset }: { coachName: string; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <style>{`@keyframes checkPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="max-w-md w-full mx-auto px-5 py-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-[18px] flex items-center justify-center text-4xl mx-auto font-[Bebas_Neue] text-[#c8ff00]"
          style={{background:'rgba(200,255,0,0.08)',border:'2px solid rgba(200,255,0,0.25)',animation:'checkPop 0.5s ease-out both'}}>
          ✓
        </div>
        <div style={{animation:'fadeUp 0.5s ease-out 0.2s both'}}>
          <h1 className="font-[Bebas_Neue] text-[#f2f2f2] tracking-[2px]" style={{fontSize:38}}>
            You're on your way! 💪
          </h1>
          <p className="text-[#555] font-[DM_Mono] text-[12px] mt-2 leading-relaxed">
            Your request has been received by {coachName}.<br/>
            We'll review your application and get back to you soon.
          </p>
          <p className="text-[#333] mt-3 font-[Bebas_Neue]" style={{fontSize:20,direction:'rtl'}}>
            رفعتك في طريقها
          </p>
        </div>
        <div className="rounded-[16px] border border-[#1e1e1e] bg-[#111] p-5 text-left space-y-3"
          style={{animation:'fadeUp 0.5s ease-out 0.4s both'}}>
          <p className="text-[#555] font-[DM_Mono] text-[10px] uppercase tracking-[2px]">What happens next</p>
          {['Coach reviews your application','You receive approval notification','Complete payment to activate your plan','Start your journey'].map((s,i)=>(
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-[6px] flex items-center justify-center font-[Bebas_Neue] text-[#c8ff00] text-sm shrink-0 mt-0.5"
                style={{background:'rgba(200,255,0,0.08)',border:'1px solid rgba(200,255,0,0.2)'}}>{i+1}</span>
              <p className="text-[#666] font-[DM_Mono] text-[12px] leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
        <button onClick={onReset} style={{animation:'fadeUp 0.5s ease-out 0.6s both'}}
          className="w-full py-4 rounded-[100px] border border-[#2a2a2a] text-[#555] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] hover:border-[#555] hover:text-[#aaa] transition-all">
          BACK TO HOME
        </button>
      </div>
    </div>
  )
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

const INITIAL: FlowData = { coach: null, planType: null, planBilling: 'monthly' }

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>('splash')
  const [data, setData] = useState<FlowData>(INITIAL)

  function go(s: Step, updates?: Partial<FlowData>) {
    if (updates) setData(prev => ({ ...prev, ...updates }))
    setStep(s)
  }

  function next(updates?: Partial<FlowData>) {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) go(STEPS[idx + 1], updates)
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function handleSurveySubmit(survey: SurveyData) {
    console.log('[HeroRequest] submitting with coach_id:', data.coach!.id)

    // ── Duplicate check ────────────────────────────────────────────────────────
    const email = survey.email.trim().toLowerCase()
    const coachId = data.coach!.id
    const { data: existing } = await supabase
      .from('hero_requests')
      .select('id, status')
      .eq('email', email)
      .eq('coach_id', coachId)
      .in('status', ['pending', 'approved'])
      .limit(1)

    if (existing && existing.length > 0) {
      if (existing[0].status === 'pending') {
        throw new Error('PENDING: You already have a pending request with this coach. Please wait for their response.')
      }
      if (existing[0].status === 'approved') {
        throw new Error('APPROVED: Your request has already been approved by this coach. Check your email for next steps.')
      }
    }

    const { error } = await supabase.from('hero_requests').insert({
      coach_id: data.coach!.id,
      plan_type: data.planType,
      plan_billing: data.planBilling,
      full_name: survey.full_name.trim(),
      email: survey.email.trim().toLowerCase(),
      phone: survey.phone.trim(),
      age: parseInt(survey.age),
      gender: survey.gender || null,
      weight: survey.weight ? parseFloat(survey.weight) : null,
      height: survey.height ? parseFloat(survey.height) : null,
      goal: survey.goal || null,
      experience_level: survey.experience_level || null,
      training_days_per_week: survey.training_days,
      injuries: survey.injuries.trim() || null,
      allergies: survey.allergies.trim() || null,
      medications: survey.medications.trim() || null,
      sleep_average: survey.sleep_average ? parseFloat(survey.sleep_average) : null,
      steps_target: survey.steps_target || 10000,
      notes: survey.notes.trim() || null,
      terms_accepted: true,
      privacy_accepted: true,
      health_consent: survey.health_consent,
      consent_timestamp: new Date().toISOString(),
      status: 'pending',
    })
    if (error) throw new Error(error.message)

    // Notify the coach (anon insert allowed by DB policy)
    await supabase.from('notifications').insert({
      user_id: data.coach!.id,
      title: 'New Hero Request',
      body: `${survey.full_name} has applied for Plan ${data.planType}.`,
      type: 'hero_request_received',
    })

    next()
  }

  return (
    <>
      {step === 'splash'        && <SplashStep onNext={() => next()} />}
      {step === 'why'           && <WhyRafaaStep onNext={() => next()} onBack={back} />}
      {step === 'coaches'       && <CoachDiscoveryStep onSelect={c => next({ coach: c })} onBack={back} />}
      {step === 'coach_profile' && data.coach && (
        <CoachProfileStep coach={data.coach} onApply={() => next()} onBack={back} />
      )}
      {step === 'plans'         && data.coach && (
        <PlansStep coach={data.coach} onSelect={(t, b) => next({ planType: t, planBilling: b })} onBack={back} />
      )}
      {step === 'consent'       && <ConsentStep onNext={() => next()} onBack={back} />}
      {step === 'survey'        && data.coach && data.planType && (
        <SurveyStep
          coach={data.coach} planType={data.planType} planBilling={data.planBilling}
          onSubmit={handleSurveySubmit} onBack={back}
        />
      )}
      {step === 'submitted'     && (
        <SubmittedStep
          coachName={data.coach?.full_name ?? 'your coach'}
          onReset={() => { setStep('splash'); setData(INITIAL) }}
        />
      )}
    </>
  )
}
