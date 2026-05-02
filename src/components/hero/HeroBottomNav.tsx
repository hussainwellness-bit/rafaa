import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function HeroBottomNav() {
  const { profile } = useAuthStore()
  const planB = profile?.plan_type === 'B' || profile?.plan_type === 'C'
  const planC = profile?.plan_type === 'C'

  const links = [
    { to: '/hero',           label: 'Workout',  icon: '🏋️', exact: true  },
    ...(planB ? [{ to: '/hero/journal',  label: 'Journal',  icon: '📓', exact: false }] : []),
    ...(planC ? [{ to: '/hero/recovery', label: 'Recovery', icon: '💚', exact: false }] : []),
    ...(planC ? [{ to: '/hero/nutrition',label: 'Nutrition',icon: '🥗', exact: false }] : []),
    { to: '/hero/history',   label: 'History',  icon: '📅', exact: false },
    { to: '/hero/settings',  label: 'Settings', icon: '⚙️', exact: false },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div className="nav" style={{ margin: '8px auto', borderRadius: 14 }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
