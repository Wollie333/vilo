import { getAccessToken, getTenantId } from './api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Types
export type Permission = 'none' | 'view' | 'edit' | 'full'

export interface Role {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  is_system_role: boolean
  is_default: boolean
  permissions: Record<string, Permission>
  created_at: string
  updated_at: string
}

export interface RoleWithMemberCount extends Role {
  member_count: number
}

export interface CreateRoleInput {
  name: string
  description?: string
  permissions?: Record<string, Permission>
  copyFromRoleId?: string
}

export interface UpdateRoleInput {
  name?: string
  description?: string
}

// All available resources that can have permissions
export const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard', description: 'View analytics and overview' },
  { key: 'bookings', label: 'Bookings', description: 'Create, view, modify reservations' },
  { key: 'rooms', label: 'Rooms', description: 'Manage room inventory and settings' },
  { key: 'calendar', label: 'Calendar', description: 'View and manage availability' },
  { key: 'reviews', label: 'Reviews', description: 'View and respond to guest reviews' },
  { key: 'reports', label: 'Reports', description: 'Access financial and operational reports' },
  { key: 'payments', label: 'Payments', description: 'Process payments and refunds' },
  { key: 'settings.account', label: 'Settings - Account', description: 'Personal account settings' },
  { key: 'settings.business', label: 'Settings - Business', description: 'Business information and branding' },
  { key: 'settings.members', label: 'Settings - Team', description: 'Manage team members' },
  { key: 'settings.billing', label: 'Settings - Billing', description: 'Billing and subscription' },
  { key: 'settings.roles', label: 'Settings - Roles', description: 'Manage roles and permissions' },
  { key: 'seasonal_rates', label: 'Seasonal Rates', description: 'Configure seasonal pricing' },
  { key: 'addons', label: 'Add-ons', description: 'Manage booking add-ons' },
  { key: 'account.delete', label: 'Delete Account', description: 'Delete the workspace' },
] as const

export const PERMISSION_LEVELS: { value: Permission; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No access' },
  { value: 'view', label: 'View', description: 'Read-only access' },
  { value: 'edit', label: 'Edit', description: 'Can create and modify' },
  { value: 'full', label: 'Full', description: 'Full access including delete' },
]

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = getAccessToken()
  const tenantId = getTenantId()

  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

/**
 * Get all roles for the current tenant
 */
export async function getRoles(): Promise<RoleWithMemberCount[]> {
  const data = await apiRequest<{ roles: RoleWithMemberCount[] }>('/roles')
  return data.roles
}

/**
 * Get a single role by ID
 */
export async function getRole(id: string): Promise<Role> {
  const data = await apiRequest<{ role: Role }>(`/roles/${id}`)
  return data.role
}

/**
 * Create a new role
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  const data = await apiRequest<{ role: Role }>('/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.role
}

/**
 * Update a role's name and description
 */
export async function updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
  const data = await apiRequest<{ role: Role }>(`/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.role
}

/**
 * Update a role's permissions
 */
export async function updateRolePermissions(
  id: string,
  permissions: Record<string, Permission>
): Promise<Role> {
  const data = await apiRequest<{ role: Role }>(`/roles/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  })
  return data.role
}

/**
 * Delete a role
 */
export async function deleteRole(id: string, reassignToRoleId?: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/roles/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reassignToRoleId }),
  })
}

/**
 * Duplicate a role
 */
export async function duplicateRole(id: string, newName: string): Promise<Role> {
  const data = await apiRequest<{ role: Role }>(`/roles/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: newName }),
  })
  return data.role
}

/**
 * Set a role as the default for new members
 */
export async function setDefaultRole(id: string): Promise<Role> {
  const data = await apiRequest<{ role: Role }>(`/roles/${id}/default`, {
    method: 'PATCH',
  })
  return data.role
}
