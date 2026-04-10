import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import Toast from '../../components/ui/Toast'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    showToast('success', 'Password set! Welcome to RafaaTech 💪')
    setTimeout(() => navigate('/', { replace: true }), 1000)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <Toast toast={toast} />

      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-[Bebas_Neue] text-[38px] text-white tracking-wider leading-none">
            SET YOUR PASSWORD
          </h1>
          <p className="text-[#555] text-sm mt-2 leading-relaxed px-4">
            Welcome to RafaaTech — create your password to access your training dashboard
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[#888] text-xs uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8ff00]/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#888] text-xs uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8ff00]/40"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-[10px]">
                <p className="text-[#ff3d3d] text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-full font-[Bebas_Neue] text-base tracking-[2px] transition-opacity"
              style={{
                background: loading ? '#2a2a2a' : '#c8ff00',
                color: loading ? '#555' : '#080808',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Setting password...' : 'SET PASSWORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
