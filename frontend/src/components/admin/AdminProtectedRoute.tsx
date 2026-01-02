import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSuperAdmin, AdminPermissions } from '../../contexts/SuperAdminContext'
import { Loader2, AlertTriangle, ShieldX } from 'lucide-react'

interface AdminProtectedRouteProps {
  children: ReactNode
  requiredPermission?: keyof AdminPermissions
}

export function AdminProtectedRoute({ children, requiredPermission }: AdminProtectedRouteProps) {
  const { admin, loading, hasPermission } = useSuperAdmin()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  if (admin.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Suspended</h2>
          <p className="text-gray-500 mb-6">Your admin account has been suspended. Please contact a super administrator.</p>
        </div>
      </div>
    )
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">You don't have permission to access this page.</p>
          <a href="/admin" className="text-accent-600 hover:text-accent-700">
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
