import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect once profile is loaded after login
  useEffect(() => {
    if (!authLoading && profile) {
      const dest = profile.role === 'super_admin' ? '/admin' : profile.role === 'coach' ? '/coach' : '/hero'
      navigate(dest, { replace: true })
    }
  }, [profile, authLoading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success: authLoading will flip, useEffect above will redirect
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-[Bebas_Neue] text-6xl text-white tracking-wider">HUSSAIN.LIFT</h1>
          <p className="text-[#555] text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div className="p-3 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-[10px]">
                <p className="text-[#ff3d3d] text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading || authLoading} className="w-full mt-2">
              {loading || authLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/reset-password" className="text-sm text-[#555] hover:text-[#c8ff00] transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
