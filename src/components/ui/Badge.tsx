import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  variant?: 'accent' | 'red' | 'blue' | 'purple' | 'muted' | 'green'
  size?: 'sm' | 'md'
}

const variants = {
  accent: 'bg-[#c8ff00]/10 text-[#c8ff00] border-[#c8ff00]/30',
  red:    'bg-[#ff3d3d]/10 text-[#ff3d3d] border-[#ff3d3d]/30',
  blue:   'bg-[#3d9fff]/10 text-[#3d9fff] border-[#3d9fff]/30',
  purple: 'bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30',
  muted:  'bg-[#222] text-[#aaa] border-[#333]',
  green:  'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30',
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-[8px] tracking-[1px]',
  md: 'px-2.5 py-1 text-[11px] tracking-[0.5px]',
}

export default function Badge({ children, variant = 'muted', size = 'sm' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[5px] border font-[DM_Mono] font-medium uppercase ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}
