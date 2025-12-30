import { Navigate, useLocation } from 'react-router-dom'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'

interface CustomerProtectedRouteProps {
  children: React.ReactNode
}

export default function CustomerProtectedRoute({ children }: CustomerProtectedRouteProps) {
  const { isAuthenticated, loading } = useCustomerAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
