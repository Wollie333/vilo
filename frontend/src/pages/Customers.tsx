import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Eye, Users, TrendingUp, DollarSign, Repeat } from 'lucide-react'
import Button from '../components/Button'
import Table from '../components/Table'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { customersApi, CustomerListItem, CustomerStats } from '../services/api'

export default function Customers() {
  const navigate = useNavigate()
  const { tenant, tenantLoading } = useAuth()
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('last_stay')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { showSuccess, showError } = useNotification()
  const initialLoadDone = useRef(false)

  useEffect(() => {
    // Wait for tenant to be loaded before fetching customers
    if (!tenantLoading && tenant) {
      loadCustomers()
      loadStats()
      initialLoadDone.current = true
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenantLoading, tenant, sortField, sortOrder, page])

  useEffect(() => {
    // Debounce search - only run after initial load
    if (!initialLoadDone.current || !tenant) return
    const timer = setTimeout(() => {
      setPage(1)
      loadCustomers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await customersApi.getAll({
        search: searchQuery,
        sort: sortField,
        order: sortOrder,
        page,
        limit: 20
      })
      setCustomers(data.customers)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load customers:', error)
      showError('Error', 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await customersApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      await customersApi.exportCsv()
      showSuccess('Export Complete', 'Customer data has been downloaded')
    } catch (error) {
      console.error('Failed to export:', error)
      showError('Export Failed', 'Could not export customer data')
    } finally {
      setExporting(false)
    }
  }

  const handleView = (email: string) => {
    navigate(`/dashboard/customers/${encodeURIComponent(email)}`)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Table.HeaderCell onClick={() => handleSort(field)} className="cursor-pointer hover:opacity-70">
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span style={{ color: 'var(--text-muted)' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </Table.HeaderCell>
  )

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Customers</h1>
          <p style={{ color: 'var(--text-muted)' }}>View and manage your customer database</p>
        </div>
        <Button onClick={handleExport} variant="secondary" disabled={exporting}>
          <Download size={18} className="mr-2" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-3">Total Customers</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">{stats.totalCustomers}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-3">Repeat Customers</p>
                <div className="flex items-baseline gap-2">
                  <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">{stats.repeatCustomers}</p>
                  <span className="text-sm font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                    {stats.repeatRate}%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                <Repeat size={20} className="text-accent-600" />
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-3">Total Revenue</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-3">Avg Bookings/Customer</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">{stats.averageBookingsPerCustomer}</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
          />
        </div>
        <span style={{ color: 'var(--text-muted)' }} className="text-sm">
          {total} customer{total !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Customers Table */}
      <Table>
        <Table.Header>
          <tr>
            <SortHeader field="name">Name</SortHeader>
            <SortHeader field="email">Email</SortHeader>
            <Table.HeaderCell>Phone</Table.HeaderCell>
            <SortHeader field="bookings">Bookings</SortHeader>
            <SortHeader field="total_spent">Total Spent</SortHeader>
            <SortHeader field="first_stay">First Stay</SortHeader>
            <SortHeader field="last_stay">Last Stay</SortHeader>
            <Table.HeaderCell>Portal</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Empty colSpan={9}>Loading customers...</Table.Empty>
          ) : customers.length === 0 ? (
            <Table.Empty colSpan={9}>No customers found</Table.Empty>
          ) : (
            customers.map((customer) => (
              <Table.Row key={customer.email}>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    {customer.name || '-'}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">{customer.email}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">{customer.phone || '-'}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{customer.bookingCount}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    {formatCurrency(customer.totalSpent, customer.currency)}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">{formatDate(customer.firstStay)}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">{formatDate(customer.lastStay)}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {customer.hasPortalAccess ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-accent-100 text-accent-700">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                      No access
                    </span>
                  )}
                </Table.Cell>
                <Table.Cell align="right" className="whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleView(customer.email)}
                    style={{ color: 'var(--text-muted)' }}
                    className="hover:opacity-70 p-2 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
