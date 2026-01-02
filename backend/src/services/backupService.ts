import { supabase } from '../lib/supabase.js'
import { createHash } from 'crypto'
import { gzipSync, gunzipSync } from 'zlib'
import * as cron from 'node-cron'

export type BackupType = 'full' | 'incremental' | 'tenant_export'
export type BackupStatus = 'in_progress' | 'completed' | 'failed' | 'deleted'
export type StorageProvider = 's3' | 'gcs' | 'azure' | 'supabase_storage'

export interface BackupOptions {
  backupType: BackupType
  tenantId?: string
  initiatedBy: string
  initiatedSource?: 'manual' | 'scheduled' | 'pre_update'
  compression?: boolean
  description?: string
}

export interface RestoreOptions {
  backupId: string
  targetTenantId?: string
  adminId: string
  dryRun?: boolean
}

export interface BackupResult {
  backupId: string
  status: BackupStatus
  sizeBytes?: number
  storagePath?: string
  error?: string
}

// Tables to include in full backup (in dependency order)
const BACKUP_TABLES = [
  'tenants',
  'tenant_members',
  'rooms',
  'bookings',
  'customers',
  'reviews',
  'invoices',
  'payments',
  'coupons',
  'addons',
  'notifications',
  'notification_preferences'
]

// Tables for tenant export (tenant-specific data only)
const TENANT_EXPORT_TABLES = [
  'rooms',
  'bookings',
  'customers',
  'reviews',
  'invoices',
  'coupons',
  'addons'
]

const BACKUP_BUCKET = 'backups'

/**
 * Create a backup of the specified type
 */
