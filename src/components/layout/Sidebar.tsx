import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../ui/NotificationBell'

interface NavItem {
  to: string
  label: string
  icon: string
}

interface Props {
  items: NavItem[]
  title: string
  subtitle?: string
  bottom?: ReactNode
}

export default function Sidebar({ items, title, subtitle, bottom }: Props) {
  const { signOut } = useAuth()
  const { profile } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col z-40">
      <div className="px-6 py-6 border-b border-[#1a1a1a]">
        <h1 className="font-[Bebas_Neue] text-3xl text-white tracking-widest">{title}</h1>
        {subtitle && <p className="text-[#444] text-sm mt-1 font-[DM_Mono] uppercase tracking-widest">{subtitle}</p>}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/coach' || item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-[12px] text-[15px] transition-all ${
                isActive
                  ? 'bg-[#c8ff00]/10 text-[#c8ff00] font-semibold'
                  : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1a1a1a] space-y-1">
        {bottom}
        {/* Notification bell — queries live for the signed-in user */}
        {profile?.id && <NotificationBell userId={profile.id} />}
        <div className="px-4 py-2">
          <p className="text-sm text-[#555] truncate">{profile?.full_name || profile?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-[12px] text-[15px] text-[#555] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/5 transition-all"
        >
          <span>↩</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
