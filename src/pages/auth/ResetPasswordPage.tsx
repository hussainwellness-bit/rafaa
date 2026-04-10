import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-[Bebas_Neue] text-6xl text-white tracking-wider">HUSSAIN.LIFT</h1>
          <p className="text-[#555] text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-7">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-white font-medium">Check your email</p>
              <p className="text-[#555] text-sm">We sent a password reset link to <span className="text-[#888]">{email}</span></p>
              <Link to="/login">
                <Button variant="ghost" className="w-full mt-2">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              {error && (
                <div className="p-3 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-[10px]">
                  <p className="text-[#ff3d3d] text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-[#555] hover:text-[#c8ff00] transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
