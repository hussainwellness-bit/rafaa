import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glass?: boolean
}

export default function Card({ children, glass, className = '', ...props }: Props) {
  return (
    <div
      className={`rounded-[16px] border border-[#222] ${glass ? 'bg-[#111]/80 backdrop-blur-sm' : 'bg-[#111]'} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
