import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import HeroHome from './HeroHome'
import HeroJournal from './HeroJournal'
import HeroRecovery from './HeroRecovery'
import HeroNutrition from './HeroNutrition'
import HeroHistory from './HeroHistory'
import HeroSettings from './HeroSettings'
import HeroWorkout from './HeroWorkout'
import HeroBottomNav from '../../components/hero/HeroBottomNav'

// Keep all tab pages permanently mounted — only toggle CSS display.
// This prevents unmount/remount flicker (black screen) when switching tabs,
// and preserves in-memory state (queries, scroll position, etc.).
export default function HeroLayout() {
  const { profile } = useAuthStore()
  const { pathname } = useLocation()
  const planB = profile?.plan_type === 'B' || profile?.plan_type === 'C'
  const planC = profile?.plan_type === 'C'

  const isWorkoutDetail = pathname.startsWith('/hero/workout/')

  // Determine which main tab is active
  const tab =
    isWorkoutDetail                          ? 'workout' :
    pathname === '/hero' || pathname === '/hero/' ? 'home'    :
    pathname.startsWith('/hero/journal')     ? 'journal'  :
    pathname.startsWith('/hero/recovery')    ? 'recovery' :
    pathname.startsWith('/hero/nutrition')   ? 'nutrition':
    pathname.startsWith('/hero/history')     ? 'history'  :
    pathname.startsWith('/hero/settings')    ? 'settings' : 'home'

  function show(name: string) {
    return { display: tab === name && !isWorkoutDetail ? 'block' : 'none' } as const
  }

  return (
    <div className="min-h-screen bg-[#080808] pb-24">

      {/* ── Main tabs — always mounted, hidden with display:none ── */}
      <div style={show('home')}>
        <HeroHome />
      </div>

      {planB && (
        <div style={show('journal')}>
          <HeroJournal />
        </div>
      )}

      {planC && (
        <div style={show('recovery')}>
          <HeroRecovery />
        </div>
      )}

      {planC && (
        <div style={show('nutrition')}>
          <HeroNutrition />
        </div>
      )}

      <div style={show('history')}>
        <HeroHistory />
      </div>

      <div style={show('settings')}>
        <HeroSettings />
      </div>

      {/* ── Workout detail — route-based (needs dynamic :bundleId param) ── */}
      <Routes>
        <Route path="workout/:bundleId" element={<HeroWorkout />} />
      </Routes>

      <HeroBottomNav />
    </div>
  )
}
