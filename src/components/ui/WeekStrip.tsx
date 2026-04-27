// ── WeekStrip ─────────────────────────────────────────────────────────────────
// Sun–Sat week selector with prev/next navigation.
// Props:
//   weekDates   – array of 7 ISO date strings [Sun … Sat]
//   selectedDate – currently highlighted date
//   onSelect    – called with the clicked date string
//   dotsMap     – Record<dateStr, boolean | string>  (truthy = show dot; string = custom color)
//   weekOffset  – current offset (0 = this week)
//   onPrev / onNext – week navigation callbacks
//   disableNext – hides the → arrow (e.g. already on current week)
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface WeekStripProps {
  weekDates: string[]
  selectedDate: string
  onSelect: (date: string) => void
  dotsMap?: Record<string, boolean | string>
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  disableNext?: boolean
}

export default function WeekStrip({
  weekDates,
  selectedDate,
  onSelect,
  dotsMap = {},
  onPrev,
  onNext,
  disableNext = false,
}: WeekStripProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Month label: show month of Wednesday (middle of week) to avoid edge ambiguity
  const midDate = weekDates[3] ? new Date(weekDates[3] + 'T12:00:00') : new Date()
  const monthLabel = midDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div>
      {/* Week nav header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="w-8 h-8 rounded-[8px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm flex items-center justify-center"
        >
          ←
        </button>
        <span className="font-[DM_Mono] text-[11px] text-[#555] tracking-[2px]">{monthLabel}</span>
        <button
          onClick={onNext}
          disabled={disableNext}
          className="w-8 h-8 rounded-[8px] border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dayNum = parseInt(date.split('-')[2])
          const isSelected = date === selectedDate
          const isToday    = date === today
          const dot        = dotsMap[date]

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-[12px] border transition-all ${
                isSelected
                  ? 'bg-[#c8ff00]/10 border-[#c8ff00]/60'
                  : 'border-[#222] hover:border-[#444]'
              }`}
            >
              <span className={`font-[DM_Mono] text-[9px] uppercase tracking-[1px] ${
                isSelected ? 'text-[#c8ff00]' : isToday ? 'text-[#888]' : 'text-[#444]'
              }`}>
                {DAY_LETTERS[i]}
              </span>
              <span className={`font-[Bebas_Neue] text-[20px] leading-none ${
                isSelected ? 'text-[#c8ff00]' : isToday ? 'text-white' : 'text-[#555]'
              }`}>
                {dayNum}
              </span>
              <div className={`w-1 h-1 rounded-full transition-all ${
                dot
                  ? (typeof dot === 'string' ? '' : (isSelected ? 'bg-[#c8ff00]' : 'bg-[#666]'))
                  : 'bg-transparent'
              }`}
                style={typeof dot === 'string' ? { background: dot } : undefined}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── helpers (exported so both pages can use them) ─────────────────────────────

export function getWeekDates(weekOffset: number): string[] {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}
