import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: string
}

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6 max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-[Bebas_Neue] text-2xl text-[#f2f2f2] tracking-wide">{title}</h2>
            <button onClick={onClose} className="text-[#555] hover:text-[#f2f2f2] transition-colors text-xl">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
