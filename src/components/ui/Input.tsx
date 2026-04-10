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
        className={`w-full px-5 py-4 bg-[#1a1a1a] border rounded-[14px] text-white text-[15px] placeholder:text-[#444] focus:outline-none transition-colors font-[DM_Mono] ${
          error ? 'border-[#ff3d3d] focus:border-[#ff3d3d]' : 'border-[#333] focus:border-[#c8ff00]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-[#ff3d3d]">{error}</p>}
      {hint && !error && <p className="text-sm text-[#555]">{hint}</p>}
    </div>
  )
}
