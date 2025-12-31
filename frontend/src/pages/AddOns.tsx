import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import { addonsApi, AddOn } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

const addonTypeLabels = {
  service: 'Service',
  product: 'Product',
  experience: 'Experience',
}

const pricingTypeLabels = {
  per_booking: 'Per Booking',
  per_night: 'Per Night',
  per_guest: 'Per Guest',
  per_guest_per_night: 'Per Guest/Night',
}

export default function AddOns() {
  const navigate = useNavigate()
  const { tenant, tenantLoading } = useAuth()
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; addonId: string | null }>({
    isOpen: false,
    addonId: null,
  })
  const [confirmToggle, setConfirmToggle] = useState<{ isOpen: boolean; addon: AddOn | null }>({
    isOpen: false,
    addon: null,
  })
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    // Wait for tenant to be loaded before fetching addons
    if (!tenantLoading && tenant) {
      loadAddons()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenant, tenantLoading])

  const loadAddons = async () => {
    try {
      setLoading(true)
      const data = await addonsApi.getAll()
      setAddons(data)
    } catch (error) {
      console.error('Failed to load add-ons:', error)
      // Use empty array on failure
      setAddons([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => navigate('/dashboard/addons/new')
  const handleEdit = (addon: AddOn) => navigate(`/dashboard/addons/${addon.id}/edit`)
  const handleDeleteClick = (id: string) => setConfirmDelete({ isOpen: true, addonId: id })

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.addonId) return
    try {
      setDeletingId(confirmDelete.addonId)
      await addonsApi.delete(confirmDelete.addonId, true)
      setConfirmDelete({ isOpen: false, addonId: null })
      showSuccess('Add-on Deleted', 'The add-on has been permanently deleted.')
      await loadAddons()
    } catch (error) {
      console.error('Error deleting add-on:', error)
      showError('Failed to Delete', 'Could not delete the add-on. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => setConfirmDelete({ isOpen: false, addonId: null })
  const handleToggleClick = (addon: AddOn) => setConfirmToggle({ isOpen: true, addon })

  const handleToggleConfirm = async () => {
    if (!confirmToggle.addon) return
    const addon = confirmToggle.addon
    try {
      setTogglingId(addon.id!)
      setConfirmToggle({ isOpen: false, addon: null })
      await addonsApi.update(addon.id!, { is_active: !addon.is_active })
      showSuccess(
        addon.is_active ? 'Add-on Deactivated' : 'Add-on Activated',
        `${addon.name} is now ${addon.is_active ? 'inactive' : 'active'}.`
      )
      await loadAddons()
    } catch (error) {
      console.error('Error toggling add-on status:', error)
      showError('Update Failed', 'Could not update the add-on status.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleToggleCancel = () => setConfirmToggle({ isOpen: false, addon: null })

  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      addon.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.addon_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && addon.is_active) ||
      (activeFilter === 'inactive' && !addon.is_active)
    const matchesType = typeFilter === 'all' || addon.addon_type === typeFilter
    return matchesSearch && matchesActive && matchesType
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Add-ons</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage extras and services for your rooms</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={18} className="mr-2" />
          Add Add-on
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search add-ons..."
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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
        >
          <option value="all">All Types</option>
          <option value="service">Services</option>
          <option value="product">Products</option>
          <option value="experience">Experiences</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Add-ons Table */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
            <tr>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Add-on</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Pricing</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody style={{ borderColor: 'var(--border-color)' }} className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)' }} className="px-6 py-12 text-center">Loading add-ons...</td>
              </tr>
            ) : filteredAddons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package style={{ color: 'var(--text-muted)' }} size={32} />
                  </div>
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-medium mb-2">
                    {addons.length === 0 ? 'No Add-ons Yet' : 'No Matching Add-ons'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }} className="mb-6 max-w-md mx-auto">
                    {addons.length === 0
                      ? 'Add-ons are extras that guests can add to their booking, like breakfast, airport transfers, or late checkout.'
                      : 'Try adjusting your search or filters.'}
                  </p>
                  {addons.length === 0 && (
                    <Button onClick={handleCreate}>
                      <Plus size={18} className="mr-2" />
                      Create Your First Add-on
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              filteredAddons.map((addon) => (
                <tr key={addon.id} className="hover:opacity-90 transition-opacity">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {addon.image ? (
                        <img
                          src={addon.image.url}
                          alt={addon.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-10 h-10 rounded-lg flex items-center justify-center">
                          <Package style={{ color: 'var(--text-muted)' }} className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{addon.name}</div>
                        {addon.addon_code && <div style={{ color: 'var(--text-muted)' }} className="text-xs">{addon.addon_code}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        addon.addon_type === 'service'
                          ? 'bg-blue-100 text-blue-700'
                          : addon.addon_type === 'product'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {addonTypeLabels[addon.addon_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                      {formatCurrency(addon.price, addon.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                      {pricingTypeLabels[addon.pricing_type]}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleClick(addon)}
                      disabled={togglingId === addon.id}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                        addon.is_active ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {addon.is_active ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(addon)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 p-1" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => addon.id && handleDeleteClick(addon.id)} disabled={deletingId === addon.id} className="text-red-500 hover:opacity-70 p-1 disabled:opacity-50" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div style={{ color: 'var(--text-muted)' }} className="mt-6 flex items-center gap-6 text-sm">
        <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{addons.length}</strong> add-ons</span>
        <span>Active: <strong style={{ color: 'var(--text-primary)' }}>{addons.filter((a) => a.is_active).length}</strong></span>
        <span>Services: <strong style={{ color: 'var(--text-primary)' }}>{addons.filter((a) => a.addon_type === 'service').length}</strong></span>
        <span>Products: <strong style={{ color: 'var(--text-primary)' }}>{addons.filter((a) => a.addon_type === 'product').length}</strong></span>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Add-on"
        message="Are you sure you want to permanently delete this add-on? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deletingId !== null}
      />

      <ConfirmModal
        isOpen={confirmToggle.isOpen}
        title={confirmToggle.addon?.is_active ? 'Deactivate Add-on' : 'Activate Add-on'}
        message={confirmToggle.addon?.is_active
          ? `Are you sure you want to deactivate "${confirmToggle.addon?.name}"?`
          : `Are you sure you want to activate "${confirmToggle.addon?.name}"?`}
        confirmText={confirmToggle.addon?.is_active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        variant={confirmToggle.addon?.is_active ? 'danger' : 'info'}
        onConfirm={handleToggleConfirm}
        onCancel={handleToggleCancel}
        isLoading={togglingId !== null}
      />
    </div>
  )
}
