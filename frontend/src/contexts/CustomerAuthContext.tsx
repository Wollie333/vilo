import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { portalApi, Customer, setCustomerToken, getCustomerToken } from '../services/portalApi'

interface CustomerAuthContextType {
  customer: Customer | null
  isAuthenticated: boolean
  loading: boolean
  requestMagicLink: (email: string) => Promise<{ success: boolean; dev_token?: string }>
  verifyToken: (token: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => Promise<void>
  setPassword: (password: string) => Promise<void>
  refreshCustomer: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = getCustomerToken()
    if (token) {
      refreshCustomer()
    } else {
      setLoading(false)
    }
  }, [])

  const refreshCustomer = async () => {
    try {
      const customerData = await portalApi.getMe()
      setCustomer(customerData)
    } catch (error) {
      // Token is invalid, clear it
      setCustomerToken(null)
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const requestMagicLink = async (email: string) => {
    const result = await portalApi.requestMagicLink(email)
    return { success: result.success, dev_token: result.dev_token }
  }

  const verifyToken = async (token: string) => {
    const result = await portalApi.verifyToken(token)
    setCustomerToken(result.token)
    setCustomer(result.customer)
  }

  const login = async (email: string, password: string) => {
    const result = await portalApi.login(email, password)
    setCustomerToken(result.token)
    setCustomer(result.customer)
  }

  // Login with an existing token (e.g., from coupon claim flow)
  const loginWithToken = async (token: string) => {
    setCustomerToken(token)
    try {
      const customerData = await portalApi.getMe()
      setCustomer(customerData)
    } catch (error) {
      setCustomerToken(null)
      throw new Error('Invalid token')
    }
  }

  const logout = async () => {
    await portalApi.logout()
    setCustomer(null)
    // Clear password modal dismissed flag so it shows for next login if needed
    sessionStorage.removeItem('vilo_password_modal_dismissed')
  }

  const setPassword = async (password: string) => {
    await portalApi.setPassword(password)
    if (customer) {
      setCustomer({ ...customer, hasPassword: true })
    }
  }

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        loading,
        requestMagicLink,
        verifyToken,
        login,
        loginWithToken,
        logout,
        setPassword,
        refreshCustomer,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return context
}
