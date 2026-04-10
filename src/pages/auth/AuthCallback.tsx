import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // First check if the token type is already in the hash (before Supabase consumes it)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    console.log('[AuthCallback] hash type:', type)

    if (type === 'recovery' || type === 'invite') {
      // Let Supabase process the hash, then navigate
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthCallback] event:', event, '| session uid:', session?.user?.id)
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/update-password', { replace: true })
        }
      })
      return
    }

    // No hash type — listen for whatever event fires
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] event:', event, '| session uid:', session?.user?.id)
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password', { replace: true })
      } else if (event === 'SIGNED_IN') {
        navigate('/', { replace: true })
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
