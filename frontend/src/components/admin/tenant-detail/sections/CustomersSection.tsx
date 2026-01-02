import { useState, useEffect } from 'react'
import { Users, Search, Mail, Phone, Calendar, Loader2, Download } from 'lucide-react'
import type { TenantCustomer } from '../types'

interface CustomersSectionProps {
  tenantId: string
  onFetch: (search?: string) => Promise<TenantCustomer[]>
}

export default function CustomersSection({ tenantId, onFetch }: CustomersSectionProps) {
  const [customers, setCustomers] = useState<TenantCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [tenantId])

  const fetchCustomers = async (searchTerm?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await onFetch(searchTerm)
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchCustomers(search || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getInitial = (customer: TenantCustomer) => {
    return (customer.name || customer.email).charAt(0).toUpperCase()
  }

  const downloadCSV = () => {
    if (customers.length === 0) return

    const headers = ['Name', 'Email', 'Phone', 'Bookings', 'Total Spent', 'Last Stay', 'Portal Access']
    const rows = customers.map(c => [
      `"${(c.name || 'Unnamed').replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      c.bookingCount,
      c.totalSpent,
      c.lastStay || '',
      c.hasPortalAccess ? 'Yes' : 'No'
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={customers.length === 0 || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Download CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <Loader2 size={24} className="mx-auto text-accent-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading customers...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && customers.length === 0 && (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No customers found</p>
        </div>
      )}

      {/* Customer List */}
      {!loading && !error && customers.length > 0 && (
        <div className="space-y-2">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name || 'Customer'}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {getInitial(customer)}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.name || 'Unnamed Customer'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {customer.email}
                    </span>
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-sm font-medium text-gray-900">{customer.bookingCount} booking{customer.bookingCount !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(customer.totalSpent)} total</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    Last: {formatDate(customer.lastStay)}
                  </p>
                </div>
                {customer.hasPortalAccess && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    Portal
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
