import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import CustomerSidebar from './CustomerSidebar'
import CustomerHeader from './CustomerHeader'
import SetPasswordModal from './portal/SetPasswordModal'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'

const PASSWORD_MODAL_DISMISSED_KEY = 'vilo_password_modal_dismissed'

export default function CustomerLayout() {
  const { customer } = useCustomerAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Show password modal for ALL first-time visitors who haven't set a password
  useEffect(() => {
    // Check if modal was already dismissed this session
    const wasDismissed = sessionStorage.getItem(PASSWORD_MODAL_DISMISSED_KEY) === 'true'

    // Check if customer exists and hasn't set a password
    const isFirstTimeVisitor = customer && !customer.hasPassword

    // Show modal for first-time visitors who haven't dismissed it
    if (isFirstTimeVisitor && !wasDismissed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowPasswordModal(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [customer])

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false)
    // Mark as dismissed for this session
    sessionStorage.setItem(PASSWORD_MODAL_DISMISSED_KEY, 'true')
  }

  const handlePasswordModalSkip = () => {
    setShowPasswordModal(false)
    // Mark as dismissed for this session
    sessionStorage.setItem(PASSWORD_MODAL_DISMISSED_KEY, 'true')
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }} className="flex h-screen transition-colors">
      <CustomerSidebar />
      <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="flex flex-col flex-1 overflow-hidden transition-colors">
        <CustomerHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Set Password Modal for first-time users */}
      <SetPasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        onSkip={handlePasswordModalSkip}
      />
    </div>
  )
}
