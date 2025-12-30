import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { setTenantId, setAccessToken } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Role and Permission types
export type Role = 'owner' | 'general_manager' | 'accountant'
export type Permission = 'none' | 'view' | 'edit' | 'full'

// Permission matrix - mirrors backend
const PERMISSIONS: Record<string, Record<Role, Permission>> = {
  'dashboard': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'bookings': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'rooms': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'reviews': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'calendar': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'settings.account': { owner: 'full', general_manager: 'edit', accountant: 'edit' },
  'settings.business': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'settings.members': { owner: 'full', general_manager: 'view', accountant: 'none' },
  'settings.billing': { owner: 'full', general_manager: 'none', accountant: 'full' },
  'account.delete': { owner: 'full', general_manager: 'none', accountant: 'none' },
  'seasonal_rates': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'addons': { owner: 'full', general_manager: 'full', accountant: 'view' },
  'reports': { owner: 'full', general_manager: 'view', accountant: 'full' },
  'payments': { owner: 'full', general_manager: 'view', accountant: 'full' },
}

interface Tenant {
  id: string
  name: string | null
  owner_user_id: string
  has_lifetime_access: boolean
  paystack_customer_code: string | null
  created_at: string
  updated_at: string
  // Domain Settings
  slug: string | null
  custom_domain: string | null
  // Business Information
  business_name: string | null
  business_description: string | null
  logo_url: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  vat_number: string | null
  business_email: string | null
  business_phone: string | null
  website_url: string | null
  // Regional Settings
  language: string | null
  currency: string | null
  timezone: string | null
  date_format: string | null
  // Paystack Settings
  paystack_enabled: boolean | null
  paystack_mode: string | null
  paystack_test_public_key: string | null
  paystack_test_secret_key: string | null
  paystack_live_public_key: string | null
  paystack_live_secret_key: string | null
  // EFT Settings
  eft_enabled: boolean | null
  eft_account_holder: string | null
  eft_bank_name: string | null
  eft_account_number: string | null
  eft_branch_code: string | null
  eft_account_type: string | null
  // Business Hours
  business_hours: Record<string, { open: string; close: string; closed: boolean }> | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  tenant: Tenant | null
  role: Role | null
  loading: boolean
  tenantLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>
  signOut: () => Promise<void>
  refreshTenant: () => Promise<void>
  refreshUser: () => Promise<void>
  // Permission helpers
  can: (resource: string, required?: Permission) => boolean
  isOwner: boolean
  isManager: boolean
  isAccountant: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantLoading, setTenantLoading] = useState(false)

  // Permission helper function
  const can = useCallback((resource: string, required: Permission = 'view'): boolean => {
    if (!role) return false
    const userPermission = PERMISSIONS[resource]?.[role] || 'none'
    const levels: Permission[] = ['none', 'view', 'edit', 'full']
    return levels.indexOf(userPermission) >= levels.indexOf(required)
  }, [role])

  // Role helper getters
  const isOwner = role === 'owner'
  const isManager = role === 'general_manager'
  const isAccountant = role === 'accountant'

  // Fetch user's role in their tenant
  const fetchRole = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/members/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRole(data.role as Role)
      } else {
        // User might be owner without tenant_members entry yet
        // Default to owner if they have a tenant
        setRole(null)
      }
    } catch (error) {
      console.error('Error fetching role:', error)
      setRole(null)
    }
  }, [])

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

        // Fetch user's role after tenant is loaded
        if (data.tenant) {
          await fetchRole(accessToken)
        } else {
          setRole(null)
        }
      } else {
        // No tenant found - this is okay for new users
        setTenant(null)
        setTenantId(null)
        setRole(null)
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
      setRole(null)
    } finally {
      setTenantLoading(false)
    }
  }, [fetchRole])

  const refreshTenant = useCallback(async () => {
    if (session?.access_token) {
      await fetchTenant(session.access_token)
    }
  }, [session, fetchTenant])

  const refreshUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
        return
      }
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } catch (err) {
      console.error('Error refreshing user:', err)
    }
  }, [])

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
        setAccessToken(session?.access_token ?? null)
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
        setAccessToken(session?.access_token ?? null)
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
    setAccessToken(null)
    setRole(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      tenant,
      role,
      loading,
      tenantLoading,
      signIn,
      signUp,
      signOut,
      refreshTenant,
      refreshUser,
      can,
      isOwner,
      isManager,
      isAccountant
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
