import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import CoachDashboard from './CoachDashboard'
import CoachHeroes from './CoachHeroes'
import CoachHeroProfile from './CoachHeroProfile'
import CoachLogForHero from './CoachLogForHero'
import CoachRequests from './CoachRequests'
import CoachPlanSettings from './CoachPlanSettings'
import { APP_CONFIG } from '../../config/app'

const NAV = [
  { to: '/coach',          label: 'Dashboard',    icon: '⚡' },
  { to: '/coach/heroes',   label: 'My Heroes',    icon: '🏆' },
  { to: '/coach/requests', label: 'Requests',     icon: '📥' },
  { to: '/coach/plans',    label: 'Plan Settings', icon: '⚙️' },
]

export default function CoachLayout() {
  return (
    <AppLayout navItems={NAV} title={APP_CONFIG.name} subtitle="coach">
      <Routes>
        <Route index element={<CoachDashboard />} />
        <Route path="heroes" element={<CoachHeroes />} />
        <Route path="requests" element={<CoachRequests />} />
        <Route path="plans" element={<CoachPlanSettings />} />
        {/* Log-for-hero must be before the wildcard heroes/:heroId/* */}
        <Route path="heroes/:heroId/log/:bundleId" element={<CoachLogForHero />} />
        <Route path="heroes/:heroId/*" element={<CoachHeroProfile />} />
        <Route path="*" element={<Navigate to="/coach" replace />} />
      </Routes>
    </AppLayout>
  )
}
