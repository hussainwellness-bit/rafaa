import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-[15px] text-[#888] font-semibold">{label}</label>}
      <input
        className={`w-full px-4 py-3 bg-[#1e1e1e] border rounded-[12px] text-[#f2f2f2] text-[14px] placeholder:text-[#555] focus:outline-none transition-colors font-[DM_Mono] ${
          error ? 'border-[#ff3d3d] focus:border-[#ff3d3d]' : 'border-[#2a2a2a] focus:border-[#c8ff00]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-[#ff3d3d]">{error}</p>}
      {hint && !error && <p className="text-sm text-[#555]">{hint}</p>}
    </div>
  )
}
