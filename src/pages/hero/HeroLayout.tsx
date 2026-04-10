import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import HeroHome from './HeroHome'
import HeroJournal from './HeroJournal'
import HeroRecovery from './HeroRecovery'
import HeroNutrition from './HeroNutrition'
import HeroHistory from './HeroHistory'
import HeroSettings from './HeroSettings'
import HeroWorkout from './HeroWorkout'
import HeroBottomNav from '../../components/hero/HeroBottomNav'

export default function HeroLayout() {
  const { profile } = useAuthStore()
  const planB = profile?.plan_type === 'B' || profile?.plan_type === 'C'
  const planC = profile?.plan_type === 'C'

  return (
    <div className="min-h-screen bg-[#080808] pb-24">
      <Routes>
        <Route index element={<HeroHome />} />
        <Route path="workout/:bundleId" element={<HeroWorkout />} />
        {planB && <Route path="journal" element={<HeroJournal />} />}
        {planC && <Route path="recovery" element={<HeroRecovery />} />}
        {planC && <Route path="nutrition" element={<HeroNutrition />} />}
        <Route path="history" element={<HeroHistory />} />
        <Route path="settings" element={<HeroSettings />} />
        <Route path="*" element={<Navigate to="/hero" replace />} />
      </Routes>
      <HeroBottomNav />
    </div>
  )
}
