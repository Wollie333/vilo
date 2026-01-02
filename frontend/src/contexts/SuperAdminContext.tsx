import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'marketing' | 'finance'

export interface AdminPermissions {
  analytics: boolean
  tenants: boolean
  users: boolean
  plans: boolean
  integrations: boolean
  marketing: boolean
  teams: boolean
  errors: boolean
  backups: boolean
  settings: boolean
}

export interface SuperAdmin {
  id: string
  userId: string
  email: string
  displayName: string
  role: AdminRole
  permissions: AdminPermissions
  avatarUrl?: string
  status: 'active' | 'suspended' | 'pending'
  lastActiveAt?: string
  createdAt: string
}

interface SuperAdminContextType {
  user: User | null
  session: Session | null
  admin: SuperAdmin | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  hasPermission: (permission: keyof AdminPermissions) => boolean
  hasAnyPermission: (permissions: (keyof AdminPermissions)[]) => boolean
  isSuperAdmin: boolean
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined)

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<SuperAdmin | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAdminProfile = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/admin/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const adminData = data.admin || data
        setAdmin({
          id: adminData.id,
          userId: adminData.user_id || adminData.id,
          email: adminData.email,
          displayName: adminData.display_name,
          role: adminData.role,
          permissions: adminData.permissions || {},
          avatarUrl: adminData.avatar_url,
          status: adminData.status || 'active',
          lastActiveAt: adminData.last_login_at || adminData.last_active_at,
          createdAt: adminData.created_at,
        })
        return true
      } else {
        setAdmin(null)
        return false
      }
    } catch (error) {
      console.error('[SuperAdminContext] Failed to fetch admin profile:', error)
      setAdmin(null)
      return false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (session?.access_token) {
      await fetchAdminProfile(session.access_token)
    }
  }, [session, fetchAdminProfile])

  useEffect(() => {
    let isMounted = true

    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false)
      }
    }, 10000)

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)
        clearTimeout(timeout)

        if (session?.access_token) {
          // Wait for admin profile before setting loading to false
          await fetchAdminProfile(session.access_token)
        }

        if (isMounted) {
          setLoading(false)
        }
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('[SuperAdminContext] Failed to get session:', error)
        setLoading(false)
        clearTimeout(timeout)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.access_token) {
          // Wait for admin profile before setting loading to false
          await fetchAdminProfile(session.access_token)
        } else {
          setAdmin(null)
        }

        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchAdminProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    setAdmin(null)
    await supabase.auth.signOut()
  }

  const hasPermission = useCallback((permission: keyof AdminPermissions): boolean => {
    if (!admin) return false
    if (admin.role === 'super_admin') return true
    return admin.permissions[permission] === true
  }, [admin])

  const hasAnyPermission = useCallback((permissions: (keyof AdminPermissions)[]): boolean => {
    if (!admin) return false
    if (admin.role === 'super_admin') return true
    if (permissions.length === 0) return true
    return permissions.some(p => admin.permissions[p] === true)
  }, [admin])

  const isSuperAdmin = admin?.role === 'super_admin'

  return (
    <SuperAdminContext.Provider value={{
      user,
      session,
      admin,
      loading,
      signIn,
      signOut,
      refresh,
      hasPermission,
      hasAnyPermission,
      isSuperAdmin,
    }}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext)
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider')
  }
  return context
}
