import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import CoachDashboard from './CoachDashboard'
import CoachHeroes from './CoachHeroes'
import CoachHeroProfile from './CoachHeroProfile'
import CoachLogForHero from './CoachLogForHero'
import CoachRequests from './CoachRequests'
import CoachPlanSettings from './CoachPlanSettings'
import { APP_CONFIG } from '../../config/app'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/coach',          label: 'Dashboard',    icon: '⚡' },
  { to: '/coach/heroes',   label: 'My Heroes',    icon: '🏆' },
  { to: '/coach/requests', label: 'Requests',     icon: '📥' },
  { to: '/coach/plans',    label: 'Plan Settings', icon: '⚙️' },
]

const PLAN_LABELS: Record<string, string> = {
  '3_months': '3 Months — 1,500 SAR',
  '6_months': '6 Months — 2,900 SAR',
  '1_year':   '1 Year — 5,500 SAR',
}

function PaymentPendingScreen() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20 flex items-center justify-center text-4xl mx-auto">
          ⏳
        </div>
        <div className="space-y-3">
          <h1 className="font-[Bebas_Neue] text-4xl text-white tracking-wide">PAYMENT PENDING</h1>
          <p className="text-[#666] text-[15px] leading-relaxed">
            Your account is approved but we are waiting for payment confirmation.
          </p>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-[16px] p-6 text-left space-y-3">
          <p className="text-[#aaa] text-xs font-bold uppercase tracking-widest">Your Subscription</p>
          {profile?.subscription_plan && (
            <p className="text-white font-semibold">{PLAN_LABELS[profile.subscription_plan] ?? profile.subscription_plan}</p>
          )}
          <p className="text-[#555] text-sm leading-relaxed">
            Please complete your payment to activate your account and start coaching.
            Once our team confirms your payment, you will be able to access the full dashboard.
          </p>
          {profile?.subscription_end && (
            <p className="text-[#444] text-xs font-[DM_Mono]">
              Subscription end: {profile.subscription_end}
            </p>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className="text-[#555] hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function CoachLayout() {
  const { profile } = useAuth()

  // Show payment pending screen if subscription not yet active
  if (profile?.subscription_status === 'pending') {
    return <PaymentPendingScreen />
  }

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
