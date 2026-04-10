import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'
import Spinner from '../ui/Spinner'

interface Props {
  allowedRoles: Role[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { profile, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-[#080808] flex items-center justify-center"><Spinner size={32} className="text-[#c8ff00]" /></div>
  if (!profile) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
}
