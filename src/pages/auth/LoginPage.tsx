import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setSuccess('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success: useEffect above redirects
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Try to sign in immediately (works if email confirmation is disabled)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      // Email confirmation may be required
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setTab('login')
      setLoading(false)
    }
    // On success: useEffect above redirects
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="font-[Bebas_Neue] text-6xl text-white tracking-wider">RAFAATECH</h1>
          <p className="text-[#555] text-sm mt-1">Your personal training platform</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-7">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#0a0a0a] rounded-[12px] mb-6">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all capitalize"
                style={tab === t
                  ? { background: '#c8ff00', color: '#080808' }
                  : { background: 'transparent', color: '#555' }
                }
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Success banner */}
          {success && (
            <div className="mb-4 p-3 bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-[10px]">
              <p className="text-[#c8ff00] text-sm">{success}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
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

              <div className="text-center">
                <Link to="/reset-password" className="text-sm text-[#555] hover:text-[#c8ff00] transition-colors">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                placeholder="Your name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
              />
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
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              {error && (
                <div className="p-3 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-[10px]">
                  <p className="text-[#ff3d3d] text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              <p className="text-center text-xs text-[#444] leading-relaxed">
                Register with the email your coach used to set up your plan — your training data will be waiting.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
