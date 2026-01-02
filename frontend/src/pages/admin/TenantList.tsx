import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, Building2, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import Table from '../../components/Table'
import { adminTenants, Tenant, TenantFilterOptions } from '../../services/adminApi'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const limit = 20

  // Filter state
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [pausedFilter, setPausedFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [discoverableFilter, setDiscoverableFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState<TenantFilterOptions>({
    plans: [],
    countries: [],
    statuses: [],
    verificationStatuses: []
  })

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilters() {
      try {
        const options = await adminTenants.getFilters()
        setFilterOptions(options)
      } catch (err) {
        console.error('Failed to load filter options:', err)
      }
    }
    fetchFilters()
  }, [])

  // Fetch tenants when filters change
  useEffect(() => {
    async function fetchTenants() {
      try {
        setLoading(true)
        const { tenants, total } = await adminTenants.list({
          page,
          limit,
          search: search || undefined,
          status: statusFilter || undefined,
          plan: planFilter || undefined,
          isPaused: pausedFilter || undefined,
          country: countryFilter || undefined,
          verification: verificationFilter || undefined,
          discoverable: discoverableFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
        setTenants(tenants)
        setTotal(total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenants')
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [page, search, statusFilter, planFilter, pausedFilter, countryFilter, verificationFilter, discoverableFilter, dateFrom, dateTo])

  const totalPages = Math.ceil(total / limit)

  // Check if any filters are active
  const hasActiveFilters = statusFilter || planFilter || pausedFilter || countryFilter || verificationFilter || discoverableFilter || dateFrom || dateTo

  // Count active filters for badge
  const activeFilterCount = [
    statusFilter, planFilter, pausedFilter, countryFilter,
    verificationFilter, discoverableFilter, dateFrom, dateTo
  ].filter(Boolean).length

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('')
    setPlanFilter('')
    setPausedFilter('')
    setCountryFilter('')
    setVerificationFilter('')
    setDiscoverableFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  if (loading && tenants.length === 0) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading tenants...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Tenants</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage all properties on the platform</p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 mb-6">
        {/* Search Bar + Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, email, or slug..."
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="w-full border rounded-lg pl-10 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-accent-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-accent-500 bg-accent-50 text-accent-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-accent-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div style={{ borderColor: 'var(--border-color)' }} className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Status */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Plan */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  {filterOptions.plans.map(plan => (
                    <option key={plan.id} value={plan.slug}>{plan.name}</option>
                  ))}
                </select>
              </div>

              {/* Paused */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Paused</label>
                <select
                  value={pausedFilter}
                  onChange={(e) => { setPausedFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  <option value="false">Active Only</option>
                  <option value="true">Paused Only</option>
                </select>
              </div>

              {/* Country */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Country</label>
                <select
                  value={countryFilter}
                  onChange={(e) => { setCountryFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  {filterOptions.countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* Verification */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Verification</label>
                <select
                  value={verificationFilter}
                  onChange={(e) => { setVerificationFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="none">Not Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              {/* Visibility */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Visibility</label>
                <select
                  value={discoverableFilter}
                  onChange={(e) => { setDiscoverableFilter(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                >
                  <option value="">All</option>
                  <option value="true">Discoverable</option>
                  <option value="false">Hidden</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Created From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-medium mb-1">Created To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Tenant</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Plan</Table.HeaderCell>
            <Table.HeaderCell>Rooms</Table.HeaderCell>
            <Table.HeaderCell>Members</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ color: 'var(--text-muted)' }} className="px-6 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-500" />
              </td>
            </tr>
          ) : tenants.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ color: 'var(--text-muted)' }} className="px-6 py-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                No tenants found
              </td>
            </tr>
          ) : (
            tenants.map((tenant) => (
              <Table.Row key={tenant.id}>
                <Table.Cell>
                  <div>
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium">{tenant.name || 'Unnamed'}</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">{tenant.slug || tenant.id.slice(0, 8)}</p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${statusColors[tenant.status] || 'bg-gray-100 text-gray-600'}`}>
                    {tenant.status}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }}>{tenant.subscriptionPlan || '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }}>{tenant.roomCount ?? '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }}>{tenant.memberCount ?? '-'}</span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>
                </Table.Cell>
                <Table.Cell align="right">
                  <Link
                    to={`/admin/tenants/${tenant.id}`}
                    className="text-accent-600 hover:text-accent-700 text-sm font-medium"
                  >
                    View
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ borderColor: 'var(--border-color)' }} className="mt-4 px-6 py-4 border-t flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tenants
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-80"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-80"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
