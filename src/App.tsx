import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import RoleRouter from './components/layout/RoleRouter'
import LoginPage from './pages/auth/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import UpdatePasswordPage from './pages/auth/UpdatePasswordPage'
import AdminLayout from './pages/admin/AdminLayout'
import CoachLayout from './pages/coach/CoachLayout'
import HeroLayout from './pages/hero/HeroLayout'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/join" element={<OnboardingFlow />} />

            {/* Role router (redirects to role-appropriate home) */}
            <Route path="/" element={<RoleRouter />} />

            {/* Protected role routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminLayout />
              </ProtectedRoute>
            } />

            <Route path="/coach/*" element={
              <ProtectedRoute allowedRoles={['coach', 'super_admin']}>
                <CoachLayout />
              </ProtectedRoute>
            } />

            <Route path="/hero/*" element={
              <ProtectedRoute allowedRoles={['hero']}>
                <HeroLayout />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
