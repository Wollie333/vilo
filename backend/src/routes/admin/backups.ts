import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'
import {
  createBackup as createBackupService,
  downloadBackup,
  restoreFromBackup,
  deleteBackup as deleteBackupService,
  cleanupExpiredBackups,
  getBackupStats
} from '../../services/backupService.js'

const router = Router()

/**
 * GET /api/admin/backups
 * List all backups with filters and pagination
 */
router.get('/', requirePermission('backups'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const backupType = req.query.type as string
    const status = req.query.status as string
    const tenantId = req.query.tenantId as string

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('backup_history')
      .select(`
        *,
        tenants (id, business_name),
        super_admins (email, display_name)
      `, { count: 'exact' })

    // Apply filters
    if (backupType) {
      query = query.eq('backup_type', backupType)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    // Sort and paginate
    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: backups, count, error } = await query

    if (error) {
      console.error('List backups error:', error)
      return res.status(500).json({ error: 'Failed to list backups' })
    }

    // Transform data
    const transformedBackups = backups?.map(backup => ({
      id: backup.id,
      backupType: backup.backup_type,
      backupName: backup.backup_name,
      status: backup.status,
      storageProvider: backup.storage_provider,
      storagePath: backup.storage_path,
      sizeBytes: backup.size_bytes,
      sizeFormatted: formatBytes(backup.size_bytes),
      compression: backup.compression,
      tenantId: backup.tenant_id,
      tenantName: backup.tenants?.business_name,
      initiatedBy: backup.super_admins?.display_name || backup.super_admins?.email,
      initiatedSource: backup.initiated_source,
      startedAt: backup.started_at,
      completedAt: backup.completed_at,
      expiresAt: backup.expires_at,
      errorMessage: backup.error_message,
      createdAt: backup.created_at
    })) || []

    res.json({
      backups: transformedBackups,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('List backups error:', error)
    res.status(500).json({ error: 'Failed to list backups' })
  }
})

/**
 * GET /api/admin/backups/stats
 * Get backup statistics
 */
router.get('/stats', requirePermission('backups'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get total backups by type
    const { data: allBackups } = await supabase
      .from('backup_history')
      .select('backup_type, status, size_bytes')

    const stats = allBackups?.reduce((acc: any, backup) => {
      // Count by type
      acc.byType[backup.backup_type] = (acc.byType[backup.backup_type] || 0) + 1

      // Count by status
      acc.byStatus[backup.status] = (acc.byStatus[backup.status] || 0) + 1

      // Total size
      if (backup.status === 'completed' && backup.size_bytes) {
        acc.totalSize += backup.size_bytes
      }

      return acc
    }, { byType: {}, byStatus: {}, totalSize: 0 }) || { byType: {}, byStatus: {}, totalSize: 0 }

    // Get last successful backup
    const { data: lastBackup } = await supabase
      .from('backup_history')
      .select('backup_type, completed_at, backup_name')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Get failed backups in last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { count: recentFailures } = await supabase
      .from('backup_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', yesterday.toISOString())

    res.json({
      byType: stats.byType,
      byStatus: stats.byStatus,
      totalSizeBytes: stats.totalSize,
      totalSizeFormatted: formatBytes(stats.totalSize),
      lastBackup: lastBackup ? {
        type: lastBackup.backup_type,
        name: lastBackup.backup_name,
        completedAt: lastBackup.completed_at
      } : null,
      recentFailures: recentFailures || 0
    })
  } catch (error) {
    console.error('Get backup stats error:', error)
    res.status(500).json({ error: 'Failed to get backup stats' })
  }
})

/**
 * GET /api/admin/backups/:id
 * Get single backup details
 */
