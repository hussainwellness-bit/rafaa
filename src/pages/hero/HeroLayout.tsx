import { useLocation, matchPath } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import HeroHome from './HeroHome'
import HeroJournal from './HeroJournal'
import HeroRecovery from './HeroRecovery'
import HeroNutrition from './HeroNutrition'
import HeroHistory from './HeroHistory'
import HeroSettings from './HeroSettings'
import HeroWorkout from './HeroWorkout'
import HeroBottomNav from '../../components/hero/HeroBottomNav'

// All pages stay permanently mounted — only CSS display toggles.
// No <Routes> inside here: using matchPath instead of Route/useParams to
// derive the active tab/bundleId. This eliminates any React Router
// reconciliation flicker (black screen) on tab switches.
export default function HeroLayout() {
  const { profile } = useAuthStore()
  const { pathname } = useLocation()
  const planB = profile?.plan_type === 'B' || profile?.plan_type === 'C'
  const planC = profile?.plan_type === 'C'

  // Derive bundleId without a Route context
  const workoutMatch = matchPath('/hero/workout/:bundleId', pathname)
  const currentBundleId = workoutMatch?.params?.bundleId ?? null

  const tab =
    currentBundleId                              ? 'workout'   :
    pathname === '/hero' || pathname === '/hero/' ? 'home'      :
    pathname.startsWith('/hero/journal')          ? 'journal'   :
    pathname.startsWith('/hero/recovery')         ? 'recovery'  :
    pathname.startsWith('/hero/nutrition')        ? 'nutrition' :
    pathname.startsWith('/hero/history')          ? 'history'   :
    pathname.startsWith('/hero/settings')         ? 'settings'  : 'home'

  const vis = (name: string): React.CSSProperties =>
    ({ display: tab === name ? 'block' : 'none' })

  return (
    <div className="min-h-screen bg-[#080808] pb-24">
      <div style={vis('home')}>    <HeroHome />    </div>

      {planB && <div style={vis('journal')}>  <HeroJournal />  </div>}
      {planC && <div style={vis('recovery')}> <HeroRecovery /> </div>}
      {planC && <div style={vis('nutrition')}><HeroNutrition /></div>}

      <div style={vis('history')}>  <HeroHistory />  </div>
      <div style={vis('settings')}> <HeroSettings /> </div>

      {/* Workout detail — always mounted, bundleId prop drives queries */}
      <div style={vis('workout')}>
        <HeroWorkout bundleId={currentBundleId} />
      </div>

      <HeroBottomNav />
    </div>
  )
}
