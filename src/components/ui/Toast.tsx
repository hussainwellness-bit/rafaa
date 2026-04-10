import { useState, useRef } from 'react'

export interface ToastState {
  type: 'success' | 'error'
  message: string
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ type, message })
    timerRef.current = setTimeout(() => setToast(null), 3500)
  }

  return { toast, showToast }
}

export default function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null
  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-[14px] font-semibold text-sm shadow-2xl ${
        toast.type === 'success'
          ? 'bg-[#c8ff00] text-[#080808]'
          : 'bg-[#ff3d3d] text-white'
      }`}
      style={{ animation: 'slideUp 0.25s ease-out' }}
    >
      <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
      <span>{toast.message}</span>
    </div>
  )
}