export async function createBackup(options: BackupOptions): Promise<BackupResult> {
  const {
    backupType,
    tenantId,
    initiatedBy,
    initiatedSource = 'manual',
    compression = true,
    description
  } = options

  console.log(`[Backup] Starting ${backupType} backup...`)

  // Create backup record
  const { data: backupRecord, error: insertError } = await supabase
    .from('backup_history')
    .insert({
      backup_type: backupType,
      storage_provider: 'supabase_storage',
      status: 'in_progress',
      initiated_by: initiatedBy,
      initiated_source: initiatedSource,
      is_encrypted: false,
      is_compressed: compression,
      metadata: {
        description,
        tenant_id: tenantId
      }
    })
    .select()
    .single()

  if (insertError || !backupRecord) {
    console.error('[Backup] Failed to create backup record:', insertError)
    return {
      backupId: '',
      status: 'failed',
      error: 'Failed to create backup record'
    }
  }

  const backupId = backupRecord.id

  try {
    // Collect data based on backup type
    let backupData: Record<string, any[]> = {}
    const tablesToBackup = backupType === 'tenant_export' ? TENANT_EXPORT_TABLES : BACKUP_TABLES

    for (const table of tablesToBackup) {
      let query = supabase.from(table).select('*')

      // Filter by tenant for tenant exports
      if (backupType === 'tenant_export' && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query

      if (error) {
        console.error(`[Backup] Error fetching ${table}:`, error)
        continue
      }

      backupData[table] = data || []
      console.log(`[Backup] Collected ${data?.length || 0} records from ${table}`)
    }

    // Create backup content
    const backupContent = JSON.stringify({
      metadata: {
        backupId,
        backupType,
        tenantId: tenantId || null,
        createdAt: new Date().toISOString(),
        tables: Object.keys(backupData),
        recordCounts: Object.fromEntries(
          Object.entries(backupData).map(([table, records]) => [table, records.length])
        )
      },
      data: backupData
    })

    // Compress if requested
    let finalContent: Buffer | string = backupContent
    if (compression) {
      finalContent = gzipSync(Buffer.from(backupContent))
    }

    const sizeBytes = typeof finalContent === 'string'
      ? Buffer.byteLength(finalContent)
      : finalContent.length

    // Calculate checksum
    const checksum = createHash('sha256')
      .update(typeof finalContent === 'string' ? finalContent : finalContent)
      .digest('hex')

    // Generate storage path
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${backupType}_${backupId}_${dateStr}${compression ? '.json.gz' : '.json'}`
    const storagePath = `${dateStr}/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(storagePath, finalContent, {
        contentType: compression ? 'application/gzip' : 'application/json',
        cacheControl: '3600'
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Update backup record with success
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 day retention

    await supabase
      .from('backup_history')
      .update({
        status: 'completed',
        storage_path: storagePath,
        size_bytes: sizeBytes,
        checksum,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .eq('id', backupId)

    console.log(`[Backup] Backup completed: ${backupId}, size: ${sizeBytes} bytes`)

    return {
      backupId,
      status: 'completed',
      sizeBytes,
      storagePath
    }
  } catch (error: any) {
    console.error('[Backup] Backup failed:', error)

    // Update backup record with failure
    await supabase
      .from('backup_history')
      .update({
        status: 'failed',
        metadata: {
          ...backupRecord.metadata,
          error: error.message
        }
      })
      .eq('id', backupId)

    return {
      backupId,
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Download backup data
 */
export async function downloadBackup(backupId: string): Promise<{
  url?: string
  expiresAt?: string
  error?: string
}> {
  try {
    // Get backup record
    const { data: backup, error } = await supabase
      .from('backup_history')
      .select('*')
      .eq('id', backupId)
      .single()

    if (error || !backup) {
      return { error: 'Backup not found' }
    }

    if (backup.status !== 'completed') {
      return { error: 'Backup is not completed' }
    }

    if (!backup.storage_path) {
      return { error: 'Backup file path not found' }
    }

    // Create signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .createSignedUrl(backup.storage_path, 3600)

    if (urlError || !signedUrl) {
      return { error: 'Failed to generate download URL' }
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    return {
      url: signedUrl.signedUrl,
      expiresAt: expiresAt.toISOString()
    }
  } catch (error: any) {
    console.error('[Backup] Download error:', error)
    return { error: error.message }
  }
}

/**
 * Restore from a backup
 */
export async function restoreFromBackup(options: RestoreOptions): Promise<{
  success: boolean
  message: string
  restoredRecords?: Record<string, number>
}> {
  const { backupId, targetTenantId, adminId, dryRun = false } = options

  console.log(`[Backup] Starting restore from backup ${backupId}...`)

  try {
    // Get backup record
    const { data: backup, error } = await supabase
      .from('backup_history')
      .select('*')
      .eq('id', backupId)
      .single()

    if (error || !backup) {
      return { success: false, message: 'Backup not found' }
    }

    if (backup.status !== 'completed') {
      return { success: false, message: 'Cannot restore from incomplete backup' }
    }

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(backup.storage_path)

    if (downloadError || !fileData) {
      return { success: false, message: 'Failed to download backup file' }
    }

    // Decompress if needed
    let backupContent: string
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (backup.is_compressed) {
      const decompressed = gunzipSync(buffer)
      backupContent = decompressed.toString('utf-8')
    } else {
      backupContent = buffer.toString('utf-8')
    }

    // Parse backup data
    const backupJson = JSON.parse(backupContent)
    const restoredRecords: Record<string, number> = {}

    if (dryRun) {
      console.log('[Backup] Dry run - would restore:', backupJson.metadata.recordCounts)
      return {
        success: true,
        message: 'Dry run completed',
        restoredRecords: backupJson.metadata.recordCounts
      }
    }

    // Restore data (tenant export only for now)
    if (backup.backup_type === 'tenant_export' && targetTenantId) {
      for (const table of TENANT_EXPORT_TABLES) {
        const records = backupJson.data[table] || []
        if (records.length === 0) continue

        // Update tenant_id to target tenant
        const updatedRecords = records.map((record: any) => ({
          ...record,
          tenant_id: targetTenantId,
          id: undefined // Let database generate new IDs
        }))

        const { error: insertError } = await supabase
          .from(table)
          .insert(updatedRecords)

        if (insertError) {
          console.error(`[Backup] Error restoring ${table}:`, insertError)
        } else {
          restoredRecords[table] = updatedRecords.length
        }
      }
    }

    // Log restore action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action: 'backup.restore',
        resource_type: 'backup',
        resource_id: backupId,
        changes: {
          targetTenantId,
          restoredRecords
        }
      })

    console.log('[Backup] Restore completed:', restoredRecords)

    return {
      success: true,
      message: 'Restore completed successfully',
      restoredRecords
    }
  } catch (error: any) {
    console.error('[Backup] Restore failed:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string, adminId: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    // Get backup record
    const { data: backup, error } = await supabase
      .from('backup_history')
      .select('*')
      .eq('id', backupId)
      .single()

    if (error || !backup) {
      return { success: false, message: 'Backup not found' }
    }

    // Delete from storage
    if (backup.storage_path) {
      const { error: deleteError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .remove([backup.storage_path])

      if (deleteError) {
        console.error('[Backup] Failed to delete storage file:', deleteError)
      }
    }

    // Update backup record
    await supabase
      .from('backup_history')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', backupId)

    // Log deletion
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action: 'backup.delete',
        resource_type: 'backup',
        resource_id: backupId
      })

    return { success: true, message: 'Backup deleted successfully' }
  } catch (error: any) {
    console.error('[Backup] Delete failed:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Cleanup expired backups
 */
export async function cleanupExpiredBackups(): Promise<number> {
  console.log('[Backup] Starting cleanup of expired backups...')

  try {
    // Find expired backups
    const { data: expiredBackups, error } = await supabase
      .from('backup_history')
      .select('id, storage_path')
      .eq('status', 'completed')
      .lt('expires_at', new Date().toISOString())

    if (error || !expiredBackups || expiredBackups.length === 0) {
      console.log('[Backup] No expired backups found')
      return 0
    }

    console.log(`[Backup] Found ${expiredBackups.length} expired backups`)

    // Delete storage files
    const storagePaths = expiredBackups
      .map(b => b.storage_path)
      .filter(Boolean) as string[]

    if (storagePaths.length > 0) {
      await supabase.storage
        .from(BACKUP_BUCKET)
        .remove(storagePaths)
    }

    // Update backup records
    const backupIds = expiredBackups.map(b => b.id)
    await supabase
      .from('backup_history')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .in('id', backupIds)

    console.log(`[Backup] Cleaned up ${expiredBackups.length} expired backups`)
    return expiredBackups.length
  } catch (error: any) {
    console.error('[Backup] Cleanup failed:', error)
    return 0
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number
  completedBackups: number
  totalSizeBytes: number
  lastBackupAt: string | null
  byType: Record<string, number>
}> {
  try {
    const { data: backups } = await supabase
      .from('backup_history')
      .select('id, backup_type, status, size_bytes, completed_at')
      .neq('status', 'deleted')

    if (!backups || backups.length === 0) {
      return {
        totalBackups: 0,
        completedBackups: 0,
        totalSizeBytes: 0,
        lastBackupAt: null,
        byType: {}
      }
    }

    const completedBackups = backups.filter(b => b.status === 'completed')
    const totalSizeBytes = completedBackups.reduce((sum, b) => sum + (b.size_bytes || 0), 0)

    const byType: Record<string, number> = {}
    backups.forEach(b => {
      byType[b.backup_type] = (byType[b.backup_type] || 0) + 1
    })

    const lastBackup = completedBackups
      .filter(b => b.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]

    return {
      totalBackups: backups.length,
      completedBackups: completedBackups.length,
      totalSizeBytes,
      lastBackupAt: lastBackup?.completed_at || null,
      byType
    }
  } catch (error: any) {
    console.error('[Backup] Stats error:', error)
    return {
      totalBackups: 0,
      completedBackups: 0,
      totalSizeBytes: 0,
      lastBackupAt: null,
      byType: {}
    }
  }
}

// Scheduled job reference
let scheduledBackupJob: ReturnType<typeof cron.schedule> | null = null

/**
 * Schedule automatic daily backups
 */
export function scheduleAutomaticBackups(): void {
  // Cancel existing job if any
  if (scheduledBackupJob) {
    scheduledBackupJob.stop()
  }

  // Schedule daily backup at 3:00 AM
  scheduledBackupJob = cron.schedule('0 3 * * *', async () => {
    console.log('[Backup] Running scheduled daily backup...')

    try {
      await createBackup({
        backupType: 'full',
        initiatedBy: '00000000-0000-0000-0000-000000000000', // System user
        initiatedSource: 'scheduled',
        compression: true,
        description: 'Scheduled daily backup'
      })

      // Cleanup expired backups after successful backup
      await cleanupExpiredBackups()
    } catch (error) {
      console.error('[Backup] Scheduled backup failed:', error)
    }
  }, {
    timezone: 'UTC'
  })

  console.log('[Backup] Automatic backups scheduled for 3:00 AM UTC daily')
}

/**
 * Stop scheduled backups
 */
export function stopScheduledBackups(): void {
  if (scheduledBackupJob) {
    scheduledBackupJob.stop()
    scheduledBackupJob = null
    console.log('[Backup] Scheduled backups stopped')
  }
}
