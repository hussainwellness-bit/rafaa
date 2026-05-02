import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: string
}

export default function SlidePanel({ open, onClose, title, subtitle, children, width = 'sm:w-[600px]' }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full ${width} bg-[#111] border-l border-[#1e1e1e] flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#1e1e1e] shrink-0">
          <div>
            <h2 className="font-[Bebas_Neue] text-3xl text-[#f2f2f2] tracking-wide">{title}</h2>
            {subtitle && <p className="text-[#555] text-sm mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#f2f2f2] transition-colors text-xl mt-1 ml-4 shrink-0">
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
