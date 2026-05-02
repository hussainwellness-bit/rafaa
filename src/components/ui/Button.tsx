import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'ghost' | 'danger' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  accent:    'bg-[#c8ff00] text-[#080808] font-bold hover:bg-[#d4ff33] active:scale-95',
  ghost:     'bg-transparent border border-[#2a2a2a] text-[#f2f2f2] hover:bg-[#1e1e1e] active:scale-95',
  danger:    'bg-[#ff3d3d]/10 border border-[#ff3d3d]/40 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 active:scale-95',
  secondary: 'bg-[#1e1e1e] text-[#f2f2f2] hover:bg-[#2a2a2a] active:scale-95',
}

const sizes = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
}

export default function Button({ variant = 'accent', size = 'md', className = '', children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[100px] font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
