import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: boolean
}

export default function StatCard({ label, value, sub, icon, accent }: Props) {
  return (
    <div className={`rounded-[16px] border p-6 flex flex-col gap-3 ${accent ? 'bg-[#c8ff00]/5 border-[#c8ff00]/20' : 'bg-[#111] border-[#1e1e1e]'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#aaa] font-semibold uppercase tracking-wider">{label}</span>
        {icon && <span className="text-[#555] text-lg">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-[Bebas_Neue] text-5xl tracking-wide leading-none ${accent ? 'text-[#c8ff00]' : 'text-[#f2f2f2]'}`}>{value}</span>
        {sub && <span className="text-[#555] text-sm mb-1">{sub}</span>}
      </div>
    </div>
  )
}
