/**
 * Centralized Brand Colors Configuration
 *
 * All brand colors should be referenced from this file to ensure
 * consistency across the entire application.
 *
 * Brand Palette:
 * - Primary Green: #047857
 * - Black: #000000
 * - White: #FFFFFF
 */

// Tailwind CSS class-based color system
export const colors = {
  // Brand accent color (green #047857)
  accent: {
    50: 'accent-50',
    100: 'accent-100',
    200: 'accent-200',
    300: 'accent-300',
    400: 'accent-400',
    500: 'accent-500',
    600: 'accent-600',
    700: 'accent-700',
    800: 'accent-800',
    900: 'accent-900',
  },
}

// Status colors for consistent styling across the app
export const statusColors = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-400',
    combined: 'bg-yellow-100 text-yellow-700',
  },
  confirmed: {
    bg: 'bg-accent-100',
    text: 'text-accent-700',
    border: 'border-accent-400',
    combined: 'bg-accent-100 text-accent-700',
  },
  checked_in: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-400',
    combined: 'bg-blue-100 text-blue-700',
  },
  checked_out: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-400',
    combined: 'bg-purple-100 text-purple-700',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-400',
    combined: 'bg-red-100 text-red-700',
  },
  completed: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-400',
    combined: 'bg-gray-100 text-gray-700',
  },
}

// Payment status colors
export const paymentStatusColors = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    combined: 'bg-gray-100 text-gray-700',
  },
  paid: {
    bg: 'bg-accent-100',
    text: 'text-accent-700',
    combined: 'bg-accent-100 text-accent-700',
  },
  partial: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    combined: 'bg-blue-100 text-blue-700',
  },
  refunded: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    combined: 'bg-red-100 text-red-700',
  },
}

// Button variants using brand colors
export const buttonStyles = {
  primary: 'bg-black text-white hover:bg-gray-800',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  accent: 'bg-accent-600 text-white hover:bg-accent-700',
  accentOutline: 'border border-accent-600 text-accent-600 hover:bg-accent-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerOutline: 'border border-red-600 text-red-600 hover:bg-red-50',
}

// Active/Inactive status colors
export const activeStatusColors = {
  active: {
    bg: 'bg-accent-100',
    text: 'text-accent-700',
    combined: 'bg-accent-100 text-accent-700',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    combined: 'bg-gray-100 text-gray-500',
  },
}

// Success/Error message colors
export const messageColors = {
  success: 'text-accent-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
}

// Focus ring colors
export const focusColors = {
  accent: 'focus:ring-accent-500 focus:border-accent-500',
  default: 'focus:ring-blue-500 focus:border-blue-500',
}

// Badge colors for various statuses
export const badgeColors = {
  success: 'bg-accent-100 text-accent-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-700',
}

// Helper function to get status color
export function getStatusColor(status: string): string {
  const colors = statusColors[status as keyof typeof statusColors]
  return colors?.combined || 'bg-gray-100 text-gray-700'
}

// Helper function to get payment status color
export function getPaymentStatusColor(status: string): string {
  const colors = paymentStatusColors[status as keyof typeof paymentStatusColors]
  return colors?.combined || 'bg-gray-100 text-gray-700'
}

// Helper function to get active status color
export function getActiveStatusColor(isActive: boolean): string {
  return isActive ? activeStatusColors.active.combined : activeStatusColors.inactive.combined
}
