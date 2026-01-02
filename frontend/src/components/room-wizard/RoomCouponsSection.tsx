import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, Moon, Loader2, Calendar, Users, Hash, MessageSquare } from 'lucide-react'
import Button from '../Button'
import { couponsApi, Coupon, DiscountType } from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'

interface RoomCouponsSectionProps {
  roomId: string | null
}

const DISCOUNT_TYPES: { value: DiscountType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'percentage', label: 'Percentage', icon: <Percent size={18} />, description: 'e.g., 10% off' },
  { value: 'fixed_amount', label: 'Fixed Amount', icon: <DollarSign size={18} />, description: 'e.g., R500 off' },
  { value: 'free_nights', label: 'Free Nights', icon: <Moon size={18} />, description: 'e.g., 1 free night' },
]

const initialFormData = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: 10,
  valid_from: '',
  valid_until: '',
  max_uses: '' as number | '',
  max_uses_per_customer: '' as number | '',
  min_booking_amount: '' as number | '',
  min_nights: '' as number | '',
  is_active: true,
  is_claimable: false,
}

export default function RoomCouponsSection({ roomId }: RoomCouponsSectionProps) {
  const { showSuccess, showError } = useNotification()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (roomId) {
      loadCoupons()
    }
  }, [roomId])

  const loadCoupons = async () => {
    if (!roomId) return
    try {
      setLoading(true)
      const data = await couponsApi.getAll({ room_id: roomId })
      // Filter to only show coupons specific to this room
      const roomCoupons = data.filter(c =>
        c.applicable_room_ids && c.applicable_room_ids.includes(roomId)
      )
      setCoupons(roomCoupons)
    } catch (error) {
      console.error('Failed to load coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setEditingCoupon(null)
    setFormData(initialFormData)
    setShowForm(true)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      valid_from: coupon.valid_from || '',
      valid_until: coupon.valid_until || '',
      max_uses: coupon.max_uses ?? '',
      max_uses_per_customer: coupon.max_uses_per_customer ?? '',
      min_booking_amount: coupon.min_booking_amount ?? '',
      min_nights: coupon.min_nights ?? '',
      is_active: coupon.is_active,
      is_claimable: coupon.is_claimable ?? false,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCoupon(null)
    setFormData(initialFormData)
  }

  const handleSave = async () => {
    if (!roomId) return

    if (!formData.code.trim()) {
      showError('Validation Error', 'Coupon code is required')
      return
    }
    if (!formData.name.trim()) {
      showError('Validation Error', 'Coupon name is required')
      return
    }
    if (formData.discount_value <= 0) {
      showError('Validation Error', 'Discount value must be greater than 0')
      return
    }
    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      showError('Validation Error', 'Percentage cannot exceed 100')
      return
    }

    try {
      setSaving(true)
      const payload = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        applicable_room_ids: [roomId],
        valid_from: formData.valid_from || undefined,
        valid_until: formData.valid_until || undefined,
        max_uses: formData.max_uses ? Number(formData.max_uses) : undefined,
        max_uses_per_customer: formData.max_uses_per_customer ? Number(formData.max_uses_per_customer) : undefined,
        min_booking_amount: formData.min_booking_amount ? Number(formData.min_booking_amount) : undefined,
        min_nights: formData.min_nights ? Number(formData.min_nights) : undefined,
        is_active: formData.is_active,
        is_claimable: formData.is_claimable,
      }

      if (editingCoupon?.id) {
        await couponsApi.update(editingCoupon.id, payload)
        showSuccess('Coupon Updated', `"${formData.code}" has been updated.`)
      } else {
        await couponsApi.create(payload)
        showSuccess('Coupon Created', `"${formData.code}" has been created.`)
      }

      setShowForm(false)
      setEditingCoupon(null)
      setFormData(initialFormData)
      loadCoupons()
    } catch (error: any) {
      showError('Save Failed', error.message || 'Could not save coupon.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!coupon.id) return

    if (!confirm(`Are you sure you want to delete the coupon "${coupon.code}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(coupon.id)
      await couponsApi.delete(coupon.id, true)
      showSuccess('Coupon Deleted', `"${coupon.code}" has been removed.`)
      loadCoupons()
    } catch (error) {
      showError('Delete Failed', 'Could not delete coupon.')
    } finally {
      setDeleting(null)
    }
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% off`
      case 'fixed_amount':
        return `R${coupon.discount_value} off`
      case 'free_nights':
        return `${coupon.discount_value} free night${coupon.discount_value > 1 ? 's' : ''}`
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Show message if room not saved yet
  if (!roomId) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Tag className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Save the room first to add promotional codes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Create promotional codes that customers can use when booking this room
        </p>
        <Button onClick={handleAddNew} variant="outline" size="sm">
          <Plus size={16} className="mr-2" />
          Add Promo Code
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingCoupon ? 'Edit Promotional Code' : 'New Promotional Code'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., SUMMER20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 uppercase"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Summer Sale"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Get 20% off for bookings during summer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Discount Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {DISCOUNT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, discount_type: type.value }))}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                      formData.discount_type === type.value
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={formData.discount_type === type.value ? 'text-gray-900' : 'text-gray-500'}>
                      {type.icon}
                    </span>
                    <span className="text-sm font-medium">{type.label}</span>
                    <span className="text-xs text-gray-500">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.discount_type === 'percentage'
                  ? 'Discount (%)'
                  : formData.discount_type === 'fixed_amount'
                  ? 'Amount Off (R)'
                  : 'Free Nights'} *
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                min="0"
                max={formData.discount_type === 'percentage' ? 100 : undefined}
                step={formData.discount_type === 'free_nights' ? 1 : 0.01}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            {/* Claimable Toggle */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_claimable}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_claimable: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Enable Claim Requests</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    When enabled, visitors can request this coupon via a contact form on your property page.
                    You'll receive a support ticket with their details.
                  </p>
                </div>
              </label>
            </div>

            {/* Validity Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Valid From
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Valid Until
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                min={formData.valid_from || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Usage Limits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash size={14} className="inline mr-1" />
                Max Total Uses
              </label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value ? parseInt(e.target.value) : '' }))}
                min="1"
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users size={14} className="inline mr-1" />
                Max Per Customer
              </label>
              <input
                type="number"
                value={formData.max_uses_per_customer}
                onChange={(e) => setFormData(prev => ({ ...prev, max_uses_per_customer: e.target.value ? parseInt(e.target.value) : '' }))}
                min="1"
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Minimum Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Booking Amount (R)</label>
              <input
                type="number"
                value={formData.min_booking_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, min_booking_amount: e.target.value ? parseFloat(e.target.value) : '' }))}
                min="0"
                placeholder="No minimum"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Nights</label>
              <input
                type="number"
                value={formData.min_nights}
                onChange={(e) => setFormData(prev => ({ ...prev, min_nights: e.target.value ? parseInt(e.target.value) : '' }))}
                min="1"
                placeholder="No minimum"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.code.trim() || !formData.name.trim()}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading coupons...
        </div>
      ) : coupons.length === 0 && !showForm ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Tag className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No promotional codes yet</p>
          <p className="text-sm text-gray-400">Click "Add Promo Code" to create your first coupon</p>
        </div>
      ) : coupons.length > 0 ? (
        <div style={{ borderColor: 'var(--border-color)' }} className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
              <tr>
                <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Code</th>
                <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Discount</th>
                <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Validity</th>
                <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">Usage</th>
                <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }} className="divide-y">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className={`hover:opacity-90 transition-opacity ${!coupon.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div style={{ color: 'var(--text-primary)' }} className="font-mono font-medium">{coupon.code}</div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-sm truncate max-w-[150px]">{coupon.name}</div>
                    {!coupon.is_active && (
                      <span style={{ color: 'var(--text-muted)' }} className="text-xs">(Inactive)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-emerald-100 text-emerald-800">
                      {getDiscountDisplay(coupon)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                    {coupon.valid_from || coupon.valid_until ? (
                      <div className="text-xs">
                        {coupon.valid_from && <div>From: {formatDate(coupon.valid_from)}</div>}
                        {coupon.valid_until && <div>Until: {formatDate(coupon.valid_until)}</div>}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Always valid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>
                    {coupon.current_uses}
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(coupon)}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1.5 hover:opacity-70 rounded"
                        title="Edit coupon"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon)}
                        disabled={deleting === coupon.id}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1.5 hover:text-red-600 rounded disabled:opacity-50"
                        title="Delete coupon"
                      >
                        {deleting === coupon.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
