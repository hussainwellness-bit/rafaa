import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export default function Select({ label, error, options, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[15px] text-[#888] font-semibold">{label}</label>}
      <select
        className={`w-full px-5 py-4 bg-[#1a1a1a] border rounded-[14px] text-white text-[15px] focus:outline-none transition-colors appearance-none cursor-pointer ${
          error ? 'border-[#ff3d3d]' : 'border-[#333] focus:border-[#c8ff00]'
        } ${className}`}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-[#ff3d3d]">{error}</p>}
    </div>
  )
}
