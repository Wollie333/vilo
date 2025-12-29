import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { setTenantId } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface Tenant {
  id: string
  name: string | null
  owner_user_id: string
  has_lifetime_access: boolean
  paystack_customer_code: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  tenant: Tenant | null
  loading: boolean
  tenantLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>
  signOut: () => Promise<void>
  refreshTenant: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantLoading, setTenantLoading] = useState(false)

  const fetchTenant = useCallback(async (accessToken: string) => {
    setTenantLoading(true)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setTenant(data.tenant)
        setTenantId(data.tenant?.id || null)
      } else {
        // No tenant found - this is okay for new users
        setTenant(null)
        setTenantId(null)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Tenant fetch timed out')
      } else {
        console.error('Error fetching tenant:', error)
      }
      setTenant(null)
      setTenantId(null)
    } finally {
      setTenantLoading(false)
    }
  }, [])

  const refreshTenant = useCallback(async () => {
    if (session?.access_token) {
      await fetchTenant(session.access_token)
    }
  }, [session, fetchTenant])

  useEffect(() => {
    // Timeout to ensure loading state resolves even if Supabase is slow
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout - Supabase may be unavailable')
        setLoading(false)
      }
    }, 10000)

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Fetch tenant if session exists
        if (session?.access_token) {
          fetchTenant(session.access_token)
        }
      })
      .catch((error) => {
        console.error('Failed to get session:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Fetch tenant on auth change
        if (session?.access_token) {
          fetchTenant(session.access_token)
        } else {
          setTenant(null)
          setTenantId(null)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchTenant])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error: error as Error | null, session: data.session }
  }

  const signOut = async () => {
    setTenant(null)
    setTenantId(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      tenant,
      loading,
      tenantLoading,
      signIn,
      signUp,
      signOut,
      refreshTenant
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
