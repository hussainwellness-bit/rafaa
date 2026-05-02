import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && profile) {
      const dest = profile.role === 'super_admin' ? '/admin' : profile.role === 'coach' ? '/coach' : '/hero'
      navigate(dest, { replace: true })
    } else if (!authLoading && !profile && loading) {
      const t = setTimeout(() => {
        setLoading(false)
        setError('Could not load your account. Please try again.')
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [profile, authLoading, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <button
          onClick={() => navigate('/')}
          style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', letterSpacing: 1, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 32, display: 'block' }}
        >
          ← Back to Home
        </button>

        <p className="auth-logo">
          HUSSAIN<em>.LIFT</em>
        </p>
        <p className="auth-sub">SIGN IN</p>

        <div className="auth-box">
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="auth-input"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="auth-input"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading || authLoading} className="auth-btn">
              {loading || authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <Link
              to="/reset-password"
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', textDecoration: 'none', letterSpacing: 1 }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text3)', marginTop: 24 }}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}
          >
            Back to Home
          </button>
        </p>
      </div>
    </div>
  )
}
