import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import AdminDashboard from './AdminDashboard'
import AdminCoaches from './AdminCoaches'
import AdminExercises from './AdminExercises'
import AdminCoachRequests from './AdminCoachRequests'
import { APP_CONFIG } from '../../config/app'

const NAV = [
  { to: '/admin',                label: 'Dashboard',      icon: '⚡' },
  { to: '/admin/coach-requests', label: 'Coach Requests', icon: '📥' },
  { to: '/admin/coaches',        label: 'Coaches',        icon: '🏋️' },
  { to: '/admin/exercises',      label: 'Exercises',      icon: '📋' },
]

export default function AdminLayout() {
  return (
    <AppLayout navItems={NAV} title={APP_CONFIG.name} subtitle="super admin">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="coach-requests" element={<AdminCoachRequests />} />
        <Route path="coaches/*" element={<AdminCoaches />} />
        <Route path="exercises/*" element={<AdminExercises />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppLayout>
  )
}
