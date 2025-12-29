import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastContainer, ToastData, ToastType } from '../components/Toast'

interface NotificationContextType {
  showNotification: (
    type: ToastType,
    title: string,
    message?: string,
    debug?: string,
    duration?: number
  ) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string, debug?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showNotification = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      debug?: string,
      duration: number = type === 'error' ? 0 : 5000
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setToasts((prev) => [...prev, { id, type, title, message, debug, duration }])
    },
    []
  )

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showNotification('success', title, message, undefined, 4000)
    },
    [showNotification]
  )

  const showError = useCallback(
    (title: string, message?: string, debug?: string) => {
      showNotification('error', title, message, debug, 0) // Errors don't auto-dismiss
    },
    [showNotification]
  )

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showNotification('warning', title, message, undefined, 6000)
    },
    [showNotification]
  )

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showNotification('info', title, message, undefined, 5000)
    },
    [showNotification]
  )

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{ showNotification, showSuccess, showError, showWarning, showInfo, clearAll }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </NotificationContext.Provider>
  )
}
