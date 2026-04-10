import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Read token type from hash before Supabase clears it
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    console.log('[AuthCallback] hash type:', type)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] event:', event, '| uid:', session?.user?.id)

      if (event === 'PASSWORD_RECOVERY') {
        // recovery link — go straight to set-password page
        subscription.unsubscribe()
        navigate('/update-password', { replace: true })
      } else if (event === 'SIGNED_IN') {
        subscription.unsubscribe()
        if (type === 'recovery' || type === 'invite' || type === 'signup') {
          // Signed in via an activation/invite link — hero must still set their password
          navigate('/update-password', { replace: true })
        } else {
          // Normal sign-in redirect (e.g. magic link)
          navigate('/', { replace: true })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#080808',
      color: '#f2f2f2',
      fontFamily: 'DM Mono, monospace',
    }}>
      Setting up your account...
    </div>
  )
}
