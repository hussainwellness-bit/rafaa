import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { CoachRequest } from '../../types'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Toast, { useToast } from '../../components/ui/Toast'

const PLAN_LABELS: Record<string, string> = {
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year':   '1 Year',
}

function statusVariant(s: string): 'muted' | 'green' | 'red' | 'accent' {
  if (s === 'approved') return 'green'
  if (s === 'rejected') return 'red'
  return 'accent'
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ req, onApprove, onReject, approving, rejecting }: {
  req: CoachRequest
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  approving: boolean
  rejecting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  return (
    <Card className="p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center text-[#c8ff00] font-bold text-sm">
            {req.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">{req.full_name}</p>
            <p className="text-[#555] text-sm">{req.email}</p>
            {req.phone && <p className="text-[#444] text-xs">{req.phone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariant(req.status)} size="sm">
            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
          </Badge>
          {req.subscription_plan && (
            <Badge variant="muted" size="sm">{PLAN_LABELS[req.subscription_plan]}</Badge>
          )}
          {req.subscription_price && (
            <Badge variant="muted" size="sm">{req.subscription_price.toLocaleString()} SAR</Badge>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {req.specialty && (
          <div>
            <p className="text-[#444] text-xs uppercase tracking-wider">Specialty</p>
            <p className="text-white mt-0.5">{req.specialty}</p>
          </div>
        )}
        {req.years_experience != null && (
          <div>
            <p className="text-[#444] text-xs uppercase tracking-wider">Experience</p>
            <p className="text-white mt-0.5">{req.years_experience} years</p>
          </div>
        )}
        <div>
          <p className="text-[#444] text-xs uppercase tracking-wider">Submitted</p>
          <p className="text-white mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Bio */}
      {req.bio && (
        <div>
          <p className="text-[#444] text-xs uppercase tracking-wider mb-1">Bio</p>
          <p className="text-[#aaa] text-sm leading-relaxed">
            {expanded ? req.bio : req.bio.slice(0, 140) + (req.bio.length > 140 ? '...' : '')}
          </p>
          {req.bio.length > 140 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#c8ff00] text-xs mt-1 hover:text-white transition-colors"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {req.rejection_reason && (
        <div className="bg-[#ff3d3d]/05 border border-[#ff3d3d]/20 rounded-[10px] p-3">
          <p className="text-[#ff3d3d] text-xs font-semibold uppercase tracking-wider">Rejection Reason</p>
          <p className="text-[#aaa] text-sm mt-1">{req.rejection_reason}</p>
        </div>
      )}

      {/* Actions — only for pending */}
      {req.status === 'pending' && (
        <div className="pt-2 space-y-3">
          {!showReject ? (
            <div className="flex gap-3">
              <button
                onClick={() => onApprove(req.id)}
                disabled={approving || rejecting}
                className="flex-1 py-2.5 rounded-[100px] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] transition-all disabled:opacity-50"
                style={{ background: '#c8ff00', color: '#080808' }}
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={approving || rejecting}
                className="flex-1 py-2.5 rounded-[100px] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] border border-[#ff3d3d]/40 text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Optional: reason for rejection..."
                className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[12px] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#ff3d3d] resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReject(false)}
                  className="flex-1 py-2.5 rounded-[100px] border border-[#2a2a2a] text-[#aaa] text-[11px] font-[DM_Mono] uppercase tracking-[2px] hover:border-[#555] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onReject(req.id, rejectReason); setShowReject(false) }}
                  disabled={rejecting}
                  className="flex-1 py-2.5 rounded-[100px] font-[DM_Mono] font-bold text-[11px] uppercase tracking-[2px] transition-all disabled:opacity-50"
                  style={{ background: '#ff3d3d', color: '#fff' }}
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminCoachRequests() {
  const qc = useQueryClient()
  const { toast, showToast } = useToast()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-coach-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CoachRequest[]
    },
  })

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  async function approveRequest(id: string) {
    setApprovingId(id)
    try {
      const { data, error } = await supabase.functions.invoke('approve-coach', {
        body: { requestId: id },
      })
      if (error) throw new Error(error.message)
      if (!data?.success) throw new Error(data?.error ?? 'Approval failed')

      qc.setQueryData(['admin-coach-requests'], (old: CoachRequest[] | undefined) =>
        (old ?? []).map(r => r.id === id ? { ...r, status: 'approved' as const } : r)
      )
      showToast('success', 'Coach approved — approval email sent ✓')
    } catch (e) {
      console.error('[ApproveCoach]', e)
      showToast('error', (e as Error).message)
    } finally {
      setApprovingId(null)
    }
  }

  async function rejectRequest(id: string, reason: string) {
    setRejectingId(id)
    try {
      const { data, error } = await supabase.functions.invoke('reject-coach', {
        body: { requestId: id, reason },
      })
      if (error) throw new Error(error.message)
      if (!data?.success) throw new Error(data?.error ?? 'Rejection failed')

      qc.setQueryData(['admin-coach-requests'], (old: CoachRequest[] | undefined) =>
        (old ?? []).map(r => r.id === id ? { ...r, status: 'rejected' as const, rejection_reason: reason } : r)
      )
      showToast('success', 'Request rejected — notification sent')
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setRejectingId(null)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} className="text-[#c8ff00]" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">Coach Requests</h2>
          <p className="text-[#555] text-sm mt-1">
            {pendingCount > 0 ? `${pendingCount} pending review` : 'No pending requests'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-[100px] text-sm font-semibold transition-all capitalize"
            style={filter === f
              ? { background: '#c8ff00', color: '#080808' }
              : { background: '#111', color: '#555', border: '1px solid #222' }
            }
          >
            {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[#555]">No {filter === 'all' ? '' : filter} requests.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={approveRequest}
              onReject={rejectRequest}
              approving={approvingId === req.id}
              rejecting={rejectingId === req.id}
            />
          ))}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