router.get('/:id', requirePermission('backups'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: backup, error } = await supabase
      .from('backup_history')
      .select(`
        *,
        tenants (id, business_name),
        super_admins (email, display_name)
      `)
      .eq('id', id)
      .single()

    if (error || !backup) {
      return res.status(404).json({ error: 'Backup not found' })
    }

    res.json({
      id: backup.id,
      backupType: backup.backup_type,
      backupName: backup.backup_name,
      status: backup.status,
      storageProvider: backup.storage_provider,
      storagePath: backup.storage_path,
      storageBucket: backup.storage_bucket,
      sizeBytes: backup.size_bytes,
      sizeFormatted: formatBytes(backup.size_bytes),
      checksum: backup.checksum,
      encryptionMethod: backup.encryption_method,
      compression: backup.compression,
      tenant: backup.tenants ? {
        id: backup.tenants.id,
        name: backup.tenants.business_name
      } : null,
      initiatedBy: backup.super_admins?.display_name || backup.super_admins?.email,
      initiatedSource: backup.initiated_source,
      startedAt: backup.started_at,
      completedAt: backup.completed_at,
      expiresAt: backup.expires_at,
      errorMessage: backup.error_message,
      createdAt: backup.created_at
    })
  } catch (error) {
    console.error('Get backup error:', error)
    res.status(500).json({ error: 'Failed to get backup' })
  }
})

/**
 * POST /api/admin/backups
 * Create a new backup
 */
router.post('/', requirePermission('backups'), auditLog('backup.create', 'backup'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { backupType, tenantId, description } = req.body

    if (!backupType) {
      return res.status(400).json({ error: 'Backup type is required' })
    }

    if (!['full', 'incremental', 'tenant_export'].includes(backupType)) {
      return res.status(400).json({ error: 'Invalid backup type' })
    }

    if (backupType === 'tenant_export' && !tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required for tenant export' })
    }

    // Start backup using the real backup service
    const result = await createBackupService({
      backupType,
      tenantId,
      initiatedBy: req.superAdmin?.id || 'unknown',
      initiatedSource: 'manual',
      compression: true,
      description
    })

    if (result.status === 'failed') {
      return res.status(500).json({ error: result.error || 'Backup failed' })
    }

    res.json({
      success: true,
      backup: {
        id: result.backupId,
        status: result.status,
        sizeBytes: result.sizeBytes,
        storagePath: result.storagePath,
        message: 'Backup completed successfully'
      }
    })
  } catch (error) {
    console.error('Create backup error:', error)
    res.status(500).json({ error: 'Failed to create backup' })
  }
})

/**
 * GET /api/admin/backups/:id/download
 * Get download URL for a backup
 */
router.get('/:id/download', requirePermission('backups'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await downloadBackup(id)

    if (result.error) {
      return res.status(400).json({ error: result.error })
    }

    res.json({
      url: result.url,
      expiresAt: result.expiresAt
    })
  } catch (error) {
    console.error('Download backup error:', error)
    res.status(500).json({ error: 'Failed to get download URL' })
  }
})

/**
 * POST /api/admin/backups/:id/restore
 * Restore from a backup
 */
router.post('/:id/restore', requirePermission('backups'), auditLog('backup.restore', 'backup'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { targetTenantId, dryRun = false } = req.body

    const result = await restoreFromBackup({
      backupId: id,
      targetTenantId,
      adminId: req.superAdmin?.id || 'unknown',
      dryRun
    })

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({
      success: true,
      message: result.message,
      restoredRecords: result.restoredRecords
    })
  } catch (error) {
    console.error('Restore backup error:', error)
    res.status(500).json({ error: 'Failed to restore backup' })
  }
})

/**
 * DELETE /api/admin/backups/:id
 * Delete a backup
 */
router.delete('/:id', requirePermission('backups'), auditLog('backup.delete', 'backup'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await deleteBackupService(id, req.superAdmin?.id || 'unknown')

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Delete backup error:', error)
    res.status(500).json({ error: 'Failed to delete backup' })
  }
})

/**
 * POST /api/admin/backups/cleanup
 * Delete expired backups
 */
router.post('/cleanup/expired', requirePermission('backups'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const deletedCount = await cleanupExpiredBackups()

    // Log the cleanup action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'backup.cleanup',
        resourceType: 'backup',
        description: `Cleaned up ${deletedCount} expired backups`,
        metadata: { deletedCount },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, deletedCount })
  } catch (error) {
    console.error('Cleanup backups error:', error)
    res.status(500).json({ error: 'Failed to cleanup backups' })
  }
})

// Helper function to format bytes
function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default router
