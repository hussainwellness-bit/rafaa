import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Notification } from '../../types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const TYPE_ICON: Record<string, string> = {
  hero_request_received: '🏆',
  request_approved: '🎉',
  request_declined: '❌',
  payment_pending: '💳',
  plan_activated: '⚡',
  system: '🔔',
}

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notification-count', userId],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
      return count ?? 0
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  })

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      return (data ?? []) as Notification[]
    },
    enabled: open && !!userId,
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-count', userId] })
      qc.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-count', userId] })
      qc.invalidateQueries({ queryKey: ['notifications', userId] })
    },
  })

  function handleOpen() {
    setOpen(true)
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-3 w-full px-4 py-3 rounded-[12px] text-[15px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-all"
      >
        <span className="text-lg">🔔</span>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#c8ff00] text-[#080808] text-[11px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide panel */}
      <>
        <div
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a] shrink-0">
            <div>
              <h2 className="font-[Bebas_Neue] text-3xl text-white tracking-wide">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[#555] text-sm mt-0.5">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-[#c8ff00] hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#555] hover:text-white text-xl">
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#c8ff00]/30 border-t-[#c8ff00] rounded-full animate-spin" />
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <span className="text-4xl mb-3">🔔</span>
                <p className="text-[#555] text-sm">No notifications yet</p>
              </div>
            )}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.read && markOneRead.mutate(n.id)}
                className={`w-full text-left px-6 py-4 border-b border-[#111] transition-colors hover:bg-[#111] ${
                  !n.read ? 'bg-[#c8ff00]/2' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${n.read ? 'text-[#666]' : 'text-white'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#c8ff00] shrink-0 mt-1.5" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[#555] text-xs mt-1 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-[#3a3a3a] text-xs mt-1.5 font-[DM_Mono]">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </>
    </>
  )
}
