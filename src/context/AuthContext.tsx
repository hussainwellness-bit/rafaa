import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Profile } from '../types'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else clear()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    // First try by id (fast path — works for coaches, admins, and heroes already linked)
    const { data: byId } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (byId) {
      setProfile(byId as Profile)
      setLoading(false)
      return
    }

    // Profile not found by id yet — the trigger may still be running (hero just registered).
    // Get the user's email from the session and retry by email up to 3 times.
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    if (!email) {
      setProfile(null)
      setLoading(false)
      return
    }

    let profile: Profile | null = null
    let attempts = 0
    while (!profile && attempts < 3) {
      await new Promise(r => setTimeout(r, 1000))
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
      profile = (data as Profile) ?? null
      attempts++
    }

    setProfile(profile)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const { profile, loading } = useAuthStore()

  return (
    <AuthContext.Provider value={{ profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
