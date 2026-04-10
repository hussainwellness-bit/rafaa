import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../ui/Spinner'

export default function RoleRouter() {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <Spinner size={32} className="text-[#c8ff00]" />
    </div>
  )

  if (!profile) return <Navigate to="/login" replace />

  switch (profile.role) {
    case 'super_admin': return <Navigate to="/admin" replace />
    case 'coach':       return <Navigate to="/coach" replace />
    case 'hero':        return <Navigate to="/hero" replace />
    default:            return <Navigate to="/login" replace />
  }
}
