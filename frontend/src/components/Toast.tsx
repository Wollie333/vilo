import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  debug?: string
  duration?: number
}

interface ToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-accent-50',
    borderColor: 'border-accent-200',
    iconColor: 'text-accent-500',
    titleColor: 'text-accent-800',
    textColor: 'text-accent-700',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
  },
}

function Toast({ toast, onClose }: ToastProps) {
  const [showDebug, setShowDebug] = useState(false)
  const config = typeConfig[toast.type]
  const Icon = config.icon

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onClose])

  return (
    <div
      className={`w-full max-w-md ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg overflow-hidden animate-slide-in`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${config.titleColor}`}>{toast.title}</p>
            {toast.message && (
              <p className={`mt-1 text-sm ${config.textColor}`}>{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onClose(toast.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 ${config.textColor}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Debug section */}
        {toast.debug && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`flex items-center gap-1 text-xs font-medium ${config.textColor} hover:underline`}
            >
              {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </button>
            {showDebug && (
              <pre className={`mt-2 p-2 text-xs ${config.textColor} bg-black/5 rounded overflow-x-auto max-h-32 overflow-y-auto`}>
                {toast.debug}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

export default Toast
