import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function HeroBottomNav() {
  const { profile } = useAuthStore()
  const planB = profile?.plan_type === 'B' || profile?.plan_type === 'C'
  const planC = profile?.plan_type === 'C'

  const links = [
    { to: '/hero', label: 'Workout', icon: '🏋️', exact: true },
    ...(planB ? [{ to: '/hero/journal', label: 'Journal', icon: '📓', exact: false }] : []),
    ...(planC ? [{ to: '/hero/recovery', label: 'Recovery', icon: '💚', exact: false }] : []),
    ...(planC ? [{ to: '/hero/nutrition', label: 'Nutrition', icon: '🥗', exact: false }] : []),
    { to: '/hero/history', label: 'History', icon: '📅', exact: false },
    { to: '/hero/settings', label: 'Settings', icon: '⚙️', exact: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d]/97 backdrop-blur-md border-t border-[#1a1a1a]">
      <div className="flex items-center justify-around px-1 py-3 max-w-lg mx-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-[12px] transition-all ${
                isActive ? 'text-[#c8ff00]' : 'text-[#444] hover:text-[#888]'
              }`
            }
          >
            <span className="text-xl leading-none">{link.icon}</span>
            <span className="text-[11px] font-semibold">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
