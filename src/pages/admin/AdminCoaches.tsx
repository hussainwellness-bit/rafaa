import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import SlidePanel from '../../components/ui/SlidePanel'
import Toast, { useToast } from '../../components/ui/Toast'

// ─── Add Coach Form ───────────────────────────────────────────────────────────

function CoachForm({ onSubmit, loading, error }: {
  onSubmit: (data: { full_name: string; email: string; phone: string; password: string }) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <Input label="Full Name" required value={form.full_name} onChange={set('full_name')} />
      <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
      <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+966..." />
      <Input label="Password" type="password" required value={form.password} onChange={set('password')} hint="Min 8 characters" />
      {error && <p className="text-[#ff3d3d] text-sm">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Coach'}
      </Button>
    </form>
  )
}

// ─── Edit Coach Panel ─────────────────────────────────────────────────────────

interface CoachEditForm {
  full_name: string
  email: string
  phone: string
  coach_type: 'online' | 'physical'
  is_active: boolean
  accepting_heroes: boolean
  role: 'coach' | 'super_admin'
  coach_bio: string
  coach_specialty: string
  notes: string
}

function coachToForm(coach: Profile): CoachEditForm {
  return {
    full_name: coach.full_name ?? '',
    email: coach.email ?? '',
    phone: coach.phone ?? '',
    coach_type: coach.coach_type ?? 'online',
    is_active: coach.is_active ?? true,
    accepting_heroes: coach.accepting_heroes !== false,
    role: (coach.role === 'super_admin' ? 'super_admin' : 'coach') as 'coach' | 'super_admin',
    coach_bio: coach.coach_bio ?? '',
    coach_specialty: coach.coach_specialty ?? '',
    notes: coach.notes ?? '',
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs text-[#555] font-semibold uppercase tracking-widest pt-2">{title}</h3>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange, description }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-white text-sm">{label}</p>
        {description && <p className="text-[#555] text-xs mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-[#c8ff00]' : 'bg-[#333]'}`}
        style={{ minWidth: 40, height: 22 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
          style={{ width: 18, height: 18 }}
        />
      </button>
    </div>
  )
}

function EditCoachPanel({ coach, heroCount, open, onClose, onDeleted, showToast }: {
  coach: Profile
  heroCount: number
  open: boolean
  onClose: () => void
  onDeleted: () => void
  showToast: (type: 'success' | 'error', msg: string) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CoachEditForm>(coachToForm(coach))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => { setForm(coachToForm(coach)) }, [coach])

  const set = <K extends keyof CoachEditForm>(k: K, v: CoachEditForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
        phone: form.phone || null,
        coach_type: form.coach_type,
        is_active: form.is_active,
        accepting_heroes: form.accepting_heroes,
        role: form.role,
        coach_bio: form.coach_bio || null,
        coach_specialty: form.coach_specialty || null,
        notes: form.notes || null,
      }).eq('id', coach.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['admin-coaches'] })
      showToast('success', 'Coach profile updated ✓')
      onClose()
    } catch (e: unknown) {
      showToast('error', (e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function cascadeDelete() {
    setDeleting(true)
    try {
      // 1. Get all hero IDs for this coach
      const { data: heroProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('role', 'hero')
      const heroIds = (heroProfiles ?? []).map(h => h.id)

      if (heroIds.length > 0) {
        // 2. Get all session IDs for these heroes
        const { data: sessions } = await supabase
          .from('sessions_v2')
          .select('id')
          .in('user_id', heroIds)
        const sessionIds = (sessions ?? []).map(s => s.id)

        // 3. Delete session_sets
        if (sessionIds.length > 0) {
          await supabase.from('session_sets').delete().in('session_id', sessionIds)
        }

        // 4. Delete sessions
        await supabase.from('sessions_v2').delete().in('user_id', heroIds)

        // 5. Get all bundle IDs for these heroes
        const { data: bundles } = await supabase
          .from('bundles')
          .select('id')
          .in('user_id', heroIds)
        const bundleIds = (bundles ?? []).map(b => b.id)

        // 6. Delete bundle_exercises
        if (bundleIds.length > 0) {
          await supabase.from('bundle_exercises').delete().in('bundle_id', bundleIds)
        }

        // 7. Delete bundles
        await supabase.from('bundles').delete().in('user_id', heroIds)

        // 8. Delete plan_schedule, journal_logs, nutrition_logs
        await supabase.from('plan_schedule').delete().in('user_id', heroIds)
        await supabase.from('journal_logs').delete().in('user_id', heroIds)
        await supabase.from('nutrition_logs').delete().in('user_id', heroIds)

        // 9. Delete hero profiles
        await supabase.from('profiles').delete().in('id', heroIds)
      }

      // 10. Delete coach profile
      await supabase.from('profiles').delete().eq('id', coach.id)

      qc.invalidateQueries({ queryKey: ['admin-coaches'] })
      qc.invalidateQueries({ queryKey: ['admin-heroes'] })
      showToast('success', `${coach.full_name} and all their data deleted`)
      onDeleted()
    } catch (e: unknown) {
      showToast('error', (e as Error).message ?? 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Edit Coach" subtitle={coach.full_name}>
      <div className="px-6 py-5 space-y-6">

        <Section title="Personal Info">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#888] font-medium">Full Name</label>
              <input
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white focus:outline-none focus:border-[#c8ff00] text-[15px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#888] font-medium">Email</label>
              <input
                value={form.email}
                disabled
                className="w-full px-4 py-3 bg-[#111] border border-[#222] rounded-[12px] text-[#555] text-[15px] cursor-not-allowed"
              />
              <p className="text-[#444] text-xs">Email cannot be changed here</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#888] font-medium">Phone</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+966..."
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] text-[15px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#888] font-medium">Coach Type</label>
              <div className="flex gap-2">
                {(['online', 'physical'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('coach_type', t)}
                    className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium border transition-all capitalize ${
                      form.coach_type === t
                        ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]'
                        : 'border-[#333] text-[#555] hover:border-[#555]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <div className="border-t border-[#1a1a1a]" />

        <Section title="Public Profile">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Short Bio</label>
            <textarea
              rows={3}
              value={form.coach_bio}
              onChange={e => set('coach_bio', e.target.value)}
              placeholder="Shown to heroes on the discovery page..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Specialty</label>
            <input
              value={form.coach_specialty}
              onChange={e => set('coach_specialty', e.target.value)}
              placeholder="e.g. Fat Loss · Muscle Building"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] text-[15px]"
            />
          </div>
        </Section>

        <div className="border-t border-[#1a1a1a]" />

        <Section title="Account">
          <Toggle
            label="Active"
            description="Inactive coaches cannot log in"
            checked={form.is_active}
            onChange={v => set('is_active', v)}
          />
          <Toggle
            label="Accepting New Heroes"
            description="When off, card shows 'Full' on discovery page"
            checked={form.accepting_heroes}
            onChange={v => set('accepting_heroes', v)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Role</label>
            <div className="flex gap-2">
              {(['coach', 'super_admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium border transition-all ${
                    form.role === r
                      ? 'bg-[#c8ff00]/10 border-[#c8ff00]/40 text-[#c8ff00]'
                      : 'border-[#333] text-[#555] hover:border-[#555]'
                  }`}
                >
                  {r === 'super_admin' ? 'Super Admin' : 'Coach'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#888] font-medium">Internal Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notes visible only to admins..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-[12px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#c8ff00] resize-none"
            />
          </div>
        </Section>

        <div className="border-t border-[#1a1a1a]" />

        {/* Save / Cancel */}
        <div className="flex gap-3 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-[12px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 rounded-[12px] bg-[#c8ff00] text-[#080808] font-semibold text-sm hover:bg-[#d4ff33] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="border-t border-[#1a1a1a]" />

        {/* Danger Zone */}
        <div className="space-y-3">
          <h3 className="text-xs text-[#ff3d3d]/60 font-semibold uppercase tracking-widest">Danger Zone</h3>
          <div className="rounded-[12px] border border-[#ff3d3d]/20 p-4 space-y-2">
            <p className="text-white text-sm font-medium">Delete Coach</p>
            <p className="text-[#555] text-xs leading-relaxed">
              This will permanently delete {coach.full_name} along with all {heroCount} of their heroes, sessions, bundles, and journal data. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-2 text-xs text-[#ff3d3d]/70 hover:text-[#ff3d3d] border border-[#ff3d3d]/20 hover:border-[#ff3d3d]/40 px-4 py-2 rounded-[8px] transition-colors"
            >
              Delete Coach & All Data
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-[20px] p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold text-lg">Delete {coach.full_name}?</h3>
            <p className="text-[#888] text-sm leading-relaxed">
              This will delete <span className="text-white font-medium">{coach.full_name}</span> and all their heroes. This cannot be undone. Continue?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-[10px] border border-[#333] text-[#888] hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); cascadeDelete() }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-[10px] bg-[#ff3d3d] text-white font-semibold text-sm hover:bg-[#ff5555] transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SlidePanel>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminCoaches() {
  const qc = useQueryClient()
  const { toast, showToast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [addError, setAddError] = useState('')
  const [editCoach, setEditCoach] = useState<Profile | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null)

  async function confirmPayment(coach: Profile) {
    setConfirmingPayment(coach.id)
    try {
      // Calculate subscription start/end now (payment date = activation date)
      const today = new Date()
      const start = today.toISOString().slice(0, 10)
      const end = new Date(today)
      if (coach.subscription_plan === '3_months') end.setMonth(end.getMonth() + 3)
      else if (coach.subscription_plan === '6_months') end.setMonth(end.getMonth() + 6)
      else if (coach.subscription_plan === '1_year') end.setFullYear(end.getFullYear() + 1)
      const endStr = end.toISOString().slice(0, 10)

      const { error } = await supabase.from('profiles').update({
        subscription_status: 'active',
        subscription_start:  start,
        subscription_end:    endStr,
        accepting_heroes:    true,
      }).eq('id', coach.id)
      if (error) throw error

      // Notify coach
      await supabase.from('notifications').insert({
        user_id: coach.id,
        title: 'Payment Confirmed! 🎉',
        body: 'Your payment has been confirmed. Your RafaaTech account is now active. Complete your profile to start accepting heroes!',
        type: 'system',
        read: false,
      })

      qc.setQueryData(['admin-coaches'], (old: Profile[] | undefined) =>
        (old ?? []).map(c => c.id === coach.id
          ? { ...c, subscription_status: 'active', subscription_start: start, subscription_end: endStr }
          : c
        )
      )
      showToast('success', `Payment confirmed for ${coach.full_name} ✓`)
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setConfirmingPayment(null)
    }
  }

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['admin-coaches'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'coach').order('created_at', { ascending: false })
      return (data ?? []) as Profile[]
    },
  })

  const { data: heroes = [] } = useQuery({
    queryKey: ['admin-heroes'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id,coach_id').eq('role', 'hero')
      return (data ?? []) as Pick<Profile, 'id' | 'coach_id'>[]
    },
  })

  const addCoach = useMutation({
    mutationFn: async (form: { full_name: string; email: string; phone: string; password: string }) => {
      const { data: { session: adminSession } } = await supabase.auth.getSession()

      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      })
      if (signupErr) throw signupErr
      const userId = signupData.user?.id
      if (!userId) throw new Error('User creation failed')

      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || null,
        role: 'coach',
        is_active: true,
      })
      if (profileErr) throw profileErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coaches'] })
      setShowAdd(false)
      setAddError('')
    },
    onError: (e: Error) => setAddError(e.message),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} className="text-[#c8ff00]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Coaches</h2>
          <p className="text-[#555] text-sm mt-1">{coaches.length} coaches on platform</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Coach</Button>
      </div>

      <div className="space-y-3">
        {coaches.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-[#555]">No coaches yet. Add one to get started.</p>
          </Card>
        )}
        {coaches.map(coach => {
          const heroCount = heroes.filter(h => h.coach_id === coach.id).length
          const subStatus = coach.subscription_status
          return (
            <Card key={coach.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] font-bold text-sm">
                    {coach.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{coach.full_name}</p>
                    <p className="text-[#555] text-sm">{coach.email}</p>
                    {coach.phone && <p className="text-[#444] text-xs">{coach.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="muted">{heroCount} heroes</Badge>
                  {coach.coach_type && <Badge variant="muted" size="sm">{coach.coach_type}</Badge>}
                  <Badge variant={coach.is_active ? 'green' : 'red'}>
                    {coach.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {subStatus && (
                    <Badge variant={subStatus === 'active' ? 'green' : subStatus === 'expired' ? 'red' : 'accent'} size="sm">
                      {subStatus === 'active' ? 'Sub Active' : subStatus === 'expired' ? 'Sub Expired' : 'Pending Payment'}
                    </Badge>
                  )}
                  <button
                    onClick={() => setEditCoach(coach)}
                    className="text-xs text-[#555] hover:text-white transition-colors px-3 py-1.5 border border-[#333] rounded-[100px] hover:border-[#555]"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {subStatus === 'pending' && (
                <div className="flex items-center justify-between px-4 py-3 bg-[#c8ff00]/05 border border-[#c8ff00]/20 rounded-[12px]">
                  <div>
                    <p className="text-[#c8ff00] text-sm font-semibold">Payment Pending</p>
                    <p className="text-[#555] text-xs mt-0.5">
                      {coach.subscription_plan?.replace('_', ' ')} · {coach.subscription_end ? `Ends ${coach.subscription_end}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => confirmPayment(coach)}
                    disabled={confirmingPayment === coach.id}
                    className="font-[DM_Mono] font-bold text-[10px] uppercase tracking-[2px] px-4 py-2 rounded-[100px] transition-all disabled:opacity-50"
                    style={{ background: '#c8ff00', color: '#080808' }}
                  >
                    {confirmingPayment === coach.id ? 'Confirming...' : 'Confirm Payment'}
                  </button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddError('') }} title="Add Coach">
        <CoachForm
          onSubmit={data => addCoach.mutate(data)}
          loading={addCoach.isPending}
          error={addError}
        />
      </Modal>

      {editCoach && (
        <EditCoachPanel
          coach={editCoach}
          heroCount={heroes.filter(h => h.coach_id === editCoach.id).length}
          open={!!editCoach}
          onClose={() => setEditCoach(null)}
          onDeleted={() => setEditCoach(null)}
          showToast={showToast}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
