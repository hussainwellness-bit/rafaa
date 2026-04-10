import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { HeroRequest, Profile } from '../../types'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Toast, { useToast } from '../../components/ui/Toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function calculatePlanEnd(billing: string): string {
  const date = new Date()
  if (billing === 'monthly')     date.setMonth(date.getMonth() + 1)
  if (billing === 'semi_annual') date.setMonth(date.getMonth() + 6)
  if (billing === 'annual')      date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

// ─── Status badge map ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<HeroRequest['status'], { label: string; variant: 'accent' | 'muted' | 'green' | 'red' | 'blue' }> = {
  pending:         { label: 'Pending Review',   variant: 'accent' },
  approved:        { label: 'Approved',         variant: 'green' },
  declined:        { label: 'Declined',         variant: 'red' },
  payment_pending: { label: 'Awaiting Payment', variant: 'blue' },
  active:          { label: 'Active',           variant: 'green' },
}

// ─── RequestCard ──────────────────────────────────────────────────────────────

function RequestCard({ req, onApprove, onDecline, approving, declining }: {
  req: HeroRequest
  onApprove: (req: HeroRequest) => void
  onDecline: (id: string, reason: string) => void
  approving: boolean
  declining: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const s = STATUS_BADGE[req.status] ?? { label: req.status, variant: 'muted' as const }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] font-bold text-sm shrink-0">
              {req.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold">{req.full_name}</p>
              <p className="text-[#555] text-xs">{req.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Badge variant="muted">Plan {req.plan_type}</Badge>
          <Badge variant="muted">{req.plan_billing?.replace('_', '-')}</Badge>
          <span className="text-[#444] text-xs font-[DM_Mono]">{timeAgo(req.created_at)}</span>
        </div>
      </div>

      {/* Actions (pending only) */}
      {req.status === 'pending' && (
        <div className="px-5 pb-4 flex gap-2">
          <button
            onClick={() => onApprove(req)}
            disabled={approving}
            className="flex-1 py-2.5 rounded-[10px] bg-[#c8ff00] text-[#080808] font-semibold text-sm hover:bg-[#d4ff33] transition-colors disabled:opacity-50"
          >
            {approving ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowDecline(true)}
            disabled={declining}
            className="flex-1 py-2.5 rounded-[10px] border border-[#ff3d3d]/30 text-[#ff3d3d]/70 hover:text-[#ff3d3d] hover:border-[#ff3d3d]/60 font-semibold text-sm transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {/* Declined reason */}
      {req.status === 'declined' && req.decline_reason && (
        <div className="px-5 pb-4">
          <p className="text-[#555] text-xs"><span className="text-[#ff3d3d]/60">Reason:</span> {req.decline_reason}</p>
        </div>
      )}

      {/* Approved note */}
      {req.status === 'approved' && (
        <div className="px-5 pb-4">
          <p className="text-[#555] text-xs">Hero account created. They appear in <span className="text-[#c8ff00]">My Heroes</span>.</p>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 border-t border-[#1a1a1a] text-[#444] hover:text-[#888] text-xs font-medium transition-colors text-left flex items-center justify-between"
      >
        <span>Application details</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[#111] px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['Phone', req.phone],
              ['Age', req.age ? `${req.age} yrs` : '—'],
              ['Gender', req.gender ?? '—'],
              ['Weight', req.weight ? `${req.weight} kg` : '—'],
              ['Height', req.height ? `${req.height} cm` : '—'],
              ['Goal', req.goal ?? '—'],
              ['Experience', req.experience_level ?? '—'],
              ['Training Days', req.training_days_per_week ? `${req.training_days_per_week}x/week` : '—'],
              ['Sleep Avg', req.sleep_average ? `${req.sleep_average}h/night` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[#444] text-xs">{k}</p>
                <p className="text-[#888] capitalize">{v}</p>
              </div>
            ))}
          </div>

          {req.injuries && (
            <div>
              <p className="text-[#444] text-xs mb-1">Injuries</p>
              <p className="text-[#888] text-sm">{req.injuries}</p>
            </div>
          )}
          {req.allergies && (
            <div>
              <p className="text-[#444] text-xs mb-1">Allergies</p>
              <p className="text-[#888] text-sm">{req.allergies}</p>
            </div>
          )}
          {req.medications && (
            <div>
              <p className="text-[#444] text-xs mb-1">Medications</p>
              <p className="text-[#888] text-sm">{req.medications}</p>
            </div>
          )}
          {req.notes && (
            <div>
              <p className="text-[#444] text-xs mb-1">Notes from applicant</p>
              <p className="text-[#888] text-sm leading-relaxed">{req.notes}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#111]">
            {[
              ['Terms accepted', req.terms_accepted],
              ['Privacy accepted', req.privacy_accepted],
              ['Health consent', req.health_consent],
            ].map(([k, v]) => (
              <span key={String(k)} className={`text-xs px-2 py-1 rounded-[100px] border ${
                v ? 'border-green-500/20 text-green-400/70' : 'border-[#333] text-[#555]'
              }`}>
                {v ? '✓' : '✗'} {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decline modal */}
      {showDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDecline(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-[20px] p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Decline Request</h3>
            <p className="text-[#555] text-sm">Optionally add a reason for {req.full_name}.</p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Optional reason..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none resize-none text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDecline(false)}
                className="flex-1 py-2.5 border border-[#333] text-[#888] rounded-[10px] text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDecline(req.id, declineReason); setShowDecline(false) }}
                disabled={declining}
                className="flex-1 py-2.5 bg-[#ff3d3d] text-white font-semibold rounded-[10px] text-sm hover:bg-[#ff5555] transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoachRequests() {
  const navigate = useNavigate()
  const { profile, setProfile } = useAuthStore()
  const qc = useQueryClient()
  const { toast, showToast } = useToast()
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  const coachId = profile?.id ?? ''

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['coach-requests', coachId],
    queryFn: async () => {
      // Always use auth.uid() — this is what RLS compares against coach_id
      const { data: { user } } = await supabase.auth.getUser()
      const authId = user?.id ?? ''
      console.log('[CoachRequests] auth user id:', authId)
      console.log('[CoachRequests] profile?.id:', coachId)
      if (authId !== coachId) {
        console.warn('[CoachRequests] MISMATCH — auth id differs from profile.id, using auth id for query')
      }

      const { data, error } = await supabase
        .from('hero_requests')
        .select('*')
        .eq('coach_id', authId)
        .order('created_at', { ascending: false })
      console.log('[CoachRequests] requests data:', data)
      console.log('[CoachRequests] requests error:', error)
      return (data ?? []) as HeroRequest[]
    },
    enabled: !!coachId,
  })

  const displayed = filter === 'pending'
    ? requests.filter(r => r.status === 'pending')
    : requests

  const pendingCount = requests.filter(r => r.status === 'pending').length

  // ─── Approve ──────────────────────────────────────────────────────────────

  const approve = useMutation({
    mutationFn: async (req: HeroRequest): Promise<{ hero: Profile; requestId: string }> => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const authId = authUser?.id ?? coachId
      console.log('[Approve] START — request id:', req.id, 'auth id:', authId, 'profile id:', coachId)

      // Step 1 — mark request approved
      console.log('[Approve] Step 1: updating hero_requests status → approved')
      const { error: reqErr } = await supabase
        .from('hero_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', req.id)
      if (reqErr) {
        console.error('[Approve] Step 1 FAILED:', reqErr.message)
        throw new Error(`Step 1 (update request): ${reqErr.message}`)
      }
      console.log('[Approve] Step 1 OK')

      // Step 2 — create hero profile
      const newHeroId = crypto.randomUUID()
      const today = new Date().toISOString().split('T')[0]
      const planEnd = calculatePlanEnd(req.plan_billing)
      const journalConfig = req.plan_type === 'A'
        ? { steps: false, cardio: false, sleep: false, water: false, body_weight: false, mood: false, soreness: false }
        : { steps: true,  cardio: true,  sleep: true,  water: true,  body_weight: true,  mood: true,  soreness: true  }
      const nutritionTargets = req.plan_type === 'C'
        ? { calories: 0, protein: 0, carbs: 0, fats: 0 }
        : null
      console.log('[NutritionDebug] CoachRequests approve — plan_type:', req.plan_type, 'nutritionTargets being set:', nutritionTargets)

      const heroRow = {
        id:               newHeroId,
        email:            req.email,
        full_name:        req.full_name,
        role:             'hero',
        coach_id:         authId,
        plan_type:        req.plan_type,
        plan_billing:     req.plan_billing,
        plan_start:       today,
        plan_end:         planEnd,
        is_active:        false,
        goal:             req.goal ?? null,
        height:           req.height ?? null,
        start_weight:     req.weight ?? null,
        steps_target:     req.steps_target ?? 10000,
        journal_config:   journalConfig,
        nutrition_targets: nutritionTargets,
        phone:            req.phone ?? null,
        gender:           req.gender ?? null,
        created_at:       new Date().toISOString(),
      }

      console.log('[Approve] Step 2: inserting hero profile, id:', newHeroId, 'coach_id:', authId)
      const { data: heroData, error: heroErr } = await supabase
        .from('profiles')
        .insert(heroRow)
        .select()
        .single()
      if (heroErr) {
        console.error('[Approve] Step 2 FAILED:', heroErr.message)
        throw new Error(`Step 2 (create hero profile): ${heroErr.message}`)
      }
      console.log('[Approve] Step 2 OK — hero profile created:', heroData.id)

      // Step 3 — link hero back to request
      console.log('[Approve] Step 3: linking hero id to request')
      const { error: linkErr } = await supabase
        .from('hero_requests')
        .update({ linked_hero_id: newHeroId })
        .eq('id', req.id)
      if (linkErr) {
        // Non-fatal — hero was already created; log but don't throw
        console.warn('[Approve] Step 3 WARN (non-fatal):', linkErr.message)
      } else {
        console.log('[Approve] Step 3 OK')
      }

      // Step 4 — notification for the hero profile
      console.log('[Approve] Step 4: inserting notification')
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert({
          user_id: newHeroId,
          title:   'Request Approved! 🎉',
          body:    'Your application has been approved. Contact your coach for payment details.',
          type:    'request_approved',
          read:    false,
        })
      if (notifErr) {
        // Non-fatal — hero account is created; notification is nice-to-have
        console.warn('[Approve] Step 4 WARN (non-fatal):', notifErr.message)
      } else {
        console.log('[Approve] Step 4 OK')
      }

      // Step 5 — increment coach hero_count
      const currentCount = profile?.hero_count ?? 0
      const newCount = currentCount + 1
      console.log('[Approve] Step 5: incrementing hero_count', currentCount, '→', newCount)
      const { error: countErr } = await supabase
        .from('profiles')
        .update({ hero_count: newCount })
        .eq('id', authId)
      if (countErr) {
        console.warn('[Approve] Step 5 WARN (non-fatal):', countErr.message)
      } else {
        console.log('[Approve] Step 5 OK')
      }

      // Step 6 — send approval notification email (non-fatal)
      console.log('[Approve] Step 6: sending approval email')
      try {
        const { error: emailErr } = await supabase.functions.invoke('send-hero-approved-email', {
          body: {
            hero_name: req.full_name,
            hero_email: req.email,
            coach_name: profile?.full_name ?? 'Your Coach',
            plan_type: req.plan_type,
          },
        })
        if (emailErr) {
          console.warn('[Approve] Step 6 WARN (email non-fatal):', emailErr.message)
        } else {
          console.log('[Approve] Step 6 OK — approval email sent')
        }
      } catch (e) {
        console.warn('[Approve] Step 6 WARN (email non-fatal):', (e as Error).message)
      }

      return { hero: heroData as Profile, requestId: req.id }
    },

    onSuccess: ({ hero: newHero, requestId }) => {
      console.log('[Approve] SUCCESS — hero id:', newHero.id, 'name:', newHero.full_name)

      // Immediately inject the new hero into the heroes cache — no refetch needed
      qc.setQueryData(
        ['coach-heroes', coachId],
        (old: Profile[] | undefined) => [newHero, ...(old ?? [])]
      )

      // Mark this request as approved in the requests cache immediately
      qc.setQueryData(
        ['coach-requests', coachId],
        (old: HeroRequest[] | undefined) =>
          (old ?? []).map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r)
      )
      // Background sync to confirm DB state
      qc.invalidateQueries({ queryKey: ['coach-requests', coachId] })

      // Update hero_count in auth store so the dashboard stat updates immediately
      if (profile) {
        setProfile({ ...profile, hero_count: (profile.hero_count ?? 0) + 1 })
      }

      setApprovingId(null)
      showToast('success', `${newHero.full_name} approved — activate their plan when payment is confirmed`)

      // Navigate to heroes list
      navigate('/coach/heroes')
    },

    onError: (e: Error) => {
      console.error('[Approve] FINAL ERROR:', e.message)
      showToast('error', e.message)
      setApprovingId(null)
    },
  })

  // ─── Decline ──────────────────────────────────────────────────────────────

  const decline = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('hero_requests')
        .update({ status: 'declined', decline_reason: reason || null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-requests', coachId] })
      showToast('success', 'Request declined')
      setDecliningId(null)
    },
    onError: (e: Error) => {
      showToast('error', e.message)
      setDecliningId(null)
    },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Hero Requests</h2>
          <p className="text-[#555] text-sm mt-1">
            {pendingCount > 0 ? `${pendingCount} pending review` : 'No pending requests'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-all capitalize ${
                filter === f
                  ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]'
                  : 'border-[#333] text-[#555] hover:border-[#555]'
              }`}
            >
              {f === 'pending' ? `Pending (${pendingCount})` : `All (${requests.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {displayed.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-[#555]">
              {filter === 'pending' ? 'No pending requests.' : 'No requests yet.'}
            </p>
          </Card>
        )}
        {displayed.map(req => (
          <RequestCard
            key={req.id}
            req={req}
            approving={approvingId === req.id && approve.isPending}
            declining={decliningId === req.id && decline.isPending}
            onApprove={r => { setApprovingId(r.id); approve.mutate(r) }}
            onDecline={(id, reason) => { setDecliningId(id); decline.mutate({ id, reason }) }}
          />
        ))}
      </div>

      <Toast toast={toast} />
    </div>
  )
}
